# Kite AI Bounty: Agent-Native Payments & Identity

An AI tutor agent that authenticates itself via Kite Passport, pays for knowledge access through x402 on Kite Chain, and records verifiable learning proofs on-chain — all without human intervention.

## What It Does

Research papers become interactive courses in a 2D dungeon environment. Each stage is gated by an x402 micropayment (~$0.001 in Test USDT on Kite Testnet). When a learner passes a quiz, the AI agent autonomously pays to unlock the next stage. No wallet popups, no manual signing. LearningLedger smart contract deployed at [`0xaffB...14A72`](https://testnet.kitescan.ai/address/0xaffB053eE4fb81c0D3450fDA6db201f901214A72) on Kite Testnet (Chain ID 2368).

## Agent Autonomy

Server boots with `KITE_AGENT_ID` + `KITE_AGENT_SECRET` → agent self-authenticates via `client_credentials` → MCP client connects to Kite MCP server → `x402Fetch()` auto-detects HTTP 402 → calls `get_payer_addr` + `approve_payment` via MCP → retries with `X-Payment` header → Pieverse settles on Kite Chain → learning event recorded on AIN blockchain. Humans configure env vars once. Everything after is autonomous.

## Bidirectional x402

We built both sides. **Service Provider**: 7 x402-gated API routes returning HTTP 402 with `gokite-aa` scheme, settling via Pieverse facilitator. **Agent Client**: `x402Fetch()` wrapper handles the entire 402→pay→retry cycle transparently. Every failure mode covered — `insufficient_funds` (faucet link), `SessionExpired` (re-auth), `InsufficientBudget` (limit warning).

## Verifiable Agent Identity

WebAuthn P-256 passkey as hardware-bound wallet with three security defenses (Rogue Key, replay/phishing, signature malleability). Agent DID (`did:kite:learner.eth/claude-tutor/v1`) derived via BIP-32 at path `m/44'/2368'/0'/0/{index}`. KitePass binds identity to Standing Intent spending constraints. Kite Passport integrated as NextAuth v5 OAuth provider with dual auth modes (user OAuth + agent self-auth).

## On-Chain Records (Dual Chain)

Kite Chain settles USDT micropayments with sub-second finality. AIN blockchain records learning events (`course_enter`, `stage_complete`, `quiz_pass`) with SHA-256 attestation hashes. ERC-4337 account abstraction for gasless UX. ERC-8004 agent identity on Base. ERC-8021 builder codes attributing original paper authors in every payment transaction.

## Security

Hardware-bound P-256 keys (non-exportable). Server-side MCP proxy (browser never sees tokens). Standing Intent with per-tx max, daily cap, contract whitelist, function whitelist, TTL. OAuth state validation (CSRF). Low-S signature enforcement. Constant-time comparison against timing side-channels.
