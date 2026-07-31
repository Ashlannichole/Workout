import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { load, save, clearAll, logId, uid, emptyState } from '../lib/storage.js'
import { generateSession } from '../lib/generator.js'
import { historyForExercise, suggestWeight } from '../lib/progression.js'
import { activeWeekForPlan as computeActiveWeek, isPlanComplete, remainingSessions as computeRemaining } from '../lib/planProgress.js'
import { fillSchedule } from '../lib/schedule.js'
import { findSubstitutes, buildItemFor, overrideKey, effectiveExercises } from '../lib/substitution.js'

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
      const assignments = Object.fromEntries(
        Object.entries(state.schedule.assignments).filter(
          ([, v]) => v.planId !== action.planId,
        ),
      )
      const activePlanId =
        state.activePlanId === action.planId ? (Object.keys(plans)[0] ?? null) : state.activePlanId
      return {
        ...state,
        plans,
        logs,
        activePlanId,
        schedule: { ...state.schedule, assignments },
      }
    }

    case 'plan/activate':
      return { ...state, activePlanId: action.planId }

    case 'plan/substituteExercise': {
      const plan = state.plans[action.planId]
      if (!plan) return state
      const days = plan.days.map((d) =>
        d.id !== action.dayId
          ? d
          : {
              ...d,
              exercises: d.exercises.map((item) =>
                item.exerciseId === action.originalExerciseId
                  ? buildItemFor(action.newExerciseId, plan.goal)
                  : item,
              ),
            },
      )
      return { ...state, plans: { ...state.plans, [action.planId]: { ...plan, days } } }
    }

    case 'overrides/set': {
      const key = overrideKey(action.planId, action.dayId, action.week)
      const existing = state.overrides[key] ?? {}
      return {
        ...state,
        overrides: {
          ...state.overrides,
          [key]: { ...existing, [action.originalExerciseId]: action.newExerciseId },
        },
      }
    }

    case 'overrides/clear': {
      const key = overrideKey(action.planId, action.dayId, action.week)
      const existing = { ...(state.overrides[key] ?? {}) }
      delete existing[action.originalExerciseId]
      const overrides = { ...state.overrides }
      if (Object.keys(existing).length) overrides[key] = existing
      else delete overrides[key]
      return { ...state, overrides }
    }

    case 'schedule/update': {
      const schedule = { ...state.schedule }
      if (action.patch.removeDates?.length) {
        const assignments = { ...schedule.assignments }
        for (const key of action.patch.removeDates) delete assignments[key]
        schedule.assignments = assignments
      }
      if (action.patch.assignments) {
        schedule.assignments = { ...schedule.assignments, ...action.patch.assignments }
      }
      if (action.patch.availableDays) {
        schedule.availableDays = action.patch.availableDays
      }
      return { ...state, schedule }
    }

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

  // A plan is "finished" once every one of its workouts has been logged —
  // never by calendar date. Stamp finishedAt once, so the completion prompt
  // fires exactly once per plan instead of every render.
  useEffect(() => {
    for (const plan of Object.values(state.plans)) {
      if (!plan.finishedAt && isPlanComplete(plan, state.logs)) {
        dispatch({ type: 'plan/update', planId: plan.id, patch: { finishedAt: new Date().toISOString() } })
      }
    }
  }, [state.plans, state.logs])

  const api = useMemo(() => {
    const plans = Object.values(state.plans).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )
    const activePlan = state.activePlanId ? (state.plans[state.activePlanId] ?? null) : null

    /** Build a plan from a session spec and persist it. */
    function createPlan({ name, weeks, goal, equipment, modality, days, frequency = 1 }) {
      const plan = {
        id: uid(),
        name,
        weeks,
        goal,
        equipment,
        modality,
        days,
        frequency,
        currentWeek: 1,
        finishedAt: null,
        notifiedAt: null,
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

    /** The week actually being trained, derived from logged completion. */
    function activeWeekForPlan(planId) {
      const plan = state.plans[planId]
      return plan ? computeActiveWeek(plan, state.logs) : 1
    }

    function remainingSessions(planId) {
      const plan = state.plans[planId]
      return plan ? computeRemaining(plan, state.logs) : 0
    }

    /** Fill the schedule's rolling window without clobbering existing days. */
    function ensureSchedule(horizonDays = 14) {
      const delta = fillSchedule({ plans, logs: state.logs, schedule: state.schedule, horizonDays })
      if (Object.keys(delta).length) {
        dispatch({ type: 'schedule/update', patch: { assignments: delta } })
      }
    }

    function setAvailability(days) {
      dispatch({ type: 'schedule/update', patch: { availableDays: days } })
    }

    /** Manually assign (or clear/rest) a specific calendar day. */
    function assignDay(dateKeyStr, value) {
      const entry = value?.rest ? { rest: true, manual: true } : { ...value, manual: true }
      dispatch({ type: 'schedule/update', patch: { assignments: { [dateKeyStr]: entry } } })
    }

    function notifyPlanFinished(planId) {
      dispatch({ type: 'plan/update', planId, patch: { notifiedAt: new Date().toISOString() } })
    }

    /** Permanent: edits the day-template itself, affects every future week. */
    function substituteExercisePermanent(planId, dayId, originalExerciseId, newExerciseId) {
      dispatch({ type: 'plan/substituteExercise', planId, dayId, originalExerciseId, newExerciseId })
    }

    /** One-time: only this exact (plan, day-template, week) instance. */
    function substituteExerciseInstance(planId, dayId, week, originalExerciseId, newExerciseId) {
      dispatch({ type: 'overrides/set', planId, dayId, week, originalExerciseId, newExerciseId })
    }

    function revertExerciseInstance(planId, dayId, week, originalExerciseId) {
      dispatch({ type: 'overrides/clear', planId, dayId, week, originalExerciseId })
    }

    function exercisesForInstance(plan, day, week) {
      return effectiveExercises(day, state.overrides, plan.id, week, plan.goal)
    }

    function substituteCandidates(originalExerciseId, plan, excludeExerciseIds = []) {
      return findSubstitutes({
        originalExerciseId,
        equipment: plan.equipment,
        activityLevel: state.profile.activityLevel,
        excludeExerciseIds,
      })
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
      activeWeekForPlan,
      remainingSessions,
      ensureSchedule,
      setAvailability,
      assignDay,
      notifyPlanFinished,
      substituteExercisePermanent,
      substituteExerciseInstance,
      revertExerciseInstance,
      exercisesForInstance,
      substituteCandidates,
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
