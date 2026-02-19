# Kite AI Bounty — 개발 요구사항 명세서

> **프로젝트:** Papers LMS × Kite AI Integration
> **바운티:** "Build an agent-native application on Kite AI using x402 payments and verifiable agent identity"
> **상금:** $10,000 (1위 $5,000 / 2위 $1,500×2 / 3위 $1,000×2)
> **작성일:** 2026-02-19
> **문서 버전:** 1.0

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [바운티 요구사항 분석](#2-바운티-요구사항-분석)
3. [기존 코드베이스 현황](#3-기존-코드베이스-현황)
4. [Kite AI 체인 기술 사양](#4-kite-ai-체인-기술-사양)
5. [x402 결제 프로토콜 명세](#5-x402-결제-프로토콜-명세)
6. [에이전트 아이덴티티 시스템](#6-에이전트-아이덴티티-시스템)
7. [Account Abstraction (ERC-4337)](#7-account-abstraction-erc-4337)
8. [시스템 아키텍처](#8-시스템-아키텍처)
9. [Phase 1: 스마트 컨트랙트 개발](#9-phase-1-스마트-컨트랙트-개발)
10. [Phase 2: 에이전트 월렛 & 아이덴티티](#10-phase-2-에이전트-월렛--아이덴티티)
11. [Phase 3: x402 API 라우트](#11-phase-3-x402-api-라우트)
12. [Phase 4: 어댑터 교체 (Mock → Real)](#12-phase-4-어댑터-교체-mock--real)
13. [Phase 5: 에이전트 대시보드](#13-phase-5-에이전트-대시보드)
14. [Phase 6: Claude 터미널 자율 결제](#14-phase-6-claude-터미널-자율-결제)
15. [Phase 7: 배포 & 데모](#15-phase-7-배포--데모)
16. [환경 변수 & 설정](#16-환경-변수--설정)
17. [심사 기준 대응 전략](#17-심사-기준-대응-전략)
18. [일정 & 마일스톤](#18-일정--마일스톤)
19. [참고 자료](#19-참고-자료)

---

## 1. 프로젝트 개요

### 1.1 컨셉: "AI Tutor Agent with Economic Autonomy"

Papers LMS는 논문 기반의 게임화된 학습 플랫폼이다. 학습자가 마을(Village)을 탐험하며 논문별 코스(Course)에 진입하고, 스테이지를 클리어하면서 학습을 진행한다. 각 스테이지의 잠금 해제에는 마이크로페이먼트가 필요하다.

**핵심 차별점:** Claude AI 튜터 에이전트가 학습자를 대신하여 **자율적으로** 코스 스테이지 잠금 해제 비용을 결제하고, 학습 진행 상황을 **온체인에 기록**한다. 사용자의 수동 지갑 조작이 필요 없으며, Session Key 기반의 위임된 권한으로 작동한다.

### 1.2 핵심 플로우

```
학습자 퀴즈 통과 → Claude 에이전트 결제 트리거 →
HTTP 402 Payment Required → 에이전트 x402 서명 →
Kite Chain 온체인 결제 → 스테이지 잠금 해제 →
LearningLedger 컨트랙트에 진행 기록 → KiteScan 확인 가능
```

### 1.3 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 16.1.6, TypeScript, Tailwind CSS v4, Zustand 5 |
| Rendering | HTML5 Canvas 2D (타일 기반) |
| UI Components | shadcn/ui, Radix UI, Lucide Icons |
| Code Editor | Monaco Editor |
| Blockchain | Kite AI Testnet (Chain ID: 2368), Solidity, Hardhat |
| Payment | x402 Protocol (Coinbase SDK) |
| Identity | BIP-32 DID, KitePass, ERC-4337 AA Wallet |
| AI | Claude API (기존 claude-terminal 어댑터) |

---

## 2. 바운티 요구사항 분석

### 2.1 필수 요구사항 (Must Have)

| # | 요구사항 | 구현 방법 |
|---|----------|-----------|
| R1 | Kite AI Testnet/Mainnet에서 빌드 | LearningLedger.sol을 Chain ID 2368에 배포 |
| R2 | x402 결제 플로우 사용 | `@x402/express` 미들웨어로 API 라우트 게이팅 |
| R3 | 검증 가능한 에이전트 아이덴티티 | BIP-32 DID + KitePass + Standing Intent |
| R4 | 자율 실행 (수동 지갑 클릭 없음) | Session Key + AA Wallet으로 자동 결제 |
| R5 | 코어 컴포넌트 오픈소스 (MIT/Apache) | MIT 라이선스로 GitHub 공개 |

### 2.2 성공 프로젝트 기준

| # | 기준 | 구현 |
|---|------|------|
| S1 | AI 에이전트가 스스로 인증 | DID 기반 에이전트 아이덴티티 + KitePass |
| S2 | 유료 액션 실행 | 스테이지 잠금 해제 = 온체인 마이크로페이먼트 |
| S3 | 온체인 정산/증명 | LearningLedger에 enrollment + stage completion 기록 |
| S4 | 프로덕션 라이브 데모 | Vercel 배포, 공개 URL |

### 2.3 보너스 포인트

| # | 항목 | 구현 |
|---|------|------|
| B1 | 멀티 에이전트 협력 | Claude 튜터 + 퀴즈 검증 에이전트 분리 |
| B2 | Gasless 트랜잭션 | AA SDK Paymaster로 가스비 스폰서링 |
| B3 | 스코프 기반 접근 제어 | Standing Intent (일일 한도, 화이트리스트 컨트랙트) |

### 2.4 심사 기준 (가중치)

1. **Agent Autonomy** — 인간 개입 최소화
2. **Correct x402 Usage** — 결제가 액션과 명확히 매핑, 잔액 부족 시 우아한 실패 처리
3. **Security & Safety** — 키 관리, 스코프, 한도
4. **Developer Experience** — 문서, 사용성, 어댑터 패턴
5. **Real-world Applicability** — 교육 플랫폼이라는 실제 유스케이스

---

## 3. 기존 코드베이스 현황

### 3.1 디렉토리 구조

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # 홈 / Explore
│   │   ├── village/page.tsx    # 마을 맵
│   │   ├── learn/[paperId]/page.tsx  # 코스 학습
│   │   └── api/                # API Routes (추가 예정)
│   ├── components/
│   │   ├── village/
│   │   │   ├── VillageCanvas.tsx    # 마을 타일맵 렌더링
│   │   │   └── VillageSidebar.tsx   # 친구 목록, 리더보드
│   │   ├── learn/
│   │   │   ├── CourseCanvas.tsx      # 코스 타일맵 렌더링
│   │   │   ├── PaymentModal.tsx      # x402 결제 모달
│   │   │   ├── QuizPanel.tsx         # 퀴즈 패널
│   │   │   └── ClaudeTerminal.tsx    # AI 터미널
│   │   └── ui/                 # shadcn/ui 컴포넌트
│   ├── lib/
│   │   └── adapters/           # 어댑터 패턴 (Mock 구현)
│   │       ├── x402.ts         # ⭐ 결제 어댑터 (교체 대상)
│   │       ├── papers.ts       # 논문 데이터
│   │       ├── progress.ts     # 학습 진행도
│   │       ├── claude-terminal.ts  # Claude AI 채팅
│   │       ├── friends.ts      # 친구 프레즌스
│   │       └── gemini-map.ts   # 맵 생성
│   ├── stores/                 # Zustand 상태관리
│   │   ├── useLearningStore.ts # ⭐ 결제/잠금 상태 포함
│   │   ├── useVillageStore.ts
│   │   ├── useExploreStore.ts
│   │   ├── useAuthStore.ts
│   │   ├── useSocialStore.ts
│   │   └── useUIStore.ts
│   ├── types/
│   │   ├── paper.ts
│   │   ├── learning.ts
│   │   └── social.ts
│   └── constants/
│       └── game.ts
├── next.config.mjs
├── postcss.config.mjs
├── package.json
└── tsconfig.json
```

### 3.2 현재 어댑터 패턴

모든 외부 의존성은 어댑터 패턴으로 추상화되어 있다. Mock 구현과 Real 구현을 환경 변수로 전환할 수 있다.

**현재 x402 어댑터 (`src/lib/adapters/x402.ts`):**

```typescript
export interface PaymentResult {
  success: boolean;
  receiptId?: string;
  error?: string;
}

export interface X402PaymentAdapter {
  requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
  }): Promise<PaymentResult>;
  verifyPayment(receiptId: string): Promise<boolean>;
}

// 현재: 1초 딜레이 후 자동 승인하는 Mock
class MockX402Adapter implements X402PaymentAdapter { ... }
export const x402Adapter: X402PaymentAdapter = new MockX402Adapter();
```

**교체 목표:** `MockX402Adapter` → `KiteX402Adapter` (실제 Kite Chain 온체인 결제)

### 3.3 현재 결제 모달 (`src/components/learn/PaymentModal.tsx`)

- 0.001 ETH 하드코딩 → **0.001 KITE**로 변경 필요
- `x402Adapter.requestPayment()` 호출 → 결제 성공 시 `setDoorUnlocked(true)`
- 지갑 주소, 트랜잭션 해시, KiteScan 링크 표시 추가 필요

### 3.4 현재 학습 스토어 (`src/stores/useLearningStore.ts`)

결제 관련 상태:
- `isPaymentModalOpen: boolean` — 결제 모달 표시 여부
- `isDoorUnlocked: boolean` — 스테이지 잠금 해제 여부
- `setPaymentModalOpen(open: boolean)` — 모달 토글
- `setDoorUnlocked(unlocked: boolean)` — 잠금 해제 토글

**추가 필요 상태:** `txHash`, `walletAddress`, `agentDID`, 결제 히스토리

---

## 4. Kite AI 체인 기술 사양

### 4.1 체인 정보

| 파라미터 | Testnet | Mainnet |
|----------|---------|---------|
| Chain Name | KiteAI Testnet | KiteAI Mainnet |
| Chain ID | **2368** | **2366** |
| Native Token | KITE | KITE |
| RPC Endpoint | `https://rpc-testnet.gokite.ai/` | `https://rpc.gokite.ai/` |
| Block Explorer | `https://testnet.kitescan.ai/` | `https://kitescan.ai/` |
| ChainList | `https://chainlist.org/chain/2368` | `https://chainlist.org/chain/2366` |
| Faucet | `https://faucet.gokite.ai` | N/A |

### 4.2 특성

- **기반:** Avalanche Subnet (AvalancheGo)
- **합의:** Proof of Attributed Intelligence (PoAI)
- **Block Gas Limit:** 400,000,000
- **거래 수수료:** Sub-cent ($0.01 이하)
- **Finality:** Instant (서브초 컨펌)
- **마이크로페이먼트 채널:** Sub-100ms 레이턴시
- **State Channel:** ~$0.01/채널 페어, ~$0.000001/트랜잭션 (스케일)
- **Stablecoin 네이티브:** USDC, pyUSD 지원

### 4.3 개발 도구

| 도구 | 용도 |
|------|------|
| Hardhat | 스마트 컨트랙트 개발, 테스트, 배포 |
| MetaMask | 테스트넷 지갑 연결 (수동 테스트 시) |
| KiteScan | 블록 익스플로러, 트랜잭션 검증 |
| Kite Faucet | 테스트넷 KITE 토큰 수령 |

### 4.4 MetaMask 네트워크 설정 (테스트용)

```
Network Name: KiteAI Testnet
RPC URL: https://rpc-testnet.gokite.ai/
Chain ID: 2368
Currency Symbol: KITE
Block Explorer: https://testnet.kitescan.ai/
```

---

## 5. x402 결제 프로토콜 명세

### 5.1 개요

x402는 Coinbase가 만든 인터넷 네이티브 결제 오픈 표준이다. HTTP 402 (Payment Required) 상태 코드를 활용하여 API 호출에 마이크로페이먼트를 연결한다.

### 5.2 HTTP 402 플로우 (12단계)

```
┌──────────┐                    ┌──────────────┐                 ┌─────────────┐
│  Client   │                    │  API Server   │                 │  Facilitator │
│ (Agent)   │                    │ (Next.js API) │                 │  (x402 SDK)  │
└─────┬────┘                    └──────┬───────┘                 └──────┬──────┘
      │                                │                                │
      │ 1. HTTP GET /api/x402/unlock   │                                │
      │ ─────────────────────────────► │                                │
      │                                │                                │
      │ 2. 402 Payment Required        │                                │
      │    + PAYMENT-REQUIRED header   │                                │
      │ ◄───────────────────────────── │                                │
      │                                │                                │
      │ 3. Parse payment requirements  │                                │
      │    Construct PaymentPayload    │                                │
      │    Sign with Session Key       │                                │
      │                                │                                │
      │ 4. Retry with                  │                                │
      │    PAYMENT-SIGNATURE header    │                                │
      │ ─────────────────────────────► │                                │
      │                                │                                │
      │                                │ 5. Verify payload              │
      │                                │ ──────────────────────────────►│
      │                                │                                │
      │                                │ 6. Validation result           │
      │                                │ ◄──────────────────────────────│
      │                                │                                │
      │                                │ 7. If valid, settle payment    │
      │                                │ ──────────────────────────────►│
      │                                │                                │
      │                                │                         8-10. Submit tx
      │                                │                              to chain
      │                                │                              + confirm
      │                                │                                │
      │                                │ 11. Settlement response        │
      │                                │ ◄──────────────────────────────│
      │                                │                                │
      │ 12. 200 OK                     │                                │
      │     + PAYMENT-RESPONSE header  │                                │
      │ ◄───────────────────────────── │                                │
```

### 5.3 핵심 HTTP 헤더

| 헤더 | 방향 | 내용 |
|------|------|------|
| `PAYMENT-REQUIRED` | Server → Client | Base64 인코딩된 결제 요구사항 (금액, 수용 체인, 지갑 주소) |
| `PAYMENT-SIGNATURE` | Client → Server | Base64 인코딩된 서명된 결제 페이로드 |
| `PAYMENT-RESPONSE` | Server → Client | 정산 확인 응답 |

### 5.4 SDK 패키지

```bash
# TypeScript (이 프로젝트에서 사용)
npm install @x402/core @x402/evm @x402/fetch @x402/express

# @x402/core    — 프로토콜 타입, 유틸리티
# @x402/evm     — EVM 체인 결제 지원 (Kite AI 포함)
# @x402/fetch   — x402 인식 fetch 클라이언트 (에이전트 측)
# @x402/express — Express 미들웨어 (서버 측 결제 게이팅)
```

### 5.5 서버 측 미들웨어 설정 예시

```typescript
import { paymentMiddleware } from '@x402/express';

// Next.js API Route에서 사용
app.use(
  paymentMiddleware({
    "POST /api/x402/unlock-stage": {
      price: "0.001",           // KITE 단위
      network: "kite-testnet",  // CAIP-2 네트워크 ID
      description: "Unlock learning stage",
      resource: "/api/x402/unlock-stage",
      accepts: [
        {
          scheme: "exact",
          network: "eip155:2368",  // Kite Testnet CAIP-2
          maxAmountRequired: "1000000000000000",  // wei
          asset: "0x0000000000000000000000000000000000000000",  // native KITE
          payTo: process.env.MERCHANT_WALLET_ADDRESS,
          extra: {}
        }
      ]
    }
  })
);
```

### 5.6 클라이언트 측 x402 fetch 예시

```typescript
import { x402Fetch } from '@x402/fetch';

const response = await x402Fetch(
  '/api/x402/unlock-stage',
  {
    method: 'POST',
    body: JSON.stringify({ paperId, stageId }),
  },
  {
    walletClient,  // AA Wallet의 Session Key로 서명
    network: 'eip155:2368',
  }
);

// 내부적으로:
// 1. 첫 요청 → 402 수신
// 2. PAYMENT-REQUIRED 파싱
// 3. PaymentPayload 구성 + Session Key 서명
// 4. PAYMENT-SIGNATURE 헤더로 재요청
// 5. 200 OK 수신
```

---

## 6. 에이전트 아이덴티티 시스템

### 6.1 3-Tier 계층적 아이덴티티 모델

```
Tier 1: User Identity (Root Authority)
  └── 개인키: HSM / Secure Enclave 저장
  └── EOA 지갑: 모든 권한의 루트
  └── 에이전트에 절대 노출하지 않음

Tier 2: Agent Identity (Delegated Authority)
  └── BIP-32 계층적 키 파생으로 결정론적 주소 생성
  └── DID: did:kite:alice.eth/chatgpt/portfolio-manager-v1
  └── KitePass: 유저→에이전트→액션 신뢰 체인
  └── Verifiable Credentials: 능력/자격 증명

Tier 3: Session Identity (Ephemeral Authority)
  └── 완전 랜덤, 일회용 키
  └── 자동 만료
  └── Perfect Forward Secrecy 보장
```

### 6.2 DID 포맷

```
did:kite:{user-identifier}/{agent-type}/{agent-instance}
```

**이 프로젝트 예시:**
```
did:kite:learner.eth/claude-tutor/session-20260219
```

### 6.3 암호학적 인가 체인

#### Standing Intent (SI) — 사용자가 서명하는 불변 선언

```typescript
interface StandingIntent {
  agentDID: string;           // "did:kite:learner.eth/claude-tutor/v1"
  maxTransactionAmount: string;  // "10000000000000000" (0.01 KITE in wei)
  dailyCap: string;           // "100000000000000000" (0.1 KITE in wei)
  allowedContracts: string[]; // [LEARNING_LEDGER_ADDRESS]
  allowedFunctions: string[]; // ["enrollCourse", "completeStage"]
  expiresAt: number;          // Unix timestamp
  userSignature: string;      // EOA 서명
}
```

#### Delegation Token (DT) — 에이전트가 세션용으로 서명

```typescript
interface DelegationToken {
  standingIntentHash: string;   // SI의 keccak256 해시
  sessionKeyAddress: string;    // 임시 세션 키 주소
  validFrom: number;            // Unix timestamp
  validUntil: number;           // 약 60초 유효
  agentSignature: string;       // 에이전트 키 서명
}
```

#### Session Signature (SS) — 트랜잭션 실행 증명

```typescript
interface SessionSignature {
  delegationTokenHash: string;
  transactionData: string;      // 실행할 트랜잭션 데이터
  nonce: number;                // 리플레이 방지
  challenge: string;            // 서버 챌린지
  sessionSignature: string;     // 세션 키 서명
}
```

### 6.4 KitePass

에이전트의 크립토그래픽 아이덴티티 크리덴셜. 유저→에이전트→액션의 완전한 신뢰 체인을 생성한다.

- 에이전트 생성 시 발급
- Standing Intent에 바인딩
- 온체인 검증 가능
- 폐기(Revocation) 가능

### 6.5 보안 보장 ("Bounded Loss Theorem")

> 에이전트가 완전히 침해(compromise)되더라도, 추출 가능한 최대 가치는 Standing Intent 한도와 동일하다.

---

## 7. Account Abstraction (ERC-4337)

### 7.1 개요

Kite AI의 AA SDK는 ERC-4337 Account Abstraction을 에이전트 전용 확장으로 구현한다. 핵심은 스마트 컨트랙트 지갑이 프로그래밍 가능한 지출 규칙을 갖는다는 것이다.

### 7.2 아키텍처

```
┌─────────────────────────────────────────────┐
│            AA Wallet (Smart Contract)        │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Shared Funds │  │ Session Key Registry │ │
│  │ (KITE/USDC)  │  │                      │ │
│  └─────────────┘  │  Agent A: key_a       │ │
│                    │    - max: 0.01 KITE   │ │
│                    │    - daily: 0.1 KITE  │ │
│                    │    - contracts: [...]  │ │
│                    │    - expires: 1708300 │ │
│                    │                      │ │
│                    │  Agent B: key_b       │ │
│                    │    - (different rules) │ │
│                    └──────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 7.3 Session Key 규칙 (온체인 강제)

```solidity
// Kite AA SDK의 Session Key 규칙 추가
addSessionKeyRule(
  address sessionKeyAddress,    // 세션 키 주소
  bytes32 agentId,              // 에이전트 DID 해시
  bytes4 functionSelector,      // 허용 함수 셀렉터
  uint256 valueLimit            // 트랜잭션당 한도 (wei)
)
```

### 7.4 지출 규칙

**온체인 강제 (스마트 컨트랙트):**
- 트랜잭션당 한도
- 일일 총합 한도
- 롤링 타임 윈도우
- 화이트리스트/블랙리스트 컨트랙트
- 외부 시그널 기반 조건부 로직

**오프체인 정책 (TEE 또는 로컬):**
- 세션 TTL
- 카테고리 제한
- 수신자 허용/거부 목록

### 7.5 계층적 한도 캐스케이드

자식 에이전트의 한도는 항상 부모 한도 이내로 바운딩된다. 사용자의 Standing Intent가 천장이다.

### 7.6 Gasless 트랜잭션

AA SDK의 Paymaster를 사용하면 제3자(예: 플랫폼)가 가스비를 대신 지불할 수 있다. 학습자는 KITE 토큰만으로 스테이지 비용을 지불하며, 가스비를 별도로 신경 쓸 필요가 없다.

**참고:** `https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk`

---

## 8. 시스템 아키텍처

### 8.1 전체 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                   │
│                                                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ CourseCanvas│  │ ClaudeTerminal│  │ AgentDashboard  │ │
│  │ (learn)    │  │ (AI chat)    │  │ (wallet+pay+ID) │ │
│  └─────┬──────┘  └──────┬───────┘  └────────┬────────┘ │
│        │                │                    │           │
│        ▼                ▼                    ▼           │
│  ┌────────────────────────────────────────────────────┐ │
│  │        KiteX402Adapter (Real Implementation)        │ │
│  │                                                     │ │
│  │  Standing Intent → Delegation Token → Session Pay   │ │
│  │  x402Fetch → 402 → Sign → Retry → 200 OK          │ │
│  └────────────────────────┬───────────────────────────┘ │
│                           │                              │
└───────────────────────────┼──────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
       ┌──────┴──────┐ ┌───┴────┐ ┌──────┴──────┐
       │ API Routes   │ │ Smart  │ │  KiteScan   │
       │ /api/x402/*  │ │Contract│ │  Explorer   │
       │              │ │Learning│ │  (verify)   │
       │ POST enroll  │ │ Ledger │ └─────────────┘
       │ POST unlock  │ │        │
       │ GET  receipt  │ │enrollCourse()     │
       │ GET  status   │ │completeStage()    │
       └──────────────┘ │getProgress()      │
                        └───────────────────┘
                          Kite AI Testnet
                          Chain ID: 2368
```

### 8.2 새로 생성할 파일 목록

| # | 파일 경로 | 목적 |
|---|-----------|------|
| 1 | `contracts/LearningLedger.sol` | 스마트 컨트랙트: 등록, 스테이지 완료, 진행 조회 |
| 2 | `contracts/scripts/deploy.ts` | Kite Testnet 배포 스크립트 |
| 3 | `contracts/hardhat.config.ts` | Hardhat 설정 (Chain ID: 2368) |
| 4 | `src/lib/kite/wallet.ts` | AA Wallet 생성/관리 |
| 5 | `src/lib/kite/identity.ts` | DID 기반 에이전트 아이덴티티 |
| 6 | `src/lib/kite/session-key.ts` | Standing Intent + Session Key 관리 |
| 7 | `src/lib/kite/contracts.ts` | ABI + 컨트랙트 주소 상수 |
| 8 | `src/app/api/x402/status/route.ts` | 월렛 잔액 + 에이전트 ID 조회 |
| 9 | `src/app/api/x402/enroll/route.ts` | 코스 등록 결제 (402 게이팅) |
| 10 | `src/app/api/x402/unlock-stage/route.ts` | 스테이지 잠금 해제 결제 (402 게이팅) |
| 11 | `src/app/api/x402/receipt/[txHash]/route.ts` | 트랜잭션 영수증 검증 |
| 12 | `src/app/agent-dashboard/page.tsx` | 에이전트 대시보드 페이지 |
| 13 | `src/components/agent/AgentWalletCard.tsx` | 월렛 정보 컴포넌트 |
| 14 | `src/components/agent/PaymentHistory.tsx` | 결제 히스토리 테이블 |
| 15 | `src/components/agent/StandingIntentConfig.tsx` | SI 설정 UI |
| 16 | `src/stores/useAgentStore.ts` | 에이전트 상태관리 (Zustand) |

### 8.3 수정할 기존 파일 목록

| # | 파일 경로 | 변경 내용 |
|---|-----------|-----------|
| 1 | `src/lib/adapters/x402.ts` | `KiteX402Adapter` 추가, 환경변수 기반 전환 |
| 2 | `src/components/learn/PaymentModal.tsx` | KITE 단위, 지갑 주소, txHash, KiteScan 링크 |
| 3 | `src/stores/useLearningStore.ts` | txHash, walletAddress, agentDID 상태 추가 |
| 4 | `src/components/learn/ClaudeTerminal.tsx` | 자율 결제 트리거 로직 |
| 5 | `package.json` | x402 SDK, ethers, hardhat 의존성 추가 |
| 6 | `.env.example` | Kite AI 환경변수 템플릿 |

---

## 9. Phase 1: 스마트 컨트랙트 개발

**예상 소요:** 1-2일
**산출물:** 배포된 LearningLedger 컨트랙트 + 검증된 ABI

### 9.1 디렉토리 구조

```
contracts/
├── LearningLedger.sol
├── scripts/
│   └── deploy.ts
├── test/
│   └── LearningLedger.test.ts
├── hardhat.config.ts
└── package.json
```

### 9.2 LearningLedger.sol 명세

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LearningLedger {
    struct Enrollment {
        uint256 enrolledAt;       // 등록 타임스탬프
        uint256 currentStage;     // 현재 진행 스테이지
        uint256 totalPaid;        // 총 결제 금액 (wei)
        bool isActive;            // 활성 상태
    }

    struct StageCompletion {
        uint256 completedAt;      // 완료 타임스탬프
        uint256 score;            // 퀴즈 점수 (0-100)
        uint256 amountPaid;       // 스테이지 해금 비용
        bytes32 attestationHash;  // 완료 증명 해시
    }

    // paperId => agent address => Enrollment
    mapping(string => mapping(address => Enrollment)) public enrollments;

    // paperId => agent address => stageNum => StageCompletion
    mapping(string => mapping(address => mapping(uint256 => StageCompletion))) public completions;

    // Events
    event CourseEnrolled(address indexed agent, string paperId, uint256 timestamp);
    event StageCompleted(address indexed agent, string paperId, uint256 stageNum, uint256 score);
    event PaymentReceived(address indexed from, string paperId, uint256 amount);

    /// @notice 코스 등록 (결제 포함)
    /// @param paperId 논문/코스 ID
    function enrollCourse(string calldata paperId) external payable {
        require(msg.value > 0, "Payment required");
        require(!enrollments[paperId][msg.sender].isActive, "Already enrolled");

        enrollments[paperId][msg.sender] = Enrollment({
            enrolledAt: block.timestamp,
            currentStage: 0,
            totalPaid: msg.value,
            isActive: true
        });

        emit CourseEnrolled(msg.sender, paperId, block.timestamp);
        emit PaymentReceived(msg.sender, paperId, msg.value);
    }

    /// @notice 스테이지 완료 기록 (결제 포함)
    /// @param paperId 논문/코스 ID
    /// @param stageNum 완료한 스테이지 번호
    /// @param score 퀴즈 점수 (0-100)
    function completeStage(
        string calldata paperId,
        uint256 stageNum,
        uint256 score
    ) external payable {
        require(enrollments[paperId][msg.sender].isActive, "Not enrolled");
        require(score <= 100, "Invalid score");
        require(
            completions[paperId][msg.sender][stageNum].completedAt == 0,
            "Stage already completed"
        );

        completions[paperId][msg.sender][stageNum] = StageCompletion({
            completedAt: block.timestamp,
            score: score,
            amountPaid: msg.value,
            attestationHash: keccak256(
                abi.encodePacked(msg.sender, paperId, stageNum, score, block.timestamp)
            )
        });

        enrollments[paperId][msg.sender].currentStage = stageNum;
        enrollments[paperId][msg.sender].totalPaid += msg.value;

        emit StageCompleted(msg.sender, paperId, stageNum, score);
        if (msg.value > 0) {
            emit PaymentReceived(msg.sender, paperId, msg.value);
        }
    }

    /// @notice 학습 진행도 조회
    /// @param agent 에이전트 주소
    /// @param paperId 논문/코스 ID
    function getProgress(
        address agent,
        string calldata paperId
    ) external view returns (
        bool isEnrolled,
        uint256 currentStage,
        uint256 totalPaid,
        uint256 enrolledAt
    ) {
        Enrollment memory e = enrollments[paperId][agent];
        return (e.isActive, e.currentStage, e.totalPaid, e.enrolledAt);
    }

    /// @notice 스테이지 완료 정보 조회
    /// @param agent 에이전트 주소
    /// @param paperId 논문/코스 ID
    /// @param stageNum 스테이지 번호
    function getStageCompletion(
        address agent,
        string calldata paperId,
        uint256 stageNum
    ) external view returns (
        uint256 completedAt,
        uint256 score,
        bytes32 attestationHash
    ) {
        StageCompletion memory sc = completions[paperId][agent][stageNum];
        return (sc.completedAt, sc.score, sc.attestationHash);
    }
}
```

### 9.3 Hardhat 설정

```typescript
// contracts/hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    kiteTestnet: {
      url: "https://rpc-testnet.gokite.ai/",
      chainId: 2368,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
    kiteMainnet: {
      url: "https://rpc.gokite.ai/",
      chainId: 2366,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
  },
};

export default config;
```

### 9.4 배포 스크립트

```typescript
// contracts/scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const LearningLedger = await ethers.getContractFactory("LearningLedger");
  const ledger = await LearningLedger.deploy();
  await ledger.waitForDeployment();

  const address = await ledger.getAddress();
  console.log(`LearningLedger deployed to: ${address}`);
  console.log(`Verify on KiteScan: https://testnet.kitescan.ai/address/${address}`);

  // ABI를 프론트엔드로 복사
  // → src/lib/kite/contracts.ts에 반영
}

main().catch(console.error);
```

### 9.5 테스트 항목

- [ ] `enrollCourse`: 결제와 함께 등록 성공
- [ ] `enrollCourse`: 이미 등록된 경우 revert
- [ ] `enrollCourse`: 결제 없이(msg.value=0) revert
- [ ] `completeStage`: 등록된 에이전트만 호출 가능
- [ ] `completeStage`: 동일 스테이지 중복 완료 불가
- [ ] `completeStage`: score > 100 revert
- [ ] `getProgress`: 정확한 진행도 반환
- [ ] `getStageCompletion`: attestationHash 검증

---

## 10. Phase 2: 에이전트 월렛 & 아이덴티티

**예상 소요:** 1-2일
**산출물:** `src/lib/kite/` 디렉토리의 4개 모듈

### 10.1 wallet.ts — AA Wallet 관리

```typescript
// src/lib/kite/wallet.ts

export interface AgentWallet {
  address: string;          // AA Wallet 주소
  sessionKeyAddress: string; // 현재 세션 키
  balance: string;          // KITE 잔액 (wei)
  chainId: number;          // 2368 (testnet) or 2366 (mainnet)
}

export interface WalletConfig {
  rpcUrl: string;
  chainId: number;
  userPrivateKey: string;   // 서버 사이드에서만 사용
}

export class KiteWalletManager {
  /// AA Wallet 생성 또는 기존 월렛 로드
  async getOrCreateWallet(config: WalletConfig): Promise<AgentWallet>;

  /// 잔액 조회
  async getBalance(address: string): Promise<string>;

  /// 세션 키 생성 (TTL 기반)
  async createSessionKey(
    walletAddress: string,
    rules: SessionKeyRules
  ): Promise<{ address: string; privateKey: string; expiresAt: number }>;

  /// 세션 키로 트랜잭션 서명
  async signWithSessionKey(
    sessionKeyPrivateKey: string,
    transaction: TransactionRequest
  ): Promise<string>;
}

export interface SessionKeyRules {
  maxTransactionValue: string;   // wei
  dailyCap: string;              // wei
  allowedContracts: string[];    // 컨트랙트 주소 목록
  allowedFunctions: string[];    // 함수 셀렉터 목록
  ttlSeconds: number;            // 유효 기간 (초)
}
```

### 10.2 identity.ts — DID 기반 에이전트 아이덴티티

```typescript
// src/lib/kite/identity.ts

export interface AgentIdentity {
  did: string;                    // "did:kite:learner.eth/claude-tutor/v1"
  walletAddress: string;          // 파생된 에이전트 주소
  kitePassHash: string;           // KitePass 해시
  createdAt: number;              // 생성 타임스탬프
}

export class KiteIdentityManager {
  /// BIP-32 계층적 키 파생으로 에이전트 주소 생성
  /// derivation path: m/44'/2368'/0'/0/{agentIndex}
  deriveAgentAddress(
    userMnemonic: string,
    agentIndex: number
  ): { address: string; privateKey: string };

  /// DID 생성
  createDID(
    userIdentifier: string,    // "learner.eth"
    agentType: string,         // "claude-tutor"
    agentVersion: string       // "v1"
  ): string;

  /// KitePass 생성 (Standing Intent에 바인딩)
  async createKitePass(
    agentIdentity: AgentIdentity,
    standingIntent: StandingIntent
  ): Promise<string>;  // KitePass 해시

  /// KitePass 검증
  async verifyKitePass(
    kitePassHash: string,
    agentAddress: string
  ): Promise<boolean>;
}
```

### 10.3 session-key.ts — Standing Intent & Session Key

```typescript
// src/lib/kite/session-key.ts

export interface StandingIntent {
  agentDID: string;
  maxTransactionAmount: string;   // wei
  dailyCap: string;               // wei
  allowedContracts: string[];
  allowedFunctions: string[];
  expiresAt: number;              // Unix timestamp
  userSignature: string;
}

export interface DelegationToken {
  standingIntentHash: string;
  sessionKeyAddress: string;
  validFrom: number;
  validUntil: number;
  agentSignature: string;
}

export class SessionKeyManager {
  /// Standing Intent 생성 및 사용자 서명
  async createStandingIntent(
    params: Omit<StandingIntent, 'userSignature'>,
    userSigner: ethers.Signer
  ): Promise<StandingIntent>;

  /// Delegation Token 발급 (에이전트가 세션용으로 생성)
  async issueDelegationToken(
    standingIntent: StandingIntent,
    sessionKeyAddress: string,
    agentSigner: ethers.Signer,
    ttlSeconds?: number          // 기본 60초
  ): Promise<DelegationToken>;

  /// Standing Intent 유효성 검증
  validateStandingIntent(si: StandingIntent): boolean;

  /// 일일 사용량 추적
  async getDailyUsage(agentAddress: string): Promise<string>;

  /// 한도 체크 (트랜잭션 전)
  async canSpend(
    agentAddress: string,
    amount: string,
    standingIntent: StandingIntent
  ): Promise<{ allowed: boolean; reason?: string }>;
}
```

### 10.4 contracts.ts — ABI & 주소 상수

```typescript
// src/lib/kite/contracts.ts

// 배포 후 실제 주소로 교체
export const LEARNING_LEDGER_ADDRESS = process.env.NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS || '';

export const KITE_CHAIN_CONFIG = {
  testnet: {
    chainId: 2368,
    rpcUrl: 'https://rpc-testnet.gokite.ai/',
    explorerUrl: 'https://testnet.kitescan.ai/',
    faucetUrl: 'https://faucet.gokite.ai',
  },
  mainnet: {
    chainId: 2366,
    rpcUrl: 'https://rpc.gokite.ai/',
    explorerUrl: 'https://kitescan.ai/',
  },
} as const;

export const LEARNING_LEDGER_ABI = [
  // 배포 후 Hardhat artifact에서 복사
  "function enrollCourse(string paperId) payable",
  "function completeStage(string paperId, uint256 stageNum, uint256 score) payable",
  "function getProgress(address agent, string paperId) view returns (bool, uint256, uint256, uint256)",
  "function getStageCompletion(address agent, string paperId, uint256 stageNum) view returns (uint256, uint256, bytes32)",
  "event CourseEnrolled(address indexed agent, string paperId, uint256 timestamp)",
  "event StageCompleted(address indexed agent, string paperId, uint256 stageNum, uint256 score)",
  "event PaymentReceived(address indexed from, string paperId, uint256 amount)",
] as const;
```

---

## 11. Phase 3: x402 API 라우트

**예상 소요:** 1일
**산출물:** 4개 API Route (`src/app/api/x402/`)

### 11.1 GET /api/x402/status — 에이전트 상태 조회

**요청:** 없음 (서버 사이드에서 환경변수의 에이전트 키 사용)

**응답:**
```typescript
{
  agentDID: string;           // "did:kite:learner.eth/claude-tutor/v1"
  walletAddress: string;      // AA Wallet 주소
  balance: string;            // KITE 잔액 (KITE 단위, 소수점)
  balanceWei: string;         // KITE 잔액 (wei)
  chainId: number;            // 2368
  explorerUrl: string;        // "https://testnet.kitescan.ai/address/0x..."
  standingIntent: {
    maxTransaction: string;   // "0.01 KITE"
    dailyCap: string;         // "0.1 KITE"
    dailyUsed: string;        // "0.023 KITE"
    expiresAt: string;        // ISO 8601
  };
}
```

### 11.2 POST /api/x402/enroll — 코스 등록

**x402 게이팅:** 이 엔드포인트는 `@x402/express` 미들웨어로 보호된다. 결제 없이 접근 시 `402 Payment Required`를 반환한다.

**요청:**
```typescript
{
  paperId: string;    // "bitdance-2602"
}
```

**플로우:**
1. 클라이언트가 POST 요청
2. 미들웨어가 402 + `PAYMENT-REQUIRED` 헤더 반환
3. 클라이언트(에이전트)가 결제 서명 후 `PAYMENT-SIGNATURE` 헤더와 함께 재요청
4. 미들웨어가 결제 검증 + 정산
5. 핸들러가 `LearningLedger.enrollCourse(paperId)` 호출
6. 200 OK + 트랜잭션 해시 반환

**응답 (200):**
```typescript
{
  success: true;
  txHash: string;           // 온체인 트랜잭션 해시
  explorerUrl: string;      // KiteScan 트랜잭션 링크
  enrollment: {
    paperId: string;
    enrolledAt: string;     // ISO 8601
  };
}
```

### 11.3 POST /api/x402/unlock-stage — 스테이지 잠금 해제

**x402 게이팅:** 402 미들웨어 보호

**요청:**
```typescript
{
  paperId: string;    // "bitdance-2602"
  stageId: string;    // "stage-3"
  stageNum: number;   // 3
  score: number;      // 퀴즈 점수 (0-100)
}
```

**응답 (200):**
```typescript
{
  success: true;
  txHash: string;
  explorerUrl: string;
  stageCompletion: {
    paperId: string;
    stageNum: number;
    score: number;
    attestationHash: string;  // 온체인 증명 해시
    completedAt: string;
  };
}
```

**에러 응답 (402 — 잔액 부족 등):**
```typescript
{
  error: "insufficient_funds";
  required: "0.001 KITE";
  available: "0.0005 KITE";
  faucetUrl: "https://faucet.gokite.ai";
}
```

### 11.4 GET /api/x402/receipt/[txHash] — 영수증 검증

**요청:** URL 파라미터로 `txHash`

**응답:**
```typescript
{
  verified: boolean;
  txHash: string;
  blockNumber: number;
  blockTimestamp: string;
  from: string;             // 에이전트 지갑 주소
  to: string;               // LearningLedger 주소
  value: string;            // 결제 금액 (KITE)
  method: string;           // "enrollCourse" | "completeStage"
  decodedArgs: {
    paperId: string;
    stageNum?: number;
    score?: number;
  };
  explorerUrl: string;      // KiteScan 트랜잭션 링크
  confirmations: number;
}
```

### 11.5 에러 핸들링 (공통)

모든 x402 API 라우트는 다음 에러를 일관되게 처리해야 한다:

| HTTP Status | 코드 | 설명 |
|-------------|------|------|
| 402 | `payment_required` | x402 결제 필요 (정상 플로우) |
| 400 | `invalid_params` | 요청 파라미터 유효성 검증 실패 |
| 402 | `insufficient_funds` | 잔액 부족 (faucet URL 제공) |
| 403 | `spending_limit_exceeded` | Standing Intent 한도 초과 |
| 403 | `session_expired` | 세션 키 만료 |
| 500 | `chain_error` | 온체인 트랜잭션 실패 |
| 500 | `settlement_failed` | x402 정산 실패 |

**중요 (심사 기준):** 잔액 부족, 한도 초과 등의 실패 시나리오를 명확하게 UI에 표시해야 한다. "Correct x402 Usage" 심사 기준에서 "insufficient funds handling"이 명시적으로 요구된다.

---

## 12. Phase 4: 어댑터 교체 (Mock → Real)

**예상 소요:** 1일
**산출물:** `KiteX402Adapter` 구현, `PaymentModal` 업데이트

### 12.1 x402.ts 어댑터 교체

```typescript
// src/lib/adapters/x402.ts — 수정 후

export interface PaymentResult {
  success: boolean;
  receiptId?: string;
  txHash?: string;           // 추가: 온체인 트랜잭션 해시
  explorerUrl?: string;      // 추가: KiteScan 링크
  error?: string;
  errorCode?: string;        // 추가: 에러 코드
}

export interface X402PaymentAdapter {
  requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
    stageNum?: number;       // 추가: 스테이지 번호
    score?: number;          // 추가: 퀴즈 점수
  }): Promise<PaymentResult>;
  verifyPayment(receiptId: string): Promise<boolean>;
  getWalletStatus?(): Promise<WalletStatus>;  // 추가: 선택적
}

interface WalletStatus {
  address: string;
  balance: string;
  agentDID: string;
  dailyUsed: string;
  dailyCap: string;
}

// KiteX402Adapter — 실제 Kite Chain 결제
class KiteX402Adapter implements X402PaymentAdapter {
  async requestPayment(params): Promise<PaymentResult> {
    // 1. /api/x402/unlock-stage에 POST
    // 2. x402Fetch가 402 → 서명 → 재요청 자동 처리
    // 3. 성공 시 txHash + explorerUrl 반환
    // 4. 실패 시 errorCode + 사용자 친화적 메시지 반환
  }

  async verifyPayment(txHash: string): Promise<boolean> {
    // /api/x402/receipt/[txHash]로 검증
  }

  async getWalletStatus(): Promise<WalletStatus> {
    // /api/x402/status로 조회
  }
}

// 환경변수 기반 자동 전환
const USE_REAL_KITE = process.env.NEXT_PUBLIC_USE_KITE_CHAIN === 'true';
export const x402Adapter: X402PaymentAdapter = USE_REAL_KITE
  ? new KiteX402Adapter()
  : new MockX402Adapter();
```

### 12.2 PaymentModal.tsx 업데이트

**변경 사항:**
1. 통화 단위: `0.001 ETH` → `0.001 KITE`
2. 결제 성공 시 표시 추가:
   - 트랜잭션 해시 (축약 표시: `0x1234...abcd`)
   - KiteScan 확인 링크 (외부 링크, 새 탭)
   - 에이전트 지갑 주소
3. 에러 상태 세분화:
   - 잔액 부족: faucet 링크 제공
   - 한도 초과: Standing Intent 설정 링크
   - 세션 만료: 재인증 안내
4. 결제 진행 중 상태:
   - "Signing..." → "Submitting to Kite Chain..." → "Confirming..." → "Done"

### 12.3 useLearningStore.ts 상태 추가

```typescript
// 추가 상태
txHash: string | null;
walletAddress: string | null;
explorerUrl: string | null;

// 추가 액션
setTxHash: (txHash: string | null) => void;
setWalletAddress: (address: string | null) => void;
setExplorerUrl: (url: string | null) => void;
```

---

## 13. Phase 5: 에이전트 대시보드

**예상 소요:** 1-2일
**산출물:** `/agent-dashboard` 페이지 + 3개 컴포넌트

### 13.1 에이전트 대시보드 페이지 (`src/app/agent-dashboard/page.tsx`)

**레이아웃:**

```
┌─────────────────────────────────────────────┐
│  Agent Dashboard                     [Back] │
├──────────────────┬──────────────────────────┤
│                  │                          │
│  Agent Identity  │    Payment History       │
│  ┌────────────┐  │    ┌──────────────────┐  │
│  │ DID        │  │    │ # | Time | Stage │  │
│  │ Wallet Addr│  │    │   | TxHash| KITE │  │
│  │ Balance    │  │    │   |  ...  | ...  │  │
│  │ KitePass ✓ │  │    │   |  ...  | ...  │  │
│  └────────────┘  │    └──────────────────┘  │
│                  │                          │
│  Standing Intent │    Learning Attestations │
│  ┌────────────┐  │    ┌──────────────────┐  │
│  │ Max Tx     │  │    │ Course | Stage   │  │
│  │ Daily Cap  │  │    │ Score  | Proof   │  │
│  │ Used Today │  │    │  ...   |  ...    │  │
│  │ Expires    │  │    └──────────────────┘  │
│  │ [Configure]│  │                          │
│  └────────────┘  │                          │
└──────────────────┴──────────────────────────┘
```

### 13.2 AgentWalletCard.tsx

표시 항목:
- **Agent DID:** `did:kite:learner.eth/claude-tutor/v1` (전체 + 복사 버튼)
- **Wallet Address:** `0x1234...abcd` (축약 + KiteScan 링크)
- **Balance:** `0.847 KITE` (실시간 갱신)
- **KitePass Status:** 검증 완료 아이콘 (✓) 또는 미발급 상태
- **Network:** KiteAI Testnet (Chain ID: 2368)

### 13.3 PaymentHistory.tsx

| 컬럼 | 설명 |
|------|------|
| # | 순번 |
| Time | 결제 시간 (상대 시간: "2m ago") |
| Course | 논문/코스 이름 |
| Stage | 스테이지 번호 |
| Amount | 결제 금액 (KITE) |
| Tx Hash | 축약된 해시 + KiteScan 링크 |
| Status | Confirmed / Pending / Failed |

**데이터 소스:** KiteScan API (`https://kitescan.ai/api-docs`)에서 에이전트 주소의 트랜잭션 히스토리 조회

### 13.4 StandingIntentConfig.tsx

설정 가능한 항목:
- **Max Transaction Amount:** 입력 필드 (KITE 단위, 기본값 0.01)
- **Daily Spending Cap:** 입력 필드 (KITE 단위, 기본값 0.1)
- **Allowed Contracts:** LearningLedger 주소 (고정, 체크박스)
- **Allowed Functions:** `enrollCourse`, `completeStage` (체크박스)
- **Expiry Duration:** 드롭다운 (1시간 / 6시간 / 24시간 / 7일)
- **[Save & Sign]** 버튼 — 사용자 서명으로 SI 생성/갱신

**시각적 요소:**
- 일일 사용량 프로그레스 바 (dailyUsed / dailyCap)
- 만료까지 남은 시간 카운트다운
- 현재 SI 상태 뱃지 (Active / Expired / Not Set)

### 13.5 useAgentStore.ts — Zustand 스토어

```typescript
// src/stores/useAgentStore.ts

interface AgentState {
  // Identity
  agentDID: string | null;
  walletAddress: string | null;
  kitePassHash: string | null;
  isKitePassVerified: boolean;

  // Wallet
  balance: string;           // KITE 단위
  balanceWei: string;
  chainId: number;

  // Standing Intent
  standingIntent: StandingIntent | null;
  dailyUsed: string;
  dailyCap: string;

  // Payment History
  paymentHistory: PaymentHistoryEntry[];
  isLoadingHistory: boolean;

  // Learning Attestations
  attestations: LearningAttestation[];

  // Actions
  fetchWalletStatus: () => Promise<void>;
  fetchPaymentHistory: () => Promise<void>;
  fetchAttestations: () => Promise<void>;
  updateStandingIntent: (si: StandingIntent) => Promise<void>;
  reset: () => void;
}

interface PaymentHistoryEntry {
  txHash: string;
  timestamp: string;
  paperId: string;
  paperTitle: string;
  stageNum?: number;
  amount: string;            // KITE
  method: 'enrollCourse' | 'completeStage';
  status: 'confirmed' | 'pending' | 'failed';
  explorerUrl: string;
}

interface LearningAttestation {
  paperId: string;
  paperTitle: string;
  stageNum: number;
  score: number;
  attestationHash: string;
  completedAt: string;
  explorerUrl: string;       // KiteScan 링크
}
```

---

## 14. Phase 6: Claude 터미널 자율 결제

**예상 소요:** 1일
**산출물:** ClaudeTerminal 자율 결제 통합

### 14.1 자율 결제 플로우

```
학습자가 퀴즈 통과
  ↓
ClaudeTerminal이 감지 (useLearningStore.isQuizPassed === true)
  ↓
Claude 에이전트가 터미널에 메시지 표시:
  "Great job! You passed Stage 3 with a score of 85/100! 🎓
   I'm unlocking Stage 4 for you now..."
  ↓
에이전트가 Session Key로 /api/x402/unlock-stage 호출
  ↓
x402 플로우 자동 실행 (402 → 서명 → 결제 → 200 OK)
  ↓
성공 시 터미널 메시지:
  "✅ Stage 4 unlocked! Payment: 0.001 KITE
   Tx: 0x1234...abcd (View on KiteScan ↗)
   Your progress has been recorded on-chain."
  ↓
setDoorUnlocked(true) → 스테이지 문 열림
```

### 14.2 실패 핸들링

```
잔액 부족 시:
  "⚠️ Insufficient KITE balance to unlock Stage 4.
   Current balance: 0.0005 KITE | Required: 0.001 KITE
   Get test tokens: https://faucet.gokite.ai"

한도 초과 시:
  "⚠️ Daily spending limit reached (0.1 KITE).
   Please update your Standing Intent in the Agent Dashboard."

네트워크 오류 시:
  "⚠️ Payment failed due to network error. Retrying in 5s..."
  → 최대 3회 자동 재시도
```

### 14.3 Claude Terminal 어댑터 수정

`src/lib/adapters/claude-terminal.ts`에 결제 트리거 메서드 추가:

```typescript
export interface ClaudeTerminalAdapter {
  // 기존 메서드들...
  sendMessage(message: string): Promise<string>;

  // 추가: 자율 결제 관련
  onQuizPassed?(params: {
    paperId: string;
    stageNum: number;
    score: number;
    nextStageId: string;
  }): Promise<void>;
}
```

### 14.4 핵심 요구사항

- **수동 지갑 클릭 절대 없음:** Session Key가 자동으로 트랜잭션 서명
- **결제 결과를 터미널에 실시간 표시:** 사용자가 에이전트의 경제적 행위를 직접 관찰
- **모든 트랜잭션 추적 가능:** txHash, KiteScan 링크 제공
- **바운티 심사 핵심:** "Agent Autonomy — minimal human involvement" 기준 직접 대응

---

## 15. Phase 7: 배포 & 데모

**예상 소요:** 1일
**산출물:** Vercel 배포, README, 데모 영상

### 15.1 배포 체크리스트

- [ ] Vercel에 프로덕션 배포 (공개 URL)
- [ ] 환경변수 설정 (Vercel Dashboard)
- [ ] LearningLedger 컨트랙트 Kite Testnet 배포 + KiteScan 검증
- [ ] Faucet에서 테스트 KITE 토큰 충분히 확보
- [ ] 모든 x402 API 라우트 동작 확인
- [ ] 에이전트 대시보드 접근 가능
- [ ] 자율 결제 E2E 테스트 통과

### 15.2 README 요구사항

```markdown
# Papers LMS — AI Tutor Agent with Economic Autonomy

## Overview
[프로젝트 설명, 스크린샷]

## Architecture
[시스템 아키텍처 다이어그램]

## Quick Start
1. Clone repo
2. Install dependencies: `yarn install`
3. Copy env: `cp .env.example .env.local`
4. Configure Kite AI credentials
5. Deploy contract: `cd contracts && npx hardhat run scripts/deploy.ts --network kiteTestnet`
6. Run dev: `yarn dev`

## Live Demo
[Vercel 배포 URL]

## Key Features
- AI agent autonomous payments (no manual wallet clicks)
- x402 protocol payment flow
- On-chain learning attestations
- Agent identity with DID & KitePass
- Session Key scoped permissions

## Tech Stack
[기술 스택 표]

## License
MIT
```

### 15.3 데모 시나리오 (심사용)

1. **에이전트 아이덴티티 시연:**
   - Agent Dashboard 열기 → DID, 지갑 주소, KitePass 표시
   - Standing Intent 설정 → 한도, 화이트리스트 확인

2. **결제 플로우 시연:**
   - 코스 입장 → 퀴즈 풀기 → 통과
   - Claude 에이전트가 자동으로 결제 실행
   - 터미널에서 txHash + KiteScan 링크 확인
   - KiteScan에서 실제 온체인 트랜잭션 확인

3. **안전성 시연:**
   - Standing Intent 한도 도달 → 에이전트 결제 거부 메시지
   - 잔액 부족 → faucet 안내
   - 세션 만료 → 재인증 안내

4. **온체인 증명 시연:**
   - Agent Dashboard에서 Learning Attestations 확인
   - attestationHash를 KiteScan에서 검증

### 15.4 데모 영상 (1-3분)

- 전체 플로우를 화면 녹화
- 내레이션 또는 자막으로 각 단계 설명
- 특히 에이전트 자율 결제 순간을 강조

---

## 16. 환경 변수 & 설정

### 16.1 .env.example

```bash
# ===== Kite AI Chain =====
NEXT_PUBLIC_USE_KITE_CHAIN=true           # true: 실제 체인 / false: Mock
NEXT_PUBLIC_KITE_CHAIN_ID=2368            # 2368: Testnet / 2366: Mainnet
NEXT_PUBLIC_KITE_RPC_URL=https://rpc-testnet.gokite.ai/
NEXT_PUBLIC_KITE_EXPLORER_URL=https://testnet.kitescan.ai/
NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS=      # 배포 후 입력

# ===== Agent Wallet (Server Only — NEVER expose to client) =====
KITE_AGENT_PRIVATE_KEY=                   # 에이전트 개인키
KITE_USER_MNEMONIC=                       # BIP-32 키 파생용 니모닉
KITE_MERCHANT_WALLET=                     # 결제 수신 지갑

# ===== x402 =====
X402_FACILITATOR_URL=                     # x402 Facilitator 엔드포인트

# ===== Agent Identity =====
NEXT_PUBLIC_AGENT_DID=did:kite:learner.eth/claude-tutor/v1
KITE_AGENT_INDEX=0                        # BIP-32 파생 인덱스

# ===== Standing Intent Defaults =====
KITE_SI_MAX_TX=10000000000000000          # 0.01 KITE (wei)
KITE_SI_DAILY_CAP=100000000000000000      # 0.1 KITE (wei)
KITE_SI_TTL_HOURS=24                      # SI 유효 기간

# ===== Smart Contract Deployment (contracts/.env) =====
DEPLOYER_PRIVATE_KEY=                     # 컨트랙트 배포용 키
```

### 16.2 보안 주의사항

| 변수 | 위치 | 노출 |
|------|------|------|
| `NEXT_PUBLIC_*` | 클라이언트 번들 | 공개 (민감하지 않은 정보만) |
| `KITE_AGENT_PRIVATE_KEY` | 서버 사이드만 | **절대 클라이언트 노출 금지** |
| `KITE_USER_MNEMONIC` | 서버 사이드만 | **절대 클라이언트 노출 금지** |
| `DEPLOYER_PRIVATE_KEY` | CI/CD만 | 프로덕션 서버에 불필요 |

---

## 17. 심사 기준 대응 전략

### 17.1 Agent Autonomy (최우선)

| 시연 포인트 | 구현 |
|------------|------|
| 수동 지갑 조작 없음 | Session Key + AA Wallet 자동 서명 |
| 결제 자동 트리거 | 퀴즈 통과 → Claude 에이전트가 즉시 결제 |
| 진행도 자동 기록 | completeStage() 온체인 자동 호출 |
| 실패 자동 처리 | 재시도, 잔액 부족 안내, 대체 경로 |

### 17.2 Correct x402 Usage

| 시연 포인트 | 구현 |
|------------|------|
| 결제-액션 매핑 | 각 API 호출 = 1 x402 결제, 로그/UI에 명확히 표시 |
| 402 → 서명 → 200 전체 플로우 | x402Fetch가 자동 처리, 터미널에서 실시간 표시 |
| 잔액 부족 처리 | 에러 메시지 + faucet URL + 대시보드 링크 |
| 한도 초과 처리 | SI 설정 안내 메시지 |

### 17.3 Security & Safety

| 시연 포인트 | 구현 |
|------------|------|
| 키 분리 | User EOA → Agent BIP-32 → Session Ephemeral |
| 스코프 제한 | SI: 특정 컨트랙트 + 특정 함수만 허용 |
| 지출 한도 | 트랜잭션당 + 일일 한도 온체인 강제 |
| 자동 만료 | Session Key TTL + SI 만료일 |
| 감사 추적 | 모든 트랜잭션 KiteScan에서 검증 가능 |

### 17.4 Developer Experience

| 시연 포인트 | 구현 |
|------------|------|
| 어댑터 패턴 | 환경변수 하나로 Mock ↔ Real 전환 |
| 명확한 인터페이스 | TypeScript 타입 전체 정의 |
| .env.example | 모든 설정값 문서화 |
| README | 아키텍처, 퀵스타트, 스크린샷 |

### 17.5 Real-world Applicability

| 시연 포인트 | 구현 |
|------------|------|
| 교육 플랫폼 = 실제 시장 | 논문 기반 학습 LMS |
| 마이크로페이먼트 | 0.001 KITE/스테이지, sub-cent 수수료 |
| 학습 증명 | 온체인 attestation, Verifiable Credential |
| 확장성 | 어댑터 패턴으로 다른 체인/결제 교체 가능 |

---

## 18. 일정 & 마일스톤

| Phase | 작업 | 예상 소요 | 의존성 |
|-------|------|-----------|--------|
| **1** | 스마트 컨트랙트 개발 & 배포 | 1-2일 | 없음 |
| **2** | 에이전트 월렛 & 아이덴티티 | 1-2일 | Phase 1 (ABI 필요) |
| **3** | x402 API 라우트 | 1일 | Phase 1, 2 |
| **4** | 어댑터 교체 (Mock → Real) | 1일 | Phase 3 |
| **5** | 에이전트 대시보드 | 1-2일 | Phase 2, 3 |
| **6** | Claude 터미널 자율 결제 | 1일 | Phase 4 |
| **7** | 배포 & 데모 | 1일 | Phase 1-6 |
| **총계** | | **7-10일** | |

**기존 코드베이스 활용률:** ~70% (어댑터 패턴, Zustand 스토어, UI 컴포넌트, Canvas 렌더링 등 재사용)

---

## 19. 참고 자료

### 공식 문서
- Kite AI Docs: https://docs.gokite.ai/
- Kite Foundation Whitepaper: https://kite.foundation/whitepaper
- x402 Protocol: https://www.x402.org/
- x402 GitHub: https://github.com/coinbase/x402
- Coinbase x402 Docs: https://docs.cdp.coinbase.com/x402/welcome

### 체인 인프라
- Testnet RPC: https://rpc-testnet.gokite.ai/ (Chain ID: 2368)
- Mainnet RPC: https://rpc.gokite.ai/ (Chain ID: 2366)
- Testnet Explorer: https://testnet.kitescan.ai/
- Mainnet Explorer: https://kitescan.ai/
- Explorer APIs: https://kitescan.ai/api-docs
- Faucet: https://faucet.gokite.ai
- ChainList (Testnet): https://chainlist.org/chain/2368
- ChainList (Mainnet): https://chainlist.org/chain/2366

### SDK & 개발 도구
- Kite AI GitHub: https://github.com/gokite-ai
- AA SDK Guide: https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk
- Multi-sig Guide: https://docs.gokite.ai/kite-chain/5-advanced/multisig-wallet
- Stablecoin Gasless: https://docs.gokite.ai/kite-chain/stablecoin-gasless-transfer
- Counter dApp Example: https://docs.gokite.ai/kite-chain/3-developing/counter-smart-contract-hardhat

### NPM 패키지
```bash
# x402 SDK
@x402/core @x402/evm @x402/fetch @x402/express

# Blockchain
ethers hardhat @nomicfoundation/hardhat-toolbox

# Existing project
next@16.1.6 react@19.2.3 zustand@^5.0.11 tailwindcss@^4
```
