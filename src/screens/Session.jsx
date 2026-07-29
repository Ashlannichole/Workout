import { useCallback, useMemo, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import RestTimer from '../components/RestTimer.jsx'
import LoadLadder from '../components/LoadLadder.jsx'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { isLoaded, isPrWeek, roundLoad } from '../lib/progression.js'

/**
 * The log screen. The rule here is one tap per set.
 *
 * Weight is pre-filled from the progression engine, so the common case is:
 * open, tap, tap, tap, done. Adjusting is a stepper, never a keyboard, unless
 * you deliberately tap the number.
 */
export default function Session({ planId, dayId, onNavigate }) {
  const { state, getLog, setLog, prescriptionFor } = useApp()
  const plan = state.plans[planId]
  const day = plan?.days.find((d) => d.id === dayId) ?? plan?.days[0]
  const [rest, setRest] = useState(null) // { seconds, key }

  const week = plan?.currentWeek ?? 1

  const startRest = useCallback((seconds) => {
    setRest({ seconds, key: Date.now() })
  }, [])

  if (!plan || !day) {
    return (
      <>
        <AppBar eyebrow="Session" title="Not found" />
        <div className="scroll">
          <div className="empty" style={{ marginTop: 'var(--s8)' }}>
            <p className="muted">That plan is gone. Build a new one to get going.</p>
          </div>
        </div>
      </>
    )
  }

  const doneCount = day.exercises.filter((item) => {
    const log = getLog({ planId, dayId: day.id, exerciseId: item.exerciseId, week })
    return log?.sets?.every((s) => s.done)
  }).length

  return (
    <>
      <AppBar
        eyebrow={`Week ${week} of ${plan.weeks}${isPrWeek(week) ? ' · PR week' : ''}`}
        title={day.name}
        action="Done"
        onAction={() => onNavigate('plan', { planId })}
      />
      <div className="scroll">
        <div className="spread" style={{ margin: 'var(--s5) 0 var(--s3)' }}>
          <span className="label">
            {doneCount} of {day.exercises.length} complete
          </span>
          <span className="label data">{day.durationMin} min</span>
        </div>

        <ul className="stack">
          {day.exercises.map((item) => (
            <ExerciseCard
              key={item.exerciseId}
              item={item}
              plan={plan}
              day={day}
              week={week}
              profile={state.profile}
              getLog={getLog}
              setLog={setLog}
              prescriptionFor={prescriptionFor}
              onStartRest={startRest}
            />
          ))}
        </ul>

        <button
          className="btn btn--dark btn--block"
          style={{ marginTop: 'var(--s8)' }}
          onClick={() => onNavigate('plan', { planId })}
        >
          Finish session
        </button>
      </div>

      {rest && (
        <RestTimer
          key={rest.key}
          seconds={rest.seconds}
          onDone={() => setRest(null)}
          onDismiss={() => setRest(null)}
        />
      )}
    </>
  )
}

function ExerciseCard({
  item,
  plan,
  day,
  week,
  profile,
  getLog,
  setLog,
  prescriptionFor,
  onStartRest,
}) {
  const ex = EXERCISE_BY_ID[item.exerciseId]
  const key = { planId: plan.id, dayId: day.id, exerciseId: item.exerciseId, week }
  const { history, suggestion } = useMemo(
    () => prescriptionFor(key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan.id, day.id, item.exerciseId, week, getLog(key)],
  )

  const log = getLog(key)
  const loaded = isLoaded(ex)

  // Sets are materialised lazily so an untouched exercise stores nothing.
  const sets =
    log?.sets ??
    Array.from({ length: item.sets }, () => ({
      weight: suggestion.weight ?? 0,
      reps: item.reps,
      done: false,
    }))

  const [showHistory, setShowHistory] = useState(false)
  const [prAccepted, setPrAccepted] = useState(false)

  const currentWeight = sets[0]?.weight ?? 0

  function writeSets(next) {
    setLog(key, next)
  }

  function adjust(delta) {
    const step = ex.incrementStep > 0 ? ex.incrementStep : 5
    const next = sets.map((s) =>
      s.done ? s : { ...s, weight: Math.max(0, roundLoad(s.weight + delta * step, ex)) },
    )
    writeSets(next)
  }

  function toggleSet(i) {
    const next = sets.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s))
    writeSets(next)
    if (!sets[i].done) onStartRest(item.restSec)
  }

  function takePr() {
    setPrAccepted(true)
    writeSets(sets.map((s) => (s.done ? s : { ...s, weight: suggestion.prTarget })))
  }

  const lastWeek = [...history].reverse().find((v) => v != null)
  const allDone = sets.every((s) => s.done)

  return (
    <li className="exrow">
      <div className="exrow__top">
        <div style={{ minWidth: 0 }}>
          <div className="exrow__name">{ex.name}</div>
          <div className="exrow__meta">
            {item.sets} × {item.reps} · {item.restSec}s rest
          </div>
        </div>
        <div className="exrow__load">
          {loaded ? (
            <>
              <div className="exrow__weight">{currentWeight} lb</div>
              {suggestion.delta > 0 && <div className="exrow__delta">+{suggestion.delta} on last</div>}
              {suggestion.source === 'starting' && (
                <div className="exrow__delta" style={{ color: 'var(--ink-3)' }}>
                  suggested start
                </div>
              )}
            </>
          ) : (
            <div className="exrow__weight" style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-3)' }}>
              bodyweight
            </div>
          )}
        </div>
      </div>

      {allDone && (
        <div className="row">
          <span className="badge badge--done">Logged</span>
        </div>
      )}

      {suggestion.prEligible && !prAccepted && !allDone && (
        <div
          className="spread"
          style={{
            background: 'var(--tint-yellow)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--s3)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="badge badge--pr" style={{ padding: 0, background: 'none' }}>
              PR eligible
            </div>
            <div style={{ fontSize: 'var(--t-sm)', marginTop: 2 }}>
              Four weeks in. Try {suggestion.prTarget} lb for one set if you're feeling good — or
              stay at {currentWeight}.
            </div>
          </div>
          <button className="btn btn--pr btn--sm" onClick={takePr}>
            Try it
          </button>
        </div>
      )}

      {loaded && !allDone && (
        <div className="row" style={{ gap: 'var(--s2)' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => adjust(-1)} aria-label="Lower the weight">
            −{ex.incrementStep}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => adjust(1)} aria-label="Raise the weight">
            +{ex.incrementStep}
          </button>
          <span className="muted" style={{ fontSize: 'var(--t-2xs)', marginLeft: 'auto' }}>
            {lastWeek ? `Last time ${lastWeek} lb` : 'First time on this lift'}
          </span>
        </div>
      )}

      <div className="pips">
        {sets.map((s, i) => (
          <button
            key={i}
            className="pip"
            data-done={s.done}
            onClick={() => toggleSet(i)}
            aria-pressed={s.done}
            aria-label={`Set ${i + 1}${s.done ? ', logged' : ''}`}
          >
            <span className="pip__n">SET {i + 1}</span>
            <span className="pip__v">{loaded ? `${s.weight}` : item.reps}</span>
          </button>
        ))}
      </div>

      <p className="muted" style={{ fontSize: 'var(--t-2xs)' }}>
        {ex.cue}
      </p>

      <button
        className="label"
        style={{ textAlign: 'left', letterSpacing: '0.12em' }}
        onClick={() => setShowHistory((v) => !v)}
      >
        {showHistory ? 'Hide history' : 'Show history'}
      </button>

      {showHistory && (
        <div>
          <LoadLadder
            exerciseId={item.exerciseId}
            weeks={plan.weeks}
            currentWeek={week}
            historyByWeek={history}
            profile={profile}
            legend
          />
        </div>
      )}
    </li>
  )
}
