import { useState } from 'react'
import { useApp } from '../state/AppContext.jsx'
import Choice from '../components/Choice.jsx'
import { EQUIPMENT, GOALS, ACTIVITY_LEVELS } from '../data/exercises.js'
import { WEEKDAYS } from '../lib/schedule.js'

const STEPS = 5

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((name, i) => ({ value: i + 1, name }))

export default function Onboarding() {
  const { dispatch } = useApp()
  const [step, setStep] = useState(0)
  const [p, setP] = useState({
    name: '',
    age: '',
    gender: '',
    weightLb: '',
    activityLevel: '',
    equipment: [],
    goal: '',
    units: 'lb',
    birthMonth: '',
    birthDay: '',
  })
  const [availableDays, setAvailableDays] = useState([])

  const set = (patch) => setP((prev) => ({ ...prev, ...patch }))
  const toggleDay = (id) =>
    setAvailableDays((days) => (days.includes(id) ? days.filter((d) => d !== id) : [...days, id].sort()))
  const toggleEquipment = (id) =>
    setP((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(id)
        ? prev.equipment.filter((e) => e !== id)
        : [...prev.equipment, id],
    }))

  const canAdvance =
    [
      Boolean(p.name.trim()),
      Boolean(p.age && p.weightLb && p.gender),
      Boolean(p.activityLevel && p.equipment.length > 0),
      Boolean(p.goal),
      availableDays.length > 0,
    ][step] ?? false

  function next() {
    if (step < STEPS - 1) {
      setStep(step + 1)
      return
    }
    dispatch({ type: 'onboard/finish', profile: p })
    dispatch({ type: 'schedule/update', patch: { availableDays } })
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

            <span className="field__label" style={{ marginTop: 'var(--s5)', display: 'block' }}>
              Birthday (optional)
            </span>
            <p className="muted" style={{ fontSize: 'var(--t-2xs)', margin: 'var(--s1) 0 var(--s2)' }}>
              Month and day only — no year. Lets Rung nudge your age forward as birthdays pass.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
              <select
                className="input"
                value={p.birthMonth}
                onChange={(e) => set({ birthMonth: e.target.value ? Number(e.target.value) : '' })}
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={p.birthDay}
                onChange={(e) => set({ birthDay: e.target.value ? Number(e.target.value) : '' })}
              >
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
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
            <p className="muted" style={{ fontSize: 'var(--t-2xs)', margin: 'var(--s1) 0 var(--s2)' }}>
              Pick everything that applies — Rung will draw from all of it.
            </p>
            <div className="choices" style={{ marginTop: 'var(--s2)' }}>
              {EQUIPMENT.map((e) => (
                <Choice
                  key={e.id}
                  title={e.name}
                  sub={e.sub}
                  selected={p.equipment.includes(e.id)}
                  onClick={() => toggleEquipment(e.id)}
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

        {step === 4 && (
          <>
            <h2 className="h2" style={{ marginBottom: 'var(--s2)' }}>
              Which days do you train?
            </h2>
            <p className="muted" style={{ marginBottom: 'var(--s6)' }}>
              Rung schedules your plans across these days automatically. You can change this or
              hand-edit any single day later.
            </p>
            <div className="choices choices--3">
              {WEEKDAYS.map((d) => (
                <Choice
                  key={d.id}
                  title={d.label}
                  selected={availableDays.includes(d.id)}
                  onClick={() => toggleDay(d.id)}
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
