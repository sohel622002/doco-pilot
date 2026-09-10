import {
  deleteOlderThan,
  deleteOlderThanForServers,
  deleteOlderThanForUsers,
  type RetentionTable,
} from '../repositories/metricsRepository.js'
import { listUserIdsForPlan, listServerIdsForOwners } from '../repositories/billingRepository.js'
import { PLAN_LIMITS, type Plan } from '../config/plans.js'
import { logger } from '../utils/logger.js'

// alert_events keeps a longer, plan-independent window — it's incident
// history, not raw noisy series, and stays small by nature.
const ALERT_EVENTS_RETENTION_DAYS = 90

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000 // every 6 hours

const SERVER_SCOPED_TABLES: RetentionTable[] = ['server_metrics', 'docker_events', 'agent_status_events']

function cutoffIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function logResult(table: string, error: unknown, count: number | null | undefined) {
  if (error) {
    logger.error({ err: error, table }, 'Retention cleanup failed')
  } else if (count) {
    logger.info(`Retention cleanup: removed ${count} row(s) from ${table}`)
  }
}

export async function runRetentionCleanup() {
  const alertResult = await deleteOlderThan('alert_events', cutoffIso(ALERT_EVENTS_RETENTION_DAYS))
  logResult('alert_events', alertResult.error, alertResult.count)

  for (const plan of Object.keys(PLAN_LIMITS) as Plan[]) {
    const { retentionDays } = PLAN_LIMITS[plan]
    const cutoff = cutoffIso(retentionDays)

    const userIds = await listUserIdsForPlan(plan)
    const serverIds = await listServerIdsForOwners(userIds)

    for (const table of SERVER_SCOPED_TABLES) {
      const { error, count } = await deleteOlderThanForServers(table, cutoff, serverIds)
      logResult(table, error, count)
    }

    const { error, count } = await deleteOlderThanForUsers('audit_logs', cutoff, userIds)
    logResult('audit_logs', error, count)
  }
}

// Starts the periodic retention sweep. Returns a stop function for tests/shutdown.
export function startRetentionSchedule() {
  runRetentionCleanup().catch((err) => logger.error({ err }, 'Initial retention cleanup failed'))
  const interval = setInterval(() => {
    runRetentionCleanup().catch((err) => logger.error({ err }, 'Retention cleanup failed'))
  }, CLEANUP_INTERVAL_MS)
  return () => clearInterval(interval)
}
