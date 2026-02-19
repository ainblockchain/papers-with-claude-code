'use client';

import { useEffect, useState } from 'react';
import TransactionLog from '@/components/TransactionLog';
import { getAllRegisteredNodes } from '@/lib/base-client';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // In production, this would fetch from Basescan API
        // and parse ERC-8021 builder codes from tx data
        const nodes = await getAllRegisteredNodes();

        // Placeholder: show empty state with explanation
        setTransactions([]);
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction Log</h1>
        <p className="text-gray-400 text-sm">
          On-chain transactions with ERC-8021 builder code attribution
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse bg-gray-800 rounded-lg h-64" />
      ) : transactions.length > 0 ? (
        <TransactionLog transactions={transactions} />
      ) : (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">
            Transaction history will appear here once agents start transacting on Base.
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
