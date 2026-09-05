import supabase from '../config/supabase.js'

const RETENTION_TABLES = ['server_metrics', 'docker_events', 'alert_events', 'agent_status_events'] as const
export type RetentionTable = (typeof RETENTION_TABLES)[number]

export async function deleteOlderThan(table: RetentionTable, cutoffIso: string) {
  return supabase.from(table).delete({ count: 'exact' }).lt('ts', cutoffIso)
}

// ── server_metrics ───────────────────────────────────────────
export async function insertMetricSample(row: {
  server_id: string
  cpu_pct: number | null
  mem_pct: number | null
  disk_pct: number | null
  disk_io: unknown
  net_rx: number | null
  net_tx: number | null
}) {
  return supabase.from('server_metrics').insert(row)
}

export async function listMetrics(serverId: string, sinceIso: string) {
  return supabase
    .from('server_metrics')
    .select('ts, cpu_pct, mem_pct, disk_pct, disk_io, net_rx, net_tx')
    .eq('server_id', serverId)
    .gte('ts', sinceIso)
    .order('ts', { ascending: true })
}

// ── docker_events ────────────────────────────────────────────
export async function insertDockerEvent(row: {
  server_id: string
  type: string
  action: string | null
  actor_name: string | null
  details: unknown
}) {
  return supabase.from('docker_events').insert(row)
}

export async function listDockerEvents(serverId: string, limit: number) {
  return supabase
    .from('docker_events')
    .select('id, ts, type, action, actor_name, details')
    .eq('server_id', serverId)
    .order('ts', { ascending: false })
    .limit(limit)
}

// ── alert_events ─────────────────────────────────────────────
export async function insertAlertEvent(row: {
  server_id: string
  rule_type: string
  status: string
  value: number | null
  threshold: number | null
}) {
  return supabase.from('alert_events').insert(row)
}

export async function listAlertEvents(serverId: string, limit: number) {
  return supabase
    .from('alert_events')
    .select('id, ts, rule_type, value, threshold, status')
    .eq('server_id', serverId)
    .order('ts', { ascending: false })
    .limit(limit)
}

// ── agent_status_events ──────────────────────────────────────
export async function insertAgentStatusEvent(serverId: string, connected: boolean) {
  return supabase.from('agent_status_events').insert({ server_id: serverId, connected })
}

export async function findSeedStatusEvent(serverId: string, beforeIso: string) {
  return supabase
    .from('agent_status_events')
    .select('connected')
    .eq('server_id', serverId)
    .lt('ts', beforeIso)
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle()
}

export async function listStatusEventsSince(serverId: string, sinceIso: string) {
  return supabase
    .from('agent_status_events')
    .select('ts, connected')
    .eq('server_id', serverId)
    .gte('ts', sinceIso)
    .order('ts', { ascending: true })
}
