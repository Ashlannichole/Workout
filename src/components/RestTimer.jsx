import { useEffect, useRef, useState } from 'react'

/**
 * Rest timer. Docks above the tab bar and never takes over the screen — the
 * whole reason it exists is so you don't have to leave the log to time a rest.
 */
export default function RestTimer({ seconds, onDone, onDismiss }) {
  const [left, setLeft] = useState(seconds)
  const total = useRef(seconds)

  useEffect(() => {
    setLeft(seconds)
    total.current = seconds
  }, [seconds])

  // onDone is usually an inline arrow, so a new identity every parent render.
  // Holding it in a ref keeps the interval from restarting each time the user
  // logs a set, which would otherwise stall the countdown.
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (left <= 0) {
      doneRef.current?.()
      return
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const clamped = Math.max(0, left)
  const mm = String(Math.floor(clamped / 60)).padStart(2, '0')
  const ss = String(clamped % 60).padStart(2, '0')
  const pct = total.current > 0 ? (clamped / total.current) * 100 : 0

  return (
    <div className="rest" role="timer">
      <div className="rest__clock">
        {mm}:{ss}
      </div>
      <div className="rest__body">
        <div className="rest__label">Resting</div>
        <div className="rest__track">
          <div className="rest__fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button className="rest__btn" onClick={() => setLeft((s) => s + 30)}>
        +30s
      </button>
      <button className="rest__btn" onClick={onDismiss}>
        Skip
      </button>
    </div>
  )
}
