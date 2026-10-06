// Plain-language versions of Supabase's sign-in errors, so nobody has to decode them.

export const MIN_PASSWORD = 8

/** Why a new password can't be used yet, or null when it's fine. */
export function passwordProblem(password) {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  return null
}

export function authMessage(err) {
  const text = String(err?.message || err || '')
  const code = err?.code || ''
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(text)) {
    return 'That email and password don’t match. Try again, or reset your password.'
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(text)) {
    return 'Confirm your email first: tap the button in the email we sent you.'
  }
  if (code === 'user_already_exists' || /already registered|already exists/i.test(text)) {
    return 'There’s already an account with this email. Sign in instead.'
  }
  if (code === 'weak_password' || /password should be|weak password/i.test(text)) {
    return `That password is too easy to guess. Use at least ${MIN_PASSWORD} characters, mixing in a number or symbol.`
  }
  if (code === 'same_password' || /different from the old password/i.test(text)) {
    return 'That’s your current password. Choose a new one.'
  }
  if (code === 'over_email_send_rate_limit' || /rate limit|too many/i.test(text)) {
    return 'Too many emails just now. Wait a few minutes and try again.'
  }
  if (/fetch|network/i.test(text)) return 'Couldn’t reach the server. Check your connection and try again.'
  return text || 'Something went wrong. Try again in a moment.'
}
