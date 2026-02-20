# base-bounty Implementation Plan

## CRITICAL RULES (DO NOT VIOLATE)

1. **AIN blockchain IS the agent.** There is NO separate agent server. NEVER add `localhost:3402`, `AGENT_URL`, or any reference to a standalone agent process. All agent functionality runs through `ain-js` SDK talking to AIN devnet (`https://devnet-api.ainetwork.ai`).

2. **ERC-8004 is NOT a plain NFT.** It defines three registries (Identity, Reputation, Validation) with functions like `register()`, `setAgentURI()`, `getMetadata()`, `setMetadata()`, `getAgentWallet()`. Do not treat it as a simple `balanceOf`/`tokenURI` ERC-721.

3. **A2A agent card must be inside AIN blockchain**, accessible through the AIN devnet API — NOT through a separate server or fake domain.

---

## Raw User Instructions (Verbatim)

> "agent is in ain-blockchain. not in nextjs"

> "you need not to bring up another agent in 3402. you should use ain-blockchain is the agent"

> "you should delete 3402 code"

> "no not 3402 kill 3402"

> "study this: https://eips.ethereum.org/EIPS/eip-8004 and let me know what you were doing wrong to check you understood correctly. give me the proper plan"

> "also make sure ain-blockchain cogito agent supports a2a card which should be accessible through devnet-api..../agent-card.json"

> "identity is registered to https://cogito.papers-with-claudecode.ai which does not exist. make sure you have working url"

> "ERC-8004 Identity should have the link to the base scan"

> "8004 is related to nft?" (rhetorical — pointing out the implementation was wrong)

> "in the knowledge graph clicking the node should go to content if the node does not have the content it could be minimized"

> "there are so many duplicated topic. also you should only accept the knowledge with official paper and corresponding code of the paper"

> "paper-enrichment should have additional functionality: github url integration related to the code"

---

## What Was Wrong With the Previous Implementation

### ERC-8004
- Treated as a plain ERC-721 NFT — only used `balanceOf`/`tokenURI`
- Missing: `setAgentURI()`, `getMetadata()`, `setMetadata()`, `getAgentWallet()`, `setAgentWallet()`
- Missing: Reputation Registry (feedback from clients)
- Missing: Validation Registry (validator attestations)
- `agentURI` pointed to `https://cogito.papers-with-claudecode.ai` which does not exist
- No hosted registration file at the agentURI
- Dashboard only showed Agent ID as an NFT badge, not the full ERC-8004 metadata

### A2A
- No A2A agent card at all
- The agent card should be accessible through AIN devnet, not a separate server
- No `.well-known/agent-registration.json` for domain verification

### Architecture
- Kept adding `localhost:3402` references for a standalone agent server
- The web frontend should talk ONLY to AIN blockchain via `ain-js` SDK
- SSE stream and chat should read from AIN blockchain state, not proxy to a separate process

---

## Implementation Plan: Proper ERC-8004 + A2A

### 1. Extend ERC-8004 ABI and base-client.ts

Add the full Identity Registry interface to `web/src/lib/base-client.ts`:

```solidity
// Beyond current balanceOf/tokenURI, add:
function register(string agentURI, MetadataEntry[] calldata metadata) external returns (uint256)
function setAgentURI(uint256 agentId, string calldata newURI) external
function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory)
function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external
function getAgentWallet(uint256 agentId) external view returns (address)
function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external
```

Add read functions for Reputation Registry:
```solidity
function getSummary(uint256 agentId, address[] calldata clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
function readAllFeedback(uint256 agentId, ...) external view returns (...)
function getClients(uint256 agentId) external view returns (address[] memory)
```

### 2. Host Agent Registration File via AIN Blockchain

The `agentURI` must resolve to a valid JSON registration file. Since the agent IS the AIN blockchain, the registration file should be stored in AIN state and served through the AIN devnet API.

