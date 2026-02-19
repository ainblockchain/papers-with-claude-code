'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentWalletCard } from '@/components/agent/AgentWalletCard';
import { PaymentHistory } from '@/components/agent/PaymentHistory';
import { StandingIntentConfig } from '@/components/agent/StandingIntentConfig';
import { useAgentStore, LearningAttestation } from '@/stores/useAgentStore';
import { AinWalletInfo } from '@/components/ain/AinWalletInfo';
import { KnowledgeGraph } from '@/components/ain/KnowledgeGraph';
import { LearnerProgressView } from '@/components/ain/LearnerProgressView';

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function LearningAttestations() {
  const { attestations } = useAgentStore();

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader>
        <CardTitle className="text-gray-100">Learning Attestations</CardTitle>
      </CardHeader>
      <CardContent>
        {attestations.length === 0 ? (
          <div className="text-center py-8">
            <GraduationCap className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No attestations yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attestations.map((a: LearningAttestation) => (
              <div
                key={a.attestationHash}
                className="p-3 bg-[#16162a] rounded-lg border border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-200 truncate max-w-[180px]">
                    {a.paperTitle}
                  </span>
                  <Badge className="bg-[#FF9D00]/20 text-[#FF9D00] border-[#FF9D00]/30">
                    Stage {a.stageNum}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  <span>Score: <strong className="text-white">{a.score}/100</strong></span>
                  <a
                    href={a.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-mono"
                  >
                    {truncateHash(a.attestationHash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(a.completedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentDashboardPage() {
  const router = useRouter();
  const { fetchWalletStatus, fetchPaymentHistory, fetchAttestations } = useAgentStore();

  useEffect(() => {
    fetchWalletStatus();
    fetchPaymentHistory();
    fetchAttestations();
  }, [fetchWalletStatus, fetchPaymentHistory, fetchAttestations]);

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
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Left Column: Identity + Standing Intent */}
          <div className="space-y-6">
            <AgentWalletCard />
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
