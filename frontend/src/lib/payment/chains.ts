// Multi-chain payment configuration

export type PaymentChainId = 'base';

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
  base: {
    id: 'base',
    name: 'Base',
    currency: 'USDC',
    icon: '\u{1F535}',
    explorerUrl: 'https://basescan.org',
    amounts: { coursePurchase: 0.001, stageUnlock: 0.001 },
    enabled: true,
  },
};

export function getEnabledChains(): PaymentChainConfig[] {
  return Object.values(PAYMENT_CHAINS).filter((c) => c.enabled);
}

export function getDefaultChain(): PaymentChainId {
  return 'base';
}

export function formatChainAmount(
  chain: PaymentChainId,
  type: 'coursePurchase' | 'stageUnlock'
): string {
  const config = PAYMENT_CHAINS[chain];
  return `${config.amounts[type]} ${config.currency}`;
}
