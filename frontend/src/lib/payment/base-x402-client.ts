// Client-side x402 fetch using the user's passkey-derived EVM key.
// No server proxy needed — the user's own wallet signs Base payments.

import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { ClientEvmSigner } from '@x402/evm';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { deriveEvmPrivateKey, loadPasskeyInfo } from '@/lib/ain/passkey';

// USDC on Base Mainnet (6 decimals)
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

const basePublicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Create a fetch wrapper that auto-handles x402 (402) payment challenges
 * using the current user's passkey-derived EVM key on Base.
 *
 * Returns null if no passkey is registered (caller should handle gracefully).
 */
export function createBaseX402Fetch(): typeof fetch | null {
  const info = loadPasskeyInfo();
  if (!info?.publicKey) return null;

  const evmPrivateKey = deriveEvmPrivateKey(info.publicKey) as `0x${string}`;
  const account = privateKeyToAccount(evmPrivateKey);

  // Manually compose ClientEvmSigner: account provides address + signTypedData,
  // publicClient provides readContract.
  const signer: ClientEvmSigner = {
    address: account.address,
    signTypedData: (msg) => account.signTypedData(msg as Parameters<typeof account.signTypedData>[0]),
    readContract: (args) => basePublicClient.readContract(args as Parameters<typeof basePublicClient.readContract>[0]),
  };

  const client = new x402Client();
  client.register('eip155:8453' as `${string}:${string}`, new ExactEvmScheme(signer));
  return wrapFetchWithPayment(fetch, client);
}

/**
 * Get the USDC balance on Base for the user's passkey-derived EVM address.
 * Returns { balance, formatted, address } or null if no passkey.
 */
export async function getBaseUsdcBalance(): Promise<{
  balance: bigint;
  formatted: string;
  address: `0x${string}`;
} | null> {
  const info = loadPasskeyInfo();
  if (!info?.evmAddress) return null;

  const address = info.evmAddress as `0x${string}`;
  const balance = await basePublicClient.readContract({
    address: BASE_USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  return {
    balance,
    formatted: formatUnits(balance, 6),
    address,
  };
}
