import { NextRequest, NextResponse } from 'next/server';

const BASE_RPC = 'https://mainnet.base.org';
const BASE_EXPLORER = 'https://basescan.org/';

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

  const explorerUrl = `${BASE_EXPLORER}tx/${txHash}`;

  try {
    const response = await fetch(BASE_RPC, {
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
        chain: 'base',
        explorerUrl,
        message: 'Transaction not found on Base. It may be pending or invalid.',
      });
    }

    const success = receipt.status === '0x1';
    return NextResponse.json({
      verified: success,
      txHash,
      chain: 'base',
      blockNumber: parseInt(receipt.blockNumber, 16),
      from: receipt.from,
      to: receipt.to,
      gasUsed: parseInt(receipt.gasUsed, 16),
      explorerUrl,
      message: success
        ? 'Transaction confirmed on Base.'
        : 'Transaction failed on Base.',
    });
  } catch {
    return NextResponse.json({
      verified: null,
      txHash,
      chain: 'base',
      explorerUrl,
      message: 'Could not verify on Base. Check the explorer link for confirmation.',
    });
  }
}
