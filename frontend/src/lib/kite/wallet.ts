import { ethers } from 'ethers';
import { getChainConfig } from './contracts';

export interface AgentWallet {
  address: string;
  sessionKeyAddress: string;
  balance: string; // KITE balance in wei
  chainId: number;
}

export interface WalletConfig {
  rpcUrl: string;
  chainId: number;
  agentPrivateKey: string; // Server-side only
}

export interface SessionKeyRules {
  maxTransactionValue: string; // wei
  dailyCap: string; // wei
  allowedContracts: string[];
  allowedFunctions: string[];
  ttlSeconds: number;
}

interface SessionKey {
  address: string;
  privateKey: string;
  expiresAt: number;
  rules: SessionKeyRules;
}

export class KiteWalletManager {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private sessionKey: SessionKey | null = null;
  private isConfigured: boolean;

  constructor(config?: Partial<WalletConfig>) {
    const chainConfig = getChainConfig();
    const rpcUrl = config?.rpcUrl || chainConfig.rpcUrl;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const privateKey = config?.agentPrivateKey || process.env.KITE_AGENT_PRIVATE_KEY || '';
    this.isConfigured = privateKey.length > 0;

    // Use a dummy key when not configured to avoid constructor crash
    const keyToUse = this.isConfigured
      ? privateKey
      : '0x0000000000000000000000000000000000000000000000000000000000000001';
    this.wallet = new ethers.Wallet(keyToUse, this.provider);
  }

  getIsConfigured(): boolean {
    return this.isConfigured;
  }

  async getOrCreateWallet(config?: WalletConfig): Promise<AgentWallet> {
    const chainConfig = getChainConfig();
    const balance = await this.getBalance(this.wallet.address);

    return {
      address: this.wallet.address,
      sessionKeyAddress: this.sessionKey?.address || this.wallet.address,
      balance,
      chainId: config?.chainId || chainConfig.chainId,
    };
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return balance.toString();
  }

  async createSessionKey(rules: SessionKeyRules): Promise<SessionKey> {
    const ephemeralWallet = ethers.Wallet.createRandom();
    const expiresAt = Math.floor(Date.now() / 1000) + rules.ttlSeconds;

    this.sessionKey = {
      address: ephemeralWallet.address,
      privateKey: ephemeralWallet.privateKey,
      expiresAt,
      rules,
    };

    return this.sessionKey;
  }

  async signWithSessionKey(
    transaction: ethers.TransactionRequest
  ): Promise<string> {
    if (!this.sessionKey) {
      throw new Error('No active session key. Call createSessionKey first.');
    }

    if (Date.now() / 1000 > this.sessionKey.expiresAt) {
      throw new Error('Session key expired');
    }

    const sessionWallet = new ethers.Wallet(
      this.sessionKey.privateKey,
      this.provider
    );
    const tx = await sessionWallet.signTransaction(transaction);
    return tx;
  }

  getWallet(): ethers.Wallet {
    return this.wallet;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getSessionKey(): SessionKey | null {
    return this.sessionKey;
  }
}
