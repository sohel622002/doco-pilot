import supabase from '../config/supabase.js'

const LIST_COLUMNS = 'id, name, ip, agent_connected, last_seen_at, alert_webhook_url, alert_cpu_threshold, created_at'

export interface CredentialFields {
  agent_key_hash: string
  agent_secret_hash: string
  agent_key_encrypted: string
  agent_secret_encrypted: string
}

export async function listByIds(ids: string[]) {
  return supabase.from('servers').select(LIST_COLUMNS).in('id', ids).order('created_at', { ascending: false })
}

export async function insertServer(userId: string, name: string, ip: string) {
  return supabase
    .from('servers')
    .insert({ user_id: userId, name, ip })
    .select('id, name, ip, created_at')
    .single()
}

export async function findById(id: string) {
  return supabase.from('servers').select(LIST_COLUMNS).eq('id', id).single()
}

export async function findCredentials(id: string) {
  return supabase
    .from('servers')
    .select('id, name, ip, agent_key_encrypted, agent_secret_encrypted')
    .eq('id', id)
    .single()
}

export async function updateCredentials(id: string, fields: CredentialFields, markDisconnected = false) {
  return supabase
    .from('servers')
    .update(markDisconnected ? { ...fields, agent_connected: false } : fields)
    .eq('id', id)
}

export async function updateServer(id: string, updates: Record<string, unknown>) {
  return supabase
    .from('servers')
    .update(updates)
    .eq('id', id)
    .select('id, name, ip, agent_connected, last_seen_at, alert_webhook_url, alert_cpu_threshold')
    .single()
}

export async function deleteServer(id: string) {
  return supabase.from('servers').delete().eq('id', id)
}

export async function findForUptime(id: string) {
  return supabase.from('servers').select('id, agent_connected, created_at').eq('id', id).single()
}

export async function findName(id: string) {
  return supabase.from('servers').select('name').eq('id', id).single()
}

// ── Used by the WebSocket layer (agent handshake, alert firing) ──────

export async function findForHandshake(id: string) {
  return supabase.from('servers').select('id, user_id, agent_key_hash, agent_secret_hash').eq('id', id).single()
}

export async function findAlertConfig(id: string) {
  return supabase.from('servers').select('name, alert_webhook_url, alert_cpu_threshold').eq('id', id).single()
}

export async function findConnectionState(id: string) {
  return supabase.from('servers').select('id, agent_connected').eq('id', id).single()
}

export async function findCpuThreshold(id: string) {
  return supabase.from('servers').select('alert_cpu_threshold').eq('id', id).single()
}

export async function markAgentConnected(id: string) {
  return supabase
    .from('servers')
    .update({ agent_connected: true, last_seen_at: new Date().toISOString() })
    .eq('id', id)
}

export async function markAgentDisconnected(id: string) {
  return supabase.from('servers').update({ agent_connected: false }).eq('id', id)
}
