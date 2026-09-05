import supabase from '../config/supabase.js'

export interface AuditLogRow {
  ts: string
  user_id: string | null
  email: string | null
  ip: string | null
  action: string
  target: string | null
  server_id: string | null
  result: string
  error: unknown
}

export async function insertAuditLog(row: AuditLogRow) {
  return supabase.from('audit_logs').insert(row)
}
