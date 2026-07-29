import { useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import Choice from '../components/Choice.jsx'
import { EQUIPMENT, GOALS, ACTIVITY_LEVELS } from '../data/exercises.js'

const STEPS = 4

export default function Onboarding() {
  const { dispatch } = useApp()
  const [step, setStep] = useState(0)
  const [p, setP] = useState({
    name: '',
    age: '',
    gender: '',
    weightLb: '',
    activityLevel: '',
    equipment: '',
    goal: '',
    units: 'lb',
  })

  const set = (patch) => setP((prev) => ({ ...prev, ...patch }))

  const canAdvance =
    [
      Boolean(p.name.trim()),
      Boolean(p.age && p.weightLb && p.gender),
      Boolean(p.activityLevel && p.equipment),
      Boolean(p.goal),
    ][step] ?? false

  function next() {
    if (step < STEPS - 1) setStep(step + 1)
    else dispatch({ type: 'onboard/finish', profile: p })
  }

  return (
    <div className="shell">
      <header className="appbar">
        <div>
          <span className="appbar__eyebrow">Setting up</span>
          <h1 className="appbar__title">Rung</h1>
        </div>
        <span className="appbar__action" aria-hidden="true">
          {step + 1}/{STEPS}
        </span>
      </header>

      <div className="scroll" style={{ paddingBottom: 'var(--s10)' }}>
        <div style={{ height: 'var(--s6)' }} />
        <div className="steps">
          {Array.from({ length: STEPS }, (_, i) => (
            <i key={i} data-on={i <= step} />
          ))}
        </div>

        {step === 0 && (
          <>
            <h2 className="h1">
              Every lift
              <br />
              walks up.
            </h2>
            <p className="muted" style={{ marginTop: 'var(--s3)', marginBottom: 'var(--s8)' }}>
              Answer four screens. Rung builds a plan that fits your equipment, your goal, and the
              minutes you actually have — then adds a little weight each week so you don't have to
              decide.
            </p>
            <label className="field">
              <span className="field__label">What should we call you</span>
              <input
                className="input"
                value={p.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="First name"
                autoFocus
              />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="h2" style={{ marginBottom: 'var(--s5)' }}>
              The basics
            </h2>
            <p className="muted" style={{ marginTop: '-8px', marginBottom: 'var(--s6)' }}>
              Used only to suggest a starting weight. You can override every number later.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
              <label className="field">
                <span className="field__label">Age</span>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={p.age}
                  onChange={(e) => set({ age: e.target.value })}
                  placeholder="—"
                />
              </label>
              <label className="field">
                <span className="field__label">Weight (lb)</span>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={p.weightLb}
                  onChange={(e) => set({ weightLb: e.target.value })}
                  placeholder="—"
                />
              </label>
            </div>

            <span className="field__label">Sex</span>
            <div className="choices choices--3" style={{ marginTop: 'var(--s2)' }}>
              {[
                { id: 'female', name: 'Female' },
                { id: 'male', name: 'Male' },
                { id: 'unspecified', name: 'Rather not' },
              ].map((g) => (
                <Choice
                  key={g.id}
                  title={g.name}
                  selected={p.gender === g.id}
                  onClick={() => set({ gender: g.id })}
                />
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="h2" style={{ marginBottom: 'var(--s5)' }}>
              Where you train
            </h2>

            <span className="field__label">Right now you're</span>
            <div className="choices" style={{ margin: 'var(--s2) 0 var(--s6)' }}>
              {ACTIVITY_LEVELS.map((l) => (
                <Choice
                  key={l.id}
                  title={l.name}
                  sub={l.sub}
                  selected={p.activityLevel === l.id}
                  onClick={() => set({ activityLevel: l.id })}
                />
              ))}
            </div>

            <span className="field__label">You have access to</span>
            <div className="choices" style={{ marginTop: 'var(--s2)' }}>
              {EQUIPMENT.map((e) => (
                <Choice
                  key={e.id}
                  title={e.name}
                  sub={e.sub}
                  selected={p.equipment === e.id}
                  onClick={() => set({ equipment: e.id })}
                />
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>
              What you're after
            </h2>
            <p className="muted" style={{ marginBottom: 'var(--s6)' }}>
              This sets your rep ranges and rest, not which exercises you get.
            </p>
            <div className="choices">
              {GOALS.map((g) => (
                <Choice
                  key={g.id}
                  title={g.name}
                  sub={g.sub}
                  selected={p.goal === g.id}
                  onClick={() => set({ goal: g.id })}
                />
              ))}
            </div>
          </>
        )}

        <div className="stack" style={{ marginTop: 'var(--s8)' }}>
          <button className="btn btn--primary btn--block" disabled={!canAdvance} onClick={next}>
            {step === STEPS - 1 ? 'Build my first workout' : 'Continue'}
          </button>
          {step > 0 && (
            <button className="btn btn--ghost btn--block" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
