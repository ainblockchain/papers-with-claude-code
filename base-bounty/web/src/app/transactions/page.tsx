'use client';

import { useEffect, useState } from 'react';
import TransactionLog from '@/components/TransactionLog';
import { AGENT_ADDRESS, AGENT_ID, getRecentTransactions, BaseTx } from '@/lib/base-client';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<BaseTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'attributed'>('all');

  useEffect(() => {
    async function load() {
      try {
        const txs = await getRecentTransactions(AGENT_ADDRESS, 50);
        setTransactions(txs);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayed = filter === 'attributed'
    ? transactions.filter(tx => tx.builderCodes.length > 0)
    : transactions;

  const attributedCount = transactions.filter(tx => tx.builderCodes.length > 0).length;
  const registrationTx = transactions.find(tx =>
    tx.to.toLowerCase() === '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Base Transactions</h1>
        <p className="text-gray-400 text-sm">
          On-chain activity for Agent #{AGENT_ID} on Base mainnet with ERC-8021 builder code attribution
        </p>
        <a href={`https://basescan.org/address/${AGENT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
          className="text-xs text-cogito-blue hover:underline mt-1 inline-block">
          View on BaseScan: {AGENT_ADDRESS}
        </a>
      </div>

      {/* Highlight: ERC-8004 Registration */}
      {registrationTx && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-400 font-bold text-sm">ERC-8004 Registration</span>
            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Agent #{AGENT_ID}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>To: 0x8004A169...9a432</span>
            <span>{new Date(registrationTx.timestamp).toLocaleString()}</span>
            <a href={`https://basescan.org/tx/${registrationTx.hash}`} target="_blank" rel="noopener noreferrer"
              className="text-cogito-blue hover:underline font-mono">
              {registrationTx.hash.substring(0, 16)}...
            </a>
          </div>
        </div>
      )}

      {/* Filter + Stats */}
      {!loading && transactions.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            {transactions.length} transactions | {attributedCount} with ERC-8021 builder codes
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1 rounded ${
                filter === 'all' ? 'bg-cogito-blue text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('attributed')}
              className={`text-xs px-3 py-1 rounded ${
                filter === 'attributed' ? 'bg-cogito-purple text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              With Builder Codes
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse bg-gray-800 rounded-lg h-64" />
      ) : displayed.length > 0 ? (
        <TransactionLog transactions={displayed} />
      ) : (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">
            {filter === 'attributed'
              ? 'No transactions with ERC-8021 builder codes found yet.'
              : 'No transactions found for this agent on Base.'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Each transaction carries ERC-8021 Schema 0 builder codes attributing the Cogito agent
            AND original paper authors whose research was synthesized.
          </p>
        </div>
      )}

      {/* ERC-8021 explainer */}
      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
        <h3 className="font-bold text-sm mb-2">ERC-8021 Builder Code Attribution</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Every Base transaction includes an ERC-8021 Schema 0 suffix in the calldata.
          Format: <span className="font-mono text-gray-300">[codesLength] [comma-delimited codes] [schemaId=0x00] [marker=0x8021...]</span>.
          Builder codes attribute both the agent (<span className="font-mono text-cogito-purple">cogito_node</span>) and
          the original paper authors (e.g., <span className="font-mono text-cogito-purple">arxiv_1706.03762</span>) whose
          research was used to generate knowledge. This creates an onchain attribution chain from the agent
          back to the original knowledge creators.
        </p>
      </div>
    </div>
  );
}
