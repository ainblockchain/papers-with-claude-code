import { Attribution } from 'ox/erc8021';
import { ethers } from 'ethers';

const BUILDER_CODE = process.env.BUILDER_CODE || 'cogito_node';
const BASE_PRIVATE_KEY = process.env.BASE_PRIVATE_KEY;
const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

/**
 * Encode builder codes into an ERC-8021 Schema 0 data suffix using ox/erc8021.
 */
export function encodeBuilderCodes(codes: string[]): string {
  return Attribution.toDataSuffix({ codes });
}

/**
 * Send a transaction on Base with ERC-8021 builder code attribution.
 */
export async function sendAttributedTransaction(params: {
  to: string;
  value?: string;
  data?: string;
  codes?: string[];
}): Promise<{ hash: string }> {
  if (!BASE_PRIVATE_KEY) {
    throw new Error('BASE_PRIVATE_KEY not configured');
  }

  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const wallet = new ethers.Wallet(BASE_PRIVATE_KEY, provider);

  const codes = params.codes || [BUILDER_CODE];
  const suffix = Attribution.toDataSuffix({ codes });

  const baseData = params.data || '0x';
  const taggedData = baseData + suffix.slice(2); // concat without double 0x

  const tx = await wallet.sendTransaction({
    to: params.to,
    value: params.value ? ethers.parseEther(params.value) : BigInt(0),
    data: taggedData,
  });

  return { hash: tx.hash };
}
