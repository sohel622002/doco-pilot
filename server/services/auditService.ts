import type { Request } from 'express'
import { insertAuditLog } from '../repositories/auditRepository.js'
import { logger } from '../utils/logger.js'

interface AuditLogParams {
  req?: Omit<Partial<Request>, 'ip' | 'user'> & { user?: { id?: string; email?: string } | null; ip?: string | null }
  action: string
  target?: string | null
  serverId?: string | null
  result?: string
  error?: unknown
}

// Structured audit log — every docker/auth/server action is logged with who did it.
// Persisted to the audit_logs table; console output is kept as a fallback if the
// insert itself fails (e.g. Supabase unreachable), so nothing is silently lost.
export function auditLog({ req, action, target, serverId, result = 'ok', error = null }: AuditLogParams) {
  const entry = {
    ts: new Date().toISOString(),
    userId: req?.user?.id ?? null,
    email: req?.user?.email ?? null,
    ip: req?.ip ?? null,
    action,
    target: target ?? null,
    serverId: serverId ?? null,
    result,
    error: error ?? null
  }

  logger.info(entry, 'audit')

  insertAuditLog({
    ts: entry.ts,
    user_id: entry.userId,
    email: entry.email,
    ip: entry.ip,
    action: entry.action,
    target: entry.target,
    server_id: entry.serverId,
    result: entry.result,
    error: entry.error
  }).then(({ error: insertError }) => {
    if (insertError) logger.error({ err: insertError }, 'Failed to persist audit log')
  })
}
