import { useMemo } from 'react'
import { useApp } from '../state/AppContext.jsx'
import AppBar from '../components/AppBar.jsx'
import { EXERCISE_BY_ID } from '../data/exercises.js'

export default function History({ onNavigate }) {
  const { state } = useApp()

  const entries = useMemo(
    () =>
      Object.values(state.logs)
        .filter((l) => l.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    [state.logs],
  )

  const totals = useMemo(() => {
    let volume = 0
    let setCount = 0
    for (const e of entries) {
      for (const s of e.sets ?? []) {
        if (!s.done) continue
        setCount += 1
        const reps = parseInt(String(s.reps), 10)
        if (s.weight > 0 && Number.isFinite(reps)) volume += s.weight * reps
      }
    }
    return { volume, setCount, lifts: new Set(entries.map((e) => e.exerciseId)).size }
  }, [entries])

  return (
    <>
      <AppBar
        eyebrow="Everything logged"
        title="History"
        action="Done"
        onAction={() => onNavigate('settings')}
      />
      <div className="scroll">
        {entries.length === 0 ? (
          <div className="empty" style={{ marginTop: 'var(--s10)' }}>
            <p className="muted" style={{ marginBottom: 'var(--s5)' }}>
              Log a set and it shows up here, along with what you lifted and when.
            </p>
            <button className="btn btn--primary" onClick={() => onNavigate('today')}>
              Go to today
            </button>
          </div>
        ) : (
          <>
            <section
              className="card card--pad"
              style={{
                marginTop: 'var(--s5)',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--s3)',
              }}
            >
              <Stat label="Sets" value={totals.setCount} />
              <Stat label="Lifts" value={totals.lifts} />
              <Stat label="Volume" value={`${Math.round(totals.volume / 1000)}k`} unit="lb" />
            </section>

            <section className="section">
              <h2 className="h3" style={{ marginBottom: 'var(--s3)' }}>
                Recent
              </h2>
              <ul className="stack">
                {entries.slice(0, 40).map((e) => {
                  const ex = EXERCISE_BY_ID[e.exerciseId]
                  const done = (e.sets ?? []).filter((s) => s.done)
                  const top = done.reduce((m, s) => Math.max(m, s.weight || 0), 0)
                  return (
                    <li key={`${e.exerciseId}-${e.week}-${e.completedAt}`} className="exrow">
                      <div className="exrow__top">
                        <div>
                          <div className="exrow__name">{ex?.name ?? e.exerciseId}</div>
                          <div className="exrow__meta">
                            Week {e.week} ·{' '}
                            {new Date(e.completedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                        <div className="exrow__load">
                          <div className="exrow__weight">{top > 0 ? `${top} lb` : '—'}</div>
                          <div className="exrow__delta" style={{ color: 'var(--ink-3)' }}>
                            {done.length} sets
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  )
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div
        className="data"
        style={{ fontSize: 'var(--t-xl)', fontWeight: 700, lineHeight: 1 }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 'var(--t-2xs)', color: 'var(--ink-3)', marginLeft: 3 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
