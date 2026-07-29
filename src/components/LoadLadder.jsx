import { ladderData } from '../lib/progression.js'

/**
 * SIGNATURE ELEMENT — the load ladder.
 *
 * One rung per week of the plan. Height encodes that week's load relative to
 * the plan's heaviest; colour encodes the week's state, using the same plate
 * coding as the rest of the app. Reading it left to right is reading your
 * progression, which is the thing this app is actually for.
 */
export default function LoadLadder({
  exerciseId,
  weeks,
  currentWeek,
  historyByWeek = [],
  profile,
  legend = false,
}) {
  const rungs = ladderData({ exerciseId, weeks, currentWeek, historyByWeek, profile })

  return (
    <div>
      <div
        className="ladder"
        role="img"
        aria-label={`Weekly load across ${weeks} weeks. Currently week ${currentWeek}.`}
      >
        {rungs.map((r) => (
          <div
            key={r.week}
            className="ladder__rung"
            data-state={r.state}
            style={{ height: `${r.heightPct}%` }}
            title={`Week ${r.week}${r.value ? ` — ${r.value} lb` : ''}${
              r.prWeek ? ' — PR eligible' : ''
            }`}
          />
        ))}
      </div>
      {legend && (
        <div className="ladder-legend">
          <span>
            <i style={{ background: 'var(--plate-green)' }} />
            Logged
          </span>
          <span>
            <i style={{ background: 'var(--plate-blue)' }} />
            This week
          </span>
          <span>
            <i style={{ background: 'var(--plate-yellow)' }} />
            PR week
          </span>
          <span>
            <i style={{ background: 'var(--line-strong)' }} />
            Ahead
          </span>
        </div>
      )}
    </div>
  )
}
