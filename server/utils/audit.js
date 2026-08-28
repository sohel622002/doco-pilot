import supabase from '../config/supabase.js'
import { logger } from './logger.js'

// Structured audit log — every docker/auth/server action is logged with who did it.
// Persisted to the audit_logs table; console output is kept as a fallback if the
// insert itself fails (e.g. Supabase unreachable), so nothing is silently lost.
export function auditLog({ req, action, target, serverId, result = 'ok', error = null }) {
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

  supabase
    .from('audit_logs')
    .insert({
      ts: entry.ts,
      user_id: entry.userId,
      email: entry.email,
      ip: entry.ip,
      action: entry.action,
      target: entry.target,
      server_id: entry.serverId,
      result: entry.result,
      error: entry.error
    })
    .then(({ error: insertError }) => {
      if (insertError) logger.error({ err: insertError }, 'Failed to persist audit log')
    })
}

// Validate container IDs — always 12-64 hex chars
export function validateContainerId(id) {
  if (!id || !/^[a-f0-9]{12,64}$/i.test(id)) {
    throw new Error('Invalid container ID format')
  }
  return id
}

// Validate image IDs — hex or name:tag format
export function validateImageId(id) {
  if (!id || !/^[a-zA-Z0-9_\-.:/@]{1,256}$/.test(id)) {
    throw new Error('Invalid image ID format')
  }
  return id
}

// Validate a user-supplied container name (Docker's own naming rules)
export function validateContainerName(name) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(name)) {
    throw new Error('Invalid container name format')
  }
  return name
}

// Validate a "hostPort:containerPort[/proto]" mapping
export function validatePortMapping(mapping) {
  if (!/^\d{1,5}:\d{1,5}(\/(tcp|udp))?$/.test(mapping)) {
    throw new Error(`Invalid port mapping: ${mapping}`)
  }
  return mapping
}

// Validate a "KEY=VALUE" environment variable entry
export function validateEnvVar(entry) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*=.{0,4096}$/.test(entry)) {
    throw new Error(`Invalid environment variable: ${entry}`)
  }
  return entry
}