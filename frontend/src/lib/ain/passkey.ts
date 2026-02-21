/**
 * WebAuthn / Passkey helpers for P256-based AIN wallet.
 *
 * Flow:
 * 1. navigator.credentials.create() with alg: -7 (ES256/P256)
 * 2. Extract P256 public key from attestation
 * 3. Derive AIN address from P256 pubkey (SHA-256 → last 20 bytes)
 * 4. Derive EVM address from P256 pubkey (keccak256 → secp256k1 private key → address)
 * 5. For signing: navigator.credentials.get() signs a challenge
 *
 * Security defenses:
 * - Rogue Key Attack: verifyAddressBinding() checks that the embedded public key
 *   derives to the expected AIN address before accepting any signature.
 * - WebAuthn Replay/Phishing: signTransaction() validates clientDataJSON (challenge,
 *   origin, type) and authenticatorData (rpIdHash, user-present flag).
 * - Signature Malleability: enforceCanonicalS() normalizes s to s < n/2 (Low-S rule),
 *   preventing an attacker from flipping s to n-s to create an alternate valid signature.
 *
 * EVM Compatibility Note:
 * Passkeys use P-256 curve (ES256), NOT secp256k1 (EVM).
 * The private key is non-exportable (stored in OS keystore).
 * We bridge this gap by deriving a deterministic secp256k1 key:
 *   evmPrivateKey = keccak256(p256PublicKey)
 * The server derives the same key from the public key sent in requests.
 */

import { ethers } from 'ethers';

// P256 curve order (n) and half-order (n/2) for Low-S enforcement
const P256_ORDER = BigInt(
  '0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'
);
const P256_HALF_ORDER = P256_ORDER / BigInt(2);

export interface PasskeyInfo {
  credentialId: string;
  publicKey: string; // hex-encoded P-256 public key (DER)
  ainAddress: string; // AIN address (SHA-256 → last 20 bytes)
  evmAddress: string; // EVM address (keccak256 → secp256k1 → address)
}

/** Result of signTransaction — the 98-byte AIN P256 signature */
export interface P256Signature {
  /** 98-byte hex signature: 0x02 + compressedPubKey(33) + r(32) + s(32) */
  signature: string;
  /** The AIN address derived from the signing public key */
  signerAddress: string;
}

const STORAGE_KEY = 'ain_passkey_info';

/** Persist passkey info to localStorage */
export function savePasskeyInfo(info: PasskeyInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

/** Load passkey info from localStorage (auto-migrates legacy data without evmAddress) */
export function loadPasskeyInfo(): PasskeyInfo | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const info = JSON.parse(stored) as PasskeyInfo;
    // Migrate legacy entries that lack evmAddress
    if (info.publicKey && !info.evmAddress) {
      info.evmAddress = deriveEvmAddress(info.publicKey);
      savePasskeyInfo(info);
    }
    return info;
  } catch {
    return null;
  }
}

/** Clear passkey info from localStorage */
export function clearPasskeyInfo(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Check if WebAuthn is available in this browser */
export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials
  );
}

/**
 * Derive EVM-compatible secp256k1 private key from P-256 public key.
 * evmPrivateKey = keccak256(publicKeyHex)
 * This is deterministic: same public key → same EVM wallet.
 */
export function deriveEvmPrivateKey(publicKeyHex: string): string {
  const input = publicKeyHex.startsWith('0x') ? publicKeyHex : `0x${publicKeyHex}`;
  return ethers.keccak256(input);
}

/**
 * Derive EVM address from P-256 public key.
 * Uses keccak256(pubkey) as secp256k1 private key → compute address.
 */
export function deriveEvmAddress(publicKeyHex: string): string {
  const privateKey = deriveEvmPrivateKey(publicKeyHex);
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

/**
 * Register a new passkey (P256/ES256).
 * Returns the credential info + derived AIN address + derived EVM address.
 */
export async function registerPasskey(
  userId: string,
  userName: string,
): Promise<PasskeyInfo> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Papers with Claude Code',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256 (P-256)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'direct',
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Passkey registration was cancelled');
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  const credentialId = bufferToBase64Url(credential.rawId);

  // Try getPublicKey() first (modern browsers), fall back to attestation parsing
  const publicKeyDer = response.getPublicKey?.();
  let publicKeyHex: string;
  let ainAddress: string;

  if (publicKeyDer) {
    publicKeyHex = bytesToHex(new Uint8Array(publicKeyDer));
    ainAddress = await deriveAinAddress(publicKeyDer);
  } else {
    // Fallback: extract from attestation object
    const pubKey = extractPublicKeyFromAttestation(response.attestationObject);
    if (pubKey) {
      publicKeyHex = bytesToHex(pubKey);
      ainAddress = await deriveAinAddress(pubKey.buffer as ArrayBuffer);
    } else {
      throw new Error('Failed to extract public key from passkey');
    }
  }

  // Derive EVM address from the P-256 public key
  const evmAddress = deriveEvmAddress(publicKeyHex);

  const info: PasskeyInfo = { credentialId, publicKey: publicKeyHex, ainAddress, evmAddress };
  savePasskeyInfo(info);
  return info;
}

