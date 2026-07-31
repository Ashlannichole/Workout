import { useEffect, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import Choice from '../components/Choice.jsx'
import LoadLadder from '../components/LoadLadder.jsx'
import ExerciseSwap from '../components/ExerciseSwap.jsx'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { historyForExercise, isPrWeek, suggestWeight } from '../lib/progression.js'

export default function Plan({ planId, onNavigate }) {
  const {
    state,
    plans,
    activePlan,
    dispatch,
    setWeek,
    activeWeekForPlan,
    remainingSessions,
    substituteExercisePermanent,
    substituteCandidates,
  } = useApp()
  const plan = (planId && state.plans[planId]) || activePlan
  const [dayIdx, setDayIdx] = useState(0)

  // The week actually being trained, derived from logged completion. This
  // only ever nudges plan.currentWeek forward when real progress overtakes
  // it — plan.currentWeek itself stays the *viewing* week the strip below
  // highlights, so browsing past/future weeks never changes what week a
  // new logged set attributes to (Session.jsx derives that independently).
  const activeWeek = plan ? activeWeekForPlan(plan.id) : 1
  useEffect(() => {
    if (plan && activeWeek > plan.currentWeek) setWeek(plan.id, activeWeek)
  }, [plan?.id, activeWeek])

  if (!plan) {
    return (
      <>
        <AppBar eyebrow="Plans" title="No plan yet" />
        <div className="scroll">
          <div className="empty" style={{ marginTop: 'var(--s10)' }}>
            <p className="muted" style={{ marginBottom: 'var(--s5)' }}>
              A plan is a session repeated across 6, 8, or 12 weeks, with the weight walking up each
              week.
            </p>
            <button className="btn btn--primary" onClick={() => onNavigate('build')}>
              Build one
            </button>
          </div>
        </div>
      </>
    )
  }

  const day = plan.days[Math.min(dayIdx, plan.days.length - 1)]
  const week = plan.currentWeek
  const complete = remainingSessions(plan.id) <= 0

  return (
    <>
      <AppBar
        eyebrow={`${plan.weeks}-week plan · ${plan.modality}`}
        title={plan.name}
        action="New"
        onAction={() => onNavigate('build')}
      />
      <div className="scroll">
        {plan.days.length > 1 && (
          <section className="section" style={{ marginTop: 'var(--s5)' }}>
            <span className="label">Session</span>
            <div className="choices choices--3" style={{ marginTop: 'var(--s2)' }}>
              {plan.days.map((d, i) => (
                <Choice
                  key={d.id}
                  title={d.name}
                  selected={i === dayIdx}
                  onClick={() => setDayIdx(i)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="section" style={plan.days.length > 1 ? undefined : { marginTop: 'var(--s5)' }}>
          <span className="label">Week</span>
          <div className="week-strip" style={{ marginTop: 'var(--s2)' }}>
            {Array.from({ length: plan.weeks }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                className="week-pill"
                aria-pressed={w === week}
                data-pr={isPrWeek(w)}
                onClick={() => setWeek(plan.id, w)}
              >
                W{w}
                {isPrWeek(w) && (
                  <>
                    <br />
                    PR
                  </>
                )}
              </button>
            ))}
          </div>
          {complete ? (
            <div className="empty">
              <span className="badge badge--done" style={{ marginBottom: 'var(--s2)' }}>
                Complete
              </span>
              <p className="muted" style={{ marginBottom: 'var(--s4)' }}>
                Every workout in this plan is logged. Nice work — build a new one to keep going.
              </p>
              <button className="btn btn--primary btn--block" onClick={() => onNavigate('build')}>
                Build a new plan
              </button>
            </div>
          ) : (
            <button
              className="btn btn--primary btn--block"
              onClick={() => onNavigate('session', { planId: plan.id, dayId: day.id })}
            >
              Log week {activeWeek}
            </button>
          )}
        </section>

        <section className="section">
          <div className="section__head">
            <h2 className="h3">Load ladder</h2>
            <span className="label">Each lift, week by week</span>
          </div>
          <p className="muted" style={{ fontSize: 'var(--t-2xs)', marginBottom: 'var(--s3)' }}>
            Swapping here changes future weeks — past history stays under the old exercise.
          </p>

          <ul className="stack">
            {day.exercises.map((item) => {
              const ex = EXERCISE_BY_ID[item.exerciseId]
              const history = historyForExercise(state.logs, plan.id, item.exerciseId)
              const s = suggestWeight({
                exerciseId: item.exerciseId,
                week,
                historyByWeek: history,
                profile: state.profile,
              })
              const otherIds = day.exercises
                .filter((x) => x.exerciseId !== item.exerciseId)
                .map((x) => x.exerciseId)
              return (
                <li key={item.exerciseId} className="exrow">
                  <div className="exrow__top">
                    <div style={{ minWidth: 0 }}>
                      <div className="exrow__name">{ex.name}</div>
                      <div className="exrow__meta">
                        {item.sets} × {item.reps}
                        {ex.incrementStep > 0 ? ` · +${ex.incrementStep} lb/wk` : ' · bodyweight'}
                      </div>
                    </div>
                    <div className="exrow__load">
                      <div className="exrow__weight">{s.weight ? `${s.weight} lb` : '—'}</div>
                      {s.delta > 0 && <div className="exrow__delta">+{s.delta}</div>}
                    </div>
                  </div>
                  <LoadLadder
                    exerciseId={item.exerciseId}
                    weeks={plan.weeks}
                    currentWeek={week}
                    historyByWeek={history}
                    profile={state.profile}
                  />
                  <ExerciseSwap
                    candidates={substituteCandidates(item.exerciseId, plan, otherIds)}
                    onPick={(newId) =>
                      substituteExercisePermanent(plan.id, day.id, item.exerciseId, newId)
                    }
                  />
                </li>
              )
            })}
          </ul>
          <div className="ladder-legend" style={{ marginTop: 'var(--s3)' }}>
            <span>
              <i style={{ background: 'var(--plate-green)' }} />
              Logged
            </span>
            <span>
              <i style={{ background: 'var(--plate-blue)' }} />
              This week
            </span>
            <span>
              <i style={{ background: 'var(--plate-yellow)' }} />
              PR week
            </span>
            <span>
              <i style={{ background: 'var(--line-strong)' }} />
              Ahead
            </span>
          </div>
        </section>

        {plans.length > 1 && (
          <section className="section">
            <h2 className="h3" style={{ marginBottom: 'var(--s3)' }}>
              Other plans
            </h2>
            <div className="stack">
              {plans
                .filter((p) => p.id !== plan.id)
                .map((p) => (
                  <button
                    key={p.id}
                    className="choice"
                    onClick={() => {
                      dispatch({ type: 'plan/activate', planId: p.id })
                      onNavigate('plan', { planId: p.id })
                    }}
                  >
                    <span className="choice__t">{p.name}</span>
                    <span className="choice__s">
                      {p.weeks} weeks · week {p.currentWeek} · {p.modality}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        )}

        <section className="section">
          <button
            className="btn btn--ghost btn--block"
            onClick={() => {
              if (confirm(`Delete "${plan.name}" and its logged sets? This can't be undone.`)) {
                dispatch({ type: 'plan/delete', planId: plan.id })
                onNavigate('today')
              }
            }}
          >
            Delete this plan
          </button>
        </section>
      </div>
    </>
  )
}
