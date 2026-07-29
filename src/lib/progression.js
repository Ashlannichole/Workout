/**
 * Progressive overload.
 *
 * Three jobs:
 *   1. Suggest a week-1 starting weight the user can actually complete.
 *   2. Add a small, exercise-appropriate step each week — never a jump.
 *   3. Every 4th week, offer an optional PR attempt. Offer, not require.
 *
 * The safety rails matter more than the math. A lateral raise that gains 5 lb
 * a week is 20 lb heavier by week 4, which is not a plan, it's an injury.
 */

import { EXERCISE_BY_ID } from '../data/exercises.js'

export const PR_INTERVAL_WEEKS = 4

/** Ceiling on any single week's increase, as a share of the current load. */
const MAX_WEEKLY_GAIN_PCT = 0.075

/** Miss this many weeks and we hold the load instead of stacking increments. */
const LAYOFF_WEEKS = 4

/** A loaded barbell can't weigh less than the bar. */
const BAR_WEIGHT_LB = 45

/**
 * Isolation work can't absorb load every single week. Compounds progress
 * weekly; everything else every other week, which is how people actually
 * train and keeps a 5 lb lateral raise from becoming 22.5 lb in two months.
 */
export function progressionCadence(exercise) {
  return exercise?.compound ? 1 : 2
}

/** Round to the granularity the equipment actually offers. */
export function roundLoad(weight, exercise) {
  if (!weight || weight <= 0) return 0
  const step =
    exercise?.loadType === 'barbell' || exercise?.loadType === 'machine'
      ? 5
      : exercise?.incrementStep && exercise.incrementStep < 5
        ? 2.5
        : 5
  const rounded = Math.round(weight / step) * step
  return Math.max(minLoadFor(exercise), rounded)
}

/** Lightest load this exercise can be performed at. */
export function minLoadFor(exercise) {
  if (exercise?.loadType === 'barbell') return BAR_WEIGHT_LB
  if (exercise?.incrementStep && exercise.incrementStep < 5) return 2.5
  return 5
}

/** Does this exercise carry external load at all? */
export function isLoaded(exercise) {
  return Boolean(exercise) && exercise.startingLoadFactor !== null && exercise.incrementStep > 0
}

/**
 * Conservative week-1 suggestion from bodyweight, tuned by training history.
 * The user can always overwrite it — this only exists so the first session
 * doesn't start with an empty box and a guess.
 */
export function suggestStartingWeight(exercise, profile) {
  if (!isLoaded(exercise)) return null
  const bw = Number(profile?.weightLb)
  if (!bw || bw < 60) return null

  const experience =
    { new: 0.62, returning: 0.78, regular: 1.0, athlete: 1.15 }[profile?.activityLevel] ?? 0.85

  const sexFactor = profile?.gender === 'female' ? 0.72 : profile?.gender === 'male' ? 1.0 : 0.86

  const raw = bw * exercise.startingLoadFactor * experience * sexFactor
  // roundLoad applies the floor, so a light beginner starts with the empty bar
  // rather than an impossible 25 lb "barbell".
  return roundLoad(raw, exercise)
}

/** Weeks where a PR attempt is offered: 4, 8, 12... */
export function isPrWeek(week) {
  return week >= PR_INTERVAL_WEEKS && week % PR_INTERVAL_WEEKS === 0
}

/**
 * The suggested working weight for a given week.
 *
 * @returns {{ weight: number|null, source: string, prEligible: boolean,
 *             prTarget: number|null, delta: number|null }}
 *   source is one of: bodyweight | starting | progressed | holding | returning
 */
