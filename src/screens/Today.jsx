import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import LoadLadder from '../components/LoadLadder.jsx'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { historyForExercise, isPrWeek } from '../lib/progression.js'

export default function Today({ onNavigate }) {
  const { state, activePlan, getLog } = useApp()
  const name = state.profile.name?.trim()

  if (!activePlan) {
    return (
      <>
        <AppBar eyebrow={name ? `Hey ${name}` : 'Welcome'} title="Today" />
        <div className="scroll">
          <div className="empty" style={{ marginTop: 'var(--s10)' }}>
            <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>
              Nothing on the bar yet
            </h2>
            <p className="muted" style={{ marginBottom: 'var(--s5)' }}>
              Build a session and Rung will turn it into a plan that adds weight for you every week.
            </p>
            <button className="btn btn--primary" onClick={() => onNavigate('build')}>
              Build a session
            </button>
          </div>
        </div>
      </>
    )
  }

  const week = activePlan.currentWeek
  const day = activePlan.days[0]
  const prWeek = isPrWeek(week)

  const doneCount = day.exercises.filter((item) => {
    const log = getLog({
      planId: activePlan.id,
      dayId: day.id,
      exerciseId: item.exerciseId,
      week,
    })
    return log?.sets?.every((s) => s.done)
  }).length
  const complete = doneCount === day.exercises.length

  // Lead with the exercise carrying the biggest jump this week — that's the
  // most interesting fact about today.
  const headline = day.exercises
    .map((item) => ({ item, ex: EXERCISE_BY_ID[item.exerciseId] }))
    .find((x) => x.ex?.compound)

  return (
    <>
      <AppBar eyebrow={name ? `Hey ${name}` : 'Today'} title={complete ? 'Session logged' : 'Up next'} />
      <div className="scroll">
        <section className="card card--pad" style={{ marginTop: 'var(--s5)' }}>
          <div className="spread" style={{ marginBottom: 'var(--s3)' }}>
            <span className="label">
              Week {week} / {activePlan.weeks}
            </span>
            {prWeek && <span className="badge badge--pr">PR week</span>}
            {complete && <span className="badge badge--done">Done</span>}
          </div>

          <h2 className="h1" style={{ marginBottom: 'var(--s2)' }}>
            {day.name}
          </h2>
          <p className="muted" style={{ marginBottom: 'var(--s4)' }}>
            {day.exercises.length} lifts · {day.durationMin} minutes ·{' '}
            {doneCount > 0 && !complete ? `${doneCount} already logged` : 'not started'}
          </p>

          {headline && (
            <div style={{ marginBottom: 'var(--s4)' }}>
              <span className="label">{headline.ex.name}</span>
              <LoadLadder
                exerciseId={headline.item.exerciseId}
                weeks={activePlan.weeks}
                currentWeek={week}
                historyByWeek={historyForExercise(state.logs, activePlan.id, headline.item.exerciseId)}
                profile={state.profile}
              />
            </div>
          )}

          <button
            className="btn btn--primary btn--block"
            onClick={() => onNavigate('session', { planId: activePlan.id, dayId: day.id })}
          >
            {complete ? 'Review the session' : doneCount > 0 ? 'Keep going' : 'Start the session'}
          </button>
        </section>

        <section className="section">
          <div className="section__head">
            <h2 className="h3">On the card</h2>
            <span className="label data">{day.durationMin} MIN</span>
          </div>
          <ul className="stack">
            {day.exercises.map((item) => {
              const ex = EXERCISE_BY_ID[item.exerciseId]
              return (
                <li key={item.exerciseId} className="exrow">
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
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}
