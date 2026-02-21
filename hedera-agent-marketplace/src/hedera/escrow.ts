// 에스크로 + 인프라 셋업 — 마켓플레이스 계정·토큰·토픽 일괄 프로비저닝

import type { HederaContext, AgentAccount } from './context.js';
import { createAgentAccount } from './context.js';
import { createTopic } from './hcs.js';
import { createToken, associateToken, transferTokenFromTreasury, transferToken } from './hts.js';
import type { MarketplaceInfra } from '../types/marketplace.js';

// ── 인프라 셋업 (재사용 지원) ──

// 레거시 인프라 (Explorer/Curator) — 기존 코드 호환용
export interface InfrastructureIds {
  topicId: string;
  tokenId: string;
  explorerAccount: AgentAccount;
  curatorAccount: AgentAccount;
}

// 레거시 셋업 (기존 Explorer/Curator 데모용)
export async function setupOrReuse(
  ctx: HederaContext,
  log?: (msg: string) => void,
): Promise<InfrastructureIds> {
  const emit = log ?? (() => {});
  const existingTopicId = process.env.HCS_TOPIC_ID;
  const existingTokenId = process.env.KNOW_TOKEN_ID;

  let topicId: string;
  if (existingTopicId) {
    emit(`토픽 재사용: ${existingTopicId}`);
    topicId = existingTopicId;
  } else {
    emit('HCS 토픽 생성 중...');
    topicId = await createTopic(ctx, 'Knowledge Marketplace Ledger');
    emit(`토픽 생성 완료: ${topicId}`);
  }

  let tokenId: string;
  if (existingTokenId) {
    emit(`토큰 재사용: ${existingTokenId}`);
    tokenId = existingTokenId;
  } else {
    emit('KNOW 토큰 생성 중...');
    tokenId = await createToken(ctx, 'Knowledge Token', 'KNOW', 10000);
    emit(`토큰 생성 완료: ${tokenId}`);
  }

  emit('Explorer 계정 생성 중...');
  const explorerAccount = await createAgentAccount(ctx, 'Explorer');
  emit(`Explorer: ${explorerAccount.accountId}`);

  emit('Curator 계정 생성 중...');
  const curatorAccount = await createAgentAccount(ctx, 'Curator');
  emit(`Curator: ${curatorAccount.accountId}`);

  emit('토큰 Association 중...');
  await associateToken(ctx, explorerAccount, tokenId);
  await associateToken(ctx, curatorAccount, tokenId);

  emit('Curator에게 초기 KNOW 전송 중...');
  await transferTokenFromTreasury(ctx, tokenId, curatorAccount, 5000);

  return { topicId, tokenId, explorerAccount, curatorAccount };
}

// ── 마켓플레이스 인프라 셋업 ──
// Escrow + Analyst + Architect + Scholar 4개 계정 병렬 생성
// 에스크로 계정에 budget만큼 KNOW 토큰 입금

export async function setupMarketplaceInfra(
  ctx: HederaContext,
  budget: number,
  log?: (msg: string) => void,
): Promise<MarketplaceInfra> {
  const emit = log ?? (() => {});
  const existingTopicId = process.env.HCS_TOPIC_ID;

  // 토픽: 재사용 또는 생성
  let topicId: string;
  if (existingTopicId) {
    emit(`토픽 재사용: ${existingTopicId}`);
    topicId = existingTopicId;
  } else {
    emit('HCS 토픽 생성 중...');
    topicId = await createTopic(ctx, 'Course Generation Marketplace');
    emit(`토픽 생성 완료: ${topicId}`);
  }

  // 토큰: 재사용 또는 생성 (생성 시 ~40-80 HBAR 소모)
  const existingTokenId = process.env.KNOW_TOKEN_ID;
  let tokenId: string;
  if (existingTokenId) {
    emit(`토큰 재사용: ${existingTokenId}`);
    tokenId = existingTokenId;
  } else {
    emit('KNOW 토큰 생성 중...');
    tokenId = await createToken(ctx, 'Knowledge Token', 'KNOW', 10000);
    emit(`토큰 생성 완료: ${tokenId} — .env에 KNOW_TOKEN_ID=${tokenId} 추가하면 다음부터 재사용`);
  }

  // 4개 계정 병렬 생성 — 네트워크 왕복 최소화
  emit('에이전트 계정 4개 병렬 생성 중...');
  const [escrowAccount, analystAccount, architectAccount, scholarAccount] = await Promise.all([
    createAgentAccount(ctx, 'Escrow'),
    createAgentAccount(ctx, 'Analyst'),
    createAgentAccount(ctx, 'Architect'),
    createAgentAccount(ctx, 'Scholar'),
  ]);
  emit(`Escrow: ${escrowAccount.accountId}`);
  emit(`Analyst: ${analystAccount.accountId}`);
  emit(`Architect: ${architectAccount.accountId}`);
  emit(`Scholar: ${scholarAccount.accountId}`);

  // 토큰 Association 병렬 처리
  emit('토큰 Association 중...');
  await Promise.all([
    associateToken(ctx, escrowAccount, tokenId),
    associateToken(ctx, analystAccount, tokenId),
    associateToken(ctx, architectAccount, tokenId),
    associateToken(ctx, scholarAccount, tokenId),
  ]);

  // 에스크로 계정에 budget만큼 입금
  emit(`에스크로에 ${budget} KNOW 입금 중...`);
  await transferTokenFromTreasury(ctx, tokenId, escrowAccount, budget);
  emit('에스크로 입금 완료');

  return { topicId, tokenId, escrowAccount, analystAccount, architectAccount, scholarAccount };
}

// 에스크로에서 특정 에이전트에게 토큰 지급
export async function escrowRelease(
  ctx: HederaContext,
  escrowAccount: AgentAccount,
  tokenId: string,
  to: AgentAccount,
  amount: number,
): Promise<string> {
  return transferToken(ctx, tokenId, escrowAccount, to, amount);
}
