'use client';

import { ExternalLink, GraduationCap, Link2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAgentStore, type LearningAttestation } from '@/stores/useAgentStore';

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export function LearningAttestations() {
  const { attestations } = useAgentStore();

  return (
    <Card className="bg-[#1a1a2e] border-gray-700 text-gray-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-100">On-Chain Attestations</CardTitle>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Dual-Chain
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Dual-chain explanation */}
        <div className="mb-4 p-3 bg-[#16162a] rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-gray-300">Dual-Chain Verification</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 bg-[#1a1a2e] rounded border border-gray-700">
              <span className="text-[#FF9D00] font-medium">KiteAI Chain</span>
              <p className="text-gray-500 mt-0.5">x402 payment settlement</p>
            </div>
            <div className="p-2 bg-[#1a1a2e] rounded border border-gray-700">
              <span className="text-purple-400 font-medium">AIN Blockchain</span>
              <p className="text-gray-500 mt-0.5">Learning attestation record</p>
            </div>
          </div>
        </div>

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
                  <div className="flex items-center gap-1.5">
                    <Badge
                      className={
                        a.chain === 'kite'
                          ? 'bg-[#FF9D00]/20 text-[#FF9D00] border-[#FF9D00]/30'
                          : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      }
                    >
                      {a.chain === 'kite' ? 'Kite' : 'AIN'}
                    </Badge>
                    <Badge className="bg-[#FF9D00]/20 text-[#FF9D00] border-[#FF9D00]/30">
                      Stage {a.stageNum}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                  <span>
                    Score: <strong className="text-white">{a.score}/100</strong>
                  </span>
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
