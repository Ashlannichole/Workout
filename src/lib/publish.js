/**
 * Shares upcoming workouts with the planner app through the
 * `scheduled_workouts` table: date, name, length, and whether it's done.
 * The planner plans the rest of the day around them. Rung itself never reads
 * this table back; its own data lives in `workout_state`.
 */

import { addDays, dateKey } from './schedule.js'
import { isSlotComplete } from './planProgress.js'

// A week back (so a workout finished yesterday still counts over there) and
// two weeks ahead (the planner's own planning window).
export const PAST_DAYS = 7
export const FUTURE_DAYS = 13

export function publishWindow(today = new Date()) {
  return { from: dateKey(addDays(today, -PAST_DAYS)), to: dateKey(addDays(today, FUTURE_DAYS)) }
}

/** Workouts in the window, one per scheduled day, in the shape the table stores. */
export function upcomingWorkouts(state, today = new Date()) {
  const { from, to } = publishWindow(today)
  const rows = []
  for (const [date, a] of Object.entries(state.schedule?.assignments || {})) {
    if (date < from || date > to || !a?.planId) continue
    const plan = state.plans?.[a.planId]
    const day = plan?.days?.find((d) => d.id === a.dayId)
    if (!day) continue
    rows.push({
      date,
      title: day.name || plan.name || 'Workout',
      duration_min: Number(day.durationMin) || 45,
      done: a.week ? isSlotComplete(state.logs || {}, plan.id, day, a.week) : false,
    })
  }
  return rows.sort((x, y) => x.date.localeCompare(y.date))
}

/** Replace this account's rows in the window with `rows`. */
export async function publishWorkouts(client, userId, rows, { from, to }) {
  if (rows.length) {
    const { error } = await client.from('scheduled_workouts').upsert(
      rows.map((r) => ({ ...r, user_id: userId, source: 'rung', updated_at: new Date().toISOString() })),
      { onConflict: 'user_id,date' },
    )
    if (error) throw error
  }
  // Remove days in the window that no longer have a workout (moved, rested, plan deleted).
  let del = client.from('scheduled_workouts').delete().eq('user_id', userId).gte('date', from).lte('date', to)
  if (rows.length) del = del.not('date', 'in', `(${rows.map((r) => `"${r.date}"`).join(',')})`)
  const { error } = await del
  if (error) throw error
}
