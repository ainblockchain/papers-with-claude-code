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

### ⚠️ 블록체인 작업 전 필수 확인

**블록체인 데이터 수정/삭제/초기화 요청 시 반드시 `project_blockchain_architecture.md`를 먼저 읽을 것.**

해당 문서에 다음 절차가 정리되어 있음:
- 전체 explorations 초기화 절차
- 특정 유저의 특정 코스만 삭제하는 절차
- devnet vs mainnet 구분 (devnet만 사용!)
- 룰 수정 → 작업 → 룰 복원 패턴

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

## Series Data Schema

시리즈 데이터는 AIN 블록체인 `/apps/knowledge/series/{series-slug}/`에 저장.

| 필드 | 필수 | 설명 |
|---|---|---|
| `title` | Yes | 시리즈 제목 |
| `description` | Yes | 시리즈 설명 |
| `thumbnailUrl` | No | 에셋 파일명 (예: `blockchain-fundamentals.png`). 프론트엔드에서 `NEXT_PUBLIC_COURSE_ASSETS_BASE_URL`과 조합하여 전체 URL 생성 |
| `creatorAddress` | Yes | 생성자 지갑 주소 (auth.addr) |
| `groups` | Yes | 그룹별 코스 ID 목록. 그룹명은 자유 (언어, 난이도, 주제 등). 1개면 탭 없음, 2개 이상이면 자동 탭 생성. `{ "English": { 0: "id", 1: "id" }, "Korean": { 0: "id" } }` |
| `createdAt` | Yes | 생성 타임스탬프 (ms) |

썸네일 이미지는 awesome 레포 `assets/` 폴더에 업로드하고, 블록체인에는 파일명만 기록.

## Git / Push Rules

- **awesome 레포** (`ainblockchain/awesome-papers-with-claude-code`, 강의 콘텐츠): 수정 시 바로 커밋 + 푸시
- **그 외** (frontend, knowledge-graph-builder 등): 유저가 커밋/푸시를 명시적으로 요청하거나 컨펌할 때만 진행. 자동 커밋/푸시 금지

## Known Issues / TODO

- identity 경로가 `/topics/identity/`에 임시 배치 (root rule 제약) → `AIN_PRIVATE_KEY` 확보 후 이전
- `login/page.tsx`에 `[identity-sync]` 디버그 로그 잔존 → 테스트 완료 후 제거
- 크로스 디바이스 identity 복구 새 시크릿 창에서 최종 검증 필요
