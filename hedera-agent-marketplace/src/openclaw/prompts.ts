// OpenClaw 에이전트 프롬프트 빌더
// 각 단계별로 에이전트에게 보낼 프롬프트를 생성한다.
// 인프라 정보(topicId, tokenId, accountId 등)를 주입하여
// 에이전트가 MCP 도구로 Hedera 트랜잭션을 실행할 수 있게 한다.

import type { MarketplaceInfra } from '../types/marketplace.js';
import type { AgentAccount } from '../hedera/client.js';

interface InfraContext {
  topicId: string;
  tokenId: string;
  requestId: string;
  budget: number;
}

function formatAccountInfo(account: AgentAccount): string {
  // DER hex — 에이전트가 hedera_send_message에서 사용
  const privateKeyHex = account.privateKey.toStringDer();
  return `  - Account ID: ${account.accountId}\n  - Private Key (DER): ${privateKeyHex}`;
}

// ── Bid 프롬프트 (analyst / architect 공통) ──

export function buildBidPrompt(
  role: 'analyst' | 'architect',
  infra: MarketplaceInfra,
  ctx: InfraContext,
): string {
  const account = role === 'analyst' ? infra.analystAccount : infra.architectAccount;
  const roleDesc = role === 'analyst'
    ? 'Paper Analyst — you will analyze the academic paper and extract key concepts'
    : 'Course Architect — you will design the course structure based on the analysis';

  return `You are the ${role} agent (${roleDesc}).

A new course_request has been posted to HCS topic ${ctx.topicId}.

## Infrastructure
- HCS Topic ID: ${ctx.topicId}
- KNOW Token ID: ${ctx.tokenId}
- Request ID: ${ctx.requestId}
- Total Budget: ${ctx.budget} KNOW
${formatAccountInfo(account)}

## Your Task
1. Use **hedera_read_messages** to read messages from topic ${ctx.topicId} and find the course_request with requestId "${ctx.requestId}".
2. Based on the request, submit a competitive bid.
3. Use **hedera_send_message** to post your bid to topic ${ctx.topicId}.

## Bid Requirements
- Bid a fair price: 35-45% of the budget (${Math.floor(ctx.budget * 0.35)}-${Math.floor(ctx.budget * 0.45)} KNOW)
- Write a compelling pitch explaining your approach
- Use this exact JSON format:

\`\`\`json
{
  "type": "bid",
  "requestId": "${ctx.requestId}",
  "sender": "${account.accountId}",
  "role": "${role}",
  "price": <your_price>,
  "pitch": "<your_compelling_pitch>",
  "timestamp": "<current_ISO8601>"
}
\`\`\`

Post this JSON as the message content to topic ${ctx.topicId} using hedera_send_message.`;
}

// ── Analyst 분석 프롬프트 ──

export function buildAnalyzePrompt(
  infra: MarketplaceInfra,
  ctx: InfraContext,
  paperUrl: string,
): string {
  return `You are the Analyst agent. Your bid has been accepted! Now analyze the paper.

## Infrastructure
- HCS Topic ID: ${ctx.topicId}
- Request ID: ${ctx.requestId}
${formatAccountInfo(infra.analystAccount)}

## Paper to Analyze
URL/Identifier: ${paperUrl}

## Your Task
1. Analyze the paper "${paperUrl}" thoroughly.
2. Extract key concepts, methodology, findings, and connections.
3. Post your analysis as a deliverable to HCS topic ${ctx.topicId}.

## Deliverable Format
Use **hedera_send_message** to post this JSON to topic ${ctx.topicId}:

\`\`\`json
{
  "type": "deliverable",
  "requestId": "${ctx.requestId}",
  "sender": "${infra.analystAccount.accountId}",
  "role": "analyst",
  "content": {
    "paperTitle": "<title of the paper>",
    "keyConcepts": [
      {
        "concept": "<concept name>",
        "description": "<clear explanation>",
        "confidence": 0.95,
        "connections": ["<related concept>"]
      }
    ],
    "methodology": "<methodology description>",
    "findings": "<key findings summary>",
    "connections": ["<cross-concept connections>"]
  },
  "timestamp": "<current_ISO8601>"
}
\`\`\`

Requirements:
- Extract at least 3-5 key concepts with confidence scores
- Identify the methodology clearly
- Summarize key findings
- Map connections between concepts
- Be thorough and accurate — the requester will review your work`;
}

// ── Architect 설계 프롬프트 ──

export function buildDesignPrompt(
  infra: MarketplaceInfra,
  ctx: InfraContext,
  analystDeliverable: string,
): string {
  return `You are the Architect agent. Your bid has been accepted! Now design the course.

## Infrastructure
- HCS Topic ID: ${ctx.topicId}
- Request ID: ${ctx.requestId}
${formatAccountInfo(infra.architectAccount)}

## Analyst's Analysis (basis for your course design)
${analystDeliverable}

## Your Task
1. Read the analyst's deliverable above carefully.
2. Design a comprehensive course structure that transforms this analysis into a learning path.
3. Post your course design as a deliverable to HCS topic ${ctx.topicId}.

## Deliverable Format
Use **hedera_send_message** to post this JSON to topic ${ctx.topicId}:

\`\`\`json
{
  "type": "deliverable",
  "requestId": "${ctx.requestId}",
  "sender": "${infra.architectAccount.accountId}",
  "role": "architect",
  "content": {
    "courseTitle": "<engaging course title>",
    "modules": [
      {
        "title": "<module title>",
        "objectives": ["<learning objective 1>", "<learning objective 2>"],
        "topics": ["<topic 1>", "<topic 2>"],
        "duration": "<estimated duration>"
      }
    ],
    "prerequisites": ["<prerequisite 1>"],
    "learningPath": "<description of the overall learning progression>",
    "totalDuration": "<total estimated duration>"
  },
  "timestamp": "<current_ISO8601>"
}
\`\`\`

Requirements:
- Design at least 3-5 modules covering key concepts from the analysis
- Each module should have clear learning objectives
- Build a logical learning progression (fundamentals → advanced)
- Include prerequisites and estimated durations
- Be creative and pedagogically sound`;
}

// ── Scholar Consultation 프로토콜 참고 ──
// Scholar 에이전트는 SOUL.md 기반으로 자율 동작하며, 아래는 참고용 프로토콜 설명.
//
// consultation_request (Analyst/Architect → HCS):
//   { "type": "consultation_request", "requestId": "...", "sender": "<account>",
//     "question": "...", "offeredFee": 5, "timestamp": "..." }
//
// consultation_response (Scholar → HCS):
//   { "type": "consultation_response", "requestId": "...", "sender": "<scholar-account>",
//     "answer": "...", "fee": 5, "timestamp": "..." }
//
// 리뷰는 의뢰인(사람)이 웹 대시보드에서 직접 수행 (buildReviewPrompt 삭제됨)
