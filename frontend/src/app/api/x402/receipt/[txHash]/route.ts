import { NextRequest, NextResponse } from 'next/server';
import { getChainConfig } from '@/lib/kite/contracts';

const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org/';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  const { txHash } = await params;
  const chain = req.nextUrl.searchParams.get('chain') || 'kite';

  if (!txHash || !txHash.startsWith('0x')) {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid transaction hash' },
      { status: 400 }
    );
  }

  // Select RPC and explorer based on chain
  let rpcUrl: string;
  let explorerBase: string;
  let chainName: string;

  if (chain === 'base') {
    rpcUrl = BASE_SEPOLIA_RPC;
    explorerBase = BASE_SEPOLIA_EXPLORER;
    chainName = 'Base Sepolia';
  } else {
    const chainConfig = getChainConfig();
    rpcUrl = process.env.NEXT_PUBLIC_KITE_RPC_URL || chainConfig.rpcUrl;
    explorerBase = chainConfig.explorerUrl;
    chainName = 'Kite Chain';
  }

  const explorerUrl = `${explorerBase}tx/${txHash}`;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    });

    const data = await response.json();
    const receipt = data.result;

    if (!receipt) {
      return NextResponse.json({
        verified: false,
        txHash,
        chain,
        explorerUrl,
        message: `Transaction not found on ${chainName}. It may be pending or invalid.`,
      });
    }

    const success = receipt.status === '0x1';
    return NextResponse.json({
      verified: success,
      txHash,
      chain,
      blockNumber: parseInt(receipt.blockNumber, 16),
      from: receipt.from,
      to: receipt.to,
      gasUsed: parseInt(receipt.gasUsed, 16),
      explorerUrl,
      message: success
        ? `Transaction confirmed on ${chainName}.`
        : `Transaction failed on ${chainName}.`,
    });
  } catch {
    return NextResponse.json({
      verified: null,
      txHash,
      chain,
      explorerUrl,
      message: `Could not verify on ${chainName}. Check the explorer link for confirmation.`,
    });
  }
}
