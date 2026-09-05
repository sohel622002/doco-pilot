import 'dotenv/config'
import { z } from 'zod'

// Single source of truth for every environment variable the server reads.
// Fails fast at startup with a readable error instead of each module
// throwing its own ad hoc "Missing X in .env" the first time it's touched.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.string().default('info'),

  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  BIND_JWT_TO_IP: z.coerce.boolean().default(false),

  MASTER_ENCRYPTION_KEY: z.string().length(64, 'MASTER_ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),

  SUPABASE_URL: z.string().url('SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Required only when a docker install command is actually generated
  // (server create/regenerate-key/credentials) — validated there, not here,
  // so the app can still boot without it in local/test setups.
  BACKEND_WS_URL: z.string().optional(),
  AGENT_IMAGE: z.string().default('ghcr.io/sohel622002/doco-pilot-agent:latest'),

  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('doco-pilot <onboarding@resend.dev>'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = parsed.data
export type Env = typeof env
