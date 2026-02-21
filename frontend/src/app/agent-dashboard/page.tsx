'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentWalletCard } from '@/components/agent/AgentWalletCard';
import { PaymentFlowVisualizer } from '@/components/agent/PaymentFlowVisualizer';
import { PaymentHistory } from '@/components/agent/PaymentHistory';
import { StandingIntentConfig } from '@/components/agent/StandingIntentConfig';
import { KiteMcpConfig } from '@/components/agent/KiteMcpConfig';
import { LearningAttestations } from '@/components/agent/LearningAttestations';
import { useAgentStore } from '@/stores/useAgentStore';
import { AinWalletInfo } from '@/components/ain/AinWalletInfo';
import { KnowledgeGraph } from '@/components/ain/KnowledgeGraph';
import { LearnerProgressView } from '@/components/ain/LearnerProgressView';

export default function AgentDashboardPage() {
  const router = useRouter();
  const { fetchWalletStatus, fetchPaymentHistory, fetchAttestations, fetchMcpStatus } = useAgentStore();

  useEffect(() => {
    fetchWalletStatus();
    fetchPaymentHistory();
    fetchAttestations();
    fetchMcpStatus();
  }, [fetchWalletStatus, fetchPaymentHistory, fetchAttestations, fetchMcpStatus]);

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
            <h1 className="text-lg font-bold text-white">Agent Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        {/* Payment Flow Visualizer - Full Width */}
        <div className="mb-6">
          <PaymentFlowVisualizer />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Left Column: Identity + MCP + Session Info */}
          <div className="space-y-6">
            <AgentWalletCard />
            <KiteMcpConfig />
            <AinWalletInfo />
            <StandingIntentConfig />
          </div>

          {/* Right Column: Payment History + Attestations + On-chain Progress */}
          <div className="space-y-6">
            <PaymentHistory />
            <LearningAttestations />
            <KnowledgeGraph />
            <LearnerProgressView />
          </div>
        </div>
      </div>
    </div>
  );
}
