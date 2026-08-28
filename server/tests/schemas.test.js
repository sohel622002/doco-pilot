import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  loginSchema,
  createServerSchema,
  updateServerSchema,
  resetPasswordSchema
} from '../schemas/index.js'

describe('registerSchema', () => {
  it('accepts a valid payload', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: 'password123' })
    expect(result.success).toBe(true)
  })

  it('rejects a short password', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'not-an-email', password: 'password123' })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('rejects a missing password', () => {
    const result = loginSchema.safeParse({ email: 'ada@example.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('createServerSchema', () => {
  it('accepts a hostname or IPv4 address', () => {
    expect(createServerSchema.safeParse({ name: 'prod-1', ip: '192.168.1.10' }).success).toBe(true)
    expect(createServerSchema.safeParse({ name: 'prod-1', ip: 'my-host.example.com' }).success).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(createServerSchema.safeParse({ name: '', ip: '192.168.1.10' }).success).toBe(false)
  })
})

describe('updateServerSchema', () => {
  it('rejects an empty update payload', () => {
    expect(updateServerSchema.safeParse({}).success).toBe(false)
  })

  it('accepts a partial update', () => {
    expect(updateServerSchema.safeParse({ name: 'renamed' }).success).toBe(true)
  })

  it('accepts a valid webhook URL and CPU threshold', () => {
    const result = updateServerSchema.safeParse({
      alertWebhookUrl: 'https://hooks.example.com/abc',
      alertCpuThreshold: 90
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty string to clear the webhook', () => {
    expect(updateServerSchema.safeParse({ alertWebhookUrl: '' }).success).toBe(true)
  })

  it('rejects a non-URL webhook value', () => {
    expect(updateServerSchema.safeParse({ alertWebhookUrl: 'not-a-url' }).success).toBe(false)
  })

  it('rejects a CPU threshold outside 50-99', () => {
    expect(updateServerSchema.safeParse({ alertCpuThreshold: 10 }).success).toBe(false)
    expect(updateServerSchema.safeParse({ alertCpuThreshold: 100 }).success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('rejects a short new password', () => {
    expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'short' }).success).toBe(false)
  })
})
