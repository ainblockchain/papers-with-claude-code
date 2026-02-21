'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart, CheckCircle, AlertTriangle, ExternalLink, SkipForward, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChainSelector } from '@/components/payment/ChainSelector';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { PAYMENT_CHAINS, formatChainAmount } from '@/lib/payment/chains';
import { getBaseUsdcBalance } from '@/lib/payment/base-x402-client';

export function PurchaseModal() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    purchaseModalPaperId,
    purchaseModalPaper,
    isPurchasing,
    purchaseError,
    lastPurchaseReceipt,
    selectedChain,
    setPurchaseModal,
    setSelectedChain,
    purchaseCourse,
    getAccessStatus,
    clearPurchaseError,
  } = usePurchaseStore();

  const handlePurchase = useCallback(async () => {
    if (!purchaseModalPaperId) return;
    clearPurchaseError();
    await purchaseCourse(purchaseModalPaperId);
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

  // Fetch USDC balance when Base is selected
  const [baseBalance, setBaseBalance] = useState<{ formatted: string; balance: bigint } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (!purchaseModalPaperId || selectedChain !== 'base') {
      setBaseBalance(null);
      return;
    }
    setBalanceLoading(true);
    getBaseUsdcBalance()
      .then((result) => setBaseBalance(result))
      .catch(() => setBaseBalance(null))
      .finally(() => setBalanceLoading(false));
  }, [purchaseModalPaperId, selectedChain]);

  if (!purchaseModalPaperId || !purchaseModalPaper) return null;

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    setPurchaseModal(null);
    return null;
  }

  const isSuccess = getAccessStatus(purchaseModalPaperId) === 'purchased' && lastPurchaseReceipt;
  const chainConfig = PAYMENT_CHAINS[selectedChain];
  const requiredAmount = chainConfig.amounts.coursePurchase;
  const hasInsufficientBalance = selectedChain === 'base' && baseBalance && parseFloat(baseBalance.formatted) < requiredAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4">
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
              <p className="mt-1 text-xs text-gray-500 font-mono">settled via x402</p>
              <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                {purchaseModalPaper.title}
              </p>
              {lastPurchaseReceipt && (
                <div className="mt-4 p-3 bg-[#16162a] rounded-lg text-left space-y-2">
                  {lastPurchaseReceipt.txHash && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Tx Hash</span>
                      <code className="text-xs text-blue-400 font-mono">
                        {lastPurchaseReceipt.txHash.length > 14
                          ? `${lastPurchaseReceipt.txHash.slice(0, 6)}...${lastPurchaseReceipt.txHash.slice(-4)}`
                          : lastPurchaseReceipt.txHash}
                      </code>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Amount Paid</span>
                    <span className="text-xs text-green-400 font-mono">
                      {lastPurchaseReceipt.amount} {lastPurchaseReceipt.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Chain</span>
                    <span className="text-xs text-green-400">
                      {PAYMENT_CHAINS[lastPurchaseReceipt.chain].name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Protocol</span>
                    <span className="text-xs text-green-400 font-mono">x402</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Status</span>
                    <span className="text-xs text-green-400">Confirmed</span>
                  </div>
                  {lastPurchaseReceipt.explorerUrl && (
                    <a
                      href={lastPurchaseReceipt.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      View on {PAYMENT_CHAINS[lastPurchaseReceipt.chain].name} Explorer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="font-bold text-lg text-white">Purchase Course</h3>
              <p className="mt-1 text-xs text-gray-500 font-mono">via x402 protocol</p>
              <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                {purchaseModalPaper.title}
              </p>

              {/* Chain Selector */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2 text-left">Select payment chain</p>
                <ChainSelector
                  selectedChain={selectedChain}
                  onSelect={setSelectedChain}
                  paymentType="coursePurchase"
                  disabled={isPurchasing}
                />
              </div>

              <div className="mt-3 p-3 bg-[#16162a] rounded-lg">
                <p className="text-xs text-gray-500">x402 Payment via {chainConfig.name}</p>
                <p className="text-lg font-bold text-white">
                  {formatChainAmount(selectedChain, 'coursePurchase')}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {purchaseModalPaper.totalStages} stages included
                </p>
                {selectedChain === 'base' && (
                  <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      Your Balance
                    </span>
                    {balanceLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
                    ) : baseBalance ? (
                      <span className={`text-xs font-mono ${hasInsufficientBalance ? 'text-red-400' : 'text-green-400'}`}>
                        {baseBalance.formatted} USDC
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">--</span>
                    )}
                  </div>
                )}
                {hasInsufficientBalance && (
                  <p className="mt-1 text-[10px] text-red-400">
                    Insufficient balance. Fund your wallet or use Skip.
                  </p>
                )}
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
                      {purchaseError.includes('insufficient') && chainConfig.faucetUrl && (
                        <a
                          href={chainConfig.faucetUrl}
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
                variant="ghost"
                onClick={() => {
                  if (purchaseModalPaperId) {
                    usePurchaseStore.getState().setAccessStatus(purchaseModalPaperId, 'purchased');
                    router.push(`/learn/${purchaseModalPaperId}`);
                  }
                  handleClose();
                }}
                className="text-xs text-gray-500 hover:text-gray-300 px-2"
                disabled={isPurchasing}
                title="For demo/judge review"
              >
                <SkipForward className="h-3.5 w-3.5 mr-1" />
                Skip
              </Button>
              <Button
                onClick={handlePurchase}
                className="flex-1 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white disabled:opacity-50"
                disabled={isPurchasing || !!hasInsufficientBalance}
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
