'use client';

import { ExternalLink, Loader2, Receipt } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAgentStore } from '@/stores/useAgentStore';

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function PaymentHistory() {
  const { paymentHistory, isLoadingHistory } = useAgentStore();

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader>
        <CardTitle className="text-gray-100">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading...</span>
          </div>
        ) : paymentHistory.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No payments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-500 text-xs">
                  <th className="py-2 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">Time</th>
                  <th className="py-2 text-left font-medium">Course</th>
                  <th className="py-2 text-left font-medium">Stage</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                  <th className="py-2 text-left font-medium">Tx Hash</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((entry, i) => (
                  <tr key={entry.txHash} className="border-b border-gray-800 hover:bg-white/5">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 text-gray-300">{relativeTime(entry.timestamp)}</td>
                    <td className="py-2 text-gray-200 max-w-[120px] truncate">
                      {entry.paperTitle}
                    </td>
                    <td className="py-2 text-gray-300">
                      {entry.stageNum != null ? `Stage ${entry.stageNum}` : '-'}
                    </td>
                    <td className="py-2 text-right text-white font-mono">
                      {entry.amount} <span className="text-gray-500">KITE</span>
                    </td>
                    <td className="py-2">
                      <a
                        href={entry.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-mono text-xs"
                      >
                        {truncateHash(entry.txHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="py-2 text-right">
                      <Badge className={statusColors[entry.status] || statusColors.pending}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