/**
 * Authenticate with an existing passkey via WebAuthn assertion.
 * Triggers biometric/PIN verification on the device.
 * Validates the WebAuthn assertion response (challenge, origin, rpIdHash).
 * Returns the stored PasskeyInfo on success.
 */
export async function authenticatePasskey(credentialId: string): Promise<PasskeyInfo> {
  const stored = loadPasskeyInfo();
  if (!stored) throw new Error('No passkey found in storage');

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: base64UrlToBuffer(credentialId),
          type: 'public-key',
        },
      ],
      userVerification: 'preferred',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('Passkey verification was cancelled');
  }

  // Defense: Validate WebAuthn assertion payload
  const response = assertion.response as AuthenticatorAssertionResponse;
  validateClientDataJSON(response.clientDataJSON, challenge, window.location.origin);
  await validateAuthenticatorData(response.authenticatorData, window.location.hostname);

  return stored;
}

/**
 * Sign a transaction hash with the passkey and return a 98-byte AIN P256 signature.
 *
 * Defenses implemented:
 * 1. Rogue Key: verifies embedded pubkey derives to the expected AIN address
 * 2. WebAuthn Replay/Phishing: validates clientDataJSON (challenge, origin, type)
 *    and authenticatorData (rpIdHash, user-present flag)
 * 3. Signature Malleability: enforces Low-S rule (s < n/2)
 */
export async function signTransaction(
  txHash: Uint8Array,
  expectedAddress: string,
): Promise<P256Signature> {
  const stored = loadPasskeyInfo();
  if (!stored) throw new Error('No passkey found in storage');

  // Use the transaction hash as the WebAuthn challenge
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: txHash as BufferSource,
      allowCredentials: [
        {
          id: base64UrlToBuffer(stored.credentialId),
          type: 'public-key',
        },
      ],
      userVerification: 'preferred',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('Transaction signing was cancelled');
  }

  const response = assertion.response as AuthenticatorAssertionResponse;

  // ── Defense 2: WebAuthn payload verification ──
  validateClientDataJSON(response.clientDataJSON, txHash, window.location.origin);
  await validateAuthenticatorData(response.authenticatorData, window.location.hostname);

  // ── Parse DER signature → extract r, s ──
  const derSig = new Uint8Array(response.signature);
  const { r, s } = parseDERSignature(derSig);

  // ── Defense 3: Low-S rule (signature malleability) ──
  const canonicalS = enforceCanonicalS(s);

  // ── Compress the public key ──
  const pubKeyBytes = hexToBytes(stored.publicKey);
  const compressedPubKey = compressPublicKey(pubKeyBytes);

  // ── Defense 1: Rogue Key — verify pubkey → address binding ──
  await verifyAddressBinding(compressedPubKey, expectedAddress);

  // ── Format 98-byte AIN P256 signature: 0x02 + compressed(33) + r(32) + s(32) ──
  const sig = new Uint8Array(98);
  sig[0] = 0x02; // P256 prefix
  sig.set(compressedPubKey, 1); // 33 bytes
  sig.set(padTo32Bytes(r), 34); // 32 bytes
  sig.set(padTo32Bytes(canonicalS), 66); // 32 bytes

  return {
    signature: '0x' + bytesToHex(sig),
    signerAddress: expectedAddress,
  };
}

/**
 * Generate WebAuthn assertion options for signing a challenge.
 */
export function getAssertionOptions(challenge: Uint8Array, credentialId: string) {
  return {
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: base64UrlToBuffer(credentialId),
          type: 'public-key' as const,
        },
      ],
      userVerification: 'preferred' as const,
      timeout: 60000,
    },
  };
}

// ─── Security: Defense implementations ──────────────────────────────

/**
 * Defense 1 — Rogue Key Attack Prevention.
 * Verifies that the compressed public key in the signature derives to the
 * expected AIN address. Without this, an attacker could embed their own
 * public key in the 98-byte signature and sign on behalf of any address.
 */
