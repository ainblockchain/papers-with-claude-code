'use client';

import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useExploreStore } from '@/stores/useExploreStore';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const { searchQuery, setSearchQuery, activeTab, setActiveTab } = useExploreStore();

  const tabs = [
    { key: 'courses' as const, label: 'Courses' },
    { key: 'series' as const, label: 'Series' },
  ];

  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        {/* Left: Title */}
        <div>
          <h1 className="text-3xl font-bold text-[#111827]">Explore Papers</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Discover the latest research and start learning with Claude Code
          </p>
        </div>

        {/* Right: Search */}
        <div className="relative w-full md:w-[400px]">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FF9D00]" />
          <Input
            placeholder="Search courses and series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 rounded-full border-gray-300"
          />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5E7EB]">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'text-sm rounded-none border-b-2 -mb-px px-4',
              activeTab === tab.key
                ? 'font-semibold text-[#111827] border-[#FF9D00]'
                : 'text-[#6B7280] border-transparent hover:text-[#111827]'
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
