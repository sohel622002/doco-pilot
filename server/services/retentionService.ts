import { deleteOlderThan, type RetentionTable } from '../repositories/metricsRepository.js'
import { logger } from '../utils/logger.js'

// Plan-based retention isn't wired up yet (see Module 9 — billing & plan
// gating). Until then everyone gets the longer Pro-tier retention window.
const METRICS_RETENTION_DAYS = 30
const EVENTS_RETENTION_DAYS = 30
const ALERT_EVENTS_RETENTION_DAYS = 90
const AGENT_STATUS_EVENTS_RETENTION_DAYS = 30 // uptime % only looks back 30 days

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000 // every 6 hours

function cutoffIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export async function runRetentionCleanup() {
  const jobs: [RetentionTable, number][] = [
    ['server_metrics', METRICS_RETENTION_DAYS],
    ['docker_events', EVENTS_RETENTION_DAYS],
    ['alert_events', ALERT_EVENTS_RETENTION_DAYS],
    ['agent_status_events', AGENT_STATUS_EVENTS_RETENTION_DAYS],
  ]

  for (const [table, days] of jobs) {
    const { error, count } = await deleteOlderThan(table, cutoffIso(days))

    if (error) {
      logger.error({ err: error, table }, 'Retention cleanup failed')
    } else if (count) {
      logger.info(`Retention cleanup: removed ${count} row(s) from ${table}`)
    }
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
