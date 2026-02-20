'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { useAuthStore } from '@/stores/useAuthStore';

export function PurchaseModal() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    purchaseModalPaperId,
    purchaseModalPaper,
    isPurchasing,
    purchaseError,
    lastPurchaseReceipt,
    setPurchaseModal,
    purchaseCourse,
    getAccessStatus,
    clearPurchaseError,
  } = usePurchaseStore();

  const handlePurchase = useCallback(async () => {
    if (!purchaseModalPaperId) return;
    clearPurchaseError();
    const success = await purchaseCourse(purchaseModalPaperId);
    if (success) {
      // Stay open to show success state
    }
  }, [purchaseModalPaperId, purchaseCourse, clearPurchaseError]);

  const handleClose = useCallback(() => {
    setPurchaseModal(null);
  }, [setPurchaseModal]);

  const handleStartLearning = useCallback(() => {
    if (purchaseModalPaperId) {
      router.push(`/learn/${purchaseModalPaperId}`);
      setPurchaseModal(null);
    }
  }, [purchaseModalPaperId, router, setPurchaseModal]);

  if (!purchaseModalPaperId || !purchaseModalPaper) return null;

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    setPurchaseModal(null);
    return null;
  }

  const isSuccess = getAccessStatus(purchaseModalPaperId) === 'purchased' && lastPurchaseReceipt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#FF9D00]/10 flex items-center justify-center mb-4">
            {isSuccess ? (
              <CheckCircle className="h-6 w-6 text-green-400" />
            ) : (
              <ShoppingCart className="h-6 w-6 text-[#FF9D00]" />
            )}
          </div>

          {isSuccess ? (
            <>
              <h3 className="font-bold text-lg text-white">Course Purchased!</h3>
              <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                {purchaseModalPaper.title}
              </p>
              {lastPurchaseReceipt && (
                <div className="mt-4 p-3 bg-[#16162a] rounded-lg text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Amount Paid</span>
                    <span className="text-xs text-green-400 font-mono">
                      {lastPurchaseReceipt.amount} {lastPurchaseReceipt.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Status</span>
                    <span className="text-xs text-green-400">Confirmed</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="font-bold text-lg text-white">Purchase Course</h3>
              <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                {purchaseModalPaper.title}
              </p>
              <div className="mt-4 p-3 bg-[#16162a] rounded-lg">
                <p className="text-xs text-gray-500">x402 Payment via AIN Blockchain</p>
                <p className="text-lg font-bold text-white">10 AIN</p>
                <p className="text-xs text-gray-600 mt-1">
                  {purchaseModalPaper.totalStages} stages included
                </p>
              </div>

              {isPurchasing && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[#FF9D00]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing payment...</span>
                </div>
              )}

              {purchaseError && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-red-400">{purchaseError}</p>
                      {purchaseError.includes('insufficient') && (
                        <a
                          href="https://faucet.gokite.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-xs text-blue-400 hover:text-blue-300"
                        >
                          Get test tokens
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-6">
          {isSuccess ? (
            <Button
              onClick={handleStartLearning}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Start Learning
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                disabled={isPurchasing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                className="flex-1 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white"
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Paying...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    Purchase
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
