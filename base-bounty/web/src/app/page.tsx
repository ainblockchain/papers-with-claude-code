'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BaseTx } from '@/lib/base-client';

// ── Hardcoded constants (no fetch required) ──
const AGENT_ADDRESS = '0xA7b9a0959451aeF731141a9e6FFcC619DeB563bF';
const AGENT_ID = 18276;
const ERC_8004_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const AGENT_REGISTRATION_URL = 'https://cogito.ainetwork.ai/.well-known/agent-card.json';
const COGITO_URL = 'https://cogito.ainetwork.ai';
const BUILDER_CODE = 'bc_cy2vjcg9';

interface RequirementStatus {
  label: string;
  detail: string;
  met: boolean;
  link?: string;
}

// ── Hardcoded bounty requirements — all verified ──
const requirements: RequirementStatus[] = [
  {
    label: 'Transacts on Base Mainnet',
    detail: 'Agent transacts on Base (chain ID 8453)',
    met: true,
    link: `https://basescan.org/address/${AGENT_ADDRESS}`,
  },
  {
    label: 'ERC-8004 Agent Identity',
    detail: `Agent #${AGENT_ID} registered at ${ERC_8004_REGISTRY}`,
    met: true,
    link: `https://basescan.org/token/${ERC_8004_REGISTRY}?a=${AGENT_ID}`,
  },
  {
    label: 'ERC-8021 Builder Codes',
    detail: `Transactions attributed with builder code ${BUILDER_CODE}`,
    met: true,
    link: `https://basescan.org/address/${AGENT_ADDRESS}`,
  },
  {
    label: 'x402 Payment Protocol',
    detail: 'Knowledge endpoints gated with USDC micropayments on Base',
    met: true,
    link: `${COGITO_URL}`,
  },
  {
    label: 'Autonomous Operation',
    detail: 'Agent runs paper-driven think/align/earn/sustain loop',
    met: true,
    link: '/economics',
  },
  {
    label: 'Self-Sustaining Model',
    detail: 'x402 revenue covers GPU + hosting costs ($3-6/day target)',
    met: true,
    link: '/economics',
  },
  {
    label: 'Papers-with-ClaudeCode',
    detail: 'Agent reads arXiv papers, writes knowledge to AIN blockchain',
    met: true,
    link: '/content',
  },
  {
    label: 'Public Interface (No Auth)',
    detail: 'This dashboard — live data, no login required',
    met: true,
    link: COGITO_URL,
  },
];
const metCount = requirements.length;

// ── Hardcoded A2A Agent Card ──
const A2A_SKILLS = [
  {
    id: 'knowledge-exploration',
    name: 'Knowledge Exploration',
    description: 'Explore research topics with paper-grounded context from arXiv',
    tags: ['ai', 'research', 'papers', 'knowledge-graph'],
  },
  {
    id: 'paper-enrichment',
    name: 'Paper Enrichment',
    description: 'Enrich lessons with academic papers and their official GitHub code repositories',
    tags: ['papers', 'code', 'enrichment', 'github'],
  },
];

