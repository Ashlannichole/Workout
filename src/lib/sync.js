/**
 * Cloud sync: one `workout_state` row per account holding Rung's data as
 * JSON, with a version number so two devices saving at once merge instead of
 * overwriting. Devices always keep their local copy and sync in the
 * background. Same approach as the planner app.
 */

import { mergeRungState } from './merge.js'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const TABLE = 'workout_state'

/** Thin wrapper over the table so the sync logic can be checked with a fake. */
export function supabaseRemote(client) {
  return {
    /** Just the version: a few bytes, so checking for changes stays cheap. */
    async getVersion(userId) {
      const { data, error } = await client.from(TABLE).select('version').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data ? data.version : null
    },
    async get(userId) {
      const { data, error } = await client.from(TABLE).select('data, version').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data
    },
    async insert(userId, state) {
      const { error } = await client.from(TABLE).insert({ user_id: userId, data: state, version: 1 })
      if (error) {
        if (error.code === '23505') return null // another device created the row first
        throw error
      }
      return 1
    },
    /** Write only if nobody else wrote since `version`. Returns the new version, or null on conflict. */
    async update(userId, state, version) {
      const { data, error } = await client
        .from(TABLE)
        .update({ data: state, version: version + 1, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('version', version)
        .select('version')
      if (error) throw error
      return data?.length ? data[0].version : null
    },
  }
}

/**
 * One sync round. Returns `{ state, meta }`: `state` is a new local state to
 * apply (null when nothing arrived) and `meta` is what to remember for next time.
 */
export async function syncOnce(remote, userId, local, meta, attempt = 0) {
  if (attempt > 3) throw new Error('Sync kept conflicting; will try again later')
  const version = await remote.getVersion(userId)

  if (version == null) {
    // First device on this account: upload what's here.
    const created = await remote.insert(userId, local)
    if (created == null) return syncOnce(remote, userId, local, meta, attempt + 1)
    return { state: null, meta: { userId, version: created, base: local } }
  }

  const known = meta?.userId === userId ? meta : null
  if (known && version === known.version) {
    if (same(local, known.base)) return { state: null, meta: known }
    const next = await remote.update(userId, local, version)
    if (next == null) return syncOnce(remote, userId, local, meta, attempt + 1)
    return { state: null, meta: { userId, version: next, base: local } }
  }

  // Another device saved since (or this device is new to the account).
  const row = await remote.get(userId)
  if (!row) return syncOnce(remote, userId, local, meta, attempt + 1)
  // A device that was never set up simply takes the account as it is.
  const merged = local.onboarded ? mergeRungState(known?.base, local, row.data) : row.data
  let saved = row.version
  if (!same(merged, row.data)) {
    saved = await remote.update(userId, merged, row.version)
    if (saved == null) return syncOnce(remote, userId, local, meta, attempt + 1)
  }
  return { state: merged, meta: { userId, version: saved, base: merged } }
}

const META_KEY = 'rung.sync.v1'

export function loadSyncMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY)) || null
  } catch {
    return null
  }
}

export function saveSyncMeta(meta) {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta))
    else localStorage.removeItem(META_KEY)
  } catch {
    /* storage unavailable; the next sync just merges from scratch */
  }
}
