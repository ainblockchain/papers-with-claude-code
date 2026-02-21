// Hedera 클라이언트 초기화 — 공유 인터페이스와 operator 컨텍스트 생성

import {
  Client,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
} from '@hashgraph/sdk';

// ── 인터페이스 ──

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

// ── 클라이언트 초기화 ──

export function createContext(): HederaContext {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error('HEDERA_ACCOUNT_ID와 HEDERA_PRIVATE_KEY를 .env에 설정하세요');
  }

  const operatorId = AccountId.fromString(accountId);
  const operatorKey = PrivateKey.fromStringDer(privateKey);
  const client = Client.forTestnet().setOperator(operatorId, operatorKey);

  return { client, operatorId, operatorKey };
}

// ── 에이전트 계정 생성 (테스트넷에 실제 계정) ──

export async function createAgentAccount(
  ctx: HederaContext,
  name: string,
): Promise<AgentAccount> {
  // ECDSA 키 생성 (EVM 호환)
  const newKey = PrivateKey.generateECDSA();

  const tx = await new AccountCreateTransaction()
    .setKey(newKey.publicKey)
    .setInitialBalance(new Hbar(1)) // 1 HBAR — token association + 수수료 충분
    .execute(ctx.client);

  const receipt = await tx.getReceipt(ctx.client);
  const newAccountId = receipt.accountId!.toString();

  return { name, accountId: newAccountId, privateKey: newKey };
}
