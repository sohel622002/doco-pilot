import supabase from '../config/supabase.js'

export async function findIdByEmail(email: string) {
  return supabase.from('profiles').select('id').eq('email', email).single()
}

export async function findForLogin(email: string) {
  return supabase.from('profiles').select('id, email, password_hash').eq('email', email).single()
}

export async function findByGoogleId(googleId: string) {
  return supabase.from('profiles').select('id, email, name, google_id').eq('google_id', googleId).maybeSingle()
}

export async function findByEmailForGoogleLink(email: string) {
  return supabase
    .from('profiles')
    .select('id, email, name, google_id, email_verified')
    .eq('email', email)
    .maybeSingle()
}

export async function linkGoogleAccount(id: string, fields: { google_id: string; email_verified: boolean; name?: string }) {
  return supabase.from('profiles').update(fields).eq('id', id).select('id, email, name, google_id').single()
}

export async function createGoogleAccount(fields: {
  name: string
  email: string
  google_id: string
  password_hash: null
  email_verified: boolean
}) {
  return supabase.from('profiles').insert(fields).select('id, email, name, google_id').single()
}

export async function insertProfile(name: string, email: string, passwordHash: string) {
  return supabase
    .from('profiles')
    .insert({ name, email, password_hash: passwordHash })
    .select('id, name, email')
    .single()
}

export async function findPasswordHash(id: string) {
  return supabase.from('profiles').select('id, password_hash').eq('id', id).single()
}

export async function updatePasswordHash(id: string, passwordHash: string) {
  return supabase.from('profiles').update({ password_hash: passwordHash }).eq('id', id)
}

export async function markEmailVerified(id: string) {
  return supabase.from('profiles').update({ email_verified: true }).eq('id', id)
}

export async function findVerificationStatus(id: string) {
  return supabase.from('profiles').select('id, email, email_verified').eq('id', id).single()
}

export async function findProfile(id: string) {
  return supabase.from('profiles').select('id, name, email, email_verified, created_at').eq('id', id).single()
}

export async function updateName(id: string, name: string) {
  return supabase.from('profiles').update({ name }).eq('id', id).select('id, name, email, created_at').single()
}

export async function findByIds(ids: string[]) {
  return supabase.from('profiles').select('id, name, email').in('id', ids)
}

export async function findByEmailCaseInsensitive(email: string) {
  return supabase.from('profiles').select('id, name, email').ilike('email', email).maybeSingle()
}
