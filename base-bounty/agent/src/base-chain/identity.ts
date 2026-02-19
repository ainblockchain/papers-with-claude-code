import { ethers } from 'ethers';

const ERC_8004_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';

// Minimal ABI for ERC-8004 Agent Identity Registry
const ERC_8004_ABI = [
  'function register(string name, string serviceEndpoint, string metadata) external',
  'function isRegistered(address agent) external view returns (bool)',
  'function getIdentity(address agent) external view returns (string name, string serviceEndpoint, string metadata)',
  'function getAllRegistered() external view returns (address[])',
];

export class AgentIdentity {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private registry: ethers.Contract;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.registry = new ethers.Contract(ERC_8004_REGISTRY, ERC_8004_ABI, this.signer);
  }

  /**
   * Register this agent on the ERC-8004 registry.
   */
  async register(agentName: string, serviceEndpoint: string): Promise<string> {
    const metadata = JSON.stringify({
      type: 'cogito-node',
      version: '0.1.0',
      services: ['Knowledge API'],
      x402Support: true,
    });

    const tx = await this.registry.register(agentName, serviceEndpoint, metadata);
    const receipt = await tx.wait();
    console.log(`[Identity] Registered as ${agentName} — tx: ${receipt.hash}`);
    return receipt.hash;
  }

  /**
   * Check if an address is registered.
   */
  async isRegistered(address?: string): Promise<boolean> {
    const addr = address || await this.signer.getAddress();
    return this.registry.isRegistered(addr);
  }

  /**
   * Get identity info for an address.
   */
  async getIdentity(address?: string): Promise<{ name: string; serviceEndpoint: string; metadata: string }> {
    const addr = address || await this.signer.getAddress();
    const [name, serviceEndpoint, metadata] = await this.registry.getIdentity(addr);
    return { name, serviceEndpoint, metadata };
  }

  /**
   * Get all registered node addresses.
   */
  async getAllRegisteredNodes(): Promise<string[]> {
    return this.registry.getAllRegistered();
  }

  getAddress(): string {
    return this.signer.address;
  }
}
