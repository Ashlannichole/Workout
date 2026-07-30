import { useApp } from '../state/AppContext.jsx'

/**
 * A plan finishes when every one of its workouts is logged, never by
 * calendar date — so this banner is the only signal that it happened. Docks
 * above the tab bar like RestTimer, but as its own component: a rest could
 * plausibly still be counting down on the same screen a plan wraps up.
 */
export default function PlanFinishedBanner({ onNavigate }) {
  const { plans, notifyPlanFinished } = useApp()
  const plan = plans.find((p) => p.finishedAt && !p.notifiedAt)
  if (!plan) return null

  return (
    <div className="plan-banner" role="status">
      <div className="plan-banner__body">
        <div className="plan-banner__label">Plan complete</div>
        <div className="plan-banner__name">{plan.name}</div>
      </div>
      <button
        className="plan-banner__btn plan-banner__btn--primary"
        onClick={() => {
          notifyPlanFinished(plan.id)
          onNavigate('build')
        }}
      >
        New plan
      </button>
      <button className="plan-banner__btn" onClick={() => notifyPlanFinished(plan.id)}>
        Dismiss
      </button>
    </div>
  )
}
