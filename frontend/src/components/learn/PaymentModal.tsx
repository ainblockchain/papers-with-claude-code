'use client';

import { useState } from 'react';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLearningStore } from '@/stores/useLearningStore';
import { x402Adapter } from '@/lib/adapters/x402';

export function PaymentModal() {
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    currentPaper,
    stages,
    currentStageIndex,
    isPaymentModalOpen,
    setPaymentModalOpen,
    setDoorUnlocked,
  } = useLearningStore();

  if (!isPaymentModalOpen || !currentPaper) return null;

  const nextStage = stages[currentStageIndex + 1];
  if (!nextStage) return null;

  const handlePayment = async () => {
    setIsPaying(true);
    setError(null);
    try {
      const result = await x402Adapter.requestPayment({
        stageId: nextStage.id,
        paperId: currentPaper.id,
        amount: 0.001,
        currency: 'ETH',
      });
      if (result.success) {
        setDoorUnlocked(true);
        setPaymentModalOpen(false);
      } else {
        setError(result.error || 'Payment failed. Please try again.');
      }
    } catch {
      setError('Payment failed. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#FF9D00]/10 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-[#FF9D00]" />
          </div>
          <h3 className="font-bold text-lg text-[#111827]">Unlock Stage {nextStage.stageNumber}</h3>
          <p className="mt-2 text-sm text-[#6B7280]">
            {nextStage.title}
          </p>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-[#6B7280]">x402 Payment</p>
            <p className="text-lg font-bold text-[#111827]">0.001 ETH</p>
          </div>
          {error && (
            <p className="mt-3 text-xs text-red-500">{error}</p>
          )}
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <Button
            variant="outline"
            onClick={() => setPaymentModalOpen(false)}
            className="flex-1"
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
                Processing...
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-1.5" />
                Unlock
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
