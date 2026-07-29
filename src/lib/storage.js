/**
 * Persistence. localStorage for v1.
 *
 * Everything goes through load()/save() with a namespaced, versioned key so
 * swapping in Supabase later means writing one adapter with the same two
 * functions — no component changes. Deliberately synchronous for now; the
 * async wrappers below are what a remote adapter would implement.
 */

const KEY = 'rung.state.v1'

export const emptyState = {
  onboarded: false,
  profile: {
    name: '',
    age: '',
    gender: '',
    weightLb: '',
    activityLevel: '',
    equipment: '',
    goal: '',
    units: 'lb',
  },
  plans: {}, // planId -> plan
  activePlanId: null,
  logs: {}, // logId -> { planId, dayId, exerciseId, week, sets, completedAt }
}

/* Deep clone without structuredClone — older iOS WebViews Capacitor may run on
   don't have it, and the state is plain JSON anyway. */
const clone = (o) => JSON.parse(JSON.stringify(o))

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return clone(emptyState)
    const parsed = JSON.parse(raw)
    return {
      ...clone(emptyState),
      ...parsed,
      profile: { ...emptyState.profile, ...(parsed.profile ?? {}) },
    }
  } catch {
    // Corrupt or unavailable storage shouldn't brick the app.
    return clone(emptyState)
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearAll() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to do */
  }
}

export function exportJson(state) {
  return JSON.stringify(state, null, 2)
}

export function logId({ planId, dayId, exerciseId, week }) {
  return `${planId}::${dayId}::${exerciseId}::w${week}`
}

export const uid = () => Math.random().toString(36).slice(2, 10)