async function verifyAddressBinding(
  compressedPubKey: Uint8Array,
  expectedAddress: string,
): Promise<void> {
  const hash = await crypto.subtle.digest('SHA-256', compressedPubKey as BufferSource);
  const derivedAddress = '0x' + bytesToHex(new Uint8Array(hash)).slice(-40);
  if (derivedAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(
      `Rogue key detected: public key derives to ${derivedAddress}, expected ${expectedAddress}`
    );
  }
}

/**
 * Defense 2a — WebAuthn clientDataJSON validation.
 * Verifies challenge, origin, and type to prevent replay and phishing attacks.
 */
function validateClientDataJSON(
  clientDataJSON: ArrayBuffer,
  expectedChallenge: Uint8Array,
  expectedOrigin: string,
): void {
  const json = new TextDecoder().decode(clientDataJSON);
  const clientData = JSON.parse(json);

  // Verify type
  if (clientData.type !== 'webauthn.get') {
    throw new Error(`Invalid WebAuthn type: ${clientData.type}`);
  }

  // Verify challenge — clientDataJSON encodes it as base64url
  const expectedChallengeB64 = bufferToBase64Url(expectedChallenge);
  if (clientData.challenge !== expectedChallengeB64) {
    throw new Error('Challenge mismatch — possible replay attack');
  }

  // Verify origin — prevents phishing from a different domain
  if (clientData.origin !== expectedOrigin) {
    throw new Error(
      `Origin mismatch: got ${clientData.origin}, expected ${expectedOrigin} — possible phishing`
    );
  }
}

/**
 * Defense 2b — WebAuthn authenticatorData validation.
 * Verifies rpIdHash matches the expected hostname and that the UP flag is set.
 */
async function validateAuthenticatorData(
  authenticatorData: ArrayBuffer,
  expectedRpId: string,
): Promise<void> {
  const authData = new Uint8Array(authenticatorData);

  // First 32 bytes = SHA-256 hash of the RP ID
  const rpIdHash = authData.slice(0, 32);
  const expectedHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(expectedRpId))
  );

  if (!constantTimeEqual(rpIdHash, expectedHash)) {
    throw new Error('RP ID hash mismatch — authenticator response is for a different origin');
  }

  // Byte 32 = flags. Bit 0 (UP) must be set (user was present)
  const flags = authData[32];
  if ((flags & 0x01) === 0) {
    throw new Error('User presence flag not set in authenticator response');
  }
}

/**
 * Defense 3 — Signature Malleability Prevention (Low-S Rule).
 * For P256 ECDSA, both (r, s) and (r, n-s) are valid signatures.
 * Enforce s < n/2 to ensure canonical form, preventing an attacker
 * from creating an alternate valid signature by flipping s.
 */
function enforceCanonicalS(s: Uint8Array): Uint8Array {
  const sBigInt = BigInt('0x' + bytesToHex(s));
  if (sBigInt > P256_HALF_ORDER) {
    const canonical = P256_ORDER - sBigInt;
    return bigIntToBytes(canonical, 32);
  }
  return s;
}

// ─── Crypto helpers ─────────────────────────────────────────────────

/** Parse a DER-encoded ECDSA signature into r and s components */
function parseDERSignature(der: Uint8Array): { r: Uint8Array; s: Uint8Array } {
  // DER format: 30 <total_len> 02 <r_len> <r_bytes> 02 <s_len> <s_bytes>
  if (der[0] !== 0x30) throw new Error('Invalid DER signature: missing SEQUENCE tag');

  let offset = 2; // skip SEQUENCE tag + length

  // Parse r
  if (der[offset] !== 0x02) throw new Error('Invalid DER signature: missing INTEGER tag for r');
  offset++;
  const rLen = der[offset++];
  let r = der.slice(offset, offset + rLen);
  offset += rLen;
  // Strip leading zero byte (DER uses it for positive numbers with high bit set)
  if (r[0] === 0x00 && r.length > 32) r = r.slice(1);

  // Parse s
  if (der[offset] !== 0x02) throw new Error('Invalid DER signature: missing INTEGER tag for s');
  offset++;
  const sLen = der[offset++];
  let s = der.slice(offset, offset + sLen);
  // Strip leading zero byte
  if (s[0] === 0x00 && s.length > 32) s = s.slice(1);

  return { r, s };
}

