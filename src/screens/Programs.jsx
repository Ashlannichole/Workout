import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import LoadLadder from '../components/LoadLadder.jsx'
import { PROGRAMS } from '../data/programs.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'

/**
 * Browse curated programs, preview one, start it. Starting a program runs
 * the exact same generator Build.jsx uses — personalized to the user's own
 * equipment — so what's previewed here is what you actually get, not a fixed
 * script.
 */
export default function Programs({ onNavigate }) {
  const { state, buildDay, startProgram } = useApp()
  const [selectedId, setSelectedId] = useState(null)
  const program = PROGRAMS.find((p) => p.id === selectedId) ?? null

  // A day-1 preview, not persisted — same idea as Build.jsx's own
  // preview-before-save step. Seeded off the program id (not Date.now())
  // so it doesn't reshuffle every render while this screen is open.
  const preview = useMemo(() => {
    if (!program) return null
    const firstDay = program.split[0]
    return buildDay({
      muscleGroups: firstDay.muscleGroups,
      durationMin: program.durationMin,
      goal: program.goal,
      equipment: state.profile.equipment,
      modality: program.modality,
      seed: program.id.length,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id, state.profile.equipment])

  function start() {
    const plan = startProgram(program)
    onNavigate('plan', { planId: plan.id })
  }

  if (program) {
    const previewExercises = preview?.exercises ?? []
    const ladderExerciseId =
      previewExercises.find((item) => EXERCISE_BY_ID[item.exerciseId]?.compound)?.exerciseId ??
      previewExercises[0]?.exerciseId

    return (
      <>
        <AppBar eyebrow="Programs" title={program.name} action="Back" onAction={() => setSelectedId(null)} />
        <div className="scroll">
          <section className="section" style={{ marginTop: 'var(--s5)' }}>
            <p className="muted" style={{ marginBottom: 'var(--s3)' }}>{program.tagline}</p>
            <span className="label">
              {program.weeks} weeks · {program.frequency}x/week · {program.durationMin} min
            </span>
          </section>

          {ladderExerciseId && (
            <section className="section">
              <div className="section__head">
                <h2 className="h3">Projected progression</h2>
                <span className="label">{EXERCISE_BY_ID[ladderExerciseId]?.name}</span>
              </div>
              <p className="muted" style={{ fontSize: 'var(--t-2xs)', marginBottom: 'var(--s3)' }}>
                Based on your profile — the real numbers adjust once you start logging.
              </p>
              <LoadLadder
                exerciseId={ladderExerciseId}
                weeks={program.weeks}
                currentWeek={0}
                historyByWeek={[]}
                profile={state.profile}
                legend
              />
            </section>
          )}

          <section className="section">
            <div className="section__head">
              <h2 className="h3">What day 1 looks like</h2>
              <span className="label">{program.split[0].name}</span>
            </div>
            <ul className="stack">
              {previewExercises.map((item) => {
                const ex = EXERCISE_BY_ID[item.exerciseId]
                return (
                  <li key={item.exerciseId} className="exrow">
                    <div className="exrow__top">
                      <div style={{ minWidth: 0 }}>
                        <div className="exrow__name">{ex.name}</div>
                        <div className="exrow__meta">
                          {item.sets} × {item.reps}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="section">
            <button className="btn btn--primary btn--block" onClick={start}>
              Start this program
            </button>
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      <AppBar eyebrow="Programs" title="Browse programs" action="Done" onAction={() => onNavigate('today')} />
      <div className="scroll">
        <section className="section" style={{ marginTop: 'var(--s5)' }}>
          <p className="muted" style={{ marginBottom: 'var(--s4)' }}>
            A curated split, built from your own equipment and profile — same engine as Build, with
            the structure already chosen.
          </p>
          <div className="stack">
            {PROGRAMS.map((p) => (
              <button key={p.id} className="choice" onClick={() => setSelectedId(p.id)}>
                <span className="choice__t">{p.name}</span>
                <span className="choice__s">
                  {p.weeks} weeks · {p.frequency}x/week · {p.tagline}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
