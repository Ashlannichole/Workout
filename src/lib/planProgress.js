/**
 * Plan completion and "true" active week.
 *
 * Kept separate from progression.js on purpose: that module's weight-cadence
 * math is exercised by scripts/smoke.mjs and shouldn't be touched just to
 * teach the app what "done" means. This module only reasons about whether a
 * day-template/week slot has been logged, never about what weight to suggest.
 */

import { logId } from './storage.js'

/** Has every exercise in this day-template been logged done for this week? */
export function isSlotComplete(logs, planId, day, week) {
  if (!day?.exercises?.length) return false
  return day.exercises.every((item) => {
    const log = logs[logId({ planId, dayId: day.id, exerciseId: item.exerciseId, week })]
    return log?.sets?.length > 0 && log.sets.every((s) => s.done)
  })
}

export function totalSessions(plan) {
  return (plan?.days?.length ?? 0) * (plan?.weeks ?? 0)
}

export function completedSessions(plan, logs) {
  if (!plan?.days?.length) return 0
  let count = 0
  for (let w = 1; w <= plan.weeks; w++) {
    for (const day of plan.days) {
      if (isSlotComplete(logs, plan.id, day, w)) count++
    }
  }
  return count
}

export function remainingSessions(plan, logs) {
  return totalSessions(plan) - completedSessions(plan, logs)
}

/** A plan is done when every (day-template x week) slot has been logged. */
export function isPlanComplete(plan, logs) {
  if (!plan?.days?.length) return false
  return remainingSessions(plan, logs) <= 0
}

/**
 * The week actually being trained, derived from logged completion rather
 * than a manually-clicked pill: the first week with any incomplete
 * day-template, or the plan's last week once everything is done.
 */
export function activeWeekForPlan(plan, logs) {
  if (!plan?.days?.length) return 1
  for (let w = 1; w <= plan.weeks; w++) {
    const weekDone = plan.days.every((day) => isSlotComplete(logs, plan.id, day, w))
    if (!weekDone) return w
  }
  return plan.weeks
}
