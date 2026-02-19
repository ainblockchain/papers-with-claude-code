import 'dotenv/config';

export interface AgentConfig {
  ainProviderUrl: string;
  ainWsUrl: string;
  ainPrivateKey: string;
  baseRpcUrl: string;
  basePrivateKey: string;
  builderCode: string;
  x402FacilitatorUrl: string;
  agentName: string;
  thinkIntervalMs: number;
  x402Port: number;
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export function loadConfig(): AgentConfig {
  return {
    ainProviderUrl: process.env.AIN_PROVIDER_URL || 'http://localhost:8081',
    ainWsUrl: process.env.AIN_WS_URL || 'ws://localhost:5100',
    ainPrivateKey: requireEnv('AIN_PRIVATE_KEY'),
    baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    basePrivateKey: requireEnv('BASE_PRIVATE_KEY'),
    builderCode: process.env.BUILDER_CODE || 'cogito_node',
    x402FacilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
    agentName: process.env.AGENT_NAME || 'cogito-alpha',
    thinkIntervalMs: parseInt(process.env.THINK_INTERVAL_MS || '60000', 10),
    x402Port: parseInt(process.env.X402_PORT || '3402', 10),
  };
}
