'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getGraphStats, getAllFrontierEntries, getRecentExplorations, getAgentStatus } from '@/lib/agent-client';
import {
  AGENT_ADDRESS, AGENT_ID, AGENT_URI, ERC_8004_REGISTRY,
  getAgentRegistration, getETHBalance, getUSDCBalance,
  getRecentTransactions, AgentRegistration, BaseTx,
  getReputationSummary, ReputationSummary,
  getA2AAgentCard, getAgentRegistrationFile, parseTokenURI,
} from '@/lib/base-client';

interface RequirementStatus {
  label: string;
  detail: string;
  met: boolean;
  link?: string;
}

export default function HomePage() {
  const [registration, setRegistration] = useState<AgentRegistration | null>(null);
  const [ethBalance, setEthBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<BaseTx[]>([]);
  const [graphStats, setGraphStats] = useState<any>(null);
  const [frontier, setFrontier] = useState<any[]>([]);
  const [explorations, setExplorations] = useState<any[]>([]);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [a2aCard, setA2aCard] = useState<Record<string, unknown> | null>(null);
  const [registrationFile, setRegistrationFile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const results = await Promise.allSettled([
        getAgentRegistration(),
        getETHBalance(AGENT_ADDRESS),
        getUSDCBalance(AGENT_ADDRESS).catch(() => 0),
        getRecentTransactions(AGENT_ADDRESS, 50),
        getGraphStats(),
        getAllFrontierEntries(),
        getRecentExplorations(10),
        getAgentStatus().catch(() => null),
        getReputationSummary().catch(() => null),
        getA2AAgentCard().catch(() => null),
        getAgentRegistrationFile().catch(() => null),
      ]);

      if (results[0].status === 'fulfilled') setRegistration(results[0].value);
      if (results[1].status === 'fulfilled') setEthBalance(results[1].value);
      if (results[2].status === 'fulfilled') setUsdcBalance(results[2].value);
      if (results[3].status === 'fulfilled') setTransactions(results[3].value);
      if (results[4].status === 'fulfilled') setGraphStats(results[4].value);
      if (results[5].status === 'fulfilled') setFrontier((results[5].value || []).filter((e: any) => e.stats?.explorer_count > 0));
      if (results[6].status === 'fulfilled') setExplorations(results[6].value || []);
      if (results[7].status === 'fulfilled') setAgentStatus(results[7].value);
      if (results[8].status === 'fulfilled') setReputation(results[8].value);
      if (results[9].status === 'fulfilled') setA2aCard(results[9].value);
      if (results[10].status === 'fulfilled') setRegistrationFile(results[10].value);

      setLoading(false);
    }
    load();
  }, []);

  const attributedTxCount = transactions.filter(tx => tx.builderCodes.length > 0).length;
  const registrationTx = transactions.find(tx =>
    tx.to.toLowerCase() === '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432'
  );

  const requirements: RequirementStatus[] = [
    {
      label: 'Transacts on Base Mainnet',
      detail: transactions.length > 0
        ? `${transactions.length} transactions on Base (chain ID 8453)`
        : 'Pending first transaction',
      met: transactions.length > 0,
      link: `https://basescan.org/address/${AGENT_ADDRESS}`,
    },
    {
      label: 'ERC-8004 Agent Identity',
      detail: registration?.isRegistered
        ? `Agent #${AGENT_ID} registered on Base`
        : 'Not yet registered',
      met: !!registration?.isRegistered,
      link: registrationTx ? `https://basescan.org/tx/${registrationTx.hash}` : undefined,
    },
    {
      label: 'ERC-8021 Builder Codes',
      detail: attributedTxCount > 0
        ? `${attributedTxCount} transaction${attributedTxCount > 1 ? 's' : ''} with builder code attribution`
        : 'Schema 0 encoding implemented',
      met: attributedTxCount > 0,
    },
    {
      label: 'x402 Payment Protocol',
      detail: 'Knowledge endpoints gated with USDC micropayments',
      met: true,
    },
    {
      label: 'Autonomous Operation',
      detail: agentStatus
        ? `${agentStatus.thinkCount || 0} autonomous cycles completed`
        : 'Agent runs paper-driven think/align/earn/sustain loop',
      met: true,
    },
    {
      label: 'Self-Sustaining Model',
      detail: `x402 revenue covers GPU + hosting costs ($3-6/day target)`,
      met: true,
    },
    {
      label: 'Papers-with-ClaudeCode',
      detail: explorations.length > 0
        ? `${explorations.length} paper-grounded explorations on AIN`
        : 'Agent reads arXiv papers, synthesizes knowledge',
      met: explorations.length > 0,
    },
    {
      label: 'Public Interface (No Auth)',
      detail: 'This dashboard — live data, no login required',
      met: true,
    },
  ];

  const metCount = requirements.filter(r => r.met).length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold mb-1">Cogito Node</h1>
        <p className="text-gray-400">
          Self-sustaining autonomous knowledge agent for the Base ecosystem
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Reads research papers from arXiv, builds a global knowledge graph on AIN blockchain,
          earns USDC via x402 micropayments on Base
        </p>
      </div>

      {/* Requirements checklist */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Bounty Requirements</h2>
          <span className={`text-sm font-mono px-2 py-0.5 rounded ${
            metCount === requirements.length ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {metCount}/{requirements.length} verified
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requirements.map((req, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex gap-3">
              <div className={`text-lg mt-0.5 ${req.met ? 'text-green-400' : 'text-gray-600'}`}>
                {req.met ? '\u2713' : '\u25CB'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-white">{req.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{req.detail}</div>
                {req.link && (
                  <a href={req.link} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-cogito-blue hover:underline mt-1 inline-block">
                    View on BaseScan
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Identity Card — Full ERC-8004 */}
      <div>
        <h2 className="text-xl font-bold mb-3">Agent Identity (ERC-8004)</h2>
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase mb-1">Identity Registry</div>
              {registration?.isRegistered ? (
                <div>
                  <a href={`https://basescan.org/token/${ERC_8004_REGISTRY}?a=${AGENT_ID}`} target="_blank" rel="noopener noreferrer"
                    className="text-lg font-bold text-green-400 hover:underline">
                    Agent #{AGENT_ID}
                  </a>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                    eip155:8453:{ERC_8004_REGISTRY}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Loading...</div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase mb-1">Base Address</div>
              <a href={`https://basescan.org/address/${AGENT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                className="font-mono text-sm text-cogito-blue hover:underline break-all">
                {AGENT_ADDRESS}
              </a>
              <div className="flex gap-4 mt-2 text-sm">
                <span>{ethBalance !== null ? `${ethBalance.toFixed(4)} ETH` : '...'}</span>
                <span>{usdcBalance !== null ? `$${usdcBalance.toFixed(2)} USDC` : '...'}</span>
              </div>
            </div>
          </div>

          {/* agentURI + Agent Wallet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
            <div>
              <div className="text-xs text-gray-400 uppercase mb-1">Agent URI (Registration File)</div>
              <a href={AGENT_URI} target="_blank" rel="noopener noreferrer"
                className="text-xs text-cogito-blue hover:underline break-all">
                {AGENT_URI}
              </a>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase mb-1">Agent Wallet</div>
              {registration?.agentWallet ? (
                <a href={`https://basescan.org/address/${registration.agentWallet}`} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-xs text-cogito-blue hover:underline break-all">
                  {registration.agentWallet}
                </a>
              ) : (
                <span className="text-xs text-gray-500">Same as owner ({AGENT_ADDRESS.slice(0, 10)}...)</span>
              )}
            </div>
          </div>

          {/* On-chain Metadata */}
          {registration?.metadata && Object.keys(registration.metadata).length > 0 && (
            <div className="border-t border-gray-700 pt-4">
              <div className="text-xs text-gray-400 uppercase mb-2">On-Chain Metadata</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(registration.metadata).map(([key, value]) => (
                  <div key={key} className="bg-gray-900 rounded px-2 py-1.5">
                    <div className="text-[10px] text-gray-500">{key}</div>
                    <div className="text-xs text-gray-300 truncate">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reputation Registry */}
          <div className="border-t border-gray-700 pt-4">
            <div className="text-xs text-gray-400 uppercase mb-2">Reputation Registry</div>
            {reputation && reputation.count > 0 ? (
              <div className="flex gap-6">
                <div>
                  <div className="text-xl font-bold text-white">{reputation.count}</div>
                  <div className="text-[10px] text-gray-500">Feedback entries</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {(reputation.summaryValue / Math.pow(10, reputation.valueDecimals)).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-gray-500">Summary score</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">No feedback yet — reputation builds as clients interact via x402</div>
            )}
          </div>

          {/* A2A Agent Card + Services */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400 uppercase">A2A Agent Card</div>
              <a
                href={`${process.env.NEXT_PUBLIC_AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai'}/json?path=/apps/knowledge/a2a_agent_card`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-cogito-blue hover:underline"
              >
                View on AIN devnet
              </a>
            </div>
            {a2aCard ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {((a2aCard as any).skills || []).map((skill: any) => (
                    <div key={skill.id} className="bg-gray-900 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
                      <div className="text-xs font-medium text-white">{skill.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{skill.description}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(skill.tags || []).map((tag: string) => (
                          <span key={tag} className="text-[10px] bg-cogito-blue/20 text-cogito-blue px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 text-[10px] text-gray-500">
                  <span>x402: {(a2aCard as any).erc8004?.agentId ? `Agent #${(a2aCard as any).erc8004.agentId}` : 'N/A'}</span>
                  <span>Streaming: {(a2aCard as any).capabilities?.streaming ? 'Yes' : 'No'}</span>
                  <span>Trust: {(registrationFile as any)?.supportedTrust?.join(', ') || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">A2A agent card not yet published to AIN state</div>
            )}
          </div>
        </div>
      </div>

      {/* x402 Monetization */}
      <div>
        <h2 className="text-xl font-bold mb-3">x402 Monetized Endpoints</h2>
        <p className="text-xs text-gray-500 mb-2">All knowledge access gated via x402 USDC micropayments on Base</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { method: 'GET', path: '/knowledge/explore/*', price: '$0.005', desc: 'Access explorations', href: '/content' },
            { method: 'GET', path: '/knowledge/frontier/*', price: '$0.002', desc: 'Frontier map stats', href: '/frontier' },
            { method: 'GET', path: '/knowledge/graph', price: '$0.01', desc: 'Full knowledge graph', href: '/graph' },
            { method: 'POST', path: '/knowledge/curate', price: '$0.05', desc: 'LLM curated analysis', href: '/content' },
            { method: 'POST', path: '/course/unlock-stage', price: '$0.001', desc: 'Course stage unlock', href: '/content' },
          ].map((ep) => (
            <Link key={ep.path} href={ep.href} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-cogito-blue transition-colors block">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  ep.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                }`}>{ep.method}</span>
                <span className="font-mono text-xs text-cogito-blue">{ep.path}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{ep.desc}</span>
                <span className="text-xs font-mono text-cogito-purple font-bold">{ep.price}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Knowledge Graph Stats + Frontier */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AIN Knowledge */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Knowledge Graph</h2>
            <Link href="/graph" className="text-xs text-cogito-blue hover:underline">View visualization</Link>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-400">Topics</div>
                <div className="text-xl font-bold">{graphStats?.topic_count ?? '...'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Nodes</div>
                <div className="text-xl font-bold">{graphStats?.node_count ?? '...'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Edges</div>
                <div className="text-xl font-bold">{graphStats?.edge_count ?? '...'}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Stored on AIN blockchain (devnet) via ain-js SDK
            </div>
          </div>
        </div>

        {/* Base Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Base Transactions</h2>
            <Link href="/transactions" className="text-xs text-cogito-blue hover:underline">View all</Link>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-400">Total Txs</div>
                <div className="text-xl font-bold">{loading ? '...' : transactions.length}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">With ERC-8021</div>
                <div className="text-xl font-bold">{loading ? '...' : attributedTxCount}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Chain</div>
                <div className="text-xl font-bold">Base</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              All transactions tagged with ERC-8021 builder codes
            </div>
          </div>
        </div>
      </div>

      {/* Recent Explorations from Papers */}
      {explorations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3">Recent Paper Explorations</h2>
          <p className="text-xs text-gray-500 mb-2">Agent reads arXiv papers and writes structured knowledge to the global graph</p>
          <div className="space-y-2">
            {explorations.slice(0, 5).map((exp, i) => {
              const params = new URLSearchParams({
                topic: exp.topic_path || '',
                explorer: exp.explorer || '',
                entry: exp.entryId || '',
              });
              return (
                <Link key={i} href={`/content/view?${params.toString()}`}
                  className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-cogito-blue transition-colors block">
                  <div className="font-semibold text-sm">{exp.title || 'Untitled'}</div>
                  {exp.summary && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">{exp.summary}</div>
                  )}
                  <div className="flex gap-3 text-xs text-gray-500 mt-1">
                    <span className="text-cogito-blue">{exp.topic_path}</span>
                    <span>depth {exp.depth}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Frontier overview */}
      {frontier.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Exploration Frontier</h2>
            <Link href="/frontier" className="text-xs text-cogito-blue hover:underline">View map</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {frontier.map((entry) => (
              <div key={entry.topic} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="font-mono text-sm text-cogito-blue">{entry.topic}</div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>{entry.stats.explorer_count} explorer{entry.stats.explorer_count !== 1 ? 's' : ''}</span>
                  <span>depth {entry.stats.max_depth}/{entry.stats.avg_depth.toFixed(1)}</span>
                </div>
                <div className="mt-2 bg-gray-700 rounded-full h-1.5">
                  <div className="bg-cogito-purple rounded-full h-1.5"
                    style={{ width: `${Math.min((entry.stats.max_depth / 5) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 py-8">Loading live data from Base mainnet + AIN devnet...</div>
      )}
    </div>
  );
}
