// Payment adapter — client-side x402 on Base via the user's passkey-derived EVM key.

import { useAuthStore } from '@/stores/useAuthStore';
import { type PaymentChainId } from './chains';
import { createBaseX402Fetch } from './base-x402-client';

export interface PaymentResult {
  success: boolean;
  receiptId?: string;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface ChainPaymentParams {
  chain: PaymentChainId;
  paperId: string;
  stageId?: string;
  stageNum?: number;
  score?: number;
}

class MultiChainPaymentAdapter {
  async purchaseCourse(params: ChainPaymentParams): Promise<PaymentResult> {
    return this.basePurchaseCourse(params);
  }

  async unlockStage(params: ChainPaymentParams): Promise<PaymentResult> {
    return this.baseUnlockStage(params);
  }

  private async basePurchaseCourse(
    params: ChainPaymentParams
  ): Promise<PaymentResult> {
    const x402Fetch = createBaseX402Fetch();
    if (!x402Fetch) {
      return { success: false, error: 'Register passkey first to pay on Base.', errorCode: 'no_passkey' };
    }
    try {
      const res = await x402Fetch('/api/x402/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: params.paperId,
          passkeyPublicKey: useAuthStore.getState().passkeyInfo?.publicKey || '',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const errorMsg = body?.details
          ? `${body.error}: ${body.details}`
          : (body?.message ?? body?.error ?? `Request failed (${res.status})`);
        return {
          success: false,
          error: errorMsg,
          errorCode: body?.error ?? 'payment_failed',
        };
      }

      const txHash = this.extractTxHashFromResponse(res);
      const data = await res.json();
      const explorerUrl = txHash
        ? `https://basescan.org/tx/${txHash}`
        : data.explorerUrl;

      return {
        success: true,
        receiptId: data.enrollment?.paperId,
        txHash: txHash || data.txHash,
        explorerUrl,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return {
        success: false,
        error: msg.includes('payment payload') ? 'Payment signing failed. Use Skip for demo access.' : msg,
        errorCode: 'network_error',
      };
    }
  }

  private async baseUnlockStage(
    params: ChainPaymentParams
  ): Promise<PaymentResult> {
    const x402Fetch = createBaseX402Fetch();
    if (!x402Fetch) {
      return { success: false, error: 'Register passkey first to pay on Base.', errorCode: 'no_passkey' };
    }
    try {
      const res = await x402Fetch('/api/x402/unlock-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: params.paperId,
          stageId: params.stageId,
          stageNum: params.stageNum ?? 0,
          score: params.score ?? 0,
          passkeyPublicKey: useAuthStore.getState().passkeyInfo?.publicKey || '',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const errorMsg = body?.details
          ? `${body.error}: ${body.details}`
          : (body?.message ?? body?.error ?? `Request failed (${res.status})`);
        return {
          success: false,
          error: errorMsg,
          errorCode: body?.error ?? 'payment_failed',
        };
      }

      const txHash = this.extractTxHashFromResponse(res);
      const data = await res.json();
      const explorerUrl = txHash
        ? `https://basescan.org/tx/${txHash}`
        : data.explorerUrl;

      return {
        success: true,
        receiptId: data.enrollment?.paperId ?? data.txHash,
        txHash: txHash || data.txHash,
        explorerUrl,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
        errorCode: 'network_error',
      };
    }
  }

  private extractTxHashFromResponse(res: Response): string | undefined {
    const header =
      res.headers.get('PAYMENT-RESPONSE') || res.headers.get('X-PAYMENT-RESPONSE');
    if (!header) return undefined;
    try {
      const decoded = JSON.parse(atob(header));
      return decoded.transaction || decoded.txHash || undefined;
    } catch {
      return undefined;
    }
  }
}

export const multiChainAdapter = new MultiChainPaymentAdapter();
