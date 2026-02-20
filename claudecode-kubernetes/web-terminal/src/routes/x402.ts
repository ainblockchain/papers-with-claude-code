// x402 서비스 프로바이더 — 스테이지 언락 결제 처리
// HTTP 402 반환 → 결제 검증 → facilitator 정산 → txHash 반환

import { Router, Request, Response } from 'express';
import type { ProgressStore } from '../db/progress.js';

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.pieverse.io';
const KITE_TESTNET_USDT = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63';

export function createX402Router(progressStore: ProgressStore, config: {
  merchantWallet: string;
  stagePrice: string;  // wei 단위 (e.g., "1000000000000000000" = 1 USDT)
  serviceName: string;
}): Router {
  const router = Router();

  // POST /x402/unlock-stage
  // X-PAYMENT 헤더 없으면 → 402 반환
  // X-PAYMENT 헤더 있으면 → facilitator로 검증+정산 → 200 반환
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

    // 이미 결제된 스테이지인지 확인
    if (userId && progressStore.isStageUnlocked(userId, courseId, stageNumber)) {
      res.json({ success: true, stageNumber, courseId, alreadyUnlocked: true });
      return;
    }

    const xPayment = req.headers['x-payment'] as string | undefined;

    if (!xPayment) {
      // 402 Payment Required 반환
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

    // X-PAYMENT 헤더가 있으면 → facilitator로 검증 + 정산
    try {
      // X-PAYMENT은 base64 인코딩된 JSON
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

      // 2) Settle (온체인 정산)
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

      // 3) DB에 결제 기록
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
