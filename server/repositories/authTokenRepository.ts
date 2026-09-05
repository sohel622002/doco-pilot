import supabase from '../config/supabase.js'

// ── refresh_tokens ───────────────────────────────────────────
export async function insertRefreshToken(userId: string, tokenHash: string, expiresAt: string) {
  return supabase.from('refresh_tokens').insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt })
}

export async function listActiveRefreshTokens() {
  return supabase
    .from('refresh_tokens')
    .select('id, user_id, token_hash, expires_at')
    .gt('expires_at', new Date().toISOString())
}

export async function listRefreshTokensForUser(userId: string) {
  return supabase.from('refresh_tokens').select('id, token_hash').eq('user_id', userId)
}

export async function deleteRefreshTokenById(id: string) {
  return supabase.from('refresh_tokens').delete().eq('id', id)
}

export async function deleteRefreshTokensForUser(userId: string) {
  return supabase.from('refresh_tokens').delete().eq('user_id', userId)
}

// ── password_resets ──────────────────────────────────────────
export async function insertPasswordReset(userId: string, tokenHash: string, expiresAt: string) {
  return supabase.from('password_resets').insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt })
}

export async function listActivePasswordResets() {
  return supabase
    .from('password_resets')
    .select('id, user_id, token_hash, expires_at')
    .gt('expires_at', new Date().toISOString())
}

export async function deletePasswordResetsForUser(userId: string) {
  return supabase.from('password_resets').delete().eq('user_id', userId)
}

// ── email_verifications ─────────────────────────────────────
export async function insertEmailVerification(userId: string, tokenHash: string, expiresAt: string) {
  return supabase.from('email_verifications').insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt })
}

export async function listActiveEmailVerifications() {
  return supabase
    .from('email_verifications')
    .select('id, user_id, token_hash, expires_at')
    .gt('expires_at', new Date().toISOString())
}

export async function deleteEmailVerificationsForUser(userId: string) {
  return supabase.from('email_verifications').delete().eq('user_id', userId)
}
