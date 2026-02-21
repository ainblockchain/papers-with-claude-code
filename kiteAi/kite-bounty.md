# Papers with Claude Code × Kite AI — Bounty Submission

> **"Papers with Claude Code"** is an AI-powered education platform where autonomous agents authenticate via Kite Passport, pay for course access through x402, and record verifiable learning attestations on dual blockchains — all with minimal human intervention.

---

## 1. Mandatory Requirements (All 5 Met)

| Requirement | Our Implementation | Key Files |
|---|---|---|
| **Build on Kite AI Testnet** | Chain ID 2368, Test USDT `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`, Pieverse facilitator integration | `contracts.ts` |
| **x402 Payment Flows** | **Bidirectional** — Service Provider (returns 402 + settles via Pieverse) AND Agent Client (detects 402 + MCP payment + auto-retry) | `x402-nextjs.ts`, `x402-fetch.ts`, `mcp-client.ts` |
| **Verifiable Agent Identity** | WebAuthn Passkey → P-256 public key → EVM address derivation, Agent DID, Kite Passport integration | `passkey.ts`, `identity.ts`, `passport-auth.ts` |
| **Autonomous Execution** | Agent self-auth (`client_credentials`) + `tryMcpPayment()` auto-payment + `x402Fetch()` auto-retry — zero manual wallet clicking | `passport-auth.ts`, `x402.ts` |
| **Open-Source** | Public GitHub repo ([ainblockchain/papers-with-claudecode](https://github.com/ainblockchain/papers-with-claudecode)) | — |

---

## 2. What the Project Does

Papers with Claude Code is a learning management system where students explore research papers (e.g., "Attention Is All You Need") through interactive 2D dungeon environments paired with an AI tutor terminal.

**The Kite AI integration makes this an agent-native economy:**

- Each course stage is **gated by an x402 paywall**
- When a student passes a quiz, the AI agent **autonomously pays** to unlock the next stage
- Payment is **settled on Kite Chain** via Pieverse facilitator
- Learning progress is **attested on AIN Blockchain** with SHA-256 hashes
- The agent can **self-authenticate** without any human OAuth interaction

---

## 3. Success Criteria Mapping

### "AI Agent Authenticating Itself"

```
passport-auth.ts → authenticateAgent()
├── KITE_AGENT_ID + KITE_AGENT_SECRET environment variables
├── client_credentials OAuth flow (zero human intervention)
├── Automatic token caching + expiry detection
└── ensureMcpConnected() auto-attempts self-auth on every request
```

The agent authenticates on server boot → connects to Kite MCP → enters payment-ready state automatically.

### "Executes Paid Actions"

```
Student passes quiz → Next stage unlock request
├── POST /api/x402/unlock-stage
├── Server: No X-Payment → returns HTTP 402 (gokite-aa scheme)
├── Client: tryMcpPayment() triggered automatically
│   ├── get_payer_addr → User's AA wallet address
│   ├── approve_payment → Signed X-Payment token
│   └── Auto-retry with X-Payment header
├── Server: Pieverse /v2/verify → /v2/settle (on-chain settlement)
└── Record: AIN blockchain logs stage_complete event
```

Each course stage unlock = a paid action. x402 handles billing, Kite Chain handles settlement.

### "On-Chain Settlement or Attestations"

| On-Chain Record | Chain | Content |
|---|---|---|
| Payment Settlement | **Kite Chain** | Pieverse facilitator → `transferWithAuthorization` → USDT to merchant wallet |
| Learning Events | **AIN Blockchain** | `course_enter`, `stage_complete`, `quiz_pass` events |
| Learning Attestations | **AIN Blockchain** | SHA-256 hash of (paperId + stageNum + score + timestamp) |
| Knowledge Graph | **AIN Blockchain** | Topic relationship graph across papers |

**Dual-chain architecture** — Kite for payments, AIN for learning proofs. Richer than single-chain approaches.

### "End-to-End Live Demo"

| Component | Implementation |
|---|---|
| Full Web App | Next.js 16 full-stack application |
| Agent Dashboard | Wallet info, MCP connection status, payment history, attestations, knowledge graph visualization |
| 2D Learning Environment | Dungeon-style course maps + Claude AI terminal (60/40 split view) |
| Payment Visualization | PaymentModal, PaymentHistory table, Kite Explorer links |

---

## 4. Bonus Points

| Bonus Criterion | Our Implementation | Status |
|---|---|---|
| **Multi-Agent Coordination** | Student agent (browser) ↔ Server agent (Next.js, self-auth) ↔ Kite MCP server — 3-party collaboration | Covered |
| **Gasless UX** | Pieverse facilitator handles gas fees; users only pay USDT | Covered |
| **Security Controls** | OAuth state validation (CSRF prevention), session expiry handling, InsufficientBudget error handling, token logging prevention, server-side MCP proxy (no token exposure to browser) | Covered |

---

## 5. Judging Criteria Breakdown

### Agent Autonomy

The entire payment pipeline is automated:

```
authenticateAgent() → ensureMcpConnected() → tryMcpPayment() → settle
```

Humans only configure environment variables once. After that, the agent self-authenticates, detects 402 responses, calls MCP tools, and retries with payment — all autonomously.

### Correct x402 Usage

- Our 402 response format has been **validated against Kite's official Weather API** (`https://x402.dev.gokite.ai/api/weather`) — **all 12 fields match exactly** (scheme, network, maxAmountRequired, resource, description, mimeType, outputSchema, payTo, maxTimeoutSeconds, asset, extra, merchantName)
- Error handling covers all cases:
  - `insufficient_funds` → User-facing balance error message
  - `payment_required` → Prompts Kite Passport connection
  - `SessionExpired` → Re-authentication flow
  - `InsufficientBudget` → Session limit warning
  - `Unauthorized` → OAuth re-initiation
  - Invalid/fake X-Payment tokens → Properly rejected

### Security & Safety

| Security Measure | Implementation |
|---|---|
| Key isolation | WebAuthn P-256 keys are non-exportable (hardware-bound) |
| CSRF protection | OAuth state parameter validation on callback |
| Token security | Server-side MCP proxy — browser never sees access tokens |
| Session management | Automatic expiry detection with 60s buffer |
| Sensitive data | No caching of payer addresses or auth tokens; fetched fresh per request |

### Developer Experience

| DX Feature | Description |
|---|---|
| Adapter pattern | `KiteX402Adapter` (real) / `MockX402Adapter` (mock) — one env var to switch |
| One-line payment | `x402Fetch(url)` handles entire 402 → pay → retry flow |
| Clear API routes | `/api/kite-mcp/{config,status,tools,oauth,oauth/callback}` |
| Type safety | Full TypeScript with exported interfaces for all payment types |
| Environment config | Single `.env.local` file with all Kite + AIN variables |

### Real-World Applicability

This is not a toy demo — it's a **functioning education platform** where:
- Research papers become interactive courses
- AI tutors guide students through concepts
- Payment gating creates a sustainable business model
- On-chain attestations create portable, verifiable credentials

The "AI agent pays for API access" pattern maps directly to real EdTech monetization.

---

## 6. Competitive Differentiation

Most hackathon projects will likely:
- Call the Weather API and demonstrate a payment
- Build a CLI tool that sends x402 requests

**What makes us different:**

| Differentiator | Description |
|---|---|
| **Bidirectional x402** | We implemented BOTH Service Provider (receiving payments) AND Agent Client (making payments). Few projects do both |
| **Dual Blockchain** | Kite Chain for payment settlement + AIN Blockchain for learning attestations — meaningful on-chain data beyond just payments |
| **Real Use Case** | A paper-based education platform is the most natural example of "AI agents consuming paid services" |
| **Rich UI** | 2D dungeon environments, AI terminal, Agent Dashboard, knowledge graph — not a simple CLI demo |
| **Dual Auth Modes** | Both agent self-authentication AND user OAuth supported — demonstrating Mode 1 (user-controlled) and autonomous agent patterns |
| **Production Architecture** | Next.js 16, Zustand stores, adapter pattern, React Query caching — built like a real product, not a hackathon prototype |

---

## 7. Architecture Overview

```
┌───────────────────── Papers with Claude Code ─────────────────────┐
│                                                                    │
│  ┌──── Service Provider ────┐    ┌──── Agent / Developer ────┐   │
│  │ (Receiving Payments)      │    │ (Making Payments)          │   │
│  │                           │    │                            │   │
│  │ • HTTP 402 responses      │    │ • MCP Client (SDK)         │   │
│  │   (gokite-aa scheme)      │    │ • get_payer_addr           │   │
│  │ • Pieverse verify/settle  │    │ • approve_payment          │   │
│  │ • 7 x402-gated API routes │    │ • x402Fetch auto-wrapper   │   │
│  │ • outputSchema per route  │    │ • Agent self-auth          │   │
│  └───────────────────────────┘    │ • User OAuth flow          │   │
│                                    └────────────────────────────┘   │
│                                                                    │
│  ┌──── Verifiable Identity ──┐    ┌──── On-Chain Records ────┐   │
│  │                           │    │                           │   │
│  │ • WebAuthn Passkey        │    │ Kite Chain:               │   │
│  │ • P-256 → EVM derivation  │    │ • USDT payment settlement │   │
│  │ • Agent DID               │    │                           │   │
│  │ • Kite Passport           │    │ AIN Blockchain:           │   │
│  │ • OAuth + Self-Auth       │    │ • Learning events         │   │
│  └───────────────────────────┘    │ • Attestation hashes      │   │
│                                    │ • Knowledge graph         │   │
│                                    └───────────────────────────┘   │
│                                                                    │
│  ┌──── UI / Visualization ───────────────────────────────────┐   │
│  │ • 2D dungeon course maps    • Agent Dashboard              │   │
│  │ • AI tutor terminal         • MCP connection panel         │   │
│  │ • Payment modal + history   • Knowledge graph explorer     │   │
│  │ • Learning attestations     • Kite Explorer links          │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
 ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
 │ Kite Chain  │    │ Kite MCP     │    │    AIN       │
 │ (Testnet)   │    │ Server       │    │ Blockchain   │
 │             │    │              │    │              │
 │ Settlement  │    │ get_payer    │    │ Events       │
 │ via Pieverse│    │ approve_pay  │    │ Attestations │
 │ Test USDT   │    │ OAuth        │    │ Graph        │
 └─────────────┘    └──────────────┘    └──────────────┘
```

---

## 8. Key Files Reference

| File | Role |
|---|---|
| `src/lib/kite/mcp-client.ts` | MCP client singleton — connects to Kite MCP server, wraps `get_payer_addr` and `approve_payment` |
| `src/lib/kite/passport-auth.ts` | Dual auth — User OAuth flow + Agent self-authentication (`client_credentials`) |
| `src/lib/kite/x402-fetch.ts` | x402-aware fetch wrapper — auto-detects 402, pays via MCP, retries |
| `src/lib/kite/contracts.ts` | Kite Chain constants — testnet config, Test USDT address, Pieverse URLs |
| `src/app/api/x402/_lib/x402-nextjs.ts` | Service Provider middleware — builds 402 responses, verifies/settles via Pieverse |
| `src/app/api/x402/unlock-stage/route.ts` | x402-gated stage unlock — payment + AIN blockchain recording |
| `src/app/api/kite-mcp/tools/route.ts` | Server-side MCP tool proxy — secure bridge between browser and MCP |
| `src/app/api/kite-mcp/oauth/route.ts` | OAuth initiation — generates authorization URL with CSRF state |
| `src/app/api/kite-mcp/oauth/callback/route.ts` | OAuth callback — exchanges code, connects MCP, validates state |
| `src/lib/ain/event-tracker.ts` | AIN event recording — fire-and-forget learning event tracking |
| `src/lib/ain/passkey.ts` | WebAuthn — P-256 key management, dual address derivation |
| `src/lib/adapters/x402.ts` | Payment adapter — `KiteX402Adapter` with auto MCP payment fallback |
| `src/components/agent/KiteMcpConfig.tsx` | UI — Kite Passport connection management panel |
| `src/app/agent-dashboard/page.tsx` | Dashboard — wallet, MCP status, payments, attestations, knowledge graph |

---

## 9. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| State | Zustand 5 |
| Blockchain (Kite) | ethers 6, Pieverse facilitator |
| Blockchain (AIN) | @ainblockchain/ain-js 1.14 |
| MCP | @modelcontextprotocol/sdk 1.27 |
| Auth | next-auth 5 (GitHub OAuth), WebAuthn |
| UI | Tailwind CSS 4, Radix UI, lucide-react |
| Terminal | @xterm/xterm 6 |

---

## 10. Summary

**Papers with Claude Code** fulfills every bounty requirement — building on Kite Testnet, implementing bidirectional x402 payment flows, providing verifiable agent identity through WebAuthn + Kite Passport, enabling autonomous execution via agent self-authentication, and shipping as open-source. Beyond the requirements, it delivers a real-world education platform where AI agents pay for knowledge, prove their learning on-chain, and operate with minimal human intervention — demonstrating that Kite AI's agent-native payment infrastructure works for production use cases, not just demos.
