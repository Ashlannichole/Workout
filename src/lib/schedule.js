/**
 * The scheduling layer: which plan's session happens on which calendar day.
 *
 * Deliberately a rolling window, not a full pre-built calendar. A plan's
 * length in weeks is a target, not a deadline — it finishes when its
 * workouts are logged, so pre-computing every date for a 12-week plan up
 * front would just be wrong the first time a day gets skipped or moved.
 */

import { isPlanComplete } from './planProgress.js'

export const WEEKDAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
]

/** Local date key, not toISOString() — that's UTC and shifts near midnight. */
export function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date, n) {
  const next = new Date(date)
  next.setDate(next.getDate() + n)
  return next
}

/**
 * Compute new assignments for the next `horizonDays`, starting at `from`.
 * Only returns entries for dates NOT already present in
 * schedule.assignments — callers merge the result in, so a manual edit or a
 * previous fill is never overwritten.
 */
export function fillSchedule({ plans, logs, schedule, from = new Date(), horizonDays = 14 }) {
  const availableDays = schedule?.availableDays ?? []
  const assignments = schedule?.assignments ?? {}
  const activePlans = plans.filter((p) => p.days?.length && !isPlanComplete(p, logs))

  // Smooth weighted round-robin, keyed by each plan's frequency, so two
  // concurrent plans interleave proportionally instead of one running to
  // completion before the other starts.
  const totalWeight = activePlans.reduce((sum, p) => sum + (p.frequency || 1), 0)
  const credit = new Map(activePlans.map((p) => [p.id, 0]))

  // Resume each plan's day-template rotation from how many times it's
  // already been assigned, so repeated fill calls stay in sequence instead
  // of restarting at day-template 0 every time. Also track occurrences per
  // exact (planId, dayId) pair, so each assignment can carry the week number
  // it corresponds to — a stable count of "how many times has this specific
  // day-template been scheduled," which Calendar uses to show whether that
  // day's workout has actually been logged (via isSlotComplete), independent
  // of the plan's live "active week" used for actual progression.
  const priorPlanCount = new Map()
  const priorDayCount = new Map() // `${planId}::${dayId}` -> count
  for (const a of Object.values(assignments)) {
    if (a?.planId) {
      priorPlanCount.set(a.planId, (priorPlanCount.get(a.planId) || 0) + 1)
      const dk = `${a.planId}::${a.dayId}`
      priorDayCount.set(dk, (priorDayCount.get(dk) || 0) + 1)
    }
  }
  const dayCursor = new Map(activePlans.map((p) => [p.id, priorPlanCount.get(p.id) || 0]))

  const delta = {}
  let cursor = new Date(from)

  for (let i = 0; i < horizonDays; i++) {
    const key = dateKey(cursor)
    if (!(key in assignments) && !(key in delta)) {
      const weekday = cursor.getDay()
      if (!availableDays.includes(weekday)) {
        delta[key] = { rest: true }
      } else if (activePlans.length === 0) {
        // No active plan to assign yet — leave this date unfilled rather
        // than permanently stamping it rest, so a plan created later still
        // gets a chance to claim it on the next fill.
      } else {
        for (const p of activePlans) credit.set(p.id, credit.get(p.id) + (p.frequency || 1))
        let winner = activePlans[0]
        for (const p of activePlans) {
          if (credit.get(p.id) > credit.get(winner.id)) winner = p
        }
        credit.set(winner.id, credit.get(winner.id) - totalWeight)

        const idx = dayCursor.get(winner.id) % winner.days.length
        dayCursor.set(winner.id, dayCursor.get(winner.id) + 1)
        const day = winner.days[idx]
        const dk = `${winner.id}::${day.id}`
        const week = (priorDayCount.get(dk) || 0) + 1
        priorDayCount.set(dk, week)
        delta[key] = { planId: winner.id, dayId: day.id, week }
      }
    }
    cursor = addDays(cursor, 1)
  }

  return delta
}
