import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import Choice from '../components/Choice.jsx'
import ExerciseSwap from '../components/ExerciseSwap.jsx'
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
import { findSubstitutes, buildItemFor } from '../lib/substitution.js'

const DURATIONS = [20, 30, 45, 60, 75, 90]
const FREQUENCIES = [2, 3, 4, 5]

/** Sensible sessions/week starting point per modality/goal — always editable. */
function defaultFrequency(modality, goal) {
  if (modality === 'pilates' || modality === 'calisthenics') return 2
  if (goal === 'tone') return 3
  return 3
}

/** Round-robin split of the selected muscle groups across N day-templates,
    so a multi-session/week plan gets distinct sessions instead of the same
    one repeated (which would also collide under the log-identity scheme). */
function splitGroups(groups, count) {
  const base = groups.length ? groups : ['full_body']
  if (count <= 1) return [base]
  const buckets = Array.from({ length: count }, () => [])
  base.forEach((g, i) => buckets[i % count].push(g))
  return buckets.map((b) => (b.length ? b : base))
}

function nameFor(groupIds, index) {
  const names = groupIds
    .map((g) => MUSCLE_GROUPS.find((m) => m.id === g)?.name)
    .filter(Boolean)
    .join(' + ')
  return names || `Day ${index + 1}`
}

