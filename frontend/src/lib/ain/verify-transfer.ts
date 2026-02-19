/**
 * Verifies an AIN transfer on-chain.
 * Fetches the transaction by hash, checks it's a transfer to the correct
 * payTo address, with sufficient amount, and that it succeeded.
 */

import { getAinClient } from './client';

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

export async function verifyAinTransfer(params: {
  txHash: string;
  payTo: string;
  requiredAmount: number;
}): Promise<VerifyResult> {
  const { txHash, payTo, requiredAmount } = params;

  if (!txHash) {
    return { valid: false, error: 'No txHash provided' };
  }

  try {
    const ain = getAinClient();

    // Retry a few times — the tx may not be finalized immediately
    let tx: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      tx = await ain.provider.send('ain_getTransactionByHash', { hash: txHash });
      if (tx && tx.is_executed) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!tx) {
      return { valid: false, error: 'Transaction not found on-chain after retries' };
    }

    if (!tx.is_executed && !tx.exec_result) {
      return { valid: false, error: 'Transaction not yet executed' };
    }

    // If the transfer failed, reject
    if (tx.exec_result?.code !== undefined && tx.exec_result.code !== 0) {
      return { valid: false, error: `Transfer failed on-chain with code ${tx.exec_result.code}: ${tx.exec_result.message || ''}` };
    }

    const execResult = tx.exec_result;
    if (execResult) {
      if (execResult.result_list) {
        const codes = Object.values(execResult.result_list).map((r: any) => r.code);
        const failed = codes.find((c: any) => c !== 0);
        if (failed !== undefined) {
          return { valid: false, error: `Transaction operation failed with code ${failed}` };
        }
      } else if (execResult.code !== undefined && execResult.code !== 0) {
        return { valid: false, error: `Transaction failed with code ${execResult.code}` };
      }
    }

    // Extract the transfer operation from tx_body
    const operation = tx.transaction?.tx_body?.operation;
    if (!operation) {
      return { valid: false, error: 'Transaction has no operation' };
    }

    let transferRef = '';
    let transferValue: any = null;

    if (operation.type === 'SET_VALUE' && operation.ref?.includes('/transfer/')) {
      transferRef = operation.ref;
      transferValue = operation.value;
    } else if (operation.type === 'SET' && operation.op_list) {
      const transferOp = operation.op_list.find(
        (op: any) => op.type === 'SET_VALUE' && op.ref?.includes('/transfer/')
      );
      if (transferOp) {
        transferRef = transferOp.ref;
        transferValue = transferOp.value;
      }
    }

    if (!transferRef) {
      return { valid: false, error: 'Transaction is not a transfer operation' };
    }

    // Parse the transfer path: /transfer/{from}/{to}/{key}/value
    const transferMatch = transferRef.match(/\/transfer\/([^/]+)\/([^/]+)\//);
    if (transferMatch) {
      const toAddress = transferMatch[2];

      if (toAddress.toLowerCase() !== payTo.toLowerCase()) {
        return { valid: false, error: `Transfer recipient mismatch: expected ${payTo}, got ${toAddress}` };
      }

      if (Number(transferValue) < requiredAmount) {
        return { valid: false, error: `Transfer amount insufficient: expected ${requiredAmount}, got ${transferValue}` };
      }
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Verification failed: ${err.message}` };
  }
}
