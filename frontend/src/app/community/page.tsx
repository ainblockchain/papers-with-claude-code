'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AinWalletInfo } from '@/components/ain/AinWalletInfo';
import { KnowledgeGraph } from '@/components/ain/KnowledgeGraph';
import { FrontierMap } from '@/components/ain/FrontierMap';
import { LearnerProgressView } from '@/components/ain/LearnerProgressView';

export default function CommunityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0f0f23] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#16162a]">
        <div className="mx-auto max-w-[1280px] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-lg font-bold text-white">Community</h1>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
              AIN Blockchain
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <AinWalletInfo />
            <FrontierMap />
            <LearnerProgressView />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <KnowledgeGraph />
          </div>
        </div>
      </div>
    </div>
  );
}
