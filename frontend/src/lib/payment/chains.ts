// Multi-chain payment configuration

export type PaymentChainId = 'kite' | 'ain' | 'base';

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
    currency: 'USDC',
    icon: '\u{1FA81}',
    explorerUrl:
      process.env.NEXT_PUBLIC_KITE_EXPLORER_URL ||
      'https://testnet.kitescan.ai',
    faucetUrl: 'https://faucet.gokite.ai',
    amounts: { coursePurchase: 0.001, stageUnlock: 0.001 },
    enabled: true,
  },
  ain: {
    id: 'ain',
    name: 'AIN Blockchain',
    currency: 'AIN',
    icon: '\u{1F517}',
    explorerUrl: 'https://insight.ainetwork.ai',
    amounts: { coursePurchase: 10, stageUnlock: 5 },
    enabled: true,
  },
  base: {
    id: 'base',
    name: 'Base',
    currency: 'USDC',
    icon: '\u{1F535}',
    explorerUrl: 'https://basescan.org',
    amounts: { coursePurchase: 0.001, stageUnlock: 0.001 },
    enabled: false,
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
