// 🔌 ADAPTER 🔗 CROSS-TEAM — x402 protocol payment integration
// Replace mock with real x402 implementation when ready

export interface PaymentResult {
  success: boolean;
  receiptId?: string;
  error?: string;
}

export interface X402PaymentAdapter {
  requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
  }): Promise<PaymentResult>;
  verifyPayment(receiptId: string): Promise<boolean>;
}

class MockX402Adapter implements X402PaymentAdapter {
  async requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
  }): Promise<PaymentResult> {
    // Mock: auto-approve after 1s delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      receiptId: `receipt-${Date.now()}-${params.stageId}`,
    };
  }

  async verifyPayment(receiptId: string): Promise<boolean> {
    return receiptId.startsWith('receipt-');
  }
}

export const x402Adapter: X402PaymentAdapter = new MockX402Adapter();
