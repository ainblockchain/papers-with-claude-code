import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { KiteWalletManager } from '@/lib/kite/wallet';
import {
  getChainConfig,
  LEARNING_LEDGER_ADDRESS,
  LEARNING_LEDGER_ABI,
} from '@/lib/kite/contracts';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  const { txHash } = await params;

  if (!txHash || !txHash.startsWith('0x')) {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid transaction hash' },
      { status: 400 }
    );
  }

  const chainConfig = getChainConfig();
  const walletManager = new KiteWalletManager();
  const provider = walletManager.getProvider();

  try {
    // Fetch transaction and receipt
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash),
    ]);

    if (!tx || !receipt) {
      return NextResponse.json(
        {
          verified: false,
          txHash,
          message: 'Transaction not found',
        },
        { status: 404 }
      );
    }

    // Get block for timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    const blockTimestamp = block
      ? new Date(block.timestamp * 1000).toISOString()
      : null;

    // Get current block for confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    // Decode the function call if it targets LearningLedger
    let method = 'unknown';
    let decodedArgs: Record<string, unknown> = {};

    if (
      LEARNING_LEDGER_ADDRESS &&
      tx.to?.toLowerCase() === LEARNING_LEDGER_ADDRESS.toLowerCase()
    ) {
      try {
        const iface = new ethers.Interface(LEARNING_LEDGER_ABI);
        const parsed = iface.parseTransaction({ data: tx.data, value: tx.value });

        if (parsed) {
          method = parsed.name;

          if (parsed.name === 'enrollCourse') {
            decodedArgs = {
              paperId: parsed.args[0],
            };
          } else if (parsed.name === 'completeStage') {
            decodedArgs = {
              paperId: parsed.args[0],
              stageNum: Number(parsed.args[1]),
              score: Number(parsed.args[2]),
            };
          }
        }
      } catch {
        // Could not decode — leave as unknown
      }
    }

    return NextResponse.json({
      verified: receipt.status === 1,
      txHash,
      blockNumber: receipt.blockNumber,
      blockTimestamp,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      method,
      decodedArgs,
      explorerUrl: `${chainConfig.explorerUrl}tx/${txHash}`,
      confirmations,
    });
  } catch (error) {
    console.error('[x402/receipt] Error:', error);
    return NextResponse.json(
      {
        error: 'chain_error',
        message: error instanceof Error ? error.message : 'Failed to fetch receipt',
      },
      { status: 500 }
    );
  }
}
