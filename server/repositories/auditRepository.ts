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

// Rows the user is allowed to see: their own actions, plus actions taken
// on any server they're a member of.
export async function listVisibleAuditLogs(userId: string, serverIds: string[], limit: number, offset: number) {
  const filters = [`user_id.eq.${userId}`]
  if (serverIds.length > 0) filters.push(`server_id.in.(${serverIds.join(',')})`)

  return supabase
    .from('audit_logs')
    .select('id, ts, user_id, email, ip, action, target, server_id, result, error')
    .or(filters.join(','))
    .order('ts', { ascending: false })
    .range(offset, offset + limit - 1)
}
