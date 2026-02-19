export { AgentConfig } from './config.js';

export interface ThinkResult {
  topicPath: string;
  entryId: string;
  title: string;
  depth: number;
}

export type Strategy = 'explore' | 'align' | 'earn' | 'sustain';

export interface RevenueSnapshot {
  incomeLast24h: number;
  costLast24h: number;
  sustainabilityRatio: number;
  usdcBalance: number;
}

export interface TransactionRecord {
  txHash: string;
  timestamp: number;
  type: 'exploration' | 'course_purchase' | 'x402_revenue' | 'alignment';
  amount?: number;
  builderCodes?: string[];
}
