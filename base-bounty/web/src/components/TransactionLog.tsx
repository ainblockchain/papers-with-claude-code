'use client';

interface Transaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  builderCodes?: string[];
}

interface Props {
  transactions: Transaction[];
}

export default function TransactionLog({ transactions }: Props) {
  if (!transactions || transactions.length === 0) {
    return <p className="text-gray-500">No transactions recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-2 pr-4">Hash</th>
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">From</th>
            <th className="pb-2 pr-4">To</th>
            <th className="pb-2 pr-4">Value</th>
            <th className="pb-2">Attribution</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.hash} className="border-b border-gray-800 hover:bg-gray-800/50">
              <td className="py-2 pr-4 font-mono text-xs text-cogito-blue">
                <a
                  href={`https://basescan.org/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {tx.hash.substring(0, 10)}...
                </a>
              </td>
              <td className="py-2 pr-4 text-gray-300">
                {new Date(tx.timestamp).toLocaleString()}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-gray-400 truncate max-w-[100px]">
                {tx.from.substring(0, 8)}...
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-gray-400 truncate max-w-[100px]">
                {tx.to.substring(0, 8)}...
              </td>
              <td className="py-2 pr-4 text-white">{tx.value}</td>
              <td className="py-2">
                <div className="flex flex-wrap gap-1">
                  {(tx.builderCodes || []).map((code, i) => (
                    <span
                      key={i}
                      className="text-xs bg-cogito-purple/20 text-cogito-purple px-1.5 py-0.5 rounded"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
