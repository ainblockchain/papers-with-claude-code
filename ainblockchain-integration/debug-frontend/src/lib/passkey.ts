/**
 * WebAuthn / Passkey helpers for P256-based AIN wallet.
 *
 * Flow:
 * 1. navigator.credentials.create() with alg: -7 (ES256/P256)
 * 2. Extract P256 public key from attestation
 * 3. Derive AIN address from P256 pubkey (keccak256)
 * 4. For signing: navigator.credentials.get() signs a challenge
 * 5. Server formats the P256 signature for AIN blockchain
 */

/**
 * Generate WebAuthn creation options for P256 passkey.
 */
export function getRegistrationOptions(userId: string, userName: string) {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  return {
    publicKey: {
      challenge,
      rp: {
        name: 'AIN Debug Frontend',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' as const }, // ES256 (P256)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform' as const,
        residentKey: 'preferred' as const,
        userVerification: 'preferred' as const,
      },
      timeout: 60000,
      attestation: 'direct' as const,
    },
  };
}

/**
 * Extract the raw P256 public key from a WebAuthn attestation response.
 * Returns the 65-byte uncompressed public key (04 || x || y).
 */
export function extractPublicKeyFromAttestation(
  attestationObject: ArrayBuffer
): Uint8Array | null {
  try {
    // Decode CBOR attestation object
    const cbor = decodeCBOR(new Uint8Array(attestationObject));
    const authData = cbor.authData;

    // Skip rpIdHash (32) + flags (1) + signCount (4) = 37 bytes
    let offset = 37;

    // Read AAGUID (16 bytes)
    offset += 16;

    // Read credential ID length (2 bytes, big-endian)
    const credIdLen = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;

    // Skip credential ID
    offset += credIdLen;

    // The rest is the COSE public key
    const coseKeyBytes = authData.slice(offset);
    const coseKey = decodeCBOR(coseKeyBytes);

    // COSE key for P256: -2 = x coordinate, -3 = y coordinate
    const x = coseKey[-2] || coseKey.get?.(-2);
    const y = coseKey[-3] || coseKey.get?.(-3);

    if (!x || !y) return null;

    // Build uncompressed public key: 04 || x(32) || y(32)
    const pubKey = new Uint8Array(65);
    pubKey[0] = 0x04;
    pubKey.set(new Uint8Array(x.buffer || x), 1);
    pubKey.set(new Uint8Array(y.buffer || y), 33);

    return pubKey;
  } catch (e) {
    console.error('Failed to extract public key from attestation:', e);
    return null;
  }
}

/**
 * Generate WebAuthn assertion options for signing.
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

/**
 * Convert a buffer to base64url string.
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert a base64url string to ArrayBuffer.
 */
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

/**
 * Convert bytes to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Minimal CBOR decoder (handles the subset used by WebAuthn).
 */
function decodeCBOR(data: Uint8Array): any {
  let offset = 0;

  function read(): any {
    const initialByte = data[offset++];
    const majorType = initialByte >> 5;
    const additionalInfo = initialByte & 0x1f;

    let value: number;
    if (additionalInfo < 24) {
      value = additionalInfo;
    } else if (additionalInfo === 24) {
      value = data[offset++];
    } else if (additionalInfo === 25) {
      value = (data[offset] << 8) | data[offset + 1];
      offset += 2;
    } else if (additionalInfo === 26) {
      value =
        (data[offset] << 24) |
        (data[offset + 1] << 16) |
        (data[offset + 2] << 8) |
        data[offset + 3];
      offset += 4;
    } else {
      value = 0;
    }

    switch (majorType) {
      case 0: // unsigned integer
        return value;
      case 1: // negative integer
        return -1 - value;
      case 2: { // byte string
        const bytes = data.slice(offset, offset + value);
        offset += value;
        return bytes;
      }
      case 3: { // text string
        const text = new TextDecoder().decode(data.slice(offset, offset + value));
        offset += value;
        return text;
      }
      case 4: { // array
        const arr = [];
        for (let i = 0; i < value; i++) {
          arr.push(read());
        }
        return arr;
      }
      case 5: { // map
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