export default function Build({ onNavigate }) {
  const { state, buildDay, createPlan } = useApp()
  const { profile } = state

  const [equipment, setEquipment] = useState(() =>
    Array.isArray(profile.equipment)
      ? profile.equipment
      : profile.equipment
        ? [profile.equipment]
        : ['gym'],
  )
  const [goal, setGoal] = useState(profile.goal || 'general')
  const [modality, setModality] = useState('weightlifting')
  const [groups, setGroups] = useState(['chest', 'back'])
  const [duration, setDuration] = useState(45)
  const [weeks, setWeeks] = useState(8)
  const [frequency, setFrequency] = useState(() => defaultFrequency('weightlifting', 'general'))
  const [frequencyTouched, setFrequencyTouched] = useState(false)
  const [baseSeed, setBaseSeed] = useState(() => Date.now())
  const [previews, setPreviews] = useState(null) // array, one per day-template

  // Re-suggest a frequency when modality/goal change, unless the user has
  // deliberately picked one already.
  useEffect(() => {
    if (!frequencyTouched) setFrequency(defaultFrequency(modality, goal))
  }, [modality, goal, frequencyTouched])

  const toggleGroup = (id) =>
    setGroups((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]))
  const toggleEquipment = (id) =>
    setEquipment((eq) => (eq.includes(id) ? eq.filter((x) => x !== id) : [...eq, id]))

  function generate(nextBaseSeed = Date.now()) {
    setBaseSeed(nextBaseSeed)
    const buckets = splitGroups(groups, frequency)
    setPreviews(
      buckets.map((bucket, i) =>
        buildDay({
          muscleGroups: bucket,
          durationMin: duration,
          goal,
          equipment,
          modality,
          seed: nextBaseSeed + i,
        }),
      ),
    )
  }

  function regenerateOne(i) {
    setPreviews((prev) => {
      const bucket = prev[i].muscleGroups
      const next = [...prev]
      next[i] = buildDay({
        muscleGroups: bucket,
        durationMin: duration,
        goal,
        equipment,
        modality,
        seed: Date.now(),
      })
      return next
    })
  }

  function substituteInPreview(previewIdx, originalExerciseId, newExerciseId) {
    setPreviews((prev) => {
      const next = [...prev]
      const p = next[previewIdx]
      next[previewIdx] = {
        ...p,
        exercises: p.exercises.map((item) =>
          item.exerciseId === originalExerciseId ? buildItemFor(newExerciseId, goal) : item,
        ),
      }
      return next
    })
  }

  const totalExercises = useMemo(
    () => (previews ? previews.reduce((sum, p) => sum + p.exercises.length, 0) : 0),
    [previews],
  )
  const hasAnyExercises = previews?.some((p) => p.exercises.length > 0)

  function savePlan() {
    if (!hasAnyExercises) return
    const days = previews.map((p, i) => ({
      id: uid(),
      name: nameFor(p.muscleGroups, i),
      muscleGroups: p.muscleGroups,
      durationMin: duration,
      exercises: p.exercises,
    }))
    const plan = createPlan({
      name: nameFor(groups, 0),
      weeks,
      goal,
      equipment,
      modality,
      days,
      frequency,
    })
    onNavigate('plan', { planId: plan.id })
  }

  return (
    <>
      <AppBar eyebrow="New plan" title="Build" />
      <div className="scroll">
        <section className="section" style={{ marginTop: 'var(--s5)' }}>
          <span className="field__label">Equipment</span>
          <div className="choices choices--3" style={{ marginTop: 'var(--s2)' }}>
            {EQUIPMENT.map((e) => (
              <Choice
                key={e.id}
                title={e.name}
                selected={equipment.includes(e.id)}
                onClick={() => toggleEquipment(e.id)}
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
          <span className="field__label">Sessions per week</span>
          <div className="choices choices--3" style={{ marginTop: 'var(--s2)' }}>
            {FREQUENCIES.map((f) => (
              <Choice
                key={f}
                title={`${f}x`}
                selected={frequency === f}
                onClick={() => {
                  setFrequencyTouched(true)
                  setFrequency(f)
                }}
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
            {previews ? 'Rebuild plan' : 'Build plan'}
          </button>
        </div>

        {previews && (
          <section className="section">
            <div className="section__head">
              <h2 className="h2">The plan</h2>
              <span className="label data">
                {frequency}x/week · {totalExercises} lifts total
              </span>
            </div>

            {!hasAnyExercises && (
              <div className="empty">
                <p className="muted">
                  Nothing in the library matches that combination. Widen the muscle groups or add
                  time.
                </p>
              </div>
            )}

            <div className="stack" style={{ gap: 'var(--s5)' }}>
              {previews.map((preview, i) => {
                const minutes = estimateMinutes(preview.exercises, goal)
                return (
                  <div key={i} className="card card--pad">
                    <div className="spread" style={{ marginBottom: 'var(--s2)' }}>
                      <span className="label">{nameFor(preview.muscleGroups, i)}</span>
                      <span className="label data">
                        ~{minutes} min · {preview.exercises.length} lifts
                      </span>
                    </div>

                    {preview.notes.map((n, ni) => (
                      <p key={ni} className="muted" style={{ fontSize: 'var(--t-2xs)', marginBottom: 'var(--s2)' }}>
                        {n}
                      </p>
                    ))}

                    <ul className="stack">
                      {preview.exercises.map((item) => {
                        const ex = EXERCISE_BY_ID[item.exerciseId]
                        const otherIds = preview.exercises
                          .filter((x) => x.exerciseId !== item.exerciseId)
                          .map((x) => x.exerciseId)
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
                            <ExerciseSwap
                              candidates={findSubstitutes({
                                originalExerciseId: item.exerciseId,
                                equipment,
                                activityLevel: profile.activityLevel,
                                excludeExerciseIds: otherIds,
                              })}
                              onPick={(newId) => substituteInPreview(i, item.exerciseId, newId)}
                            />
                          </li>
                        )
                      })}
                    </ul>

                    <button
                      className="btn btn--ghost btn--sm"
                      style={{ marginTop: 'var(--s3)' }}
                      onClick={() => regenerateOne(i)}
                    >
                      Give me a different one
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="stack" style={{ marginTop: 'var(--s5)' }}>
              <button
                className="btn btn--primary btn--block"
                disabled={!hasAnyExercises}
                onClick={savePlan}
              >
                Start a {weeks}-week plan with this
              </button>
              <button className="btn btn--ghost btn--block" onClick={() => generate(baseSeed + 1)}>
                Regenerate everything
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
