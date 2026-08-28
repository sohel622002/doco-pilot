import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM  = 'aes-256-gcm'
const KEY_HEX    = process.env.MASTER_ENCRYPTION_KEY

if (!KEY_HEX) {
  throw new Error('Missing MASTER_ENCRYPTION_KEY in .env')
}

if (KEY_HEX.length !== 64) {
  throw new Error('MASTER_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
}

const MASTER_KEY = Buffer.from(KEY_HEX, 'hex')

/**
 * Encrypt a plain string using AES-256-GCM.
 * Returns a single storable string: hex(iv):hex(authTag):hex(ciphertext)
 * Each encryption uses a fresh random IV — same input produces different output every time.
 */
export function encrypt(plain) {
  const iv         = randomBytes(12)          // 96-bit IV recommended for GCM
  const cipher     = createCipheriv(ALGORITHM, MASTER_KEY, iv)
  const encrypted  = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag    = cipher.getAuthTag()       // 16-byte authentication tag

  // Pack everything into one string so only one DB column is needed
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex')
  ].join(':')
}

/**
 * Decrypt a string produced by encrypt().
 * Throws if the ciphertext was tampered with (GCM auth tag mismatch).
 */
export function decrypt(stored) {
  const parts = stored.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted format')

  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv         = Buffer.from(ivHex,         'hex')
  const authTag    = Buffer.from(authTagHex,     'hex')
  const ciphertext = Buffer.from(ciphertextHex,  'hex')

  const decipher = createDecipheriv(ALGORITHM, MASTER_KEY, iv)
  decipher.setAuthTag(authTag)  // GCM will throw if this doesn't match

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}