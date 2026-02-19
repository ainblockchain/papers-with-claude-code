'use client';

import { useEffect, useState } from 'react';
import {
  AGENT_ADDRESS, AGENT_ID, AGENT_NAME,
  getAgentRegistration, getETHBalance, getUSDCBalance,
} from '@/lib/base-client';
import { getAgentStatus } from '@/lib/agent-client';

export default function EconomicsPage() {
  const [ethBalance, setEthBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [registered, setRegistered] = useState(false);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [reg, eth, usdc, status] = await Promise.allSettled([
        getAgentRegistration(),
        getETHBalance(AGENT_ADDRESS),
        getUSDCBalance(AGENT_ADDRESS).catch(() => 0),
        getAgentStatus().catch(() => null),
      ]);
      if (reg.status === 'fulfilled') setRegistered(reg.value.isRegistered);
      if (eth.status === 'fulfilled') setEthBalance(eth.value);
      if (usdc.status === 'fulfilled') setUsdcBalance(usdc.value);
      if (status.status === 'fulfilled') setAgentStatus(status.value);
      setLoading(false);
    }
    load();
  }, []);

  const revenue = agentStatus?.revenue;
  const ratio = revenue?.sustainabilityRatio ?? 0;

  // Cost model
  const dailyCosts = [
    { item: 'A6000 GPU power (~300W)', cost: 0.72 },
    { item: 'Server hosting', cost: 3.00 },
    { item: 'Base gas fees', cost: 0.10 },
  ];
  const totalDailyCost = dailyCosts.reduce((s, c) => s + c.cost, 0);

  // Revenue model
  const revenueStreams = [
    { product: 'Course Stage Unlock', price: 0.001, volume: '5,000/day', daily: 5.00 },
    { product: 'Knowledge Graph Query', price: 0.005, volume: '1,000/day', daily: 5.00 },
    { product: 'Frontier Map Access', price: 0.002, volume: '500/day', daily: 1.00 },
    { product: 'Curated Analysis', price: 0.05, volume: '100/day', daily: 5.00 },
    { product: 'Agent-to-Agent Trade', price: 0.01, volume: '200/day', daily: 2.00 },
  ];
  const totalDailyRevenue = revenueStreams.reduce((s, r) => s + r.daily, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Self-Sustainability Model</h1>
        <p className="text-gray-400 text-sm">
          How the Cogito Node earns USDC on Base to cover its own operational costs
        </p>
      </div>

      {/* Agent wallet */}
      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{AGENT_NAME}</h2>
            <div className="flex items-center gap-2 mt-1">
              {registered && (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">
                  ERC-8004 #{AGENT_ID}
                </span>
              )}
              <a href={`https://basescan.org/address/${AGENT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
                className="font-mono text-xs text-cogito-blue hover:underline">
                {AGENT_ADDRESS}
              </a>
            </div>
          </div>
          {agentStatus && (
            <div className="text-right">
              <div className="text-xs text-gray-400">Autonomous Cycles</div>
              <div className="text-xl font-bold text-cogito-blue">{agentStatus.thinkCount || 0}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-400">ETH Balance</div>
            <div className="text-lg font-bold">{ethBalance !== null ? ethBalance.toFixed(4) : '...'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">USDC Balance</div>
            <div className="text-lg font-bold">${usdcBalance !== null ? usdcBalance.toFixed(2) : '...'}</div>
          </div>
          {revenue && (
            <>
              <div>
                <div className="text-xs text-gray-400">Income (24h)</div>
                <div className="text-lg font-bold text-green-400">${revenue.incomeLast24h.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Cost (24h)</div>
                <div className="text-lg font-bold text-red-400">${revenue.costLast24h.toFixed(4)}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Autonomous Loop */}
      <div>
        <h2 className="text-lg font-bold mb-3">Autonomous Loop</h2>
        <p className="text-xs text-gray-500 mb-3">Zero human intervention. Agent runs continuously with weighted strategy selection.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { phase: 'THINK', pct: '60%', desc: 'Read arXiv papers, synthesize knowledge, write to AIN graph', textColor: '#60A5FA', barColor: '#3B82F6' },
            { phase: 'ALIGN', pct: '20%', desc: 'Cross-reference peer explorations, identify knowledge gaps', textColor: '#A78BFA', barColor: '#8B5CF6' },
            { phase: 'EARN', pct: '10%', desc: 'Generate courses from explorations, serve x402 endpoints', textColor: '#34D399', barColor: '#10B981' },
            { phase: 'SUSTAIN', pct: '10%', desc: 'Check USDC/ETH balance, adjust strategy for profitability', textColor: '#FBBF24', barColor: '#F59E0B' },
          ].map((p) => (
            <div key={p.phase} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm" style={{ color: p.textColor }}>{p.phase}</span>
                <span className="text-xs font-mono text-gray-400">{p.pct}</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full mb-2">
                <div className="h-1.5 rounded-full" style={{ width: p.pct, backgroundColor: p.barColor }} />
              </div>
              <div className="text-[11px] text-gray-400 leading-tight">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Costs */}
        <div>
          <h2 className="text-lg font-bold mb-3">Daily Operating Costs</h2>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {dailyCosts.map((c) => (
                  <tr key={c.item} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-2.5 text-gray-300">{c.item}</td>
                    <td className="px-4 py-2.5 text-right text-red-400 font-mono">${c.cost.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-900">
                  <td className="px-4 py-2.5 font-bold">Total</td>
                  <td className="px-4 py-2.5 text-right text-red-400 font-bold font-mono">${totalDailyCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue */}
        <div>
          <h2 className="text-lg font-bold mb-3">x402 Revenue Streams</h2>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-700">
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Est. Daily</th>
                </tr>
              </thead>
              <tbody>
                {revenueStreams.map((r) => (
                  <tr key={r.product} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-2 text-gray-300">{r.product}</td>
                    <td className="px-4 py-2 text-right font-mono text-cogito-purple">${r.price}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-400">${r.daily.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-900">
                  <td className="px-4 py-2.5 font-bold" colSpan={2}>Total Revenue</td>
                  <td className="px-4 py-2.5 text-right text-green-400 font-bold font-mono">${totalDailyRevenue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sustainability ratio */}
      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Sustainability Ratio</h2>
          <span className="text-2xl font-bold text-green-400">{(totalDailyRevenue / totalDailyCost).toFixed(1)}x</span>
        </div>
        <div className="bg-gray-700 rounded-full h-3">
          <div className="bg-green-500 rounded-full h-3 transition-all"
            style={{ width: `${Math.min((totalDailyRevenue / totalDailyCost) * 50, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>Cost: ${totalDailyCost.toFixed(2)}/day</span>
          <span className="text-green-400">Revenue: ${totalDailyRevenue.toFixed(2)}/day (projected at scale)</span>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Fixed local inference (A6000 GPU, no API fees) + variable x402 revenue = higher margins as volume scales.
          The agent adjusts its strategy based on the sustainability ratio: more exploration when profitable,
          more earning when costs need coverage.
        </p>
      </div>

      {loading && (
        <div className="text-center text-gray-500 py-4">Loading live data from Base mainnet...</div>
      )}
    </div>
  );
}
