import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import Choice from '../components/Choice.jsx'
import {
  MUSCLE_GROUPS,
  MODALITIES,
  GOALS,
  EQUIPMENT,
  PLAN_LENGTHS,
  EXERCISE_BY_ID,
} from '../data/exercises.js'
import { estimateMinutes } from '../lib/generator.js'
import { uid } from '../lib/storage.js'

const DURATIONS = [20, 30, 45, 60, 75, 90]

export default function Build({ onNavigate }) {
  const { state, buildDay, createPlan } = useApp()
  const { profile } = state

  const [equipment, setEquipment] = useState(profile.equipment || 'gym')
  const [goal, setGoal] = useState(profile.goal || 'general')
  const [modality, setModality] = useState('weightlifting')
  const [groups, setGroups] = useState(['chest', 'back'])
  const [duration, setDuration] = useState(45)
  const [weeks, setWeeks] = useState(8)
  const [seed, setSeed] = useState(() => Date.now())
  const [preview, setPreview] = useState(null)

  const toggleGroup = (id) =>
    setGroups((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]))

  function generate(nextSeed = Date.now()) {
    setSeed(nextSeed)
    setPreview(
      buildDay({
        muscleGroups: groups.length ? groups : ['full_body'],
        durationMin: duration,
        goal,
        equipment,
        modality,
        seed: nextSeed,
      }),
    )
  }

  const previewMinutes = useMemo(
    () => (preview ? estimateMinutes(preview.exercises, goal) : 0),
    [preview, goal],
  )

  function savePlan() {
    if (!preview?.exercises.length) return
    const groupNames = groups
      .map((g) => MUSCLE_GROUPS.find((m) => m.id === g)?.name)
      .filter(Boolean)
      .join(' + ')
    const plan = createPlan({
      name: groupNames || 'Full body',
      weeks,
      goal,
      equipment,
      modality,
      days: [
        {
          id: uid(),
          name: groupNames || 'Full body',
          muscleGroups: groups,
          durationMin: duration,
          exercises: preview.exercises,
        },
      ],
    })
    onNavigate('plan', { planId: plan.id })
  }

  return (
    <>
      <AppBar eyebrow="New session" title="Build" />
      <div className="scroll">
        <section className="section" style={{ marginTop: 'var(--s5)' }}>
          <span className="field__label">Equipment</span>
          <div className="choices choices--3" style={{ marginTop: 'var(--s2)' }}>
            {EQUIPMENT.map((e) => (
              <Choice
                key={e.id}
                title={e.name}
                selected={equipment === e.id}
                onClick={() => setEquipment(e.id)}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <span className="field__label">Modality</span>
          <div className="choices choices--2" style={{ marginTop: 'var(--s2)' }}>
            {MODALITIES.map((m) => (
              <Choice
                key={m.id}
                title={m.name}
                sub={m.sub}
                selected={modality === m.id}
                onClick={() => setModality(m.id)}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <span className="field__label">Goal</span>
          <div className="choices choices--2" style={{ marginTop: 'var(--s2)' }}>
            {GOALS.map((g) => (
              <Choice key={g.id} title={g.name} selected={goal === g.id} onClick={() => setGoal(g.id)} />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <span className="field__label">Target muscles</span>
            <span className="label">{groups.length} selected</span>
          </div>
          <div className="choices choices--3">
            {MUSCLE_GROUPS.map((m) => (
              <Choice
                key={m.id}
                title={m.name}
                selected={groups.includes(m.id)}
                onClick={() => toggleGroup(m.id)}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <span className="field__label">Time you have</span>
          <div className="choices choices--3" style={{ marginTop: 'var(--s2)' }}>
            {DURATIONS.map((d) => (
              <Choice
                key={d}
                title={`${d} min`}
                selected={duration === d}
                onClick={() => setDuration(d)}
              />
            ))}
          </div>
        </section>

        <section className="section">
          <span className="field__label">Plan length</span>
          <div className="choices choices--3" style={{ marginTop: 'var(--s2)' }}>
            {PLAN_LENGTHS.map((w) => (
              <Choice
                key={w}
                title={`${w} weeks`}
                sub={`PR at ${Array.from({ length: Math.floor(w / 4) }, (_, i) => (i + 1) * 4).join(', ')}`}
                selected={weeks === w}
                onClick={() => setWeeks(w)}
              />
            ))}
          </div>
        </section>

        <div style={{ marginTop: 'var(--s8)' }}>
          <button className="btn btn--dark btn--block" onClick={() => generate()}>
            {preview ? 'Rebuild session' : 'Build session'}
          </button>
        </div>

        {preview && (
          <section className="section">
            <div className="section__head">
              <h2 className="h2">The session</h2>
              <span className="label data">
                ~{previewMinutes} min · {preview.exercises.length} lifts
              </span>
            </div>

            {preview.notes.map((n, i) => (
              <p key={i} className="muted" style={{ marginBottom: 'var(--s3)' }}>
                {n}
              </p>
            ))}

            {preview.exercises.length === 0 ? (
              <div className="empty">
                <p className="muted">
                  Nothing in the library matches that combination. Widen the muscle groups or add
                  time.
                </p>
              </div>
            ) : (
              <ul className="stack">
                {preview.exercises.map((item, i) => {
                  const ex = EXERCISE_BY_ID[item.exerciseId]
                  return (
                    <li key={item.exerciseId} className="exrow">
                      <div className="exrow__top">
                        <div>
                          <div className="exrow__name">{ex.name}</div>
                          <div className="exrow__meta">
                            {ex.primary.join(' · ')} {ex.compound ? '· compound' : ''}
                          </div>
                        </div>
                        <div className="exrow__load">
                          <div className="exrow__weight">
                            {item.sets}×{item.reps}
                          </div>
                          <div className="exrow__delta" style={{ color: 'var(--ink-3)' }}>
                            {item.restSec}s rest
                          </div>
                        </div>
                      </div>
                      <p className="muted" style={{ fontSize: 'var(--t-2xs)' }}>
                        {ex.cue}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="stack" style={{ marginTop: 'var(--s5)' }}>
              <button
                className="btn btn--primary btn--block"
                disabled={!preview.exercises.length}
                onClick={savePlan}
              >
                Start a {weeks}-week plan with this
              </button>
              <button className="btn btn--ghost btn--block" onClick={() => generate(seed + 1)}>
                Give me a different one
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
