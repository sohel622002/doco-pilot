import pino from 'pino'

// Pretty-print in dev, structured JSON in prod (for log aggregators like
// Datadog/Loki/CloudWatch). Level configurable via LOG_LEVEL.
const isProd = process.env.NODE_ENV === 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } }
})
