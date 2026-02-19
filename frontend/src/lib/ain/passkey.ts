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
 * EVM Compatibility Note:
 * Passkeys use P-256 curve (ES256), NOT secp256k1 (EVM).
 * The private key is non-exportable (stored in OS keystore).
 * We bridge this gap by deriving a deterministic secp256k1 key:
 *   evmPrivateKey = keccak256(p256PublicKey)
 * The server derives the same key from the public key sent in requests.
 */

import { ethers } from 'ethers';

export interface PasskeyInfo {
  credentialId: string;
  publicKey: string; // hex-encoded P-256 public key (DER)
  ainAddress: string; // AIN address (SHA-256 → last 20 bytes)
  evmAddress: string; // EVM address (keccak256 → secp256k1 → address)
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
