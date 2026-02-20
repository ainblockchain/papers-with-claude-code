// x402 service provider — stage unlock payment processing
// Return HTTP 402 -> payment verification -> facilitator settlement -> return txHash

import { Router, Request, Response } from 'express';
import type { ProgressStore } from '../db/progress.js';

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.pieverse.io';
const KITE_TESTNET_USDT = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63';

export function createX402Router(progressStore: ProgressStore, config: {
  merchantWallet: string;
  stagePrice: string;  // in wei units (e.g., "1000000000000000000" = 1 USDT)
  serviceName: string;
}): Router {
  const router = Router();

  // POST /x402/unlock-stage
  // If no X-PAYMENT header -> return 402
  // If X-PAYMENT header present -> verify+settle via facilitator -> return 200
  router.post('/x402/unlock-stage', async (req: Request, res: Response) => {
    const { courseId, stageNumber, userId } = req.body as {
      courseId?: string;
      stageNumber?: number;
      userId?: string;
    };

    if (!courseId || !stageNumber) {
      res.status(400).json({ error: 'courseId and stageNumber are required' });
      return;
    }

    // Check if the stage has already been paid for
    if (userId && progressStore.isStageUnlocked(userId, courseId, stageNumber)) {
      res.json({ success: true, stageNumber, courseId, alreadyUnlocked: true });
      return;
    }

    const xPayment = req.headers['x-payment'] as string | undefined;

    if (!xPayment) {
      // Return 402 Payment Required
      res.status(402).json({
        error: 'X-PAYMENT header is required',
        accepts: [{
          scheme: 'gokite-aa',
          network: 'kite-testnet',
          maxAmountRequired: config.stagePrice,
          resource: `/api/x402/unlock-stage`,
          description: `Unlock Stage ${stageNumber} for paper ${courseId}`,
          mimeType: 'application/json',
          outputSchema: {
            input: {
              type: 'http',
              method: 'POST',
              body: {
                courseId: { type: 'string', required: true },
                stageNumber: { type: 'number', required: true },
                userId: { type: 'string', required: false },
              },
            },
            output: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                txHash: { type: 'string' },
                stageNumber: { type: 'number' },
              },
            },
          },
          payTo: config.merchantWallet,
          maxTimeoutSeconds: 300,
          asset: KITE_TESTNET_USDT,
          extra: null,
          merchantName: config.serviceName,
        }],
        x402Version: 1,
      });
      return;
    }

    // If X-PAYMENT header is present -> verify + settle via facilitator
    try {
      // X-PAYMENT is base64-encoded JSON
      const paymentData = JSON.parse(Buffer.from(xPayment, 'base64').toString());

      // 1) Verify
      const verifyRes = await fetch(`${FACILITATOR_URL}/v2/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentData, network: 'kite-testnet' }),
      });

      if (!verifyRes.ok) {
        const verifyErr = await verifyRes.text();
        console.error('[x402] Verification failed:', verifyErr);
        res.status(402).json({ error: 'Payment verification failed', details: verifyErr });
        return;
      }

      // 2) Settle (on-chain settlement)
      const settleRes = await fetch(`${FACILITATOR_URL}/v2/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paymentData, network: 'kite-testnet' }),
      });

      if (!settleRes.ok) {
        const settleErr = await settleRes.text();
        console.error('[x402] Settlement failed:', settleErr);
        res.status(500).json({ error: 'Payment settlement failed', details: settleErr });
        return;
      }

      const settleData = await settleRes.json() as { txHash?: string; transactionHash?: string };
      const txHash = settleData.txHash || settleData.transactionHash || '';

      // 3) Record payment in DB
      if (userId) {
        progressStore.saveStagePayment(userId, courseId, stageNumber, txHash, '');
      }

      console.log(`[x402] Stage ${stageNumber} unlocked: courseId=${courseId}, tx=${txHash}`);

      res.json({
        success: true,
        stageNumber,
        courseId,
        txHash,
        explorerUrl: `https://testnet.kitescan.ai/tx/${txHash}`,
      });
    } catch (err) {
      console.error('[x402] Error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  });

  return router;
}
