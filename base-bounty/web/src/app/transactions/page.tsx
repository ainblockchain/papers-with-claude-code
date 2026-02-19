'use client';

import { useEffect, useState } from 'react';
import TransactionLog from '@/components/TransactionLog';
import { getAllRegisteredNodes, getRecentTransactions, BaseTx } from '@/lib/base-client';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<BaseTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'attributed'>('all');

  useEffect(() => {
    async function load() {
      try {
        const nodes = await getAllRegisteredNodes();
        const allTxs: BaseTx[] = [];

        for (const node of nodes) {
          try {
            const txs = await getRecentTransactions(node.address, 50);
            allTxs.push(...txs);
          } catch {
            // Skip failed fetches for individual nodes
          }
        }

        // Sort by timestamp descending, dedupe by hash
        const seen = new Set<string>();
        const deduped = allTxs
          .sort((a, b) => b.timestamp - a.timestamp)
          .filter(tx => {
            if (seen.has(tx.hash)) return false;
            seen.add(tx.hash);
            return true;
          });

        setTransactions(deduped);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction Log</h1>
        <p className="text-gray-400 text-sm">
          On-chain transactions with ERC-8021 builder code attribution
        </p>
      </div>

      {!loading && transactions.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            {transactions.length} transactions | {attributedCount} with builder codes
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
              With Attribution
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
              ? 'No transactions with ERC-8021 builder codes found.'
              : 'Transaction history will appear here once agents start transacting on Base.'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Each transaction carries ERC-8021 builder codes attributing the Cogito agent
            AND original paper authors / GitHub contributors.
          </p>
        </div>
      )}
    </div>
  );
}
