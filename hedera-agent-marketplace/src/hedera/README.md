# hedera/

Hedera testnet integration module — HCS/HTS transaction execution and escrow infrastructure management

## File structure

| File | Role |
|------|------|
| `context.ts` | Shared interfaces (`HederaContext`, `AgentAccount`, `HCSMessage`) + client initialization + account creation |
| `hcs.ts` | HCS (Hedera Consensus Service) — topic creation, message submission/retrieval |
| `hts.ts` | HTS (Hedera Token Service) — token creation, association, transfer, balance query |
| `escrow.ts` | Escrow release + marketplace infrastructure setup (batch provisioning of accounts, tokens, topics) |
| `utils.ts` | HashScan explorer URL generation utility |
| `client.ts` | Barrel re-export — maintains backward compatibility with external import path (`hedera/client.js`) |

## Dependency graph

```
utils.ts        ← standalone
context.ts      ← standalone (@hashgraph/sdk)
hcs.ts          ← context.ts
hts.ts          ← context.ts
escrow.ts       ← context.ts + hcs.ts + hts.ts + types/marketplace.ts
client.ts       ← re-exports all submodules (no logic)
```

## How to import from external modules

Import from `hedera/client.js` as before:

```typescript
import { createContext, createTopic, submitMessage } from './hedera/client.js';
```
