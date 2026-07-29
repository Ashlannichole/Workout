import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { load, save, clearAll, logId, uid, emptyState } from '../lib/storage.js'
import { generateSession } from '../lib/generator.js'
import { historyForExercise, suggestWeight } from '../lib/progression.js'

const AppCtx = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'profile/set':
      return { ...state, profile: { ...state.profile, ...action.patch } }

    case 'onboard/finish':
      return { ...state, onboarded: true, profile: { ...state.profile, ...action.profile } }

    case 'plan/create': {
      const plan = action.plan
      return {
        ...state,
        plans: { ...state.plans, [plan.id]: plan },
        activePlanId: plan.id,
      }
    }

    case 'plan/update': {
      const existing = state.plans[action.planId]
      if (!existing) return state
      return {
        ...state,
        plans: { ...state.plans, [action.planId]: { ...existing, ...action.patch } },
      }
    }

    case 'plan/delete': {
      const plans = { ...state.plans }
      delete plans[action.planId]
      const logs = Object.fromEntries(
        Object.entries(state.logs).filter(([, v]) => v.planId !== action.planId),
      )
      const activePlanId =
        state.activePlanId === action.planId ? (Object.keys(plans)[0] ?? null) : state.activePlanId
      return { ...state, plans, logs, activePlanId }
    }

    case 'plan/activate':
      return { ...state, activePlanId: action.planId }

    case 'log/set': {
      const id = logId(action.key)
      const prev = state.logs[id]
      return {
        ...state,
        logs: {
          ...state.logs,
          [id]: {
            ...action.key,
            sets: action.sets,
            completedAt: action.sets.some((s) => s.done)
              ? (prev?.completedAt ?? new Date().toISOString())
              : null,
            updatedAt: new Date().toISOString(),
          },
        },
      }
    }

    case 'state/reset':
      return JSON.parse(JSON.stringify(emptyState))

    case 'state/replace':
      return action.state

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    save(state)
  }, [state])

  const api = useMemo(() => {
    const plans = Object.values(state.plans).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
    const activePlan = state.activePlanId ? (state.plans[state.activePlanId] ?? null) : null

    /** Build a plan from a session spec and persist it. */
    function createPlan({ name, weeks, goal, equipment, modality, days }) {
      const plan = {
        id: uid(),
        name,
        weeks,
        goal,
        equipment,
        modality,
        days,
        currentWeek: 1,
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'plan/create', plan })
      return plan
    }

    /** Generate one day's exercise list without persisting anything. */
    function buildDay({ muscleGroups, durationMin, goal, equipment, modality, seed }) {
      const result = generateSession({
        equipment,
        modality,
        goal,
        muscleGroups,
        durationMin,
        activityLevel: state.profile.activityLevel,
        seed,
      })
      return { ...result, muscleGroups, durationMin }
    }

    function getLog(key) {
      return state.logs[logId(key)] ?? null
    }

    function setLog(key, sets) {
      dispatch({ type: 'log/set', key, sets })
    }

    /** Everything the log screen needs for one exercise in one week. */
    function prescriptionFor({ planId, dayId, exerciseId, week }) {
      const history = historyForExercise(state.logs, planId, exerciseId)
      const suggestion = suggestWeight({
        exerciseId,
        week,
        historyByWeek: history,
        profile: state.profile,
      })
      return { history, suggestion }
    }

    function setWeek(planId, week) {
      dispatch({ type: 'plan/update', planId, patch: { currentWeek: week } })
    }

    return {
      state,
      dispatch,
      plans,
      activePlan,
      createPlan,
      buildDay,
      getLog,
      setLog,
      prescriptionFor,
      setWeek,
      resetAll: () => {
        clearAll()
        dispatch({ type: 'state/reset' })
      },
    }
  }, [state])

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>
}

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