/** Compress a 65-byte uncompressed P256 public key (04||x||y) to 33 bytes (02/03||x) */
function compressPublicKey(uncompressed: Uint8Array): Uint8Array {
  // Handle DER/SPKI-wrapped keys — find the 04 prefix
  let keyStart = 0;
  if (uncompressed.length > 65) {
    // DER-wrapped: scan for 0x04 marker followed by 64 bytes
    for (let i = 0; i < uncompressed.length - 64; i++) {
      if (uncompressed[i] === 0x04 && i + 64 < uncompressed.length) {
        keyStart = i;
        break;
      }
    }
  }

  const prefix = uncompressed[keyStart];
  if (prefix === 0x02 || prefix === 0x03) {
    // Already compressed
    return uncompressed.slice(keyStart, keyStart + 33);
  }
  if (prefix !== 0x04) throw new Error('Invalid public key format');

  const x = uncompressed.slice(keyStart + 1, keyStart + 33);
  const y = uncompressed.slice(keyStart + 33, keyStart + 65);

  // Even y → 0x02, odd y → 0x03
  const compressed = new Uint8Array(33);
  compressed[0] = (y[31] & 1) === 0 ? 0x02 : 0x03;
  compressed.set(x, 1);
  return compressed;
}

/** Convert a BigInt to a fixed-length byte array */
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const hex = value.toString(16).padStart(length * 2, '0');
  return hexToBytes(hex);
}

/** Pad a byte array to exactly 32 bytes (left-pad with zeros) */
function padTo32Bytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 32) return bytes;
  if (bytes.length > 32) return bytes.slice(bytes.length - 32);
  const padded = new Uint8Array(32);
  padded.set(bytes, 32 - bytes.length);
  return padded;
}

/** Convert hex string to Uint8Array */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Constant-time comparison to prevent timing side-channels */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// ─── Internal helpers ───────────────────────────────────────────────

/** Derive AIN address from public key bytes: SHA-256 → last 20 bytes → 0x prefix */
async function deriveAinAddress(publicKeyBytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', publicKeyBytes);
  const hex = bytesToHex(new Uint8Array(hash));
  return '0x' + hex.slice(-40);
}

/** Extract raw P256 public key (65 bytes, uncompressed) from WebAuthn attestation */
function extractPublicKeyFromAttestation(
  attestationObject: ArrayBuffer,
): Uint8Array | null {
  try {
    const cbor = decodeCBOR(new Uint8Array(attestationObject));
    const authData = cbor.authData;

    // Skip rpIdHash(32) + flags(1) + signCount(4) = 37
    let offset = 37;
    // AAGUID (16)
    offset += 16;
    // Credential ID length (2 bytes, big-endian)
    const credIdLen = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;
    // Skip credential ID
    offset += credIdLen;

    // COSE public key
    const coseKey = decodeCBOR(authData.slice(offset));
    const x = coseKey[-2] || coseKey.get?.(-2);
    const y = coseKey[-3] || coseKey.get?.(-3);
    if (!x || !y) return null;

    // Uncompressed: 04 || x(32) || y(32)
    const pubKey = new Uint8Array(65);
    pubKey[0] = 0x04;
    pubKey.set(new Uint8Array(x.buffer || x), 1);
    pubKey.set(new Uint8Array(y.buffer || y), 33);
    return pubKey;
  } catch {
    return null;
  }
}

export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Minimal CBOR decoder for the WebAuthn subset */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeCBOR(data: Uint8Array): any {
  let offset = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function read(): any {
    const initial = data[offset++];
    const major = initial >> 5;
    const info = initial & 0x1f;

    let value: number;
    if (info < 24) value = info;
    else if (info === 24) value = data[offset++];
    else if (info === 25) {
      value = (data[offset] << 8) | data[offset + 1];
      offset += 2;
    } else if (info === 26) {
      value =
        (data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3];
      offset += 4;
    } else {
      value = 0;
    }

    switch (major) {
      case 0:
        return value;
      case 1:
        return -1 - value;
      case 2: {
        const bytes = data.slice(offset, offset + value);
        offset += value;
        return bytes;
      }
      case 3: {
        const text = new TextDecoder().decode(data.slice(offset, offset + value));
        offset += value;
        return text;
      }
      case 4: {
        const arr = [];
        for (let i = 0; i < value; i++) arr.push(read());
        return arr;
      }
      case 5: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {};
        for (let i = 0; i < value; i++) {
          const key = read();
          obj[key] = read();
        }
        return obj;
      }
      default:
        return null;
    }
  }

  return read();
}
