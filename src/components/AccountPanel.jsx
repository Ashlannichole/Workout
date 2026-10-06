import { useState } from 'react'
import { authMessage, MIN_PASSWORD, passwordProblem } from '../lib/authMessages.js'
import { useApp } from '../state/AppContext.jsx'

const STATUS = {
  syncing: 'Syncing…',
  synced: 'All synced',
  offline: 'Offline. Everything is saved here and syncs when you’re back online.',
  error: 'Couldn’t sync just now. Your data is safe here; it will try again.',
}

const small = { fontSize: 'var(--t-2xs)', margin: 'var(--s1) 0 var(--s3)' }
const errorStyle = { ...small, color: 'var(--plate-red)' }

/** A password field with a show/hide toggle. */
function PasswordField({ label = 'Password', value, onChange, autoComplete, placeholder }) {
  const [shown, setShown] = useState(false)
  return (
    <label className="field">
      <span className="field__label" style={{ display: 'flex', justifyContent: 'space-between' }}>
        {label}
        <button type="button" className="btn btn--ghost" style={{ padding: 0, minHeight: 0, fontSize: 'var(--t-2xs)' }} onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </span>
      <input
        className="input"
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

/**
 * Choose a new password: after opening a "reset your password" email, or from Settings.
 */
export function NewPasswordForm({ onDone, onCancel }) {
  const { cloud } = useApp()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const problem = password ? passwordProblem(password) : null

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError('')
        try {
          await cloud.setPassword(password)
          onDone?.()
        } catch (err) {
          setError(authMessage(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      {cloud.user?.email && (
        <p className="muted" style={small}>
          For <b>{cloud.user.email}</b>
        </p>
      )}
      <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" placeholder={`${MIN_PASSWORD}+ characters`} />
      {problem && <p className="muted" style={small}>{problem}</p>}
      {error && <p style={errorStyle}>{error}</p>}
      <button className="btn btn--primary btn--block" style={{ marginTop: 'var(--s3)' }} type="submit" disabled={busy || !!passwordProblem(password)}>
        {busy ? 'Saving…' : 'Save password'}
      </button>
      {onCancel && (
        <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s2)' }} onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  )
}

/**
 * Create an account or sign in with an email and password, reset a forgotten password,
 * see sync status, change the password, sign out, or delete the account. The same account
 * works in the planner app.
 */
export default function AccountPanel({ compact = false, initialMode = 'signin' }) {
  const { cloud } = useApp()
  const [mode, setModeState] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  if (!cloud.available) {
    return compact ? null : (
      <p className="muted" style={small}>
        Accounts aren’t switched on for this copy of Rung yet, so everything stays on this device.
      </p>
    )
  }

  const setMode = (next) => {
    setModeState(next)
    setError('')
    setNotice('')
  }

  const run = async (fn) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await fn()
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (cloud.user) {
    return (
      <div>
        <p style={{ margin: 0 }}>
          Signed in as <b>{cloud.user.email}</b>
        </p>
        <p className="muted" style={small}>
          {(STATUS[cloud.status] || '').replace(/\.$/, '')}
          {cloud.status === 'synced' && cloud.lastSynced
            ? ` · ${new Date(cloud.lastSynced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : ''}
          . Your workouts also show up in the planner app when you use the same account there.
        </p>
        {changingPassword ? (
          <NewPasswordForm
            onDone={() => {
              setChangingPassword(false)
              setNotice('Password saved.')
            }}
            onCancel={() => setChangingPassword(false)}
          />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s2)' }}>
              <button className="btn btn--ghost" onClick={cloud.syncNow}>
                Sync now
              </button>
              <button className="btn btn--ghost" onClick={() => run(cloud.signOut)} disabled={busy}>
                Sign out
              </button>
            </div>
            <button className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s2)' }} onClick={() => setChangingPassword(true)}>
              Change password
            </button>
          </>
        )}
        {notice && <p className="muted" style={small}>{notice}</p>}
        {confirmDelete ? (
          <div style={{ marginTop: 'var(--s3)' }}>
            <p className="muted" style={small}>
              This permanently deletes your account and everything synced with it, in Rung and the planner.
              What’s on this device stays here.
            </p>
            <button className="btn btn--dark btn--block" disabled={busy} onClick={() => run(cloud.deleteAccount)}>
              {busy ? 'Deleting…' : 'Yes, delete my account'}
            </button>
            <button className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s2)' }} onClick={() => setConfirmDelete(false)}>
              Keep my account
            </button>
          </div>
        ) : (
          <button className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s2)' }} onClick={() => setConfirmDelete(true)}>
            Delete account
          </button>
        )}
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    )
  }

  if (mode === 'check-confirm' || mode === 'check-reset') {
    return (
      <div>
        <p style={{ margin: 0 }}>
          We sent an email to <b>{email}</b>. Open it on this device and tap the button in it.
        </p>
        <p className="muted" style={small}>
          {mode === 'check-confirm'
            ? 'It says “Confirm your email”. That finishes your account and signs you in; this screen updates by itself.'
            : 'It says “Reset password”. You’ll be signed in and asked to choose a new password.'}
        </p>
        {error && <p style={errorStyle}>{error}</p>}
        {notice && <p className="muted" style={small}>{notice}</p>}
        {mode === 'check-confirm' && (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await cloud.resendConfirmation(email.trim())
                setNotice('Sent again. Check your spam folder too.')
              })
            }
          >
            Send the email again
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s2)' }} onClick={() => setMode('signin')}>
          Back to sign in
        </button>
      </div>
    )
  }

  const emailOk = /.+@.+\..+/.test(email.trim())
  const tooShort = mode === 'signup' && password ? passwordProblem(password) : null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const addr = email.trim()
        if (mode === 'signin') run(() => cloud.signIn(addr, password))
        if (mode === 'signup') {
          run(async () => {
            const result = await cloud.signUp(addr, password)
            if (result === 'confirm-email') setMode('check-confirm')
            if (result === 'exists') {
              setMode('signin')
              setError('There’s already an account with this email. Sign in instead.')
            }
          })
        }
        if (mode === 'forgot') {
          run(async () => {
            await cloud.sendPasswordReset(addr)
            setMode('check-reset')
          })
        }
      }}
    >
      {!compact && (
        <p className="muted" style={small}>
          {mode === 'forgot'
            ? 'Enter your account’s email and we’ll send a link to choose a new password.'
            : 'Use Rung on your phone and iPad. The same account works in the planner app.'}
        </p>
      )}
      <label className="field">
        <span className="field__label">Email</span>
        <input
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {mode !== 'forgot' && (
        <div style={{ marginTop: 'var(--s2)' }}>
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? `${MIN_PASSWORD}+ characters` : ''}
          />
        </div>
      )}
      {tooShort && <p className="muted" style={small}>{tooShort}</p>}
      {error && <p style={errorStyle}>{error}</p>}
      <button
        className="btn btn--primary btn--block"
        style={{ marginTop: 'var(--s3)' }}
        type="submit"
        disabled={busy || !emailOk || (mode === 'signin' && !password) || (mode === 'signup' && !!passwordProblem(password))}
      >
        {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Email me a reset link'}
      </button>
      {mode === 'signin' && (
        <>
          <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s2)' }} onClick={() => setMode('signup')}>
            New here? Create an account
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setMode('forgot')}>
            Forgot your password?
          </button>
        </>
      )}
      {mode !== 'signin' && (
        <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s2)' }} onClick={() => setMode('signin')}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'Back to sign in'}
        </button>
      )}
    </form>
  )
}
