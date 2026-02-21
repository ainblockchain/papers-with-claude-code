// Multi-chain payment adapter — delegates to x402Adapter for Kite and client-side x402 for Base

import { x402Adapter, type PaymentResult } from '@/lib/adapters/x402';
import { loadPasskeyInfo } from '@/lib/ain/passkey';
import { type PaymentChainId, PAYMENT_CHAINS } from './chains';
import { createBaseX402Fetch } from './base-x402-client';

export interface ChainPaymentParams {
  chain: PaymentChainId;
  paperId: string;
  stageId?: string;
  stageNum?: number;
  score?: number;
}

class MultiChainPaymentAdapter {
  async purchaseCourse(params: ChainPaymentParams): Promise<PaymentResult> {
    switch (params.chain) {
      case 'kite':
        return this.kitePurchaseCourse(params);
      case 'base':
        return this.basePurchaseCourse(params);
      default:
        return {
          success: false,
          error: `Chain "${params.chain}" is not supported yet`,
        };
    }
  }

  async unlockStage(params: ChainPaymentParams): Promise<PaymentResult> {
    switch (params.chain) {
      case 'kite':
        return this.kiteUnlockStage(params);
      case 'base':
        return this.baseUnlockStage(params);
      default:
        return {
          success: false,
          error: `Chain "${params.chain}" is not supported yet`,
        };
    }
  }

  // ── Kite: Course Purchase via /api/x402/enroll ──
  private async kitePurchaseCourse(
    params: ChainPaymentParams
  ): Promise<PaymentResult> {
    try {
      const passkeyInfo = loadPasskeyInfo();
      const requestBody = {
        paperId: params.paperId,
        passkeyPublicKey: passkeyInfo?.publicKey || '',
      };

      let res = await fetch('/api/x402/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (res.status === 402) {
        const body = await res.json().catch(() => null);
        if (body?.error === 'insufficient_funds') {
          return {
            success: false,
            error: 'Insufficient USDC balance.',
            errorCode: 'insufficient_funds',
          };
        }

        const mcpPayment = await this.tryKiteMcpPayment(body);
        if (mcpPayment) {
          res = await fetch('/api/x402/enroll', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Payment': mcpPayment,
            },
            body: JSON.stringify(requestBody),
          });
        } else {
          return {
            success: false,
            error:
              'Payment required. Connect Kite Passport to enable automatic payments.',
            errorCode: 'payment_required',
          };
        }
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return {
          success: false,
          error: body?.message ?? `Request failed (${res.status})`,
          errorCode: body?.error,
        };
      }

      // Extract txHash from PAYMENT-RESPONSE header (base64-encoded JSON from withX402)
      const txHash = this.extractTxHashFromResponse(res);
      const data = await res.json();
      const explorerUrl = txHash
        ? `https://testnet.kitescan.ai/tx/${txHash}`
        : data.explorerUrl;

      return {
        success: true,
        receiptId: data.enrollment?.paperId,
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

  // ── Base: Course Purchase via client-side x402 ──
  private async basePurchaseCourse(
    params: ChainPaymentParams
  ): Promise<PaymentResult> {
    const x402Fetch = createBaseX402Fetch();
    if (!x402Fetch) {
      return { success: false, error: 'Register passkey first to pay on Base.', errorCode: 'no_passkey' };
    }
    try {
      const res = await x402Fetch('/api/x402/enroll?chain=base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: params.paperId,
          passkeyPublicKey: loadPasskeyInfo()?.publicKey || '',
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // x402 settlement returns { error: "Settlement failed", details: "reason" }
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

  // ── Kite: Stage Unlock — delegates to existing x402Adapter ──
  private async kiteUnlockStage(
    params: ChainPaymentParams
  ): Promise<PaymentResult> {
    const config = PAYMENT_CHAINS.kite;
    return x402Adapter.requestPayment({
      stageId: params.stageId!,
      paperId: params.paperId,
      amount: config.amounts.stageUnlock,
      currency: config.currency,
      stageNum: params.stageNum,
      score: params.score,
    });
  }

  // ── Base: Stage Unlock via client-side x402 ──
  private async baseUnlockStage(
    params: ChainPaymentParams
  ): Promise<PaymentResult> {
    const x402Fetch = createBaseX402Fetch();
    if (!x402Fetch) {
      return { success: false, error: 'Register passkey first to pay on Base.', errorCode: 'no_passkey' };
    }
    try {
      const res = await x402Fetch('/api/x402/unlock-stage?chain=base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: params.paperId,
          stageId: params.stageId,
          stageNum: params.stageNum ?? 0,
          score: params.score ?? 0,
          passkeyPublicKey: loadPasskeyInfo()?.publicKey || '',
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

  // ── Shared: Extract txHash from x402 PAYMENT-RESPONSE header ──
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

  // ── Shared: Kite MCP auto-payment for 402 responses ──
  private async tryKiteMcpPayment(
    paymentInfo: Record<string, unknown> | null
  ): Promise<string | null> {
    try {
      const payerRes = await fetch('/api/kite-mcp/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'get_payer_addr', params: {} }),
      });
      if (!payerRes.ok) return null;
      const { payer_addr } = await payerRes.json();

      const accepts = (
        paymentInfo?.accepts as Array<Record<string, string>>
      )?.[0];
      const payeeAddr =
        accepts?.payTo || (paymentInfo?.payTo as string) || '';
      const amount =
        accepts?.maxAmountRequired || (paymentInfo?.amount as string) || '0';
      const tokenType = accepts?.asset || 'USDC';
      if (!payeeAddr) return null;

      const approveRes = await fetch('/api/kite-mcp/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'approve_payment',
          params: {
            payer_addr,
            payee_addr: payeeAddr,
            amount,
            token_type: tokenType,
          },
        }),
      });
      if (!approveRes.ok) return null;
      const { x_payment } = await approveRes.json();
      return x_payment || null;
    } catch {
      return null;
    }
  }
}

export const multiChainAdapter = new MultiChainPaymentAdapter();
