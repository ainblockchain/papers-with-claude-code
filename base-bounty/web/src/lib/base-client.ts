import { ethers } from 'ethers';

const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
export const ERC_8004_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Our known agent address and ID
export const AGENT_ADDRESS = '0xA7b9a0959451aeF731141a9e6FFcC619DeB563bF';
export const AGENT_ID = 18276;
export const AGENT_NAME = 'Cogito Node';
export const AGENT_URI = 'https://cogito.papers-with-claudecode.ai';

// ERC-8004 is ERC-721 based — correct ABI
const ERC_8004_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

let provider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  }
  return provider;
}

export interface AgentRegistration {
  agentId: number;
  address: string;
  tokenURI: string;
  isRegistered: boolean;
}

/**
 * Check if our agent is registered on ERC-8004 and get its token metadata.
 */
export async function getAgentRegistration(): Promise<AgentRegistration> {
  const p = getProvider();
  const registry = new ethers.Contract(ERC_8004_REGISTRY, ERC_8004_ABI, p);

  try {
    const balance = await registry.balanceOf(AGENT_ADDRESS);
    const isRegistered = Number(balance) > 0;

    let tokenURI = '';
    if (isRegistered) {
      try {
        tokenURI = await registry.tokenURI(AGENT_ID);
      } catch {}
    }

    return { agentId: AGENT_ID, address: AGENT_ADDRESS, tokenURI, isRegistered };
  } catch {
    return { agentId: AGENT_ID, address: AGENT_ADDRESS, tokenURI: '', isRegistered: false };
  }
}

export async function getUSDCBalance(address: string): Promise<number> {
  const p = getProvider();
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, p);
  const balance = await usdc.balanceOf(address);
  const decimals = await usdc.decimals();
  return Number(ethers.formatUnits(balance, decimals));
}

export async function getETHBalance(address: string): Promise<number> {
  const p = getProvider();
  const balance = await p.getBalance(address);
  return Number(ethers.formatEther(balance));
}

// ---------------------------------------------------------------------------
// ERC-8021 Builder Code parsing (Schema 0)
// ---------------------------------------------------------------------------

const ERC_8021_MARKER = '80218021802180218021802180218021'; // 16 bytes

/**
 * Parse ERC-8021 Schema 0 builder codes from transaction calldata.
 * Format: [codesLength(1B)] [codes(comma-delimited)] [schemaId(1B)] [marker(16B)]
 */
export function parseBuilderCodes(txData: string): string[] {
  const hex = txData.startsWith('0x') ? txData.slice(2) : txData;
  if (hex.length < 36) return []; // minimum: 1B len + 1B code + 1B schema + 16B marker = 19B = 38 hex

  // Check for ERC-8021 marker at the end
  if (!hex.endsWith(ERC_8021_MARKER)) return [];

  // Read schemaId (1 byte before marker)
  const schemaIdPos = hex.length - 32 - 2; // 32 hex = 16 bytes marker, 2 hex = 1 byte schema
  const schemaId = parseInt(hex.slice(schemaIdPos, schemaIdPos + 2), 16);
  if (schemaId !== 0) return []; // only Schema 0

  // Read codesLength: try from largest possible downward
  const codesEnd = schemaIdPos;
  const maxCodesLen = Math.floor((codesEnd - 2) / 2); // subtract 2 hex for the length byte itself

  for (let tryLen = Math.min(maxCodesLen, 255); tryLen >= 1; tryLen--) {
    const lenBytePos = codesEnd - (tryLen * 2) - 2;
    if (lenBytePos < 0) continue;

    const lenByte = parseInt(hex.slice(lenBytePos, lenBytePos + 2), 16);
    if (lenByte !== tryLen) continue;

    // Extract codes string
    const codesHex = hex.slice(lenBytePos + 2, codesEnd);
    try {
      const bytes = new Uint8Array(codesHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
      const codesStr = new TextDecoder().decode(bytes);
      // Validate: should be printable ASCII
      if (/^[\x20-\x7e]+$/.test(codesStr)) {
        return codesStr.split(',').filter(c => c.length > 0);
      }
    } catch {}
  }

  return [];
}

// ---------------------------------------------------------------------------
// Transaction history
// ---------------------------------------------------------------------------

export interface BaseTx {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  input: string;
  builderCodes: string[];
}

/**
 * Fetch recent transactions via Blockscout V2 API (BaseScan V1 is deprecated).
 */
export async function getRecentTransactions(address: string, limit = 50): Promise<BaseTx[]> {
  const BLOCKSCOUT_URL = process.env.NEXT_PUBLIC_BLOCKSCOUT_URL || 'https://base.blockscout.com';

  try {
    const res = await fetch(`${BLOCKSCOUT_URL}/api/v2/addresses/${address}/transactions`);
    const json = await res.json();
    const items = json.items || [];

    return items.map((tx: any) => ({
      hash: tx.hash,
      timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() : 0,
      from: tx.from?.hash || '',
      to: tx.to?.hash || '',
      value: tx.value ? ethers.formatEther(tx.value) : '0',
      input: tx.raw_input || tx.input || '0x',
      builderCodes: parseBuilderCodes(tx.raw_input || tx.input || ''),
    }));
  } catch {
    return [];
  }
}

/**
 * Get the ERC-8004 registration transaction from Blockscout.
 */
export async function getRegistrationTx(): Promise<BaseTx | null> {
  const txs = await getRecentTransactions(AGENT_ADDRESS, 50);
  return txs.find(tx => tx.to.toLowerCase() === ERC_8004_REGISTRY.toLowerCase()) || null;
}

/**
 * Get transactions that have ERC-8021 builder codes.
 */
export async function getAttributedTransactions(): Promise<BaseTx[]> {
  const txs = await getRecentTransactions(AGENT_ADDRESS, 50);
  return txs.filter(tx => tx.builderCodes.length > 0);
}
