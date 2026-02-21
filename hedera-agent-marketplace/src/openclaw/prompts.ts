// OpenClaw agent prompt builder
// Generates prompts for each step to send to agents.
// Injects infrastructure info (topicId, tokenId, accountId, etc.)
// so agents can execute Hedera transactions via MCP tools.

import type { MarketplaceInfra } from '../types/marketplace.js';
import type { AgentAccount } from '../hedera/client.js';

interface InfraContext {
  topicId: string;
  tokenId: string;
  requestId: string;
  budget: number;
}

function formatAccountInfo(account: AgentAccount): string {
  // DER hex — used by agents in hedera_send_message
  const privateKeyHex = account.privateKey.toStringDer();
  return `  - Account ID: ${account.accountId}\n  - Private Key (DER): ${privateKeyHex}`;
}

// ── Bid prompt (shared by analyst / architect) ──

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

// ── Analyst analysis prompt ──

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

// ── Architect design prompt ──

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

// ── Scholar Consultation protocol reference ──
// The Scholar agent operates autonomously based on SOUL.md; below is protocol documentation.
//
// consultation_request (Analyst/Architect -> HCS):
//   { "type": "consultation_request", "requestId": "...", "sender": "<account>",
//     "question": "...", "offeredFee": 5, "timestamp": "..." }
//
// consultation_response (Scholar -> HCS):
//   { "type": "consultation_response", "requestId": "...", "sender": "<scholar-account>",
//     "answer": "...", "fee": 5, "timestamp": "..." }
//
// Reviews are performed directly by the requester (human) via the web dashboard (buildReviewPrompt removed)
