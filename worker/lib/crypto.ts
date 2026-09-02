const PBKDF2_ITERATIONS = 100_000
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — avoids transcription mistakes

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  return bytes
}

/** Constant-time comparison over equal-length hex strings — hashes below are always
 *  fixed-length, so a length mismatch alone (checked first, non-secret) is safe to
 *  short-circuit on. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function pbkdf2Hex(input: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(input), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return toHex(bits)
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { hash: await pbkdf2Hex(password, salt), salt: toHex(salt) }
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computed = await pbkdf2Hex(password, fromHex(salt))
  return timingSafeEqualHex(computed, hash)
}

/** Recovery codes are already high-entropy random strings (not user-chosen), so a
 *  fast SHA-256 hash is fine here — no need for PBKDF2's deliberate slowness. */
export async function hashRecoveryCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.toUpperCase()))
  return toHex(digest)
}

export async function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  return timingSafeEqualHex(await hashRecoveryCode(code), hash)
}

/** e.g. "K7H2-9RXM-P4WT" — 12 chars from a 33-symbol alphabet (~62 bits), grouped
 *  for readability since the user has to copy this down once at signup. */
export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const chars = Array.from(bytes, (b) => RECOVERY_CODE_ALPHABET[b % RECOVERY_CODE_ALPHABET.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`
}

export function generateSessionToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)))
}

export function generateId(): string {
  return crypto.randomUUID()
}
