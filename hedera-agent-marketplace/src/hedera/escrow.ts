// Escrow + infrastructure setup — batch provisioning of marketplace accounts, tokens, and topics

import type { HederaContext, AgentAccount } from './context.js';
import { createAgentAccount } from './context.js';
import { createTopic } from './hcs.js';
import { createToken, associateToken, transferTokenFromTreasury, transferToken } from './hts.js';
import type { MarketplaceInfra } from '../types/marketplace.js';

// ── Infrastructure setup (with reuse support) ──

// Legacy infrastructure (Explorer/Curator) — for backward compatibility
export interface InfrastructureIds {
  topicId: string;
  tokenId: string;
  explorerAccount: AgentAccount;
  curatorAccount: AgentAccount;
}

// Legacy setup (for existing Explorer/Curator demo)
export async function setupOrReuse(
  ctx: HederaContext,
  log?: (msg: string) => void,
): Promise<InfrastructureIds> {
  const emit = log ?? (() => {});
  const existingTopicId = process.env.HCS_TOPIC_ID;
  const existingTokenId = process.env.KNOW_TOKEN_ID;

  let topicId: string;
  if (existingTopicId) {
    emit(`Reusing topic: ${existingTopicId}`);
    topicId = existingTopicId;
  } else {
    emit('Creating HCS topic...');
    topicId = await createTopic(ctx, 'Knowledge Marketplace Ledger');
    emit(`Topic created: ${topicId}`);
  }

  let tokenId: string;
  if (existingTokenId) {
    emit(`Reusing token: ${existingTokenId}`);
    tokenId = existingTokenId;
  } else {
    emit('Creating KNOW token...');
    tokenId = await createToken(ctx, 'Knowledge Token', 'KNOW', 10000);
    emit(`Token created: ${tokenId}`);
  }

  emit('Creating Explorer account...');
  const explorerAccount = await createAgentAccount(ctx, 'Explorer');
  emit(`Explorer: ${explorerAccount.accountId}`);

  emit('Creating Curator account...');
  const curatorAccount = await createAgentAccount(ctx, 'Curator');
  emit(`Curator: ${curatorAccount.accountId}`);

  emit('Associating tokens...');
  await associateToken(ctx, explorerAccount, tokenId);
  await associateToken(ctx, curatorAccount, tokenId);

  emit('Transferring initial KNOW to Curator...');
  await transferTokenFromTreasury(ctx, tokenId, curatorAccount, 5000);

  return { topicId, tokenId, explorerAccount, curatorAccount };
}

// ── Marketplace infrastructure setup ──
// Create 4 accounts in parallel: Escrow + Analyst + Architect + Scholar
// Deposit budget amount of KNOW tokens into the escrow account

export async function setupMarketplaceInfra(
  ctx: HederaContext,
  budget: number,
  log?: (msg: string) => void,
): Promise<MarketplaceInfra> {
  const emit = log ?? (() => {});
  const existingTopicId = process.env.HCS_TOPIC_ID;

  // Topic: reuse or create
  let topicId: string;
  if (existingTopicId) {
    emit(`Reusing topic: ${existingTopicId}`);
    topicId = existingTopicId;
  } else {
    emit('Creating HCS topic...');
    topicId = await createTopic(ctx, 'Course Generation Marketplace');
    emit(`Topic created: ${topicId}`);
  }

  // Token: reuse or create (creation costs ~40-80 HBAR)
  const existingTokenId = process.env.KNOW_TOKEN_ID;
  let tokenId: string;
  if (existingTokenId) {
    emit(`Reusing token: ${existingTokenId}`);
    tokenId = existingTokenId;
  } else {
    emit('Creating KNOW token...');
    tokenId = await createToken(ctx, 'Knowledge Token', 'KNOW', 10000);
    emit(`Token created: ${tokenId} — add KNOW_TOKEN_ID=${tokenId} to .env to reuse next time`);
  }

  // Create 4 accounts in parallel — minimize network round trips
  emit('Creating 4 agent accounts in parallel...');
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

  // Token association in parallel
  emit('Associating tokens...');
  await Promise.all([
    associateToken(ctx, escrowAccount, tokenId),
    associateToken(ctx, analystAccount, tokenId),
    associateToken(ctx, architectAccount, tokenId),
    associateToken(ctx, scholarAccount, tokenId),
  ]);

  // Deposit budget amount into escrow account
  emit(`Depositing ${budget} KNOW into escrow...`);
  await transferTokenFromTreasury(ctx, tokenId, escrowAccount, budget);
  emit('Escrow deposit complete');

  return { topicId, tokenId, escrowAccount, analystAccount, architectAccount, scholarAccount };
}

// Release tokens from escrow to a specific agent
export async function escrowRelease(
  ctx: HederaContext,
  escrowAccount: AgentAccount,
  tokenId: string,
  to: AgentAccount,
  amount: number,
): Promise<string> {
  return transferToken(ctx, tokenId, escrowAccount, to, amount);
}
