/**
 * Server-side AIN blockchain client.
 *
 * getAinClient()       — service wallet (admin/read-only operations)
 * getUserAinClient(pk) — per-user wallet derived from passkey public key
 */

/* eslint-disable @typescript-eslint/no-require-imports */
let ainInstance: any = null;

/** Cached per-user AIN clients keyed by derived address */
const userClientCache = new Map<string, any>();

export function getAinClient(): any {
  if (ainInstance) return ainInstance;

  const Ain = require('@ainblockchain/ain-js').default;
  const providerUrl = process.env.AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';
  const chainId = Number(process.env.AIN_CHAIN_ID ?? 0); // 0 = testnet, 1 = mainnet
  ainInstance = new Ain(providerUrl, null, chainId);

  const privateKey = process.env.AIN_PRIVATE_KEY;
  if (privateKey) {
    ainInstance.wallet.addAndSetDefaultAccount(privateKey);
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[AIN] AIN_PRIVATE_KEY not set — service wallet will be random on each cold start.');
    }
    const addresses = ainInstance.wallet.create(1);
    const addr = Array.isArray(addresses) ? addresses[0] : addresses;
    if (addr) ainInstance.wallet.setDefaultAccount(addr);
  }

  return ainInstance;
}

/**
 * Get a per-user AIN client whose wallet is deterministically derived
 * from the user's passkey P-256 public key: privateKey = keccak256(publicKeyHex).
 * Data written with this client is stored under the user's own address.
 */
export function getUserAinClient(passkeyPublicKey: string): any {
  const { keccak256 } = require('ethers');
  const input = passkeyPublicKey.startsWith('0x') ? passkeyPublicKey : `0x${passkeyPublicKey}`;
  const derivedPrivateKey: string = keccak256(input);
  // AIN SDK's wallet.add() uses Buffer.from(key, 'hex') which does NOT handle 0x prefix
  const rawPrivateKey = derivedPrivateKey.startsWith('0x') ? derivedPrivateKey.slice(2) : derivedPrivateKey;

  if (userClientCache.has(rawPrivateKey)) {
    return userClientCache.get(rawPrivateKey);
  }

  const Ain = require('@ainblockchain/ain-js').default;
  const providerUrl = process.env.AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';
  const chainId = Number(process.env.AIN_CHAIN_ID ?? 0);
  const userAin = new Ain(providerUrl, null, chainId);
  userAin.wallet.addAndSetDefaultAccount(rawPrivateKey);

  userClientCache.set(rawPrivateKey, userAin);
  return userAin;
}

export function getProviderUrl(): string {
  return process.env.AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';
}
