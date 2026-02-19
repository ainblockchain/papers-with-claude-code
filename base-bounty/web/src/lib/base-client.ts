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

export async function getRecentTransactions(address: string, limit = 20): Promise<any[]> {
  // In production, this would use Basescan API or an indexer
  // For now, return empty array
  return [];
}
