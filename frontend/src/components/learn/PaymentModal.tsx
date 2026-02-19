'use client';

import { useState } from 'react';
import { Loader2, Lock, Unlock, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLearningStore } from '@/stores/useLearningStore';
import { x402Adapter } from '@/lib/adapters/x402';

type PaymentPhase = 'idle' | 'signing' | 'submitting' | 'confirming' | 'done';

const phaseLabels: Record<PaymentPhase, string> = {
  idle: '',
  signing: 'Signing...',
  submitting: 'Submitting to Kite Chain...',
  confirming: 'Confirming...',
  done: 'Done',
};

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

const EXPLORER_BASE = process.env.NEXT_PUBLIC_KITE_EXPLORER_URL || 'https://testnet.kitescan.ai';
const FAUCET_URL = 'https://faucet.gokite.ai';

export function PaymentModal() {
  const [phase, setPhase] = useState<PaymentPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resultTxHash, setResultTxHash] = useState<string | null>(null);
  const [resultExplorerUrl, setResultExplorerUrl] = useState<string | null>(null);
  const {
    currentPaper,
    stages,
    currentStageIndex,
    isPaymentModalOpen,
    setPaymentModalOpen,
    setDoorUnlocked,
    setTxHash,
    setExplorerUrl,
  } = useLearningStore();

  if (!isPaymentModalOpen || !currentPaper) return null;

  const nextStage = stages[currentStageIndex + 1];
  if (!nextStage) return null;

  const isPaying = phase !== 'idle' && phase !== 'done';

  const handlePayment = async () => {
    setPhase('signing');
    setError(null);
    setErrorCode(null);
    try {
      setPhase('submitting');
      const result = await x402Adapter.requestPayment({
        stageId: nextStage.id,
        paperId: currentPaper.id,
        amount: 0.001,
        currency: 'KITE',
        stageNum: nextStage.stageNumber,
        score: 0,
      });

      if (result.success) {
        setPhase('confirming');
        // Brief pause to show confirming state
        await new Promise(resolve => setTimeout(resolve, 500));
        setPhase('done');
        setResultTxHash(result.txHash || null);
        setResultExplorerUrl(result.explorerUrl || null);
        setTxHash(result.txHash || null);
        setExplorerUrl(result.explorerUrl || null);
        setDoorUnlocked(true);
      } else {
        setPhase('idle');
        setError(result.error || 'Payment failed. Please try again.');
        setErrorCode(result.errorCode || null);
      }
    } catch {
      setPhase('idle');
      setError('Payment failed. Please try again.');
    }
  };

  const handleClose = () => {
    setPaymentModalOpen(false);
    setPhase('idle');
    setError(null);
    setErrorCode(null);
    setResultTxHash(null);
    setResultExplorerUrl(null);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#FF9D00]/10 flex items-center justify-center mb-4">
            {phase === 'done' ? (
              <Unlock className="h-6 w-6 text-green-400" />
            ) : (
              <Lock className="h-6 w-6 text-[#FF9D00]" />
            )}
          </div>

          {phase === 'done' ? (
            <>
              <h3 className="font-bold text-lg text-white">Stage Unlocked!</h3>
              <p className="mt-2 text-sm text-gray-400">
                {nextStage.title}
              </p>
              {resultTxHash && (
                <div className="mt-4 p-3 bg-[#16162a] rounded-lg text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Tx Hash</span>
                    <code className="text-xs text-blue-400 font-mono">
                      {truncateHash(resultTxHash)}
                    </code>
                  </div>
                  {resultExplorerUrl && (
                    <a
                      href={resultExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      View on KiteScan
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="font-bold text-lg text-white">Unlock Stage {nextStage.stageNumber}</h3>
              <p className="mt-2 text-sm text-gray-400">
                {nextStage.title}
              </p>
              <div className="mt-4 p-3 bg-[#16162a] rounded-lg">
                <p className="text-xs text-gray-500">x402 Payment</p>
                <p className="text-lg font-bold text-white">0.001 KITE</p>
              </div>

              {/* Progress indicator */}
              {isPaying && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[#FF9D00]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{phaseLabels[phase]}</span>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-red-400">{error}</p>
                      {errorCode === 'insufficient_funds' && (
                        <a
                          href={FAUCET_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          Get test KITE tokens
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {errorCode === 'spending_limit_exceeded' && (
                        <a
                          href="/agent-dashboard"
                          className="inline-flex items-center gap-1 mt-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          Update Standing Intent
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {errorCode === 'session_expired' && (
                        <p className="mt-1 text-xs text-gray-400">Please re-authenticate to continue.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-6">
          {phase === 'done' ? (
            <Button
              onClick={handleClose}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Continue
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                disabled={isPaying}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                className="flex-1 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white"
                disabled={isPaying}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    {phaseLabels[phase]}
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-1.5" />
                    Unlock
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
