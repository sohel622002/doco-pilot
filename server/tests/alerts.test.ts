import { describe, it, expect, vi, beforeAll } from 'vitest'

// checkForAlert fires DB writes and the outbound webhook as unawaited
// promises (fire-and-forget from the WS message handler's perspective), so
// this suite mocks both and asserts on them via vi.waitFor rather than a
// synchronous return value.
const insertedAlertEvents: any[] = []
let serversRow: any = null

vi.mock('../config/supabase.js', () => ({
  default: {
    from: (table: string) => {
      if (table === 'alert_events') {
        return {
          insert: (row: any) => {
            insertedAlertEvents.push(row)
            return Promise.resolve({ error: null })
          }
        }
      }
      if (table === 'servers') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: serversRow, error: null })
            })
          })
        }
      }
      throw new Error(`Unexpected table in test mock: ${table}`)
    }
  }
}))

const sendWebhook = vi.fn((...args: any[]) => Promise.resolve())
vi.mock('../utils/webhook.js', () => ({ sendWebhook: (...args: any[]) => sendWebhook(...args) }))

let checkForAlert: any

beforeAll(async () => {
  ;({ checkForAlert } = await import('../ws/index.js'))
})

describe('checkForAlert — container crash', () => {
  it('records a fired alert_events row and sends the webhook for a nonzero exit code', async () => {
    const serverId = 'srv-crash-1'
    serversRow = { name: 'prod-1', alert_webhook_url: 'https://hooks.example.com/x', alert_cpu_threshold: 90 }

    checkForAlert(serverId, {
      type: 'docker:event',
      kind: 'container',
      event: 'die',
      actor: 'abc123',
      actorName: 'web-1',
      exitCode: 1,
    })

    await vi.waitFor(() => {
      expect(insertedAlertEvents.some((r) => r.server_id === serverId && r.rule_type === 'container_crashed' && r.status === 'fired')).toBe(true)
    })
    await vi.waitFor(() => {
      expect(sendWebhook).toHaveBeenCalledWith(
        'https://hooks.example.com/x',
        expect.objectContaining({ type: 'container_crashed', serverId, containerId: 'abc123' }),
      )
    })
  })

  it('ignores a clean exit (code 0) — no crash to report', async () => {
    const serverId = 'srv-crash-2'
    serversRow = { name: 'prod-2', alert_webhook_url: 'https://hooks.example.com/y', alert_cpu_threshold: 90 }
    const before = insertedAlertEvents.length

    checkForAlert(serverId, {
      type: 'docker:event',
      kind: 'container',
      event: 'die',
      actor: 'def456',
      exitCode: 0,
    })

    // Give any (incorrect) async write a chance to land before asserting nothing happened.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(insertedAlertEvents.length).toBe(before)
  })

  it('does not send a webhook when none is configured for the server', async () => {
    const serverId = 'srv-crash-3'
    serversRow = { name: 'prod-3', alert_webhook_url: null, alert_cpu_threshold: 90 }
    sendWebhook.mockClear()

    checkForAlert(serverId, {
      type: 'docker:event',
      kind: 'container',
      event: 'die',
      actor: 'ghi789',
      exitCode: 137,
    })

    await vi.waitFor(() => {
      expect(insertedAlertEvents.some((r) => r.server_id === serverId)).toBe(true)
    })
    expect(sendWebhook).not.toHaveBeenCalled()
  })
})

describe('checkForAlert — high CPU', () => {
  it('records a fired row once usage crosses the server\'s threshold', async () => {
    const serverId = 'srv-cpu-1'
    serversRow = { name: 'prod-4', alert_webhook_url: null, alert_cpu_threshold: 80 }

    checkForAlert(serverId, { type: 'system:stats:result', data: { cpu: { usagePercent: 95 } } })

    await vi.waitFor(() => {
      expect(insertedAlertEvents.some((r) => r.server_id === serverId && r.rule_type === 'high_cpu_usage' && r.status === 'fired')).toBe(true)
    })
  })

  it('does not fire again while usage stays above threshold on the next sample', async () => {
    const serverId = 'srv-cpu-2'
    serversRow = { name: 'prod-5', alert_webhook_url: null, alert_cpu_threshold: 80 }

    checkForAlert(serverId, { type: 'system:stats:result', data: { cpu: { usagePercent: 95 } } })
    await vi.waitFor(() => {
      expect(insertedAlertEvents.filter((r) => r.server_id === serverId).length).toBe(1)
    })

    checkForAlert(serverId, { type: 'system:stats:result', data: { cpu: { usagePercent: 96 } } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(insertedAlertEvents.filter((r) => r.server_id === serverId).length).toBe(1)
  })
})