Store in AIN state tree at a known path:
```
/apps/knowledge/agent_registration -> {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "Cogito Node",
  description: "Autonomous knowledge agent that reads research papers, builds a global knowledge graph on AIN blockchain, and earns USDC via x402 micropayments on Base",
  services: [
    {
      name: "A2A",
      endpoint: "https://devnet-api.ainetwork.ai",
      version: "1.0.0",
      skills: ["knowledge-exploration", "paper-analysis", "course-generation"],
      domains: ["ai", "crypto"]
    }
  ],
  x402Support: true,
  active: true,
  registrations: [
    {
      agentId: 18276,
      agentRegistry: "eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
    }
  ],
  supportedTrust: ["reputation"]
}
```

### 3. A2A Agent Card via AIN Blockchain

The A2A agent card should be accessible through the AIN devnet API. Store it in the AIN state tree:

```
/apps/knowledge/a2a_agent_card -> {
  name: "Cogito Node",
  description: "Autonomous knowledge agent — reads arXiv papers, builds knowledge graph, earns via x402",
  url: "https://devnet-api.ainetwork.ai",
  version: "1.0.0",
  capabilities: {
    streaming: true,
    pushNotifications: false
  },
  skills: [
    {
      id: "knowledge-exploration",
      name: "Knowledge Exploration",
      description: "Explore research topics with paper-grounded context from arXiv",
      tags: ["ai", "research", "papers", "knowledge-graph"],
      examples: ["Explore transformer architecture", "What are state-space models?"]
    },
    {
      id: "paper-enrichment",
      name: "Paper Enrichment",
      description: "Enrich lessons with academic papers and their official GitHub code repositories",
      tags: ["papers", "code", "enrichment"],
      examples: ["Enrich a lesson about attention mechanisms"]
    },
    {
      id: "course-generation",
      name: "Course Generation",
      description: "Generate structured courses from accumulated knowledge explorations",
      tags: ["education", "courses"],
      examples: ["Generate a course on reinforcement learning"]
    }
  ],
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain", "application/json"],
  erc8004: {
    agentId: 18276,
    registry: "eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    address: "0xA7b9a0959451aeF731141a9e6FFcC619DeB563bF"
  }
}
```

### 4. Update agentURI On-Chain

Call `setAgentURI(18276, <working_url>)` to point to the AIN-hosted registration file instead of the non-existent `cogito.papers-with-claudecode.ai`.

The URI should resolve to the registration JSON stored in AIN state.

### 5. Update Dashboard to Show Full ERC-8004 Metadata

In `web/src/app/page.tsx`, the Agent Identity section should display:
- Agent ID with BaseScan link (already done)
- agentURI (must be a working link)
- Agent wallet address (from `getAgentWallet()`)
- On-chain metadata keys
- Reputation summary (from Reputation Registry `getSummary()`)
- A2A agent card link (to AIN devnet)
- Registration file content

### 6. Update agent/src/base-chain/identity.ts

Add methods:
- `setAgentURI(agentId, newURI)` — update the on-chain URI
- `getMetadata(agentId, key)` — read on-chain metadata
- `setMetadata(agentId, key, value)` — write on-chain metadata
- `getAgentWallet(agentId)` — read payment wallet

### 7. Write Registration + A2A Card to AIN State

In `agent/src/cogito.ts`, during `start()`:
- Write the registration file JSON to `/apps/knowledge/agent_registration`
- Write the A2A agent card to `/apps/knowledge/a2a_agent_card`
- These become accessible via AIN devnet API

---

## Architecture

**`base-bounty/agent/` is DELETED.** The agent is the AIN blockchain (cogito/).

## Files Modified

| File | Change |
|------|--------|
| `cogito/src/ain-client.ts` | Added `writeAgentRegistration()` and `writeA2AAgentCard()` — writes ERC-8004 registration + A2A card to AIN state |
| `cogito/src/server.ts` | Calls registration + A2A write on startup |
| `base-bounty/web/src/lib/base-client.ts` | Extended ERC-8004 ABI with full Identity + Reputation Registry read functions, added `getA2AAgentCard()` and `getAgentRegistrationFile()` |
| `base-bounty/web/src/app/page.tsx` | Shows full ERC-8004 metadata, reputation, A2A card link |
| `base-bounty/web/.env.local` | NO `AGENT_URL` — only AIN and Base RPC URLs |
