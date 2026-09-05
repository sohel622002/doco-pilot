import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128)
})

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128)
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254)
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120)
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128)
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required')
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128)
})

const hostnameOrIp = /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9.-]+$/

export const createServerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  ip: z.string().trim().min(1, 'IP is required').max(255).regex(hostnameOrIp, 'Invalid IP or hostname format')
})

// Docker Compose project names: lowercase, digits, - and _ only
const stackNamePattern = /^[a-z0-9][a-z0-9_-]{0,62}$/

export const createStackSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(63).regex(stackNamePattern, 'Use lowercase letters, digits, - and _ only'),
  composeYaml: z.string().min(1, 'Compose file is required').max(262144)
})

export const updateStackSchema = z.object({
  composeYaml: z.string().min(1, 'Compose file is required').max(262144)
})

// Only 'operator' and 'viewer' are invitable directly — promoting someone
// to 'owner' is a separate, more deliberate action (PATCH a membership).
export const inviteMemberSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  role: z.enum(['operator', 'viewer'])
})

export const updateMemberSchema = z.object({
  role: z.enum(['owner', 'operator', 'viewer'])
})

export const updateServerSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  ip: z.string().trim().min(1).max(255).regex(hostnameOrIp, 'Invalid IP or hostname format').optional(),
  alertWebhookUrl: z.union([
    z.string().trim().url('Must be a valid URL'),
    z.literal('') // empty string clears the webhook
  ]).optional(),
  alertCpuThreshold: z.number().int().min(50).max(99).optional()
}).refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' })
