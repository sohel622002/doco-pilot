import { logger } from '../utils/logger.js'
import * as metricsRepo from '../repositories/metricsRepository.js'

// Sample system:stats:result into server_metrics at most once per minute
// per server, so a fast poll cadence doesn't flood the history table.
const METRICS_SAMPLE_MS = 60 * 1000
const lastMetricSampleAt = new Map<string, number>()

function numOrNull(value: unknown) {
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

export function persistMetricsAndEvents(serverId: string, msg: any) {
  if (msg.type === 'system:stats:result') {
    const now = Date.now()
    const last = lastMetricSampleAt.get(serverId) || 0
    if (now - last < METRICS_SAMPLE_MS) return
    lastMetricSampleAt.set(serverId, now)

    const data = msg.data ?? {}
    metricsRepo
      .insertMetricSample({
        server_id: serverId,
        cpu_pct: numOrNull(data.cpu?.usagePercent),
        mem_pct: numOrNull(data.memory?.usagePercent),
        disk_pct: numOrNull(data.disk?.usagePercent),
        disk_io: data.diskIO ?? null,
        net_rx: numOrNull(data.network?.rxBytes),
        net_tx: numOrNull(data.network?.txBytes),
      })
      .then(({ error }) => {
        if (error) logger.error({ err: error }, 'Failed to insert server_metrics row')
      })
    return
  }

  if (msg.type === 'docker:event') {
    metricsRepo
      .insertDockerEvent({
        server_id: serverId,
        type: msg.kind ?? 'unknown',
        action: msg.event ?? null,
        actor_name: msg.actorName ?? null,
        details: { actor: msg.actor, exitCode: msg.exitCode, status: msg.status },
      })
      .then(({ error }) => {
        if (error) logger.error({ err: error }, 'Failed to insert docker_events row')
      })
  }
}
