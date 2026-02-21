# 0G Developer Course

> Learn to build on 0G — the decentralized AI operating system — through a structured curriculum with runnable TypeScript examples.

**Source**: Official 0G Documentation (docs.0g.ai)
**Format**: Hybrid — AI-tutored course + standalone runnable examples
**Time**: ~4 hours to complete all 5 modules

---

## Quick Start (5 minutes)

```bash
# 1. Clone and navigate to examples
cd examples && npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# 3. Get testnet tokens
# Visit https://faucet.0g.ai and paste your wallet address

# 4. Run the full-stack demo
npm run demo
```

That's it. The demo uploads a file to 0G Storage, registers it on-chain, and runs AI analysis — all in one script.

---

## Course Overview

| Module | Topic | Concepts | Level |
|---|---|---|---|
| 1 | 0G Foundations | 5 concepts | Foundational |
| 2 | 0G Storage SDK | 6 concepts | Intermediate |
| 3 | 0G Compute Network | 5 concepts | Intermediate |
| 4 | 0G Chain & Smart Contracts | 5 concepts | Advanced |
| 5 | Advanced 0G Patterns | 4 concepts | Frontier |

**25 concepts total** — from "what is 0G?" to "deploy an AI agent as an ERC-7857 INFT".

---

## Module 1: 0G Foundations

**What you'll learn**: The four-service architecture, network setup, wallet configuration, and all the contract addresses you'll ever need.

**Key concepts**:
- `decentralized_ai_os` — Chain + Storage + Compute + DA
- `network_configuration` — Testnet Galileo (chainId: 16602) + Mainnet Aristotle (16661)
- `smart_contract_addresses` — Flow, DAEntrance, Compute Ledger, precompiles

**Network Quick Reference**:

| Network | Chain ID | RPC | Explorer |
|---|---|---|---|
| Testnet (Galileo) | 16602 | https://evmrpc-testnet.0g.ai | https://chainscan-galileo.0g.ai |
| Mainnet (Aristotle) | 16661 | https://evmrpc.0g.ai | https://chainscan.0g.ai |

---

## Module 2: 0G Storage SDK

**What you'll learn**: Upload and download files with cryptographic integrity guarantees. 95% cheaper than AWS S3, 200 MBPS retrieval.

