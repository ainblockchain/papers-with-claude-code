// Client-side x402 fetch using the user's passkey-derived EVM key.
// No server proxy needed — the user's own wallet signs Base Sepolia payments.

import { privateKeyToAccount } from 'viem/accounts';
import { toClientEvmSigner } from '@x402/evm';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { deriveEvmPrivateKey, loadPasskeyInfo } from '@/lib/ain/passkey';

/**
 * Create a fetch wrapper that auto-handles x402 (402) payment challenges
 * using the current user's passkey-derived EVM key on Base Sepolia.
 *
 * Returns null if no passkey is registered (caller should handle gracefully).
 */
export function createBaseX402Fetch(): typeof fetch | null {
  const info = loadPasskeyInfo();
  if (!info?.publicKey) return null;

  const evmPrivateKey = deriveEvmPrivateKey(info.publicKey) as `0x${string}`;
  const account = privateKeyToAccount(evmPrivateKey);
  const signer = toClientEvmSigner(account);

  const client = new x402Client();
  client.register('eip155:84532' as `${string}:${string}`, new ExactEvmScheme(signer));
  return wrapFetchWithPayment(fetch, client);
}
