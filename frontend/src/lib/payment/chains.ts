// Multi-chain payment configuration

export type PaymentChainId = 'kite' | 'base';

export interface PaymentChainConfig {
  id: PaymentChainId;
  name: string;
  currency: string;
  icon: string;
  explorerUrl: string;
  faucetUrl?: string;
  amounts: {
    coursePurchase: number;
    stageUnlock: number;
  };
  enabled: boolean;
}

export const PAYMENT_CHAINS: Record<PaymentChainId, PaymentChainConfig> = {
  kite: {
    id: 'kite',
    name: 'Kite Chain',
    currency: 'USDT',
    icon: '\u{1FA81}',
    explorerUrl:
      process.env.NEXT_PUBLIC_KITE_EXPLORER_URL ||
      'https://testnet.kitescan.ai',
    faucetUrl: 'https://faucet.gokite.ai',
    amounts: { coursePurchase: 0.001, stageUnlock: 0.001 },
    enabled: true,
  },
  base: {
    id: 'base',
    name: 'Base Sepolia',
    currency: 'USDC',
    icon: '\u{1F535}',
    explorerUrl: 'https://sepolia.basescan.org',
    faucetUrl: 'https://portal.cdp.coinbase.com/products/faucet',
    amounts: { coursePurchase: 0.001, stageUnlock: 0.001 },
    enabled: true,
  },
};

export function getEnabledChains(): PaymentChainConfig[] {
  return Object.values(PAYMENT_CHAINS).filter((c) => c.enabled);
}

export function getDefaultChain(): PaymentChainId {
  return 'kite';
}

export function formatChainAmount(
  chain: PaymentChainId,
  type: 'coursePurchase' | 'stageUnlock'
): string {
  const config = PAYMENT_CHAINS[chain];
  return `${config.amounts[type]} ${config.currency}`;
}
