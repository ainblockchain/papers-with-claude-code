'use client';

import { useEffect } from 'react';
import { BookOpen, Award, ShoppingCart, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAinStore } from '@/stores/useAinStore';

export function LearnerProgressView({ address }: { address?: string }) {
  const { ainAddress, progress, isLoadingProgress, fetchProgress } = useAinStore();
  const targetAddress = address || ainAddress;

  useEffect(() => {
    if (targetAddress) {
      fetchProgress(targetAddress);
    }
  }, [targetAddress, fetchProgress]);

  if (!targetAddress) {
    return (
      <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-gray-500">Connect AIN wallet to view progress</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <BookOpen className="h-4 w-4 text-amber-400" />
          Learning Progress
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => targetAddress && fetchProgress(targetAddress)}
          disabled={isLoadingProgress}
          className="h-7 px-2 text-gray-500 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingProgress ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {!progress ? (
          <div className="text-center py-8">
            <BookOpen className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {isLoadingProgress ? 'Loading...' : 'No progress data'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-[#0f0f23] rounded-lg text-center">
                <p className="text-lg font-bold text-white">{progress.totalTopics}</p>
                <p className="text-xs text-gray-500">Topics</p>
              </div>
              <div className="p-2 bg-[#0f0f23] rounded-lg text-center">
                <p className="text-lg font-bold text-white">{progress.totalEntries}</p>
                <p className="text-xs text-gray-500">Entries</p>
              </div>
              <div className="p-2 bg-[#0f0f23] rounded-lg text-center">
                <p className="text-lg font-bold text-white">{progress.totalPurchases}</p>
                <p className="text-xs text-gray-500">Purchases</p>
              </div>
            </div>

            {/* Topics */}
            {progress.topics.map((topic) => (
              <div key={topic.topicPath} className="p-3 bg-[#16162a] rounded-lg border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-200">
                    {topic.topicPath.split('/').pop()}
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {topic.entryCount} entries
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {topic.entries.slice(0, 5).map((entry) => (
                    <div key={entry.entryId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Award className="h-3 w-3 text-amber-400" />
                        <span className="text-gray-300 truncate max-w-[180px]">
                          {entry.title}
                        </span>
                      </div>
                      <span className="text-gray-600">d{entry.depth}</span>
                    </div>
                  ))}
                  {topic.entries.length > 5 && (
                    <p className="text-xs text-gray-600">
                      +{topic.entries.length - 5} more entries
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Purchases */}
            {progress.purchases.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  Purchases
                </h4>
                <div className="space-y-1.5">
                  {progress.purchases.map((p) => (
                    <div key={p.key} className="flex items-center justify-between text-xs p-2 bg-[#0f0f23] rounded">
                      <span className="text-gray-300 truncate max-w-[150px]">
                        {p.topicPath.split('/').pop()}
                      </span>
                      <span className="text-amber-400 font-mono">{p.amount} {p.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
