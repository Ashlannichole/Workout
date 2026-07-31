import { useEffect, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import Choice from '../components/Choice.jsx'
import ExerciseSwap from '../components/ExerciseSwap.jsx'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { dateKey, addDays } from '../lib/schedule.js'
import { isSlotComplete } from '../lib/planProgress.js'

const WEEKDAY_FMT = { weekday: 'short' }

/**
 * `week` must be the plan's live active week (activeWeekForPlan), not the
 * assignment's own stored `week` — that field is just the fill algorithm's
 * internal day-template rotation counter, and can drift from the real
 * logged-progress week. Using anything else here would let this status (and
 * the override key built from it) disagree with what Session.jsx actually
 * logs against when the session is opened.
 */
function statusFor(assignment, plans, logs, activeWeekForPlan) {
  if (!assignment) return 'unscheduled'
  if (assignment.rest) return 'rest'
  const plan = plans[assignment.planId]
  const day = plan?.days.find((d) => d.id === assignment.dayId)
  if (plan && day && isSlotComplete(logs, plan.id, day, activeWeekForPlan(plan.id))) return 'logged'
  return 'scheduled'
}

export default function Calendar({ onNavigate }) {
  const {
    state,
    plans,
    ensureSchedule,
    assignDay,
    activeWeekForPlan,
    exercisesForInstance,
    substituteExerciseInstance,
    revertExerciseInstance,
    substituteCandidates,
  } = useApp()
  const today = new Date()
  const todayKey = dateKey(today)
  const [selectedKey, setSelectedKey] = useState(todayKey)

  useEffect(() => {
    ensureSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const strip = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i)
    const key = dateKey(d)
    return {
      key,
      date: d,
      weekday: d.toLocaleDateString(undefined, WEEKDAY_FMT),
      dayNum: d.getDate(),
      status: statusFor(state.schedule.assignments[key], state.plans, state.logs, activeWeekForPlan),
    }
  })

  const activePlans = plans.filter((p) => !p.finishedAt)
  const assignment = state.schedule.assignments[selectedKey]
  const plan = assignment?.planId ? state.plans[assignment.planId] : null
  const day = plan?.days.find((d) => d.id === assignment.dayId)
  const isPast = selectedKey < todayKey

  // Always the plan's live active week — see statusFor's comment. The strip
  // only ever shows today and the next 6 days, so there's no past-date view
  // to preserve a stale week number for.
  const week = plan ? activeWeekForPlan(plan.id) : null
  const exercises = plan && day ? exercisesForInstance(plan, day, week) : []

  const options = activePlans.flatMap((p) =>
    p.days.map((d) => ({ planId: p.id, dayId: d.id, planName: p.name, dayName: d.name })),
  )

  return (
    <>
      <AppBar eyebrow="Your week" title="Calendar" />
      <div className="scroll">
        <section className="section" style={{ marginTop: 'var(--s5)' }}>
          <div className="week-strip">
            {strip.map((d) => (
              <button
                key={d.key}
                className="week-pill"
                data-status={d.status}
                aria-pressed={d.key === selectedKey}
                onClick={() => setSelectedKey(d.key)}
              >
                {d.weekday}
                <br />
                {d.dayNum}
              </button>
            ))}
          </div>
          <div className="ladder-legend" style={{ marginTop: 'var(--s2)' }}>
            <span>
              <i style={{ background: 'var(--plate-blue)' }} />
              Scheduled
            </span>
            <span>
              <i style={{ background: 'var(--plate-green)' }} />
              Logged
            </span>
            <span>
              <i style={{ background: 'var(--line-strong)' }} />
              Rest
            </span>
          </div>
        </section>

        <section className="section">
          {plan && day ? (
            <div className="card card--pad">
              <div className="spread" style={{ marginBottom: 'var(--s2)' }}>
                <span className="label">{plan.name}</span>
                {statusFor(assignment, state.plans, state.logs, activeWeekForPlan) === 'logged' && (
                  <span className="badge badge--done">Logged</span>
                )}
              </div>
              <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>
                {day.name}
              </h2>
              <p className="muted" style={{ marginBottom: 'var(--s4)' }}>
                {exercises.length} lifts · {day.durationMin} minutes
              </p>
              <button
                className="btn btn--primary btn--block"
                onClick={() => onNavigate('session', { planId: plan.id, dayId: day.id })}
              >
                {isPast ? 'Log it late' : 'Start this session'}
              </button>

              <ul className="stack" style={{ marginTop: 'var(--s4)' }}>
                {exercises.map((item) => {
                  const ex = EXERCISE_BY_ID[item.exerciseId]
                  const originalId = item.originalExerciseId ?? item.exerciseId
                  const otherIds = exercises
                    .filter((x) => x.exerciseId !== item.exerciseId)
                    .map((x) => x.exerciseId)
                  return (
                    <li key={originalId} className="exrow">
                      <div className="exrow__top">
                        <div>
                          <div className="exrow__name">{ex.name}</div>
                          <div className="exrow__meta">{ex.primary.join(' · ')}</div>
                        </div>
                        <div className="exrow__load">
                          <div className="exrow__weight">
                            {item.sets}×{item.reps}
                          </div>
                        </div>
                      </div>
                      <ExerciseSwap
                        candidates={substituteCandidates(originalId, plan, otherIds)}
                        activeOverride={Boolean(item.originalExerciseId)}
                        onPick={(newId) =>
                          substituteExerciseInstance(plan.id, day.id, week, originalId, newId)
                        }
                        onRevert={
                          item.originalExerciseId
                            ? () => revertExerciseInstance(plan.id, day.id, week, originalId)
                            : undefined
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <div className="empty">
              <p className="muted">
                {activePlans.length === 0
                  ? 'No active plans yet — build one to start filling out your week.'
                  : 'Rest day.'}
              </p>
            </div>
          )}
        </section>

        {options.length > 0 && (
          <section className="section">
            <h2 className="h3" style={{ marginBottom: 'var(--s3)' }}>
              Change this day
            </h2>
            <div className="stack">
              {options.map((o) => (
                <Choice
                  key={`${o.planId}::${o.dayId}`}
                  title={o.dayName}
                  sub={o.planName}
                  selected={assignment?.planId === o.planId && assignment?.dayId === o.dayId}
                  onClick={() => assignDay(selectedKey, { planId: o.planId, dayId: o.dayId })}
                />
              ))}
              <Choice
                title="Rest"
                selected={Boolean(assignment?.rest)}
                onClick={() => assignDay(selectedKey, { rest: true })}
              />
            </div>
          </section>
        )}
      </div>
    </>
  )
}
