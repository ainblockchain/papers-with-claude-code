// Hedera client initialization — shared interfaces and operator context creation

import {
  Client,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
} from '@hashgraph/sdk';

// ── Interfaces ──

export interface HederaContext {
  client: Client;
  operatorId: AccountId;
  operatorKey: PrivateKey;
}

export interface AgentAccount {
  name: string;
  accountId: string;
  privateKey: PrivateKey;
}

export interface HCSMessage {
  topicId: string;
  sequenceNumber: number;
  timestamp: string;
  message: string;
}

// ── Client initialization ──

export function createContext(): HederaContext {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error('HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env');
  }

  const operatorId = AccountId.fromString(accountId);
  const operatorKey = PrivateKey.fromStringDer(privateKey);
  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  return { client, operatorId, operatorKey };
}

// ── Agent account creation (real account on testnet) ──

export async function createAgentAccount(
  ctx: HederaContext,
  name: string,
): Promise<AgentAccount> {
  // Generate ECDSA key (EVM compatible)
  const newKey = PrivateKey.generateECDSA();

  const tx = await new AccountCreateTransaction()
    .setKey(newKey.publicKey)
    .setInitialBalance(new Hbar(1)) // 1 HBAR — enough for token association + fees
    .execute(ctx.client);

  const receipt = await tx.getReceipt(ctx.client);
  const newAccountId = receipt.accountId!.toString();

  return { name, accountId: newAccountId, privateKey: newKey };
}
