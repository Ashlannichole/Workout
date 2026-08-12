/* Sanity checks for the pure logic. Run: node scripts/smoke.mjs */
import { EXERCISES, EXERCISE_BY_ID, MODALITIES, EQUIPMENT, GOALS } from '../src/data/exercises.js'
import {
  generateSession,
  estimateMinutes,
  resolveForEquipment,
  resolveForAnyEquipment,
  movementFamily,
} from '../src/lib/generator.js'
import { suggestWeight, suggestStartingWeight, isPrWeek, ladderData, minLoadFor } from '../src/lib/progression.js'

let fails = 0
const ok = (cond, msg) => {
  if (!cond) {
    fails++
    console.log('  FAIL:', msg)
  }
}

console.log('--- library integrity ---')
const ids = new Set()
for (const e of EXERCISES) {
  ok(!ids.has(e.id), `duplicate id ${e.id}`)
  ids.add(e.id)
  ok(e.primary.length > 0, `${e.id} has no primary group`)
  ok(e.equipment.length > 0, `${e.id} has no equipment tier`)
  ok(e.estTimePerSet > 0, `${e.id} estTimePerSet must be positive`)
  if (e.homeAlternativeId) {
    ok(EXERCISE_BY_ID[e.homeAlternativeId], `${e.id} points at missing alt ${e.homeAlternativeId}`)
  }
  if (e.incrementStep > 0) ok(e.startingLoadFactor !== null, `${e.id} loaded but no startingLoadFactor`)
}
console.log(`  ${EXERCISES.length} exercises checked`)

console.log('--- home alternative resolution ---')
for (const e of EXERCISES) {
  for (const tier of ['gym', 'home', 'bodyweight']) {
    const r = resolveForEquipment(e, tier)
    if (r) ok(r.equipment.includes(tier), `${e.id} -> ${r.id} does not support ${tier}`)
  }
}
console.log('  no resolution cycles or bad tiers')

console.log('--- generator across the matrix ---')
const profile = { weightLb: 150, gender: 'female', activityLevel: 'regular' }
let empties = 0
let combos = 0
for (const eq of EQUIPMENT) {
  for (const m of MODALITIES) {
    for (const g of GOALS) {
      for (const dur of [20, 45, 90]) {
        combos++
        const r = generateSession({
          equipment: eq.id,
          modality: m.id,
          goal: g.id,
          muscleGroups: ['chest', 'back', 'core'],
          durationMin: dur,
          activityLevel: 'regular',
          seed: 42,
        })
        const mins = estimateMinutes(r.exercises, g.id)
        ok(mins <= dur, `${eq.id}/${m.id}/${g.id}/${dur}min overshot budget: ${mins}min`)
        ok(r.exercises.length <= 8, `${eq.id}/${m.id}/${dur}min returned ${r.exercises.length} lifts`)
        const seen = new Set()
        const fams = new Set()
        for (const item of r.exercises) {
          ok(!seen.has(item.exerciseId), `duplicate exercise in ${eq.id}/${m.id}`)
          seen.add(item.exerciseId)
          const ex = EXERCISE_BY_ID[item.exerciseId]
          ok(ex.equipment.includes(eq.id), `${ex.id} not available at ${eq.id}`)
          if (r.exercises.length >= 3) {
            const f = movementFamily(ex)
            ok(!fams.has(f), `${eq.id}/${m.id}/${dur}min repeated movement family ${f}`)
            fams.add(f)
          }
        }
        if (r.exercises.length === 0) empties++
      }
    }
  }
}
console.log(`  ${combos} combinations, ${empties} produced an empty session`)

console.log('--- multi-tier equipment (gym + home + bodyweight together) ---')
const allTiers = ['gym', 'home', 'bodyweight']
let multiEmpties = 0
for (const m of MODALITIES) {
  for (const g of GOALS) {
    const r = generateSession({
      equipment: allTiers,
      modality: m.id,
      goal: g.id,
      muscleGroups: ['chest', 'back', 'core'],
      durationMin: 45,
      activityLevel: 'regular',
      seed: 42,
    })
    for (const item of r.exercises) {
      const ex = EXERCISE_BY_ID[item.exerciseId]
      ok(
        allTiers.some((t) => ex.equipment.includes(t)),
        `${ex.id} not available at any of ${allTiers.join('/')}`,
      )
    }
    if (r.exercises.length === 0) multiEmpties++
  }
}
ok(multiEmpties === 0, `${multiEmpties} multi-tier combination(s) produced an empty session`)
for (const e of EXERCISES) {
  const r = resolveForAnyEquipment(e, allTiers)
  ok(r, `${e.id} does not resolve under any of ${allTiers.join('/')}`)
}
console.log(`  ${MODALITIES.length * GOALS.length} multi-tier combinations, ${multiEmpties} empty`)

console.log('--- 20 min vs 90 min ---')
const short = generateSession({ durationMin: 20, muscleGroups: ['chest'], seed: 7 })
const long = generateSession({ durationMin: 90, muscleGroups: ['chest'], seed: 7 })
ok(long.exercises.length > short.exercises.length, 'longer session should hold more work')
console.log(`  20min -> ${short.exercises.length} lifts, 90min -> ${long.exercises.length} lifts`)

