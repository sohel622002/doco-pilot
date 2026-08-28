import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.MASTER_ENCRYPTION_KEY = 'a'.repeat(64)
})

describe('encryption', () => {
  it('round-trips a plaintext value', async () => {
    const { encrypt, decrypt } = await import('../utils/encryption.js')
    const plain = 'super-secret-agent-key'
    const ciphertext = encrypt(plain)

    expect(ciphertext).not.toBe(plain)
    expect(ciphertext.split(':')).toHaveLength(3)
    expect(decrypt(ciphertext)).toBe(plain)
  })

  it('produces different ciphertext for the same plaintext (random IV)', async () => {
    const { encrypt } = await import('../utils/encryption.js')
    expect(encrypt('same-input')).not.toBe(encrypt('same-input'))
  })

  it('throws when ciphertext has been tampered with', async () => {
    const { encrypt, decrypt } = await import('../utils/encryption.js')
    const [iv, authTag, data] = encrypt('tamper-me').split(':')
    const tampered = [iv, authTag, data.slice(0, -2) + '00'].join(':')

    expect(() => decrypt(tampered)).toThrow()
  })
})
