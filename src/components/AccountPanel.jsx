import { useState } from 'react'
import { useApp } from '../state/AppContext.jsx'

const STATUS = {
  syncing: 'Syncing…',
  synced: 'All synced',
  offline: 'Offline. Everything is saved here and syncs when you’re back online.',
  error: 'Couldn’t sync just now. Your data is safe here; it will try again.',
}

const small = { fontSize: 'var(--t-2xs)', margin: 'var(--s1) 0 var(--s3)' }

/**
 * Sign in with an emailed 6-digit code (no password), see sync status, sign
 * out, or delete the account. The same account works in the planner app.
 */
export default function AccountPanel({ compact = false }) {
  const { cloud } = useApp()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!cloud.available) {
    return compact ? null : (
      <p className="muted" style={small}>
        Accounts aren’t switched on for this copy of Rung yet, so everything stays on this device.
      </p>
    )
  }

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again in a moment.')
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
          {STATUS[cloud.status] || ''}
          {cloud.status === 'synced' && cloud.lastSynced
            ? ` · ${new Date(cloud.lastSynced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : ''}
          . Your workouts also show up in the planner app when you use the same email there.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s2)' }}>
          <button className="btn btn--ghost" onClick={cloud.syncNow}>
            Sync now
          </button>
          <button className="btn btn--ghost" onClick={() => run(cloud.signOut)} disabled={busy}>
            Sign out
          </button>
        </div>
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
        {error && <p style={{ ...small, color: 'var(--plate-red)' }}>{error}</p>}
      </div>
    )
  }

  if (step === 'email') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(async () => {
            await cloud.sendCode(email.trim())
            setStep('code')
          })
        }}
      >
        {!compact && (
          <p className="muted" style={small}>
            Sign in to use Rung on your phone and iPad. New here? The same step creates your account. No password.
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
        {error && <p style={{ ...small, color: 'var(--plate-red)' }}>{error}</p>}
        <button className="btn btn--primary btn--block" style={{ marginTop: 'var(--s3)' }} type="submit" disabled={busy || !/.+@.+\..+/.test(email)}>
          {busy ? 'Sending…' : 'Email me a code'}
        </button>
      </form>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => cloud.verifyCode(email.trim(), code.trim()))
      }}
    >
      <p className="muted" style={small}>
        We sent a 6-digit code to <b>{email}</b>.
      </p>
      <label className="field">
        <span className="field__label">Code</span>
        <input
          className="input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          style={{ letterSpacing: '0.4em', textAlign: 'center', fontFamily: 'var(--font-data)' }}
          autoFocus
        />
      </label>
      {error && <p style={{ ...small, color: 'var(--plate-red)' }}>{error}</p>}
      <button className="btn btn--primary btn--block" style={{ marginTop: 'var(--s3)' }} type="submit" disabled={busy || code.length < 6}>
        {busy ? 'Checking…' : 'Sign in'}
      </button>
      <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 'var(--s2)' }} onClick={() => setStep('email')}>
        Use a different email
      </button>
    </form>
  )
}
