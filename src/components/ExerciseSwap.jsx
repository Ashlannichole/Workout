import { useState } from 'react'
import Choice from './Choice.jsx'

/**
 * Expand/collapse exercise picker — mirrors Session.jsx's "Show history"
 * toggle rather than introducing a modal, since none exists in this app.
 *
 * `activeOverride`/`onRevert` are only meaningful for one-time (instance)
 * swaps; permanent (Build/Plan) callers omit them since there's nothing to
 * revert to mid-edit.
 */
export default function ExerciseSwap({ candidates, activeOverride, onPick, onRevert }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <div className="row" style={{ gap: 'var(--s3)' }}>
        <button
          className="label"
          style={{ textAlign: 'left', letterSpacing: '0.12em' }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Cancel swap' : activeOverride ? 'Swapped · change again' : 'Swap'}
        </button>
        {activeOverride && onRevert && (
          <button
            className="label"
            style={{ textAlign: 'left', letterSpacing: '0.12em', color: 'var(--ink-3)' }}
            onClick={onRevert}
          >
            Revert
          </button>
        )}
      </div>

      {open &&
        (candidates.length ? (
          <div className="choices choices--3" style={{ marginTop: 'var(--s2)' }}>
            {candidates.map((c) => (
              <Choice
                key={c.id}
                title={c.name}
                sub={c.primary.join(' · ')}
                onClick={() => {
                  onPick(c.id)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 'var(--t-2xs)', marginTop: 'var(--s2)' }}>
            No good alternative for this equipment/modality yet.
          </p>
        ))}
    </div>
  )
}
