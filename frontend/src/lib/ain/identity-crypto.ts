/**
 * Server-side AES-256-GCM encryption for identity mappings.
 *
 * Encrypts passkey public keys before storing them on the AIN blockchain,
 * so that on-chain data cannot be used to derive wallet private keys.
 *
 * Key derivation: SHA-256(AIN_PRIVATE_KEY || AUTH_SECRET) → 32-byte AES key.
 * Format: hex(iv[12] + ciphertext + authTag[16])
 */

import crypto from 'crypto';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/** Derive a 32-byte AES key from a server secret via SHA-256 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AIN_PRIVATE_KEY || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('[identity-crypto] Neither AIN_PRIVATE_KEY nor AUTH_SECRET is set');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/** Encrypt a publicKey string → hex(iv + ciphertext + authTag) */
export function encryptPublicKey(publicKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(publicKey, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // iv (12) + ciphertext (variable) + authTag (16)
  return Buffer.concat([iv, encrypted, authTag]).toString('hex');
}

/** Decrypt hex(iv + ciphertext + authTag) → publicKey string */
export function decryptPublicKey(encryptedHex: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encryptedHex, 'hex');

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
