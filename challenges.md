# Engineering Challenges

---

## 1. P256 Passkey as Blockchain Wallet

WebAuthn mandates P256 (ES256), but P256 lacks reliable public key recovery from signatures — unlike secp256k1's `ecrecover`. We designed a new 98-byte signature format (`0x02 + compressedPubKey(33) + r(32) + s(32)`) that embeds the public key directly, making verification deterministic on AIN blockchain while remaining backward-compatible with existing 66-byte secp256k1 signatures. The passkey IS the wallet — no seed phrases, no private key management.

Embedding the public key in the signature opens three attack surfaces. We implemented defenses for all three:

**Rogue Key Attack.** An attacker generates their own P256 keypair, embeds their public key in the 98-byte signature, and signs a transaction claiming to be the victim's address. The signature is cryptographically valid — just signed by the wrong key. Defense: `verifyAddressBinding()` hashes the compressed public key from the signature and compares the derived address against the expected sender address before accepting. If they don't match, the signature is rejected.

**WebAuthn Replay & Phishing.** WebAuthn signs over `authenticatorData + SHA-256(clientDataJSON)`, not just the raw transaction hash. Without validating these fields, an attacker can replay a signature from a different transaction or phish it from a lookalike domain. Defense: `validateClientDataJSON()` verifies the challenge matches the transaction hash, the origin matches the app domain, and the type is `webauthn.get`. `validateAuthenticatorData()` verifies the rpIdHash against the expected hostname and checks the user-present flag. Comparisons use constant-time equality to prevent timing side-channels.

**Signature Malleability (Low-S).** For any valid ECDSA signature `(r, s)`, the pair `(r, n-s)` is also valid. An attacker can flip `s` to produce a second valid signature with a different hash, confusing transaction deduplication. Defense: `enforceCanonicalS()` checks if `s > n/2` (P256 curve half-order) and normalizes to `n - s` if so, ensuring only the canonical form is accepted.

## 2. Dual-Chain Architecture

The knowledge graph needs fast, append-only writes. Payments need EVM compatibility and stablecoins. No single chain does both. We split: AIN blockchain stores the knowledge graph (explorations, topics, frontier maps), Kite/Base chain handles USDC micropayments (ERC-4337 AA, ERC-8004 agent identity, ERC-8021 attribution). A Cogito Node writes an exploration to AIN, tags it with a price, and a learner on Base pays to access it — x402 bridges the two chains.

## 3. x402 Micropayment Protocol

At ~$0.001 per stage, traditional payment rails (Stripe minimum fees, subscriptions) don't work. We adopted HTTP 402: server returns payment details, client signs and retries with `X-Payment` header. An x402-aware fetch wrapper handles the 402 → sign → retry flow transparently — application code never sees payment logic. Adapter pattern switches between mock (dev) and real (Kite chain) via env var.

## 4. Ephemeral K8s Pods for Per-Learner AI Tutors

Each learner gets a dedicated Claude Code instance in a dynamically created Kubernetes pod. Perfect isolation — no shared state, no context leakage. Dynamic creation over pre-allocated pool: security outweighs the 5-10s startup latency. WebSocket over SSH: no port exposure, works through standard proxies. Three cleanup paths (unmount, HMR, tab close) required to prevent zombie session leaks.

## 5. Knowledge Graph as Collective Intelligence Ledger

Multiple autonomous Cogito Nodes independently explore papers and write to the same AIN blockchain graph — no central coordinator. Each exploration creates a graph node with typed edges (extends, related, prerequisite). Frontier maps aggregate depth across all nodes, enabling cross-node discovery: Node A sees "transformers explored to depth 5" by Node B and fills gaps at depth 6. Throughput limited by consensus — solved with polling intervals and batch writes.

## 6. Self-Sustaining Cogito Node Economics

Local LLM (Qwen3-32B-AWQ on A6000) costs ~$0.004/inference vs. cloud API at $0.01-0.05. At $0.001/stage micropayment prices, cloud APIs would never break even. Local LLM becomes self-sustaining at ~180 queries/day. The SUSTAIN phase tracks P&L and shifts exploration toward higher-demand topics visible on frontier maps.

## 7. ERC-8004 + ERC-8021: Agent Identity and Author Attribution

Each Cogito Node registers as an ERC-8004 autonomous agent on Base — not a plain NFT, but full identity: `setAgentURI()`, metadata registry, wallet binding. Every x402 payment transaction includes ERC-8021 builder codes encoding `arxiv_id + github_repo + first_author` — immutable on-chain attribution of original paper authors whenever their work is monetized.

## 8. Deterministic Course Generation from Papers

6-step headless pipeline: parse paper → extract 15-30 concept nodes → topological sort by prerequisites → generate lessons with quizzes → scaffold files → publish to AIN with x402 pricing. Deterministic slugs ensure the same paper always produces the same course ID regardless of input URL format (arXiv, GitHub, HuggingFace all normalize to canonical title). Paper text treated as DATA only — defense against prompt injection in adversarial papers.
