import { ethers } from 'ethers';

const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
const ERC_8004_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ERC_8004_ABI = [
  'function isRegistered(address agent) view returns (bool)',
  'function getIdentity(address agent) view returns (string name, string serviceEndpoint, string metadata)',
  'function getAllRegistered() view returns (address[])',
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

export interface NodeIdentity {
  address: string;
  name: string;
  serviceEndpoint: string;
  metadata: any;
}

export async function getAllRegisteredNodes(): Promise<NodeIdentity[]> {
  const p = getProvider();
  const registry = new ethers.Contract(ERC_8004_REGISTRY, ERC_8004_ABI, p);

  try {
    const addresses: string[] = await registry.getAllRegistered();
    const nodes: NodeIdentity[] = [];

    for (const addr of addresses) {
      try {
        const [name, serviceEndpoint, metadataStr] = await registry.getIdentity(addr);
        let metadata = {};
        try { metadata = JSON.parse(metadataStr); } catch {}
        nodes.push({ address: addr, name, serviceEndpoint, metadata });
      } catch {
        // Skip invalid entries
      }
    }

    return nodes;
  } catch {
    return [];
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

export interface BaseTx {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  input: string;
  builderCodes: string[];
}

const BASESCAN_API_URL = process.env.NEXT_PUBLIC_BASESCAN_API_URL || 'https://api.basescan.org/api';
const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '';

/**
 * Parse ERC-8021 builder codes from transaction input data.
 * Builder codes are length-prefixed UTF-8 strings appended to calldata.
 */
function parseBuilderCodes(txData: string): string[] {
  const hex = txData.startsWith('0x') ? txData.slice(2) : txData;
  if (hex.length < 4) return [];

  const searchRegion = hex.slice(Math.max(0, hex.length - 512));

  for (let startPos = 0; startPos < searchRegion.length; startPos += 2) {
    const candidate = tryParseCodesAt(searchRegion, startPos);
    if (candidate.length > 0 && candidate.some(c => c === 'cogito_node')) {
      return candidate;
    }
  }

  return [];
}

function tryParseCodesAt(hex: string, startPos: number): string[] {
  const codes: string[] = [];
  let pos = startPos;

  while (pos < hex.length) {
    if (pos + 2 > hex.length) break;
    const len = parseInt(hex.slice(pos, pos + 2), 16);
    if (len === 0 || len > 128) break;
    pos += 2;

    const contentHexLen = len * 2;
    if (pos + contentHexLen > hex.length) break;
    const contentHex = hex.slice(pos, pos + contentHexLen);
    pos += contentHexLen;

    try {
      const bytes = new Uint8Array(contentHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
      const content = new TextDecoder().decode(bytes);
      if (/^[\x20-\x7e]+$/.test(content)) {
        codes.push(content);
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  if (pos === hex.length && codes.length > 0) {
    return codes;
  }
  return codes;
}

export async function getRecentTransactions(address: string, limit = 20): Promise<BaseTx[]> {
  const params = new URLSearchParams({
    module: 'account',
    action: 'txlist',
    address,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: String(limit),
    sort: 'desc',
    ...(BASESCAN_API_KEY ? { apikey: BASESCAN_API_KEY } : {}),
  });

  try {
    const res = await fetch(`${BASESCAN_API_URL}?${params}`);
    const json = await res.json();

    if (json.status !== '1' || !Array.isArray(json.result)) {
      return [];
    }

    return json.result.map((tx: any) => ({
      hash: tx.hash,
      timestamp: Number(tx.timeStamp) * 1000,
      from: tx.from,
      to: tx.to || '',
      value: ethers.formatEther(tx.value || '0'),
      input: tx.input || '0x',
      builderCodes: parseBuilderCodes(tx.input || ''),
    }));
  } catch {
    return [];
  }
}
