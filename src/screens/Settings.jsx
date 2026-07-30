import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import Choice from '../components/Choice.jsx'
import { WEEKDAYS, dateKey } from '../lib/schedule.js'

export default function Settings({ onNavigate }) {
  const { state, dispatch, resetAll, ensureSchedule } = useApp()
  const availableDays = state.schedule.availableDays

  function toggleDay(id) {
    const days = availableDays.includes(id)
      ? availableDays.filter((d) => d !== id)
      : [...availableDays, id].sort()

    // Auto-filled future days need to adapt to the new availability; a day
    // the user has hand-edited stays put either way.
    const todayKey = dateKey(new Date())
    const removeDates = Object.entries(state.schedule.assignments)
      .filter(([key, a]) => key >= todayKey && !a.manual)
      .map(([key]) => key)

    dispatch({ type: 'schedule/update', patch: { availableDays: days, removeDates } })
    ensureSchedule()
  }

  return (
    <>
      <AppBar eyebrow="Rung" title="Settings" action="Done" onAction={() => onNavigate('today')} />
      <div className="scroll">
        <section className="section" style={{ marginTop: 'var(--s5)' }}>
          <span className="field__label">Which days do you train?</span>
          <p className="muted" style={{ fontSize: 'var(--t-2xs)', margin: 'var(--s1) 0 var(--s2)' }}>
            Rung schedules your plans across these days automatically — you can still hand-edit any
            single day from Calendar.
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
        </section>

        <section className="section">
          <button className="btn btn--ghost btn--block" onClick={() => onNavigate('history')}>
            View history
          </button>
        </section>

        <section className="section">
          <button
            className="btn btn--ghost btn--block"
            onClick={() => {
              if (confirm('Erase your profile, plans, and every logged set?')) resetAll()
            }}
          >
            Erase all data
          </button>
          <p className="muted" style={{ fontSize: 'var(--t-2xs)', marginTop: 'var(--s2)' }}>
            Everything is stored on this device only. Nothing is uploaded.
          </p>
        </section>
      </div>
    </>
  )
}
