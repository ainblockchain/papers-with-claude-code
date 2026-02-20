import { ethers } from 'ethers';

const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
export const ERC_8004_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Our known agent address and ID
export const AGENT_ADDRESS = '0xA7b9a0959451aeF731141a9e6FFcC619DeB563bF';
export const AGENT_ID = 18276;
export const AGENT_NAME = 'Cogito Node';
// agentURI points to the AIN blockchain-hosted registration file
export const AGENT_URI = 'https://devnet-api.ainetwork.ai/json?path=/apps/knowledge/agent_registration';

// Full ERC-8004 Identity Registry ABI (read functions)
const ERC_8004_ABI = [
  // ERC-721 basics
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  // ERC-8004 Identity extensions
  'function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)',
  'function getAgentWallet(uint256 agentId) view returns (address)',
];

// ERC-8004 Reputation Registry ABI (read functions)
const ERC_8004_REPUTATION_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'; // Same contract or separate — update if different
const REPUTATION_ABI = [
  'function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
  'function getClients(uint256 agentId) view returns (address[])',
  'function getLastIndex(uint256 agentId, address clientAddress) view returns (uint64)',
  'function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)',
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
  agentWallet?: string;
  metadata?: Record<string, string>;
}

/**
 * Check if our agent is registered on ERC-8004 and get full identity data.
 */
export async function getAgentRegistration(): Promise<AgentRegistration> {
  const p = getProvider();
  const registry = new ethers.Contract(ERC_8004_REGISTRY, ERC_8004_ABI, p);

  try {
    const balance = await registry.balanceOf(AGENT_ADDRESS);
    const isRegistered = Number(balance) > 0;

    let tokenURI = '';
    let agentWallet: string | undefined;
    const metadata: Record<string, string> = {};

    if (isRegistered) {
      // Get tokenURI
      try {
        tokenURI = await registry.tokenURI(AGENT_ID);
      } catch {}

      // Get agent wallet (payment address)
      try {
        const wallet = await registry.getAgentWallet(AGENT_ID);
        if (wallet && wallet !== ethers.ZeroAddress) {
          agentWallet = wallet;
        }
      } catch {}

      // Try reading common metadata keys
      for (const key of ['name', 'description', 'x402Support', 'services']) {
        try {
          const raw = await registry.getMetadata(AGENT_ID, key);
          if (raw && raw !== '0x') {
            metadata[key] = ethers.toUtf8String(raw);
          }
        } catch {}
      }
    }

    return { agentId: AGENT_ID, address: AGENT_ADDRESS, tokenURI, isRegistered, agentWallet, metadata };
  } catch {
    return { agentId: AGENT_ID, address: AGENT_ADDRESS, tokenURI: '', isRegistered: false };
  }
}

/**
 * Parse the on-chain tokenURI (base64 data URI) into JSON metadata.
 */
export function parseTokenURI(tokenURI: string): Record<string, unknown> | null {
  const prefix = 'data:application/json;base64,';
  if (tokenURI.startsWith(prefix)) {
    try {
      const json = atob(tokenURI.slice(prefix.length));
      return JSON.parse(json);
    } catch {}
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reputation Registry (read-only)
// ---------------------------------------------------------------------------

export interface ReputationSummary {
  count: number;
  summaryValue: number;
  valueDecimals: number;
}

export interface FeedbackEntry {
  clientAddress: string;
  feedbackIndex: number;
  value: number;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  isRevoked: boolean;
}

/**
 * Get reputation summary for an agent from the Reputation Registry.
 */
export async function getReputationSummary(agentId: number = AGENT_ID): Promise<ReputationSummary | null> {
  const p = getProvider();
  const reputation = new ethers.Contract(ERC_8004_REPUTATION_REGISTRY, REPUTATION_ABI, p);

  try {
    const [count, summaryValue, valueDecimals] = await reputation.getSummary(agentId, [], '', '');
    return {
      count: Number(count),
      summaryValue: Number(summaryValue),
      valueDecimals: Number(valueDecimals),
    };
  } catch {
    return null;
  }
}

/**
 * Get all clients who have given feedback to an agent.
 */
export async function getReputationClients(agentId: number = AGENT_ID): Promise<string[]> {
  const p = getProvider();
  const reputation = new ethers.Contract(ERC_8004_REPUTATION_REGISTRY, REPUTATION_ABI, p);

  try {
    return await reputation.getClients(agentId);
  } catch {
    return [];
  }
}

/**
 * Read individual feedback entries for an agent from a specific client.
 */
export async function readFeedback(agentId: number, clientAddress: string, feedbackIndex: number): Promise<FeedbackEntry | null> {
  const p = getProvider();
  const reputation = new ethers.Contract(ERC_8004_REPUTATION_REGISTRY, REPUTATION_ABI, p);

  try {
    const [value, valueDecimals, tag1, tag2, isRevoked] = await reputation.readFeedback(agentId, clientAddress, feedbackIndex);
    return {
      clientAddress,
      feedbackIndex,
      value: Number(value),
      valueDecimals: Number(valueDecimals),
      tag1,
      tag2,
      isRevoked,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

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
  if (hex.length < 36) return [];

  if (!hex.endsWith(ERC_8021_MARKER)) return [];

  const schemaIdPos = hex.length - 32 - 2;
  const schemaId = parseInt(hex.slice(schemaIdPos, schemaIdPos + 2), 16);
  if (schemaId !== 0) return [];

  const codesEnd = schemaIdPos;
  const maxCodesLen = Math.floor((codesEnd - 2) / 2);

  for (let tryLen = Math.min(maxCodesLen, 255); tryLen >= 1; tryLen--) {
    const lenBytePos = codesEnd - (tryLen * 2) - 2;
    if (lenBytePos < 0) continue;

    const lenByte = parseInt(hex.slice(lenBytePos, lenBytePos + 2), 16);
    if (lenByte !== tryLen) continue;

    const codesHex = hex.slice(lenBytePos + 2, codesEnd);
    try {
      const bytes = new Uint8Array(codesHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
      const codesStr = new TextDecoder().decode(bytes);
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
 * Fetch recent transactions via Blockscout V2 API.
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

// ---------------------------------------------------------------------------
// A2A Agent Card (from AIN blockchain)
// ---------------------------------------------------------------------------

const AIN_PROVIDER_URL = process.env.NEXT_PUBLIC_AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';

/**
 * Fetch the A2A agent card from AIN blockchain state.
 */
export async function getA2AAgentCard(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${AIN_PROVIDER_URL}/json?path=/apps/knowledge/a2a_agent_card`);
    const data = await res.json();
    return data?.result || data || null;
  } catch {
    return null;
  }
}

/**
 * Fetch the ERC-8004 registration file from AIN blockchain state.
 */
export async function getAgentRegistrationFile(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${AIN_PROVIDER_URL}/json?path=/apps/knowledge/agent_registration`);
    const data = await res.json();
    return data?.result || data || null;
  } catch {
    return null;
  }
}
