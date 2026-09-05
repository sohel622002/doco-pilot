import { logger } from './logger.js'

/**
 * Fire-and-forget POST of a JSON payload to a user-configured webhook URL
 * (Slack/Discord/n8n/Zapier/anything that accepts a JSON POST). Failures are
 * logged, never thrown — a broken webhook must not affect anything else.
 */
export async function sendWebhook(url: string, payload: Record<string, unknown>) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!res.ok) {
      logger.error({ url, status: res.status }, 'Webhook delivery returned non-2xx')
    }
  } catch (err) {
    logger.error({ err, url }, 'Webhook delivery failed')
  }
}
