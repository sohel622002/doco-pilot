import { sendWebhook } from '../utils/webhook.js'
import { logger } from '../utils/logger.js'
import * as serverRepo from '../repositories/serverRepository.js'
import * as metricsRepo from '../repositories/metricsRepository.js'

// Per-server, per-alert-kind cooldown so a crash-looping container or
// sustained high CPU doesn't spam the webhook — one fire per 10 minutes.
const ALERT_COOLDOWN_MS = 10 * 60 * 1000
const alertCooldowns = new Map<string, number>() // `${serverId}:${kind}` → last-fired timestamp

async function maybeFireAlert(serverId: string, kind: string, payload: Record<string, unknown>) {
  const key = `${serverId}:${kind}`
  const now = Date.now()
  const last = alertCooldowns.get(key) || 0
  if (now - last < ALERT_COOLDOWN_MS) return

  const { data: server } = await serverRepo.findAlertConfig(serverId)

  if (!server?.alert_webhook_url) return
  if (kind === 'high_cpu_usage' && Number(payload.cpuPercent) < server.alert_cpu_threshold) return

  alertCooldowns.set(key, now)

  await sendWebhook(server.alert_webhook_url, {
    type: kind,
    serverId,
    serverName: server.name,
    ts: new Date().toISOString(),
    ...payload,
  })
}

// Persist a fired/resolved row to alert_events — independent of the
// webhook's own cooldown, so the alert history stays complete even when
// no webhook is configured.
async function recordAlertEvent(serverId: string, ruleType: string, status: string, value: number | null, threshold: number | null) {
  const { error } = await metricsRepo.insertAlertEvent({ server_id: serverId, rule_type: ruleType, status, value, threshold })
  if (error) logger.error({ err: error }, 'Failed to insert alert_events row')
}

// Short-lived cache of each server's alert threshold, so a fast stats poll
// cadence doesn't turn into a DB read per sample.
const THRESHOLD_CACHE_MS = 60 * 1000
const thresholdCache = new Map<string, { threshold: number; fetchedAt: number }>()

async function getCpuThreshold(serverId: string): Promise<number> {
  const cached = thresholdCache.get(serverId)
  if (cached && Date.now() - cached.fetchedAt < THRESHOLD_CACHE_MS) {
    return cached.threshold
  }

  const { data: server } = await serverRepo.findCpuThreshold(serverId)

  const threshold = server?.alert_cpu_threshold ?? 90
  thresholdCache.set(serverId, { threshold, fetchedAt: Date.now() })
  return threshold
}

// Whether high-CPU is currently in a "fired" (unresolved) state per server
const highCpuActive = new Map<string, boolean>()

// Inspect an inbound agent message for alert-worthy conditions
export function checkForAlert(serverId: string, msg: any) {
  if (msg.type === 'docker:event' && msg.kind === 'container' && msg.event === 'die') {
    const exitCode = msg.exitCode
    if (exitCode !== undefined && exitCode !== null && String(exitCode) !== '0') {
      recordAlertEvent(serverId, 'container_crashed', 'fired', Number(exitCode), null).catch(
        (err) => logger.error({ err }, 'Failed to record crash alert event'),
      )
      maybeFireAlert(serverId, 'container_crashed', {
        containerName: msg.actorName,
        containerId: msg.actor,
        exitCode,
      }).catch((err) => logger.error({ err }, 'Failed to check/fire crash alert'))
    }
    return
  }

  if (msg.type === 'system:stats:result') {
    const cpuPercent = Number(msg.data?.cpu?.usagePercent)
    if (!Number.isNaN(cpuPercent)) {
      getCpuThreshold(serverId)
        .then((threshold) => {
          const wasActive = highCpuActive.get(serverId) || false
          const isActive = cpuPercent >= threshold
          if (isActive !== wasActive) {
            highCpuActive.set(serverId, isActive)
            recordAlertEvent(
              serverId,
              'high_cpu_usage',
              isActive ? 'fired' : 'resolved',
              cpuPercent,
              threshold,
            ).catch((err) => logger.error({ err }, 'Failed to record high-CPU alert event'))
          }
        })
        .catch((err) => logger.error({ err }, 'Failed to load CPU threshold'))

      maybeFireAlert(serverId, 'high_cpu_usage', { cpuPercent }).catch((err) =>
        logger.error({ err }, 'Failed to check/fire high-CPU alert'),
      )
    }
  }
}
