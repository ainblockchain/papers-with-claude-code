// HTS (Hedera Token Service) — 토큰 생성, Association, 전송, 잔액 조회

import {
  TokenCreateTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountId,
  TokenId,
} from '@hashgraph/sdk';

import type { HederaContext, AgentAccount } from './context.js';

export async function createToken(
  ctx: HederaContext,
  name: string,
  symbol: string,
  initialSupply: number,
): Promise<string> {
  const tx = await new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setInitialSupply(initialSupply)
    .setDecimals(0)
    .setTreasuryAccountId(ctx.operatorId)
    .setAdminKey(ctx.operatorKey)
    .setSupplyKey(ctx.operatorKey)
    .execute(ctx.client);

  const receipt = await tx.getReceipt(ctx.client);
  return receipt.tokenId!.toString();
}

// 계정이 토큰을 받으려면 먼저 association 필요
export async function associateToken(
  ctx: HederaContext,
  account: AgentAccount,
  tokenId: string,
): Promise<void> {
  const tx = await new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(account.accountId))
    .setTokenIds([TokenId.fromString(tokenId)])
    .freezeWith(ctx.client)
    .sign(account.privateKey);

  const response = await tx.execute(ctx.client);
  await response.getReceipt(ctx.client);
}

// Operator(Treasury)에서 에이전트로 토큰 전송
export async function transferTokenFromTreasury(
  ctx: HederaContext,
  tokenId: string,
  to: AgentAccount,
  amount: number,
): Promise<string> {
  const tx = await new TransferTransaction()
    .addTokenTransfer(TokenId.fromString(tokenId), ctx.operatorId, -amount)
    .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(to.accountId), amount)
    .execute(ctx.client);

  const receipt = await tx.getReceipt(ctx.client);
  return tx.transactionId.toString();
}

// 에이전트 간 토큰 전송
export async function transferToken(
  ctx: HederaContext,
  tokenId: string,
  from: AgentAccount,
  to: AgentAccount,
  amount: number,
): Promise<string> {
  const tx = await new TransferTransaction()
    .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(from.accountId), -amount)
    .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(to.accountId), amount)
    .freezeWith(ctx.client)
    .sign(from.privateKey);

  const response = await tx.execute(ctx.client);
  await response.getReceipt(ctx.client);
  return response.transactionId.toString();
}

// Mirror Node에서 토큰 잔액 조회
export async function getTokenBalance(
  accountId: string,
  tokenId: string,
): Promise<number> {
  const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`;

  try {
    const res = await fetch(url);
    const data = await res.json() as { tokens?: Array<{ balance: number }> };
    return data.tokens?.[0]?.balance ?? 0;
  } catch {
    return 0;
  }
}