export function suggestWeight({ exerciseId, week, historyByWeek = [], profile }) {
  const exercise = EXERCISE_BY_ID[exerciseId]
  const prEligible = isPrWeek(week)

  if (!isLoaded(exercise)) {
    return { weight: null, source: 'bodyweight', prEligible: false, prTarget: null, delta: null }
  }

  // Most recent logged week strictly before this one.
  let lastWeight = null
  let lastWeek = null
  for (let w = week - 1; w >= 1; w--) {
    if (historyByWeek[w] != null && historyByWeek[w] > 0) {
      lastWeight = historyByWeek[w]
      lastWeek = w
      break
    }
  }

  if (lastWeight == null) {
    return {
      weight: suggestStartingWeight(exercise, profile),
      source: 'starting',
      prEligible: false,
      prTarget: null,
      delta: null,
    }
  }

  const gap = week - lastWeek
  const withPr = (weight, source, delta) => ({
    weight,
    source,
    prEligible,
    prTarget: prEligible ? roundLoad(weight + exercise.incrementStep * 2, exercise) : null,
    delta,
  })

  // Back from a layoff: repeat the last load, don't stack four weeks of
  // increments onto someone who hasn't trained the lift in a month.
  if (gap >= LAYOFF_WEEKS) return withPr(lastWeight, 'returning', 0)

  // Isolation work only steps up on its cadence weeks.
  const cadence = progressionCadence(exercise)
  const weeksSinceStep = countStepWeeks(historyByWeek, lastWeek, week, cadence)
  if (weeksSinceStep === 0) return withPr(lastWeight, 'holding', 0)

  // One increment per eligible week, but never more than the percentage
  // ceiling once a gap is involved. For a normal week-over-week step the
  // increment itself governs — that's what the field is for.
  const rawStep = exercise.incrementStep * weeksSinceStep
  const ceiling = Math.max(exercise.incrementStep, lastWeight * MAX_WEEKLY_GAIN_PCT)
  const step = Math.min(rawStep, ceiling)

  const stepped = roundLoad(lastWeight + step, exercise)
  if (stepped <= lastWeight) return withPr(lastWeight, 'holding', 0)

  return withPr(stepped, 'progressed', stepped - lastWeight)
}

/** How many cadence boundaries fall between the last logged week and now. */
function countStepWeeks(_history, lastWeek, week, cadence) {
  if (cadence <= 1) return week - lastWeek
  return Math.floor(week / cadence) - Math.floor(lastWeek / cadence)
}

/**
 * Build the sparse week→weight array for one exercise inside one plan.
 * Uses the heaviest completed set in each week as that week's mark.
 */
export function historyForExercise(logs, planId, exerciseId) {
  const byWeek = []
  for (const entry of Object.values(logs ?? {})) {
    if (entry.planId !== planId || entry.exerciseId !== exerciseId) continue
    const top = (entry.sets ?? [])
      .filter((s) => s.done && s.weight > 0)
      .reduce((m, s) => Math.max(m, s.weight), 0)
    if (top > 0) byWeek[entry.week] = Math.max(byWeek[entry.week] ?? 0, top)
  }
  return byWeek
}

/**
 * Data for the load ladder: one rung per week of the plan.
 * `state` is what the rung is coloured by.
 */
export function ladderData({ exerciseId, weeks, currentWeek, historyByWeek, profile }) {
  const rungs = []
  let peak = 0
  // Project forward off logged data so future rungs show the intended slope.
  const projected = [...historyByWeek]

  for (let w = 1; w <= weeks; w++) {
    const logged = historyByWeek[w] ?? null
    let value = logged
    if (value == null) {
      value = suggestWeight({ exerciseId, week: w, historyByWeek: projected, profile }).weight
      if (value != null) projected[w] = value
    }
    if (value && value > peak) peak = value

    let state
    if (logged != null) state = isPrWeek(w) ? 'pr' : 'done'
    else if (w === currentWeek) state = 'current'
    else if (w < currentWeek) state = 'missed'
    else state = 'ahead'

    rungs.push({ week: w, value, state, prWeek: isPrWeek(w) })
  }

  // Heights are relative to the plan's peak so the ladder reads as a slope.
  return rungs.map((r) => ({
    ...r,
    heightPct: peak > 0 && r.value ? Math.max(18, Math.round((r.value / peak) * 100)) : 22,
  }))
}
