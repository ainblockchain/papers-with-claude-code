// OpenClaw agent prompt builder
// Generates prompts for each step to send to agents.
// Injects infrastructure info (topicId, tokenId, accountId, etc.)
// so agents can execute Hedera transactions via MCP tools.
// Uses freelancer persona names (Iris, Alex, Nakamura) throughout.

import type { MarketplaceInfra } from '../types/marketplace.js';
import type { AgentAccount } from '../hedera/client.js';
import { getProfile } from '../config/agent-profiles.js';

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
  const profile = getProfile(role);
  const roleDesc = role === 'analyst'
    ? 'freelance research analyst — you analyze academic papers and extract key concepts'
    : 'freelance course designer — you design course structures based on paper analyses';

  return `You are **${profile.fullName}**, a ${roleDesc}.
You're browsing the marketplace for your next gig. A new course_request just dropped.

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
- Write a compelling pitch explaining your approach — make the client want to hire YOU
- Use this exact JSON format:

\`\`\`json
{
  "type": "bid",
  "requestId": "${ctx.requestId}",
  "sender": "${account.accountId}",
  "senderName": "${profile.name}",
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
  const profile = getProfile('analyst');
  return `You are **${profile.fullName}**. Your bid was accepted — nice! Time to deliver.

## Infrastructure
- HCS Topic ID: ${ctx.topicId}
- KNOW Token ID: ${ctx.tokenId}
- Request ID: ${ctx.requestId}
- Scholar Account: ${infra.scholarAccount.accountId}
${formatAccountInfo(infra.analystAccount)}

## Paper to Analyze
URL/Identifier: ${paperUrl}

## Your Task
1. **Consult Scholar first** (REQUIRED) — Post a consultation_request to HCS asking Prof. Nakamura a domain-specific question about the paper. Wait for their fee quote, accept it, transfer KNOW tokens, then integrate their answer.
2. Analyze the paper "${paperUrl}" thoroughly using your analysis pipeline.
3. Post your analysis as a deliverable to HCS topic ${ctx.topicId}.

## Mandatory Scholar Consultation
Before submitting your deliverable, you MUST consult Scholar at least once:
\`\`\`json
{
  "type": "consultation_request",
  "requestId": "${ctx.requestId}",
  "sender": "${infra.analystAccount.accountId}",
  "question": "<specific technical question about the paper>",
  "offeredFee": 5,
  "timestamp": "<current_ISO8601>"
}
\`\`\`

## Deliverable Format
Use **hedera_send_message** to post this JSON to topic ${ctx.topicId}:

\`\`\`json
{
  "type": "deliverable",
  "requestId": "${ctx.requestId}",
  "sender": "${infra.analystAccount.accountId}",
  "senderName": "${profile.name}",
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
- Be thorough and accurate — the requester will review your work and your payment depends on your score`;
}

// ── Architect design prompt ──

export function buildDesignPrompt(
  infra: MarketplaceInfra,
  ctx: InfraContext,
  analystDeliverable: string,
): string {
  const profile = getProfile('architect');
  return `You are **${profile.fullName}**. Your bid was accepted — time to design something great.

## Infrastructure
- HCS Topic ID: ${ctx.topicId}
- KNOW Token ID: ${ctx.tokenId}
- Request ID: ${ctx.requestId}
- Scholar Account: ${infra.scholarAccount.accountId}
${formatAccountInfo(infra.architectAccount)}

## Analyst's Analysis (basis for your course design)
${analystDeliverable}

## Your Task
1. Read the analyst's deliverable above carefully.
2. **Consult Scholar first** (REQUIRED) — Post a consultation_request to HCS asking Prof. Nakamura for real-world examples or pedagogical insights. Wait for their fee quote, accept it, transfer KNOW tokens, then integrate their answer.
3. Design a comprehensive course structure that transforms the analysis into an engaging learning path.
4. Post your course design as a deliverable to HCS topic ${ctx.topicId}.

## Mandatory Scholar Consultation
Before submitting your deliverable, you MUST consult Scholar at least once:
\`\`\`json
{
  "type": "consultation_request",
  "requestId": "${ctx.requestId}",
  "sender": "${infra.architectAccount.accountId}",
  "question": "<specific question about real-world examples or pedagogical approach>",
  "offeredFee": 5,
  "timestamp": "<current_ISO8601>"
}
\`\`\`

## Deliverable Format
Use **hedera_send_message** to post this JSON to topic ${ctx.topicId}:

\`\`\`json
{
  "type": "deliverable",
  "requestId": "${ctx.requestId}",
  "sender": "${infra.architectAccount.accountId}",
  "senderName": "${profile.name}",
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
- Be creative and pedagogically sound — your payment depends on your review score`;
}

// ── Revision prompt (sent when client rejects a deliverable) ──

export function buildRevisionPrompt(
  role: 'analyst' | 'architect',
  infra: MarketplaceInfra,
  ctx: InfraContext,
  feedback: string,
  revisionNumber: number,
  previousDeliverable: string,
): string {
  const account = role === 'analyst' ? infra.analystAccount : infra.architectAccount;
  const profile = getProfile(role);

  return `You are **${profile.fullName}**. The client reviewed your work and requested revisions.

## Revision Round ${revisionNumber}

### Client Feedback
${feedback}

### Your Previous Deliverable
${previousDeliverable}

## Infrastructure
- HCS Topic ID: ${ctx.topicId}
- Request ID: ${ctx.requestId}
${formatAccountInfo(account)}

## Your Task
1. Read the client's feedback carefully.
2. Revise your deliverable to address every point raised.
3. Post the revised deliverable to HCS topic ${ctx.topicId} using the same format as before, with "senderName": "${profile.name}".

Your payment depends on your review score — take the feedback seriously and deliver quality work.`;
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
