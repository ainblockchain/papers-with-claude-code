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
      return NextResponse.json({ attestations: [] });
    }

    const wallet = walletManager.getWallet();
    const provider = walletManager.getProvider();

    const contract = new ethers.Contract(
      LEARNING_LEDGER_ADDRESS,
      LEARNING_LEDGER_ABI,
      provider
    );

    // Query StageCompleted events for this agent
    const filter = contract.filters.StageCompleted(wallet.address);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000);

    const events = await contract.queryFilter(filter, fromBlock, currentBlock);

    const attestations = await Promise.all(
      events.map(async (event) => {
        const block = await event.getBlock();
        const parsed = contract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data,
        });

        if (!parsed) return null;

        const paperId = parsed.args[1];
        const stageNum = Number(parsed.args[2]);
        const score = Number(parsed.args[3]);

        // Read attestationHash from contract
        let attestationHash = '';
        try {
          const completion = await contract.getStageCompletion(
            wallet.address,
            paperId,
            stageNum
          );
          attestationHash = completion[2]; // attestationHash is the 3rd return value
        } catch {
          // If we can't read attestation, use event tx hash as fallback
          attestationHash = event.transactionHash;
        }

        return {
          paperId,
          paperTitle: paperId,
          stageNum,
          score,
          attestationHash,
          completedAt: new Date(block.timestamp * 1000).toISOString(),
          explorerUrl: `${chainConfig.explorerUrl}tx/${event.transactionHash}`,
        };
      })
    );

    // Filter out nulls and sort by completedAt descending
    const validAttestations = attestations
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b!.completedAt).getTime() -
          new Date(a!.completedAt).getTime()
      );

    return NextResponse.json({ attestations: validAttestations });
  } catch (error) {
    console.error('[x402/attestations] Error:', error);
    return NextResponse.json(
      {
        error: 'chain_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch attestations',
      },
      { status: 500 }
    );
  }
}