console.log('--- variety across seeds ---')
const a = generateSession({ durationMin: 60, muscleGroups: ['back'], seed: 1 }).exercises.map((x) => x.exerciseId)
const b = generateSession({ durationMin: 60, muscleGroups: ['back'], seed: 2 }).exercises.map((x) => x.exerciseId)
const c = generateSession({ durationMin: 60, muscleGroups: ['back'], seed: 1 }).exercises.map((x) => x.exerciseId)
ok(a.join() === c.join(), 'same seed must be reproducible')
console.log(`  seed1 ${a.join(', ')}`)
console.log(`  seed2 ${b.join(', ')}`)

console.log('--- progressive overload, 12 weeks of bench ---')
const history = []
let prevWeight = null
for (let w = 1; w <= 12; w++) {
  const s = suggestWeight({ exerciseId: 'barbell-bench-press', week: w, historyByWeek: history, profile })
  if (prevWeight != null) {
    const jump = s.weight - prevWeight
    ok(jump > 0, `week ${w} did not progress (${prevWeight} -> ${s.weight})`)
    ok(jump <= 10, `week ${w} jumped ${jump} lb, too much`)
    ok(s.weight >= 45, `bench below the empty bar at week ${w}: ${s.weight}`)
  }
  console.log(
    `  W${String(w).padStart(2)}  ${String(s.weight).padStart(5)} lb  ${
      s.delta ? `+${s.delta}` : '     '
    }  ${s.prEligible ? `PR offer ${s.prTarget}` : ''}`,
  )
  history[w] = s.weight // simulate the user logging exactly the suggestion
  prevWeight = s.weight
}

console.log('--- isolation lift stays gentle ---')
const isoHist = []
let iso = null
for (let w = 1; w <= 8; w++) {
  const s = suggestWeight({ exerciseId: 'lateral-raise', week: w, historyByWeek: isoHist, profile })
  if (iso != null) ok(s.weight - iso <= 2.5, `lateral raise jumped ${s.weight - iso} lb in week ${w}`)
  isoHist[w] = s.weight
  iso = s.weight
}
ok(isoHist[8] <= isoHist[1] * 3, `lateral raise ran away: ${isoHist[1]} -> ${isoHist[8]}`)
console.log(`  lateral raise week by week: ${isoHist.slice(1).join(', ')} lb`)

console.log('--- skipped weeks are capped ---')
const gap = suggestWeight({
  exerciseId: 'back-squat',
  week: 10,
  historyByWeek: (() => { const h = []; h[1] = 135; return h })(),
  profile,
})
ok(gap.weight <= 135, `a 9-week layoff should not increase the load, got ${gap.weight}`)
console.log(`  squat logged 135 in W1, W10 suggests ${gap.weight} lb`)

console.log('--- PR weeks ---')
ok(!isPrWeek(1) && !isPrWeek(3) && isPrWeek(4) && isPrWeek(8) && isPrWeek(12), 'PR week cadence wrong')
console.log('  PR eligible at 4, 8, 12 only')

console.log('--- bodyweight lifts carry no load ---')
const bw = suggestWeight({ exerciseId: 'push-up', week: 5, historyByWeek: [], profile })
ok(bw.weight === null && bw.source === 'bodyweight', 'push-up should not suggest a weight')
console.log('  push-up returns bodyweight')

console.log('--- ladder data ---')
const rungs = ladderData({
  exerciseId: 'barbell-bench-press',
  weeks: 8,
  currentWeek: 3,
  historyByWeek: (() => { const h = []; h[1] = 95; h[2] = 100; return h })(),
  profile,
})
ok(rungs.length === 8, 'ladder should have one rung per week')
ok(rungs[0].state === 'done' && rungs[2].state === 'current' && rungs[7].state === 'ahead', 'ladder states wrong')
ok(rungs.every((r) => r.heightPct >= 18 && r.heightPct <= 100), 'rung heights out of range')
console.log('  ' + rungs.map((r) => `W${r.week}:${r.state}`).join(' '))

console.log('--- starting weights are sane ---')
for (const p of [
  { weightLb: 130, gender: 'female', activityLevel: 'new' },
  { weightLb: 190, gender: 'male', activityLevel: 'athlete' },
]) {
  const sq = suggestStartingWeight(EXERCISE_BY_ID['back-squat'], p)
  const bp = suggestStartingWeight(EXERCISE_BY_ID['barbell-bench-press'], p)
  ok(sq >= minLoadFor(EXERCISE_BY_ID['back-squat']), `squat start ${sq} below the empty bar`)
  ok(bp >= 45, `bench start ${bp} below the empty bar`)
  ok(sq < p.weightLb * 1.1, `squat start ${sq} unreasonable for ${p.weightLb} lb`)
  console.log(`  ${p.weightLb} lb ${p.gender} ${p.activityLevel}: squat ${sq}, bench ${suggestStartingWeight(EXERCISE_BY_ID['barbell-bench-press'], p)}`)
}

console.log('')
console.log(fails === 0 ? 'ALL CHECKS PASSED' : `${fails} CHECK(S) FAILED`)
process.exit(fails === 0 ? 0 : 1)
