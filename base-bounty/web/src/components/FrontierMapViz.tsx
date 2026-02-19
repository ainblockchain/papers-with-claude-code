'use client';

interface FrontierEntry {
  topic: string;
  stats: {
    explorer_count: number;
    max_depth: number;
    avg_depth: number;
  };
}

interface Props {
  entries: FrontierEntry[];
}

export default function FrontierMapViz({ entries }: Props) {
  if (!entries || entries.length === 0) {
    return <p className="text-gray-500">No frontier data available.</p>;
  }

  const maxExplorers = Math.max(...entries.map(e => e.stats.explorer_count), 1);

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const explorerPct = (entry.stats.explorer_count / maxExplorers) * 100;
        const depthPct = (entry.stats.max_depth / 5) * 100;

        return (
          <div key={entry.topic} className="bg-gray-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-sm text-cogito-blue">{entry.topic}</span>
              <span className="text-xs text-gray-400">
                {entry.stats.explorer_count} explorer{entry.stats.explorer_count !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-gray-400">Explorers</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-cogito-blue rounded-full h-2 transition-all"
                    style={{ width: `${explorerPct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-300">{entry.stats.explorer_count}</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="w-16 text-gray-400">Depth</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-cogito-purple rounded-full h-2 transition-all"
                    style={{ width: `${depthPct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-300">
                  {entry.stats.max_depth}/{entry.stats.avg_depth.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
