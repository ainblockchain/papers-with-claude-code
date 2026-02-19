import { ethers } from 'ethers';
import { tagTransaction, AuthorAttribution } from './builder-codes.js';

// USDC on Base mainnet
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export class BaseWallet {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private usdc: ethers.Contract;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, this.signer);
  }

  /**
   * Get USDC balance (human-readable).
   */
  async getUSDCBalance(): Promise<number> {
    const balance = await this.usdc.balanceOf(this.signer.address);
    const decimals = await this.usdc.decimals();
    return Number(ethers.formatUnits(balance, decimals));
  }

  /**
   * Get ETH balance (human-readable).
   */
  async getETHBalance(): Promise<number> {
    const balance = await this.provider.getBalance(this.signer.address);
    return Number(ethers.formatEther(balance));
  }

  /**
   * Send a transaction with ERC-8021 builder code attribution.
   */
  async sendTransaction(
    tx: ethers.TransactionRequest,
    authors?: AuthorAttribution[]
  ): Promise<ethers.TransactionResponse> {
    // Tag transaction data with builder codes
    if (tx.data) {
      tx.data = tagTransaction(tx.data.toString(), authors);
    }
    return this.signer.sendTransaction(tx);
  }

  getAddress(): string {
    return this.signer.address;
  }

  getSigner(): ethers.Wallet {
    return this.signer;
  }
}
