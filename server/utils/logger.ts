import pino from 'pino'
import { env } from '../env.js'

// Pretty-print in dev, structured JSON in prod (for log aggregators like
// Datadog/Loki/CloudWatch). Level configurable via LOG_LEVEL.
const isProd = env.NODE_ENV === 'production'

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } }
})
