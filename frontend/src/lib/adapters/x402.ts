// 🔌 ADAPTER 🔗 CROSS-TEAM — x402 protocol payment integration
// KiteX402Adapter for real Kite Chain payments, MockX402Adapter as fallback

import { loadPasskeyInfo } from '@/lib/ain/passkey';

export interface PaymentResult {
  success: boolean;
  receiptId?: string;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface WalletStatus {
  address: string;
  balance: string;
  agentDID: string;
}

export interface X402PaymentAdapter {
  requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
    stageNum?: number;
    score?: number;
  }): Promise<PaymentResult>;
  verifyPayment(receiptId: string): Promise<boolean>;
  getWalletStatus?(): Promise<WalletStatus>;
}

class KiteX402Adapter implements X402PaymentAdapter {
  /**
   * Request payment for a stage unlock.
   * If the service returns 402, attempts MCP-based payment via Kite Passport.
   */
  async requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
    stageNum?: number;
    score?: number;
  }): Promise<PaymentResult> {
    try {
      const passkeyInfo = loadPasskeyInfo();
      const requestBody = {
        paperId: params.paperId,
        stageId: params.stageId,
        stageNum: params.stageNum ?? 0,
        score: params.score ?? 0,
        passkeyPublicKey: passkeyInfo?.publicKey || '',
      };

      let res = await fetch('/api/x402/unlock-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (res.status === 402) {
        // x402 flow: try MCP-based payment via Kite Passport
        const body = await res.json().catch(() => null);

        if (body?.error === 'insufficient_funds') {
          return {
            success: false,
            error: `Insufficient USDC balance. Required: ${body.required}, Available: ${body.available}`,
            errorCode: 'insufficient_funds',
          };
        }

        // Attempt automatic payment via MCP tools
        const mcpPayment = await this.tryMcpPayment(body);
        if (mcpPayment) {
          // Retry with X-Payment header
          res = await fetch('/api/x402/unlock-stage', {
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
            error: 'Payment required. Connect Kite Passport to enable automatic payments.',
            errorCode: 'payment_required',
          };
        }
      }

      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        return { success: false, error: body?.message ?? 'Forbidden', errorCode: body?.error ?? 'forbidden' };
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return {
          success: false,
          error: body?.message ?? `Request failed (${res.status})`,
          errorCode: body?.error ?? 'unknown',
        };
      }

      // Extract txHash from PAYMENT-RESPONSE header (base64-encoded JSON from withX402)
      const txHash = this.extractTxHash(res);
      const data = await res.json();
      const explorerUrl = txHash
        ? `https://testnet.kitescan.ai/tx/${txHash}`
        : data.explorerUrl;

      return {
        success: true,
        receiptId: txHash || data.txHash,
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

  /**
   * Extract txHash from x402 PAYMENT-RESPONSE header (base64-encoded SettleResponse).
   */
  private extractTxHash(res: Response): string | undefined {
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

  /**
   * Try to get an X-Payment token via Kite MCP tools.
   * Returns the X-Payment string or null if MCP is not available.
   */
  private async tryMcpPayment(paymentInfo: Record<string, unknown> | null): Promise<string | null> {
    try {
      // 1. Get payer address
      const payerRes = await fetch('/api/kite-mcp/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'get_payer_addr', params: {} }),
      });
      if (!payerRes.ok) return null;
      const { payer_addr } = await payerRes.json();

      // 2. Extract payment requirements from 402 body
      const accepts = (paymentInfo?.accepts as Array<Record<string, string>>)?.[0];
      const payeeAddr = accepts?.payTo || (paymentInfo?.payTo as string) || '';
      const amount = accepts?.maxAmountRequired || (paymentInfo?.amount as string) || '0';
      const tokenType = accepts?.asset || 'USDC';

      if (!payeeAddr) return null;

      // 3. Approve payment
      const approveRes = await fetch('/api/kite-mcp/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'approve_payment',
          params: { payer_addr, payee_addr: payeeAddr, amount, token_type: tokenType },
        }),
      });
      if (!approveRes.ok) return null;
      const { x_payment } = await approveRes.json();
      return x_payment || null;
    } catch {
      return null; // MCP not available, fall back to manual payment
    }
  }

  async verifyPayment(txHash: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/x402/receipt/${encodeURIComponent(txHash)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.verified === true;
    } catch {
      return false;
    }
  }

  async getWalletStatus(): Promise<WalletStatus> {
    const res = await fetch('/api/x402/status');
    if (!res.ok) throw new Error(`Failed to fetch wallet status (${res.status})`);
    const data = await res.json();
    return {
      address: data.walletAddress,
      balance: data.balance,
      agentDID: data.agentDID,
    };
  }
}

class MockX402Adapter implements X402PaymentAdapter {
  async requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
    stageNum?: number;
    score?: number;
  }): Promise<PaymentResult> {
    // Mock: auto-approve after 1s delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockTxHash = `0x${Date.now().toString(16)}${'0'.repeat(40)}`.slice(0, 66);
    return {
      success: true,
      receiptId: `receipt-${Date.now()}-${params.stageId}`,
      txHash: mockTxHash,
      explorerUrl: `https://testnet.kitescan.ai/tx/${mockTxHash}`,
    };
  }

  async verifyPayment(receiptId: string): Promise<boolean> {
    return receiptId.startsWith('receipt-') || receiptId.startsWith('0x');
  }

  async getWalletStatus(): Promise<WalletStatus> {
    return {
      address: '0x' + '1'.repeat(40),
      balance: '0.847',
      agentDID: 'did:kite:learner.eth/claude-tutor/v1',
    };
  }
}

const USE_REAL_KITE = process.env.NEXT_PUBLIC_USE_KITE_CHAIN === 'true';
export const x402Adapter: X402PaymentAdapter = USE_REAL_KITE
  ? new KiteX402Adapter()
  : new MockX402Adapter();