**Key concepts**:
- `ts_sdk_setup` — `npm install @0glabs/0g-ts-sdk ethers`
- `file_upload_merkle` — ZgFile + Merkle tree + rootHash (your file's permanent ID)
- `file_download_verify` — Merkle proof verification built-in
- `kv_storage` — Mutable key-value store via Batcher + KvClient

**Runnable examples**:
```bash
npm run upload   # Upload a file → get rootHash
npm run download # Download by rootHash + verify integrity
npm run kv       # Read/write key-value pairs
```

**Core pattern**:
```typescript
import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const indexer = new Indexer('https://indexer-storage-testnet-turbo.0g.ai');

const file = await ZgFile.fromFilePath('./my-dataset.jsonl');
const [tree] = await file.merkleTree();
const rootHash = tree!.rootHash();  // ← SAVE THIS. It's your file's identity.
await indexer.upload(file, RPC_URL, signer);
await file.close();
```

---

## Module 3: 0G Compute Network

**What you'll learn**: Run AI inference and fine-tune models on decentralized GPU hardware. 90% cheaper than OpenAI. OpenAI SDK compatible.

**Key concepts**:
- `account_funding_flow` — CLI setup: login → deposit → transfer → acknowledge
- `openai_compatible_inference` — 2-line migration from OpenAI
- `fine_tuning_workflow` — Custom .jsonl datasets, fee calculation
- `compute_fee_model` — ZG-Res-Key settlement, ZK proofs

**Setup**:
```bash
pnpm add @0glabs/0g-serving-broker -g
0g-compute-cli login
0g-compute-cli deposit --amount 10
0g-compute-cli inference list-providers
0g-compute-cli transfer-fund --provider <ADDR> --amount 5
0g-compute-cli inference acknowledge-provider --provider <ADDR>
0g-compute-cli inference get-secret --provider <ADDR>  # → ZG_API_KEY
```

**Migrate from OpenAI** (2 lines):
```typescript
// Before:
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// After (2-line change → 90% cheaper):
const client = new OpenAI({
  apiKey: process.env.ZG_API_KEY,           // from get-secret
  baseURL: process.env.ZG_PROVIDER_URL + '/v1/proxy',
});
```

**Run**: `npm run infer`

---

## Module 4: 0G Chain & Smart Contracts

**What you'll learn**: Deploy Solidity contracts, use native precompiles, and integrate the 0G DA layer for rollup applications.

**Key concepts**:
- `evm_compatibility_config` — **Must set `evmVersion: 'cancun'`** in Hardhat/Foundry
- `da_signers_precompile` — Native DA access at address `0x1000`
- `data_availability_layer` — KZG commitments, 50 Gbps throughput
- `rollup_integration` — OP Stack da-server, Arbitrum Nitro DataAvailabilityProvider

**Critical Hardhat config**:
```javascript
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      evmVersion: "cancun",  // ← REQUIRED. Missing this causes silent failures.
      optimizer: { enabled: true, runs: 200 }
    }
  },
  networks: {
    testnet: { url: "https://evmrpc-testnet.0g.ai", chainId: 16602, accounts: [PK] },
    mainnet: { url: "https://evmrpc.0g.ai", chainId: 16661, accounts: [PK] }
  }
};
```

---

## Module 5: Advanced 0G Patterns

**What you'll learn**: Tokenize AI agents as NFTs, build full-stack AI applications, and index on-chain data with Goldsky.

**Key concepts**:
- `inft_erc7857` — ERC-7857: NFT owns encrypted AI model weights, TEE re-encrypts on transfer
- `ai_agent_storage_pattern` — Storage (weights) + Compute (inference) + Chain (provenance)
- `goldsky_indexing` — GraphQL subgraphs and real-time database streaming
- `full_stack_0g_app` — All four services composing into a complete application

**Full-stack pipeline**:
```
User uploads dataset → 0G Storage (rootHash)
                    → On-chain registration (smart contract stores rootHash)
                    → 0G Compute (AI analysis)
                    → 0G Storage (analysis result, immutable)
```

**Run the capstone demo**: `npm run demo`

---

## Contract Addresses Reference

### Testnet (Galileo, chainId: 16602)

| Contract | Address |
|---|---|
| Flow (Storage) | `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296` |
| Mine (Mining) | `0x00A9E9604b0538e06b268Fb297Df333337f9593b` |
| DAEntrance | `0xE75A073dA5bb7b0eC622170Fd268f35E675a957B` |
| Compute Ledger | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` |
| Compute Inference | `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E` |
| Compute FineTuning | `0xaC66eBd174435c04F1449BBa08157a707B6fa7b1` |
| DASigners (precompile) | `0x0000000000000000000000000000000000001000` |
| WrappedOGBase (precompile) | `0x0000000000000000000000000000000000001001` |

### Mainnet (Aristotle, chainId: 16661)

| Contract | Address |
|---|---|
| Flow | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526` |
| Compute Ledger | `0x2dE54c845Cd948B72D2e32e39586fe89607074E3` |

---

## Course Files

```
0g-developer-course/
├── CLAUDE.md             ← AI tutor instructions
├── README.md             ← This file
├── .gitignore
├── knowledge/
│   ├── graph.json        ← Knowledge graph (25 nodes, 32 edges)
│   └── courses.json      ← Full curriculum (5 modules, 25 lessons)
├── examples/
│   ├── 00-setup.md       ← Environment setup guide
│   ├── 01-storage-upload.ts
│   ├── 02-storage-download.ts
│   ├── 03-kv-storage.ts
│   ├── 04-compute-inference.ts
│   ├── 05-full-stack.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── blockchain/
    ├── config.json       ← Knowledge graph metadata
    └── package.json
```

---

## Resources

- **Documentation**: https://docs.0g.ai
- **Builder Hub**: https://build.0g.ai
- **Faucet**: https://faucet.0g.ai
- **Explorer (Testnet)**: https://chainscan-galileo.0g.ai
- **Explorer (Mainnet)**: https://chainscan.0g.ai
- **Storage Explorer**: https://storagescan.0g.ai

---

## Using the AI Tutor

This course includes a CLAUDE.md that configures an AI tutor. To use it:

```bash
cd 0g-developer-course
claude  # Opens Claude Code with CLAUDE.md tutor instructions loaded
```

Then ask the AI to teach you any concept:
- "Explain how Merkle proof verification works in 0G Storage"
- "Walk me through the full account setup for 0G Compute"
- "Show me how to deploy a smart contract to 0G Testnet"
- "What is the AI Agent Storage Pattern?"

---

*Generated by Papers with Claude Code — 0G Bounty Submission*
*Source: 0G Labs, 2024 — 0G Developer Documentation (docs.0g.ai)*
