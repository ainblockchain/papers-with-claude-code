import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { KiteWalletManager } from '@/lib/kite/wallet';
import {
  getChainConfig,
  LEARNING_LEDGER_ADDRESS,
  LEARNING_LEDGER_ABI,
} from '@/lib/kite/contracts';

export async function GET() {
  try {
    const chainConfig = getChainConfig();
    const walletManager = new KiteWalletManager();

    if (!walletManager.getIsConfigured() || !LEARNING_LEDGER_ADDRESS) {
      return NextResponse.json({ history: [] });
    }

    const wallet = walletManager.getWallet();
    const provider = walletManager.getProvider();

    const contract = new ethers.Contract(
      LEARNING_LEDGER_ADDRESS,
      LEARNING_LEDGER_ABI,
      provider
    );

    // Query PaymentReceived events for this agent
    const paymentFilter = contract.filters.PaymentReceived(wallet.address);
    const enrollFilter = contract.filters.CourseEnrolled(wallet.address);
    const stageFilter = contract.filters.StageCompleted(wallet.address);

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks

    const [paymentEvents, enrollEvents, stageEvents] = await Promise.all([
      contract.queryFilter(paymentFilter, fromBlock, currentBlock),
      contract.queryFilter(enrollFilter, fromBlock, currentBlock),
      contract.queryFilter(stageFilter, fromBlock, currentBlock),
    ]);

    // Build a map of txHash → event type for enrichment
    const enrollMap = new Map<string, { paperId: string }>();
    for (const event of enrollEvents) {
      const parsed = contract.interface.parseLog({
        topics: event.topics as string[],
        data: event.data,
      });
      if (parsed) {
        enrollMap.set(event.transactionHash, {
          paperId: parsed.args[1],
        });
      }
    }

    const stageMap = new Map<
      string,
      { paperId: string; stageNum: number; score: number }
    >();
    for (const event of stageEvents) {
      const parsed = contract.interface.parseLog({
        topics: event.topics as string[],
        data: event.data,
      });
      if (parsed) {
        stageMap.set(event.transactionHash, {
          paperId: parsed.args[1],
          stageNum: Number(parsed.args[2]),
          score: Number(parsed.args[3]),
        });
      }
    }

    // Build payment history from PaymentReceived events
    const history = await Promise.all(
      paymentEvents.map(async (event) => {
        const txHash = event.transactionHash;
        const block = await event.getBlock();
        const parsed = contract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data,
        });

        const paperId = parsed?.args[1] || '';
        const amount = parsed ? ethers.formatEther(parsed.args[2]) : '0';

        const enrollInfo = enrollMap.get(txHash);
        const stageInfo = stageMap.get(txHash);
        const method: 'enrollCourse' | 'completeStage' = enrollInfo
          ? 'enrollCourse'
          : 'completeStage';

        return {
          txHash,
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          paperId,
          paperTitle: paperId, // Title lookup would require additional data source
          stageNum: stageInfo?.stageNum,
          amount: `${amount} KITE`,
          method,
          status: 'confirmed' as const,
          explorerUrl: `${chainConfig.explorerUrl}tx/${txHash}`,
        };
      })
    );

    // Sort by timestamp descending (newest first)
    history.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ history });
  } catch (error) {
    console.error('[x402/history] Error:', error);
    return NextResponse.json(
      {
        error: 'chain_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch payment history',
      },
      { status: 500 }
    );
  }
}
