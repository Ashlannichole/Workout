/**
 * Three-way merge used by sync. `base` is the last state this device synced,
 * `local` is this device, `remote` is what another device saved since. Each
 * side's changes are kept; if both changed the same entry, this device wins.
 * Deletions are spotted by comparing with the base, so nothing comes back
 * from the dead.
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Merge key -> value objects (plans, logs, schedule assignments, overrides, profile). */
export function mergeMap(base = {}, local = {}, remote = {}) {
  const out = {}
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)])
  for (const k of keys) {
    const inB = k in base
    const inL = k in local
    const inR = k in remote
    if (inL && inR) {
      const localChanged = !same(local[k], base[k])
      const remoteChanged = !same(remote[k], base[k])
      out[k] = localChanged || !remoteChanged ? local[k] : remote[k]
    } else if (inL) {
      if (!(inB && same(local[k], base[k]))) out[k] = local[k]
    } else if (inR) {
      if (!(inB && same(remote[k], base[k]))) out[k] = remote[k]
    }
  }
  return out
}

/** A single value: whichever side changed it (this device if both did). */
export function mergeValue(base, local, remote) {
  return same(local, base) ? remote : local
}

export function mergeRungState(base, local, remote) {
  base = base || {}
  const plans = mergeMap(base.plans, local.plans, remote.plans)
  let activePlanId = mergeValue(base.activePlanId, local.activePlanId, remote.activePlanId)
  if (activePlanId && !plans[activePlanId]) activePlanId = Object.keys(plans)[0] ?? null
  return {
    ...remote,
    ...local,
    onboarded: !!(local.onboarded || remote.onboarded),
    profile: mergeMap(base.profile, local.profile, remote.profile),
    plans,
    activePlanId,
    logs: mergeMap(base.logs, local.logs, remote.logs),
    overrides: mergeMap(base.overrides, local.overrides, remote.overrides),
    schedule: {
      availableDays: mergeValue(base.schedule?.availableDays, local.schedule?.availableDays, remote.schedule?.availableDays),
      assignments: mergeMap(base.schedule?.assignments, local.schedule?.assignments, remote.schedule?.assignments),
    },
  }
}
