import { NextResponse } from 'next/server';
import {
  AGENT_ADDRESS, AGENT_ID, AGENT_REGISTRATION_URL, ERC_8004_REGISTRY,
  getAgentRegistration, getETHBalance, getUSDCBalance,
  getRecentTransactions, getReputationSummary,
  getA2AAgentCard, getAgentRegistrationFile,
} from '@/lib/base-client';

const COGITO_URL = process.env.NEXT_PUBLIC_COGITO_URL || 'https://cogito.ainetwork.ai';
const CACHE_TTL_MS = 60_000; // 1 minute

let cached: { data: any; ts: number } | null = null;

async function rpc(action: string, params: Record<string, any> = {}): Promise<any> {
  const res = await fetch(`${COGITO_URL}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  const json = await res.json();
  if (json.error) return null;
  return json.result;
}

async function fetchAll() {
  const [
    registration,
    ethBalance,
    usdcBalance,
    transactions,
    graphStats,
    frontier,
    explorations,
    agentStatus,
    reputation,
    a2aCard,
    registrationFile,
  ] = await Promise.allSettled([
    getAgentRegistration(),
    getETHBalance(AGENT_ADDRESS),
    getUSDCBalance(AGENT_ADDRESS).catch(() => 0),
    getRecentTransactions(AGENT_ADDRESS, 50),
    rpc('getGraphStats'),
    rpc('getAllFrontierEntries'),
    rpc('getRecentExplorations', { limit: 10 }),
    (async () => {
      const [gs, exps] = await Promise.allSettled([
        rpc('getGraphStats'),
        rpc('getRecentExplorations', { limit: 10 }),
      ]);
      return {
        running: true,
        thinkCount: gs.status === 'fulfilled' ? gs.value?.node_count || 0 : 0,
        recentExplorations: exps.status === 'fulfilled' ? exps.value || [] : [],
      };
    })(),
    getReputationSummary().catch(() => null),
    getA2AAgentCard().catch(() => null),
    getAgentRegistrationFile().catch(() => null),
  ]);

  return {
    registration: registration.status === 'fulfilled' ? registration.value : null,
    ethBalance: ethBalance.status === 'fulfilled' ? ethBalance.value : null,
    usdcBalance: usdcBalance.status === 'fulfilled' ? usdcBalance.value : null,
    transactions: transactions.status === 'fulfilled' ? transactions.value : [],
    graphStats: graphStats.status === 'fulfilled' ? graphStats.value : null,
    frontier: frontier.status === 'fulfilled'
      ? ((frontier.value || []) as any[]).filter((e: any) => e.stats?.explorer_count > 0)
      : [],
    explorations: explorations.status === 'fulfilled' ? explorations.value || [] : [],
    agentStatus: agentStatus.status === 'fulfilled' ? agentStatus.value : null,
    reputation: reputation.status === 'fulfilled' ? reputation.value : null,
    a2aCard: a2aCard.status === 'fulfilled' ? a2aCard.value : null,
    registrationFile: registrationFile.status === 'fulfilled' ? registrationFile.value : null,
    constants: { AGENT_ADDRESS, AGENT_ID, AGENT_REGISTRATION_URL, ERC_8004_REGISTRY },
    cachedAt: Date.now(),
  };
}

export async function GET() {
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const data = await fetchAll();
  cached = { data, ts: Date.now() };
  return NextResponse.json(data);
}
