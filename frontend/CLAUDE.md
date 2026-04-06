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
하나의 유저에 **복수 패스키(publicKey)** 등록 가능 — 디바이스마다 다른 패스키.

```
/apps/knowledge/topics/identity/{userId}
└── keys/
    ├── key_{timestamp1}: { encryptedPublicKey, provider, createdAt }
    ├── key_{timestamp2}: { encryptedPublicKey, provider, createdAt }
    └── ...
```

- GET: `keys/` 순회하며 현재 환경의 `AIN_PRIVATE_KEY`로 복호화 가능한 첫 번째 publicKey 반환
- POST: 동일 publicKey 중복 방지(409), 기존 keys 보존하며 추가
- 환경별(로컬/프로드) `AIN_PRIVATE_KEY`가 다르면 서로의 키를 복호화 불가 → 데이터 자연 분리
- 블록체인 패스키가 항상 우선: 복구 시 블록체인 publicKey로 지갑 파생

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
| `groups` | Yes | 그룹별 코스 목록. 그룹명은 자유 (언어, 난이도, 주제 등). 1개면 탭 없음, 2개 이상이면 자동 탭 생성. 각 항목은 `{ courseId, achievementUrl? }` 형태. 아래 Groups 상세 참조 |
| `createdAt` | Yes | 생성 타임스탬프 (ms) |

썸네일 이미지는 awesome 레포 `assets/` 폴더에 업로드하고, 블록체인에는 파일명만 기록.

### Groups 상세

각 그룹 항목은 인덱스 키(`0`, `1`, ...)로 정렬된 object:

```json
{
  "English": {
    "0": { "courseId": "blockchain-decentralization-fundamentals--core", "achievementUrl": "https://learn-dev.modulabs.co.kr/..." },
    "1": { "courseId": "dao-decentralized-organizations--core" }
  },
  "Korean": {
    "0": { "courseId": "blockchain-decentralization-fundamentals--core-ko", "achievementUrl": "https://learn-dev.modulabs.co.kr/..." }
  }
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `courseId` | Yes | 코스 ID (`{paper-slug}--{course-slug}` 형태) |
| `achievementUrl` | No | 외부 성취 인증 URL. 설정 시 코스 완료 화면에 "Complete on Modulabs" 버튼 표시 (새 탭) |

> **하위호환**: API(`api/series/route.ts`)는 레거시 포맷(`"0": "course-id"` string)도 자동 변환하므로, 기존 시리즈 데이터가 있어도 동작함.

## Lesson Content Media Support

학습 모달(ConceptOverlay)은 `courses.json`의 `content` 마크다운 필드에서 이미지와 YouTube 비디오를 렌더링함.

### 이미지

마크다운 이미지 문법을 독립 라인으로 작성: `![캡션](경로)`

- **에셋 이미지**: awesome 레포 `assets/courses/{paper-slug}/{course-slug}/`에 업로드 후 상대 경로 사용
  - 예: `![아키텍처](courses/attention-is-all-you-need/my-course/architecture.png)`
  - 프론트엔드에서 `NEXT_PUBLIC_COURSE_ASSETS_BASE_URL`과 조합하여 전체 URL 생성
- **외부 이미지**: 전체 URL 사용
  - 예: `![다이어그램](https://example.com/image.png)`

### YouTube 비디오

YouTube URL을 독립 라인으로 작성하면 자동으로 임베드 플레이어로 변환:

```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
```

### 에셋 폴더 구조

```
awesome-papers-with-claude-code/
  assets/
    blockchain-fundamentals.png          ← 시리즈 썸네일 (기존)
    courses/
      {paper-slug}/{course-slug}/        ← 코스별 학습 이미지
        architecture-overview.png
        training-pipeline.png
```

## Git / Push Rules

- **awesome 레포** (`ainblockchain/awesome-papers-with-claude-code`, 강의 콘텐츠): 수정 시 바로 커밋 + 푸시
- **그 외** (frontend, knowledge-graph-builder 등): 유저가 커밋/푸시를 명시적으로 요청하거나 컨펌할 때만 진행. 자동 커밋/푸시 금지

## Known Issues / TODO

- identity 경로가 `/topics/identity/`에 임시 배치 (root rule 제약) → `AIN_PRIVATE_KEY` 확보 후 이전
- `login/page.tsx`에 `[identity-sync]` 디버그 로그 잔존 → 테스트 완료 후 제거
