'use client';

interface Props {
  address: string;
  usdcBalance: number;
  ethBalance: number;
  revenue?: { incomeLast24h: number; costLast24h: number; sustainabilityRatio: number };
}

export default function NodeEconomics({ address, usdcBalance, ethBalance, revenue }: Props) {
  const ratio = revenue?.sustainabilityRatio ?? 0;
  const ratioColor = ratio >= 1 ? 'text-green-400' : ratio >= 0.5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="font-mono text-xs text-gray-400 truncate mb-3">{address}</div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-400">USDC Balance</div>
          <div className="text-lg font-bold text-white">${usdcBalance.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">ETH Balance</div>
          <div className="text-lg font-bold text-white">{ethBalance.toFixed(4)}</div>
        </div>

        {revenue && (
          <>
            <div>
              <div className="text-xs text-gray-400">Income (24h)</div>
              <div className="text-sm text-green-400">${revenue.incomeLast24h.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Cost (24h)</div>
              <div className="text-sm text-red-400">${revenue.costLast24h.toFixed(4)}</div>
            </div>
          </>
        )}
      </div>

      {revenue && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Sustainability</span>
            <span className={`text-sm font-bold ${ratioColor}`}>
              {ratio === Infinity ? 'self-sustaining' : `${ratio.toFixed(2)}x`}
            </span>
          </div>
          <div className="mt-1 bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                ratio >= 1 ? 'bg-green-500' : ratio >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
