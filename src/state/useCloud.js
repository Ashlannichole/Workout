import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyState } from '../lib/storage.js'
import { supabase, syncAvailable } from '../lib/supabase.js'
import { loadSyncMeta, saveSyncMeta, supabaseRemote, syncOnce } from '../lib/sync.js'
import { publishWindow, publishWorkouts, upcomingWorkouts } from '../lib/publish.js'

const PUSH_DELAY = 1500
const POLL_EVERY = 2 * 60 * 1000
const PUBLISHED_KEY = 'rung.published.v1'

const clone = (o) => JSON.parse(JSON.stringify(o))

/** Fill in anything missing from a state that came from another device. */
function normalize(incoming) {
  return {
    ...clone(emptyState),
    ...incoming,
    profile: { ...emptyState.profile, ...(incoming.profile ?? {}) },
    schedule: { ...emptyState.schedule, ...(incoming.schedule ?? {}) },
  }
}

function lastPublished() {
  try {
    return localStorage.getItem(PUBLISHED_KEY)
  } catch {
    return null
  }
}

function rememberPublished(sig) {
  try {
    if (sig) localStorage.setItem(PUBLISHED_KEY, sig)
    else localStorage.removeItem(PUBLISHED_KEY)
  } catch {
    /* next sync will simply publish again */
  }
}

/**
 * Accounts and background sync for Rung. Everything keeps working from
 * localStorage; when signed in, changes sync shortly after they happen and
 * when the app comes back to the foreground, and upcoming workouts are shared
 * with the planner app.
 */
export function useCloud(state, dispatch) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(syncAvailable ? 'signed-out' : 'unavailable')
  const [lastSynced, setLastSynced] = useState(null)
  const [recovering, setRecovering] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const metaRef = useRef(loadSyncMeta())
  const running = useRef(false)
  const again = useRef(false)
  const remote = useRef(supabase ? supabaseRemote(supabase) : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // Arrived from a "reset your password" email: ask for the new password.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const syncNow = useCallback(async () => {
    if (!user || !remote.current) return
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    setStatus('syncing')
    try {
      const sent = stateRef.current
      const { state: incoming, meta } = await syncOnce(remote.current, user.id, sent, metaRef.current)
      metaRef.current = meta
      saveSyncMeta(meta)
      let current = stateRef.current
      if (incoming && current === sent) {
        current = normalize(incoming)
        dispatch({ type: 'state/replace', state: current })
      } else if (incoming) {
        // Edited while syncing: keep the local edits; the next round merges them in.
        again.current = true
      }

      // Share upcoming workouts with the planner, only when they changed.
      const window = publishWindow()
      const rows = upcomingWorkouts(current)
      const sig = JSON.stringify({ user: user.id, window, rows })
      if (sig !== lastPublished()) {
        await publishWorkouts(supabase, user.id, rows, window)
        rememberPublished(sig)
      }
      setLastSynced(Date.now())
      setStatus('synced')
    } catch (err) {
      setStatus(navigator.onLine === false || /fetch|network/i.test(String(err?.message)) ? 'offline' : 'error')
    } finally {
      running.current = false
      if (again.current) {
        again.current = false
        setTimeout(syncNow, 0)
      }
    }
  }, [user, dispatch])

  useEffect(() => {
    if (!supabase) return
    setStatus(user ? 'syncing' : 'signed-out')
    if (user) syncNow()
  }, [user, syncNow])

  useEffect(() => {
    if (!user) return
    const id = setTimeout(syncNow, PUSH_DELAY)
    return () => clearTimeout(id)
  }, [state, user, syncNow])

  useEffect(() => {
    if (!user) return
    const onVisible = () => document.visibilityState === 'visible' && syncNow()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', syncNow)
    const id = setInterval(() => document.visibilityState === 'visible' && syncNow(), POLL_EVERY)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', syncNow)
      clearInterval(id)
    }
  }, [user, syncNow])

  // Links in account emails (confirm your email, reset your password) come back to this same page.
  const here = () => window.location.origin + window.location.pathname

  /**
   * Create an account with an email and password. Returns 'signed-in', 'confirm-email'
   * (a confirmation email went out), or 'exists' (that email already has an account).
   */
  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: here() } })
    if (error) throw error
    if (data.session) return 'signed-in'
    if (data.user && data.user.identities?.length === 0) return 'exists'
    return 'confirm-email'
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const resendConfirmation = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: here() } })
    if (error) throw error
  }, [])

  /** Email a "reset your password" link; opening it signs in and asks for a new password. */
  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: here() })
    if (error) throw error
  }, [])

  const setPassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setRecovering(false)
  }, [])

  const forget = useCallback(() => {
    metaRef.current = null
    saveSyncMeta(null)
    rememberPublished(null)
    setLastSynced(null)
  }, [])

  /** Sign out of this device. Rung keeps everything here; it just stops syncing. */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    forget()
  }, [forget])

  /**
   * Permanently delete the account and everything stored with it, in Rung and
   * the planner (App Store requirement). This device keeps its local copy.
   */
  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_my_account')
    if (error) throw error
    await supabase.auth.signOut()
    forget()
  }, [forget])

  return {
    available: syncAvailable,
    user,
    status,
    lastSynced,
    recovering,
    cancelRecovery: () => setRecovering(false),
    signUp,
    signIn,
    resendConfirmation,
    sendPasswordReset,
    setPassword,
    signOut,
    deleteAccount,
    syncNow,
  }
}
