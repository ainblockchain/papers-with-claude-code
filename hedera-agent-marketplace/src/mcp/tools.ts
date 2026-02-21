// MCP Tool 정의 — Hedera 블록체인 프리미티브를 범용 MCP 도구로 래핑
// 에이전트가 자율적으로 사용할 수 있도록 워크플로우에 종속되지 않는 범용 도구만 제공

import { z } from 'zod';
import { PrivateKey } from '@hashgraph/sdk';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createContext,
  createAgentAccount,
  createTopic,
  createToken,
  associateToken,
  transferTokenFromTreasury,
  transferToken,
  submitMessage,
  getTopicMessages,
  getTokenBalance,
  hashscanUrl,
  type HederaContext,
  type AgentAccount,
} from '../hedera/client.js';

// HederaContext는 서버 시작 시 한 번 초기화 후 재사용
let cachedCtx: HederaContext | null = null;

function getContext(): HederaContext {
  if (!cachedCtx) {
    cachedCtx = createContext();
  }
  return cachedCtx;
}

/** JSON 결과를 MCP text content로 변환하는 헬퍼 */
function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** 모든 Hedera 도구를 McpServer에 등록 */
export function registerAllTools(server: McpServer): void {
  // ── 1. hedera_setup_infra ──
  // Topic, Token, Agent 계정을 한번에 생성하는 인프라 셋업 도구

  server.tool(
    'hedera_setup_infra',
    'Create HCS topic, fungible token, and two agent accounts on Hedera testnet. Returns all IDs and private keys needed for subsequent operations.',
    {
      tokenName: z.string().describe('Token name (e.g. "Knowledge Token")'),
      tokenSymbol: z.string().describe('Token symbol (e.g. "KNOW")'),
      initialSupply: z.number().describe('Initial token supply'),
      topicMemo: z.string().describe('HCS topic memo describing the marketplace'),
    },
    async (args) => {
      const ctx = getContext();

      const topicId = await createTopic(ctx, args.topicMemo);
      const tokenId = await createToken(ctx, args.tokenName, args.tokenSymbol, args.initialSupply);

      const explorer = await createAgentAccount(ctx, 'Explorer');
      const curator = await createAgentAccount(ctx, 'Curator');

      await associateToken(ctx, explorer, tokenId);
      await associateToken(ctx, curator, tokenId);

      // Curator에게 보상 풀 전송 (초기 공급량의 50%)
      const rewardPool = Math.floor(args.initialSupply / 2);
      await transferTokenFromTreasury(ctx, tokenId, curator, rewardPool);

      return jsonResult({
        topicId,
        tokenId,
        explorerAccount: {
          accountId: explorer.accountId,
          privateKey: explorer.privateKey.toStringDer(),
        },
        curatorAccount: {
          accountId: curator.accountId,
          privateKey: curator.privateKey.toStringDer(),
        },
        rewardPool,
        hashscanLinks: {
          topic: hashscanUrl('topic', topicId),
          token: hashscanUrl('token', tokenId),
          explorer: hashscanUrl('account', explorer.accountId),
          curator: hashscanUrl('account', curator.accountId),
        },
      });
    },
  );

  // ── 2. hedera_send_message ──
  // 임의의 JSON 메시지를 HCS 토픽에 기록하는 범용 도구

  server.tool(
    'hedera_send_message',
    'Submit any JSON message to an HCS topic. The message is immutably recorded on Hedera consensus. Use this for explorations, verifications, feedback, or any other communication.',
    {
      topicId: z.string().describe('HCS Topic ID (e.g. "0.0.12345")'),
      message: z.string().describe('JSON string payload to record on the topic'),
    },
    async (args) => {
      const ctx = getContext();

      // 메시지가 유효한 JSON인지 검증
      try {
        JSON.parse(args.message);
      } catch {
        return jsonResult({ error: 'message must be a valid JSON string' });
      }

      const record = await submitMessage(ctx, args.topicId, args.message);

      return jsonResult({
        sequenceNumber: record.sequenceNumber,
        timestamp: record.timestamp,
        topicId: record.topicId,
        hashscanLink: hashscanUrl('topic', record.topicId),
      });
    },
  );

  // ── 3. hedera_read_messages ──
  // Mirror Node에서 HCS 토픽 메시지를 조회하고 선택적으로 필터링

  server.tool(
    'hedera_read_messages',
    'Read messages from an HCS topic via Mirror Node. Supports optional filtering by message type, sender, or sequence number range. Returns parsed JSON payloads.',
    {
      topicId: z.string().describe('HCS Topic ID'),
      filterType: z.string().optional().describe('Filter by payload "type" field (e.g. "exploration", "verification")'),
      filterSender: z.string().optional().describe('Filter by payload "sender" field (agent account ID)'),
      afterSequence: z.number().optional().describe('Only return messages after this sequence number'),
      limit: z.number().optional().describe('Maximum number of messages to return'),
    },
    async (args) => {
      const messages = await getTopicMessages(args.topicId);

      let parsed = messages.map((msg) => {
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(msg.message);
        } catch {
          payload = { raw: msg.message };
        }
        return {
          sequenceNumber: msg.sequenceNumber,
          timestamp: msg.timestamp,
          payload,
        };
      });

      // 필터 적용
      if (args.afterSequence !== undefined) {
        parsed = parsed.filter((m) => m.sequenceNumber > args.afterSequence!);
      }
      if (args.filterType) {
        parsed = parsed.filter((m) => (m.payload as any).type === args.filterType);
      }
      if (args.filterSender) {
        parsed = parsed.filter((m) => (m.payload as any).sender === args.filterSender);
      }
      if (args.limit !== undefined) {
        parsed = parsed.slice(0, args.limit);
      }

      return jsonResult({
        topicId: args.topicId,
        messageCount: parsed.length,
        messages: parsed,
        hashscanLink: hashscanUrl('topic', args.topicId),
      });
    },
  );

  // ── 4. hedera_transfer_token ──
  // 에이전트 간 범용 토큰 전송

  server.tool(
    'hedera_transfer_token',
    'Transfer tokens from one account to another. Can be used for rewards, payments, or any token movement between agents.',
    {
      tokenId: z.string().describe('HTS Token ID'),
      fromAccountId: z.string().describe('Sender account ID'),
      fromPrivateKey: z.string().describe('Sender private key (DER-encoded hex)'),
      toAccountId: z.string().describe('Recipient account ID'),
      toPrivateKey: z.string().describe('Recipient private key (DER-encoded hex)'),
      amount: z.number().positive().describe('Number of tokens to transfer'),
    },
    async (args) => {
      const ctx = getContext();

      const from: AgentAccount = {
        name: 'sender',
        accountId: args.fromAccountId,
        privateKey: PrivateKey.fromStringDer(args.fromPrivateKey),
      };
      const to: AgentAccount = {
        name: 'recipient',
        accountId: args.toAccountId,
        privateKey: PrivateKey.fromStringDer(args.toPrivateKey),
      };

      const txId = await transferToken(ctx, args.tokenId, from, to, args.amount);

      return jsonResult({
        transactionId: txId,
        from: args.fromAccountId,
        to: args.toAccountId,
        amount: args.amount,
        tokenId: args.tokenId,
        hashscanLink: hashscanUrl('transaction', txId),
      });
    },
  );

  // ── 5. hedera_get_balance ──
  // Mirror Node에서 토큰 잔액 조회

  server.tool(
    'hedera_get_balance',
    'Query token balance for an account via Hedera Mirror Node.',
    {
      accountId: z.string().describe('Hedera account ID (e.g. "0.0.12345")'),
      tokenId: z.string().describe('HTS Token ID'),
    },
    async (args) => {
      const balance = await getTokenBalance(args.accountId, args.tokenId);

      return jsonResult({
        accountId: args.accountId,
        tokenId: args.tokenId,
        balance,
        hashscanLink: hashscanUrl('account', args.accountId),
      });
    },
  );

  // ── 6. hedera_escrow_status ──
  // 에스크로 계정의 잔액과 HCS에 기록된 lock/release 이력 조회

  server.tool(
    'hedera_escrow_status',
    'Query escrow account status: current balance and lock/release history from HCS messages. Use this to verify escrow state during marketplace transactions.',
    {
      escrowAccountId: z.string().describe('Escrow account ID'),
      tokenId: z.string().describe('HTS Token ID'),
      topicId: z.string().describe('HCS Topic ID to search for escrow messages'),
    },
    async (args) => {
      const balance = await getTokenBalance(args.escrowAccountId, args.tokenId);
      const messages = await getTopicMessages(args.topicId);

      // HCS에서 escrow 관련 메시지 필터링
      const escrowMessages = messages
        .map((msg) => {
          try { return JSON.parse(msg.message); } catch { return null; }
        })
        .filter((p): p is Record<string, unknown> => {
          if (!p) return false;
          const t = p.type as string;
          return t === 'escrow_lock' || t === 'escrow_release';
        });

      const locks = escrowMessages.filter((m) => m.type === 'escrow_lock');
      const releases = escrowMessages.filter((m) => m.type === 'escrow_release');
      const totalLocked = locks.reduce((s, m) => s + ((m.amount as number) || 0), 0);
      const totalReleased = releases.reduce((s, m) => s + ((m.amount as number) || 0), 0);

      return jsonResult({
        escrowAccountId: args.escrowAccountId,
        tokenId: args.tokenId,
        currentBalance: balance,
        totalLocked,
        totalReleased,
        remaining: totalLocked - totalReleased,
        lockCount: locks.length,
        releaseCount: releases.length,
        history: escrowMessages,
        hashscanLink: hashscanUrl('account', args.escrowAccountId),
      });
    },
  );
}
