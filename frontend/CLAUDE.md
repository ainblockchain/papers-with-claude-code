# Frontend — Papers with Claude Code

## Project Overview

Next.js 기반 학습 플랫폼. AI 논문을 인터랙티브 코스로 변환하여 학습하고, 학습 데이터를 AIN 블록체인에 기록.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Auth**: NextAuth v5 (JWT strategy, GitHub + Kite Passport)
- **State**: Zustand (useAuthStore, usePurchaseStore)
- **Blockchain**: AIN devnet (`@ainblockchain/ain-js`)
- **Payment**: x402 protocol (Kite + Base chains)
- **Wallet**: WebAuthn P-256 passkey → AIN/EVM 주소 파생

## Memory / Documentation

프로젝트 아키텍처 문서는 Claude memory에 저장되어 있음:

```
~/.claude/projects/-Users-comcom-Desktop-papers-with-claude-code/memory/
├── MEMORY.md                          ← 인덱스
├── project_blockchain_architecture.md ← 블록체인 데이터 구조, write rules, 조회 방법
├── project_auth_wallet_flow.md        ← 로그인 플로우, 패스키, identity 복구
├── project_payment_progress.md        ← x402 결제, 학습 진행 추적, 대시보드
└── project_key_patterns.md            ← 개발 패턴, 주의사항, 알려진 이슈
```

## Key Architecture

### Auth Flow

`/login` → GitHub/Kite OAuth → Passkey 등록/인증 → Identity sync (블록체인) → `/explore`

### Wallet Derivation

```
P-256 publicKey → SHA-256 last 20 bytes → AIN address
P-256 publicKey → keccak256 → secp256k1 private key → EVM address
```

### Cross-Device Identity Recovery

블록체인 `/apps/knowledge/topics/identity/{userId}`에 암호화된 publicKey 저장.
새 디바이스 로그인 시 복구하여 동일 지갑 사용.

### Blockchain Paths

```
/apps/knowledge/
├── topics/           ← write: auth.addr !== '' (any wallet)
│   ├── {topicPath}   ← topic metadata
│   └── identity/     ← user identity mapping
├── explorations/     ← user learning data (per address)
├── graph/            ← knowledge graph (write: any wallet)
├── locations/        ← user positions (write: service wallet only)
├── courses/          ← course metadata (write: service wallet only)
└── access/           ← x402 payment receipts
```

### Devnet Query

```bash
curl -s -X POST https://devnet-api.ainetwork.ai/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ain_get","params":{"protoVer":"1.6.0","type":"GET_VALUE","ref":"/apps/knowledge/topics/identity"}}'
```

## Known Issues / TODO

- identity 경로가 `/topics/identity/`에 임시 배치 (root rule 제약) → `AIN_PRIVATE_KEY` 확보 후 이전
- `login/page.tsx`에 `[identity-sync]` 디버그 로그 잔존 → 테스트 완료 후 제거
- 크로스 디바이스 identity 복구 새 시크릿 창에서 최종 검증 필요
