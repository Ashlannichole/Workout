// Checks the sync, merge and workout-sharing logic. No dependencies:
//   node scripts/sync-check.mjs
import assert from 'node:assert/strict'
import { mergeMap, mergeRungState } from '../src/lib/merge.js'
import { syncOnce } from '../src/lib/sync.js'
import { upcomingWorkouts, publishWindow } from '../src/lib/publish.js'
import { emptyState, logId } from '../src/lib/storage.js'

const clone = (o) => JSON.parse(JSON.stringify(o))
let passed = 0
async function check(name, fn) {
  await fn()
  passed++
  console.log(`  ✓ ${name}`)
}

function fakeRemote() {
  const rows = new Map()
  const calls = { get: 0 }
  return {
    rows,
    calls,
    async getVersion(u) {
      return rows.get(u)?.version ?? null
    },
    async get(u) {
      calls.get++
      return rows.has(u) ? clone(rows.get(u)) : null
    },
    async insert(u, data) {
      if (rows.has(u)) return null
      rows.set(u, { data: clone(data), version: 1 })
      return 1
    },
    async update(u, data, version) {
      const row = rows.get(u)
      if (!row || row.version !== version) return null
      rows.set(u, { data: clone(data), version: version + 1 })
      return version + 1
    },
  }
}

const withPlan = (state, id) => ({
  ...state,
  plans: {
    ...state.plans,
    [id]: { id, name: id, weeks: 4, days: [{ id: `${id}-d1`, name: `${id} day`, durationMin: 40, exercises: [{ exerciseId: 'squat' }] }] },
  },
})

console.log('merge')
await check('keeps additions and deletions from both sides', () => {
  const base = { a: 1, b: 1, c: 1 }
  assert.deepEqual(mergeMap(base, { a: 2, b: 1, x: 1 }, { a: 1, c: 1, y: 1 }), { a: 2, x: 1, y: 1 })
})
await check('merges plans and logs from two devices', () => {
  const base = { ...clone(emptyState), onboarded: true }
  const phone = withPlan(base, 'legs')
  const ipad = withPlan(base, 'arms')
  const merged = mergeRungState(base, phone, ipad)
  assert.deepEqual(Object.keys(merged.plans).sort(), ['arms', 'legs'])
})
await check('keeps the active plan pointing at a plan that exists', () => {
  const base = withPlan({ ...clone(emptyState), onboarded: true, activePlanId: 'legs' }, 'legs')
  const phone = { ...base, plans: {}, activePlanId: null }
  const merged = mergeRungState(base, phone, base)
  assert.equal(merged.activePlanId, null)
})

console.log('sync')
await check('first device uploads, a new device receives the plan', async () => {
  const remote = fakeRemote()
  const phone = withPlan({ ...clone(emptyState), onboarded: true }, 'legs')
  await syncOnce(remote, 'u', phone, null)
  const { state } = await syncOnce(remote, 'u', clone(emptyState), null)
  assert.equal(state.onboarded, true)
  assert.ok(state.plans.legs)
})
await check('edits on two devices both survive', async () => {
  const remote = fakeRemote()
  const start = { ...clone(emptyState), onboarded: true }
  const phone1 = await syncOnce(remote, 'u', start, null)
  const ipad1 = await syncOnce(remote, 'u', clone(emptyState), null)
  await syncOnce(remote, 'u', withPlan(ipad1.state, 'arms'), ipad1.meta)
  const { state } = await syncOnce(remote, 'u', withPlan(start, 'legs'), phone1.meta)
  assert.deepEqual(Object.keys(state.plans).sort(), ['arms', 'legs'])
})
await check('nothing changed means nothing downloaded', async () => {
  const remote = fakeRemote()
  const phone = { ...clone(emptyState), onboarded: true }
  const first = await syncOnce(remote, 'u', phone, null)
  const before = remote.calls.get
  const again = await syncOnce(remote, 'u', phone, first.meta)
  assert.equal(again.state, null)
  assert.equal(remote.calls.get, before)
})

console.log('sharing workouts with the planner')
await check('publishes scheduled workouts in the window with name, length and done', () => {
  const today = new Date(2026, 9, 5) // Oct 5 2026
  const { from, to } = publishWindow(today)
  assert.equal(from, '2026-09-28')
  assert.equal(to, '2026-10-18')
  const state = withPlan({ ...clone(emptyState), onboarded: true }, 'legs')
  state.schedule.assignments = {
    '2026-10-01': { planId: 'legs', dayId: 'legs-d1', week: 1 },
    '2026-10-06': { planId: 'legs', dayId: 'legs-d1', week: 2 },
    '2026-10-07': { rest: true },
    '2026-11-30': { planId: 'legs', dayId: 'legs-d1', week: 3 },
  }
  state.logs[logId({ planId: 'legs', dayId: 'legs-d1', exerciseId: 'squat', week: 1 })] = {
    sets: [{ done: true }, { done: true }],
  }
  const rows = upcomingWorkouts(state, today)
  assert.deepEqual(rows, [
    { date: '2026-10-01', title: 'legs day', duration_min: 40, done: true },
    { date: '2026-10-06', title: 'legs day', duration_min: 40, done: false },
  ])
})

console.log(`\nALL ${passed} SYNC CHECKS PASSED`)
