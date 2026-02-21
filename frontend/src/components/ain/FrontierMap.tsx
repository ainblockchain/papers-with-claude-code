'use client';

import { useEffect } from 'react';
import { Map, RefreshCw, Users, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAinStore } from '@/stores/useAinStore';

export function FrontierMap() {
  const { frontierMap, fetchFrontierMap } = useAinStore();

  useEffect(() => {
    fetchFrontierMap();
  }, [fetchFrontierMap]);

  const entries = frontierMap
    ? Object.entries(frontierMap).sort(
        ([, a], [, b]) => b.explorer_count - a.explorer_count
      )
    : [];

  const maxExplorers = entries.length > 0
    ? Math.max(...entries.map(([, v]) => v.explorer_count))
    : 1;

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <Map className="h-4 w-4 text-emerald-400" />
          Frontier Map
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchFrontierMap()}
          className="h-7 px-2 text-gray-500 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <Map className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No frontier data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(([topicPath, stats]) => {
              const barWidth = (stats.explorer_count / maxExplorers) * 100;
              const topicName = topicPath.split('/').pop() || topicPath;

              return (
                <div key={topicPath} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300 truncate max-w-[200px]">
                      {topicName}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {stats.explorer_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        d{stats.max_depth}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#0f0f23] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    avg depth: {(stats.avg_depth ?? 0).toFixed(1)} / max: {stats.max_depth ?? 0}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