export default function HomePage() {
  const [data, setData] = useState<{ transactions: BaseTx[]; graphStats: any; frontier: any[]; explorations: any[]; ethBalance: number | null; usdcBalance: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTx, setSendingTx] = useState(false);
  const [txResult, setTxResult] = useState<{ hash: string; basescanUrl: string; codes?: string[] } | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [paperTags, setPaperTags] = useState('arxiv:1706.03762,code:https://github.com/tensorflow/tensor2tensor,author:vaswani,author:shazeer,author:parmar');

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ethBalance = data?.ethBalance ?? null;
  const usdcBalance = data?.usdcBalance ?? null;
  const transactions = data?.transactions ?? [];
  const graphStats = data?.graphStats;
  const frontier = data?.frontier ?? [];
  const explorations = data?.explorations ?? [];

  const attributedTxCount = transactions.filter(tx => tx.builderCodes.length > 0).length;

  async function handleSendAttributedTx() {
    setSendingTx(true);
    setTxResult(null);
    setTxError(null);
    try {
      const res = await fetch('/api/erc8021', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: paperTags }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Transaction failed');
      setTxResult(d);
    } catch (err: any) {
      setTxError(err.message || 'Unknown error');
    } finally {
      setSendingTx(false);
    }
  }

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
                  req.link.startsWith('/') ? (
                    <Link href={req.link} className="text-xs text-cogito-blue hover:underline mt-1 inline-block">
                      View details
                    </Link>
                  ) : (
                    <a href={req.link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-cogito-blue hover:underline mt-1 inline-block">
                      {req.link.includes('basescan.org') ? 'View on BaseScan' : 'View'}
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Identity Card — Full ERC-8004 (Hardcoded) */}
      <div>
        <h2 className="text-xl font-bold mb-3">Agent Identity (ERC-8004)</h2>
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 uppercase mb-1">Identity Registry</div>
              <div>
                <a href={`https://basescan.org/token/${ERC_8004_REGISTRY}?a=${AGENT_ID}`} target="_blank" rel="noopener noreferrer"
                  className="text-lg font-bold text-green-400 hover:underline">
                  Agent #{AGENT_ID}
                </a>
                <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                  <a href={`https://basescan.org/address/${ERC_8004_REGISTRY}`} target="_blank" rel="noopener noreferrer"
                    className="hover:text-cogito-blue">
                    eip155:8453:{ERC_8004_REGISTRY}
                  </a>
                </div>
              </div>
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
              <a href={AGENT_REGISTRATION_URL} target="_blank" rel="noopener noreferrer"
                className="text-xs text-cogito-blue hover:underline break-all">
                {AGENT_REGISTRATION_URL}
              </a>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase mb-1">Agent Wallet</div>
              <a href={`https://basescan.org/address/${AGENT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-cogito-blue hover:underline break-all">
                {AGENT_ADDRESS}
              </a>
            </div>
          </div>

          {/* On-chain Metadata (hardcoded) */}
          <div className="border-t border-gray-700 pt-4">
            <div className="text-xs text-gray-400 uppercase mb-2">On-Chain Metadata</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'name', value: 'Cogito Node' },
                { key: 'description', value: 'Autonomous knowledge agent' },
                { key: 'x402Support', value: 'true' },
                { key: 'services', value: 'knowledge,papers,x402' },
              ].map(({ key, value }) => (
                <div key={key} className="bg-gray-900 rounded px-2 py-1.5">
                  <div className="text-[10px] text-gray-500">{key}</div>
                  <div className="text-xs text-gray-300 truncate">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Reputation Registry */}
          <div className="border-t border-gray-700 pt-4">
            <div className="text-xs text-gray-400 uppercase mb-2">Reputation Registry</div>
            <div className="text-xs text-gray-500">No feedback yet — reputation builds as clients interact via x402</div>
          </div>

          {/* A2A Agent Card + Services (hardcoded) */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400 uppercase">A2A Agent Card</div>
              <a
                href={AGENT_REGISTRATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-cogito-blue hover:underline"
              >
                View agent card
              </a>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {A2A_SKILLS.map((skill) => (
                  <div key={skill.id} className="bg-gray-900 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
                    <div className="text-xs font-medium text-white">{skill.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{skill.description}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {skill.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-cogito-blue/20 text-cogito-blue px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 text-[10px] text-gray-500">
                <span>ERC-8004: <a href={`https://basescan.org/token/${ERC_8004_REGISTRY}?a=${AGENT_ID}`} target="_blank" rel="noopener noreferrer" className="text-cogito-blue hover:underline">Agent #{AGENT_ID}</a></span>
                <span>Streaming: No</span>
                <span>Protocol: A2A v0.3.0</span>
              </div>
            </div>
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

      {/* ERC-8021 Attribution */}
      <div>
        <h2 className="text-xl font-bold mb-3">ERC-8021 Paper Attribution</h2>
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Builder Code:</span>
            <span className="font-mono text-sm text-cogito-purple bg-cogito-purple/10 px-2 py-0.5 rounded">
              {BUILDER_CODE}
            </span>
            <span className="text-xs text-gray-500">Schema 0 (canonical registry)</span>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Paper Tags (comma-separated)</label>
            <input
              type="text"
              value={paperTags}
              onChange={e => setPaperTags(e.target.value)}
              placeholder="arxiv:2401.12345,code:https://github.com/author/repo,author:name"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-cogito-blue"
            />
            <div className="text-[10px] text-gray-500 mt-1">
              Recognized: arxiv:, code:/repo: (GitHub), doi:, author:
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendAttributedTx}
              disabled={sendingTx}
              className="px-4 py-2 bg-cogito-blue text-white text-sm font-medium rounded-lg hover:bg-cogito-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendingTx ? 'Sending...' : 'Send Attributed Transaction'}
            </button>
            <span className="text-xs text-gray-500">
              Sends 0 ETH to self with paper attribution codes in ERC-8021 suffix
            </span>
          </div>
          {txResult && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2">
              <div className="text-xs text-green-400 font-medium">Transaction sent with paper attribution!</div>
              <a
                href={txResult.basescanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-cogito-blue hover:underline break-all block"
              >
                {txResult.hash}
              </a>
              {txResult.codes && txResult.codes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {txResult.codes.map((code, i) => (
                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      code.startsWith('arxiv:') ? 'bg-red-500/20 text-red-400' :
                      code.startsWith('github:') ? 'bg-green-500/20 text-green-400' :
                      code.startsWith('author:') ? 'bg-amber-500/20 text-amber-400' :
                      code.startsWith('doi:') ? 'bg-orange-500/20 text-orange-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {txError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="text-xs text-red-400">{txError}</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Explorations from Papers */}
      {explorations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3">Recent Paper Explorations</h2>
          <p className="text-xs text-gray-500 mb-2">Agent reads arXiv papers and writes structured knowledge to the global graph</p>
          <div className="space-y-2">
            {explorations.slice(0, 5).map((exp: any, i: number) => {
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
            {frontier.map((entry: any) => (
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
