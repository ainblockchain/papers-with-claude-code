'use client';

import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useExploreStore } from '@/stores/useExploreStore';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const { searchQuery, setSearchQuery, period, setPeriod } = useExploreStore();

  const periods = ['daily', 'weekly', 'monthly'] as const;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8">
      {/* Left: Title */}
      <div>
        <h1 className="text-3xl font-bold text-[#111827]">Explore Papers</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Discover the latest research and start learning with Claude Code
        </p>
      </div>

      {/* Right: Search + Filters */}
      <div className="flex flex-col items-end gap-2 w-full md:w-auto">
        <div className="relative w-full md:w-[400px]">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FF9D00]" />
          <Input
            placeholder="Search any paper with AI"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 rounded-full border-gray-300"
          />
        </div>
        <div className="flex items-center gap-1">
          {periods.map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              onClick={() => setPeriod(p)}
              className={cn(
                'text-xs capitalize',
                period === p
                  ? 'font-bold text-[#111827] underline underline-offset-4'
                  : 'text-[#6B7280]'
              )}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
