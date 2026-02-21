# Papers with Claude Code x Kite AI 통합 제안서

> **프로젝트명:** Papers with Claude Code — AI 자율 에이전트 학습 플랫폼
> **통합 대상:** Kite AI (x402 결제, Agent Passport, MCP)
> **작성일:** 2026-02-21
> **GitHub:** [ainblockchain/papers-with-claudecode](https://github.com/ainblockchain/papers-with-claudecode)
> **스마트 컨트랙트:** `0xaffB053eE4fb81c0D3450fDA6db201f901214A72` (Kite Testnet)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [통합 아키텍처](#2-통합-아키텍처)
3. [핵심 통합 포인트](#3-핵심-통합-포인트)
4. [듀얼체인 아키텍처](#4-듀얼체인-아키텍처)
5. [바운티 평가 기준 대응 전략](#5-바운티-평가-기준-대응-전략)
6. [확장 계획](#6-확장-계획)
7. [경쟁 우위 분석](#7-경쟁-우위-분석)
8. [기술적 구현 세부사항](#8-기술적-구현-세부사항)

---

## 1. 프로젝트 개요

### 1.1 Papers with Claude Code — AI 기반 학습 플랫폼

**Papers with Claude Code**는 학술 논문(예: "Attention Is All You Need")을 인터랙티브한 게임화된 학습 경험으로 변환하는 차세대 교육 플랫폼입니다.

| 구분 | 설명 |
|------|------|
| **학습 방식** | 2D 던전 스타일의 코스 맵에서 스테이지를 탐험하며 학습 |
| **AI 튜터** | Claude AI 터미널이 실시간으로 개념을 설명하고 퀴즈를 출제 |
| **데이터 소스** | GitHub 레포지토리(`ainblockchain/awesome-papers-with-claude-code`)가 과정 콘텐츠의 원본 |
| **렌더링** | HTML5 Canvas 2D (타일 기반 맵), TMJ(Tiled Map JSON) 포맷 |
| **프레임워크** | Next.js 16.1 (App Router, Turbopack), TypeScript 5 (strict), Zustand 5 |

```
학습자 여정:

  [탐색 페이지] → [논문 선택] → [2D 던전 입장] → [스테이지별 학습]
       │                │               │                │
       │                │               │                ▼
       │                │               │         [퀴즈 통과]
       │                │               │                │
       │                │               │                ▼
       │                │               │    [AI 에이전트 자동 결제]
       │                │               │                │
       │                │               │                ▼
       │                │               │      [다음 스테이지 잠금 해제]
       │                │               │                │
       │                │               │                ▼
       ▼                ▼               ▼      [온체인 학습 증명 기록]
```

### 1.2 Kite AI — 에이전트 네이티브 블록체인

Kite AI는 AI 에이전트를 위해 설계된 EVM 호환 L1 블록체인(Avalanche 서브넷)으로, 에이전트 경제(Agent Economy)를 위한 핵심 인프라를 제공합니다.

| 구분 | 테스트넷 | 메인넷 |
|------|----------|--------|
| **Chain ID** | 2368 | 2366 |
| **RPC** | `https://rpc-testnet.gokite.ai/` | `https://rpc.gokite.ai/` |
| **Explorer** | `https://testnet.kitescan.ai/` | `https://kitescan.ai/` |
| **Faucet** | `https://faucet.gokite.ai` | N/A |
| **합의** | Proof of Attributed Intelligence (PoAI) |
| **블록 가스 한도** | 400,000,000 |
| **트랜잭션 수수료** | Sub-cent ($0.01 미만) |
| **Finality** | 즉시 (서브초 확인) |
| **마이크로페이먼트** | 100ms 미만 지연, ~$0.000001/tx |

### 1.3 통합 비전: "경제적 자율성을 가진 AI 튜터 에이전트"

이 통합의 핵심 비전은 **AI 에이전트가 스스로 인증하고, 결제하고, 학습 증명을 기록하는** 완전 자율적 교육 생태계를 구현하는 것입니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    핵심 통합 비전                               │
│                                                               │
│   "학습자가 퀴즈를 통과하면, AI 에이전트가 자율적으로          │
│    결제를 실행하고, 다음 스테이지를 잠금 해제하며,              │
│    학습 증명을 블록체인에 기록한다."                            │
│                                                               │
│   사람의 개입: 환경변수 설정 1회                               │
│   이후 모든 과정: 완전 자동화                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 통합 아키텍처

### 2.1 시스템 구성도

```
┌────────────────────────── Papers with Claude Code ──────────────────────────┐
│                                                                              │
│  ┌──── Service Provider ─────┐      ┌──── Agent / Developer ─────┐         │
│  │ (결제 수신 측)              │      │ (결제 실행 측)               │         │
│  │                            │      │                             │         │
│  │ - HTTP 402 응답 생성        │      │ - MCP Client (SDK 1.27)    │         │
│  │   (gokite-aa scheme)       │      │ - get_payer_addr 호출       │         │
│  │ - Pieverse verify/settle   │      │ - approve_payment 호출      │         │
│  │ - 7개 x402-gated API 라우트│      │ - x402Fetch 자동 래퍼       │         │
│  │ - outputSchema per route   │      │ - 에이전트 자기인증          │         │
│  └────────────────────────────┘      │ - 사용자 OAuth 플로우       │         │
│                                       └─────────────────────────────┘         │
│                                                                              │
│  ┌──── Verifiable Identity ──┐      ┌──── On-Chain Records ──────┐         │
│  │                            │      │                             │         │
│  │ - WebAuthn Passkey (P-256) │      │ Kite Chain:                 │         │
│  │ - P-256 -> EVM 주소 도출   │      │ - USDT 결제 정산             │         │
│  │ - Agent DID                │      │ - Pieverse facilitator      │         │
│  │ - Kite Passport OAuth      │      │                             │         │
│  │ - OAuth + Self-Auth 듀얼   │      │ AIN Blockchain:             │         │
│  └────────────────────────────┘      │ - 학습 이벤트 기록           │         │
│                                       │ - 증명 해시(attestation)    │         │
│  ┌──── UI / Visualization ─────────────────────────────────────┐  │         │
│  │ - 2D 던전 코스 맵           - Agent Dashboard                │  │         │
│  │ - AI 튜터 터미널            - MCP 연결 패널                  │  │         │
│  │ - 결제 모달 + 히스토리      - 지식 그래프 탐색기             │  │         │
│  │ - 학습 증명 뷰어            - KiteScan 링크                  │  │         │
│  └──────────────────────────────────────────────────────────────┘  │         │
│                                       └─────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
  ┌─────────────┐      ┌──────────────┐      ┌──────────────┐
  │ Kite Chain  │      │  Kite MCP    │      │    AIN       │
  │ (Testnet)   │      │  Server      │      │ Blockchain   │
  │ Chain 2368  │      │              │      │              │
  │             │      │ neo.dev.     │      │ 학습 이벤트  │
  │ 결제 정산   │      │ gokite.ai    │      │ 증명 기록    │
  │ Test USDT   │      │ /v1/mcp      │      │ 지식 그래프  │
  │ Pieverse    │      │              │      │              │
  └─────────────┘      └──────────────┘      └──────────────┘
```

### 2.2 데이터 흐름 다이어그램

```
[학습자] ──퀴즈 통과──> [Next.js Frontend]
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                    ▼         ▼         ▼
              ┌──────────┐ ┌──────┐ ┌──────────┐
              │ x402 API │ │ MCP  │ │ AIN API  │
              │ Routes   │ │Proxy │ │ Events   │
              └────┬─────┘ └──┬───┘ └────┬─────┘
                   │          │          │
                   ▼          ▼          ▼
              ┌──────────┐ ┌──────┐ ┌──────────┐
              │ Pieverse  │ │ Kite │ │   AIN    │
              │Facilitator│ │ MCP  │ │Blockchain│
              └────┬─────┘ └──┬───┘ └──────────┘
                   │          │
                   ▼          │
              ┌──────────┐   │
              │Kite Chain│◄──┘
              │(on-chain │
              │settlement)│
              └──────────┘
```

### 2.3 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| **프레임워크** | Next.js (App Router, Turbopack) | 16.1 |
| **언어** | TypeScript (strict mode) | 5 |
| **상태 관리** | Zustand | 5 |
| **블록체인 (Kite)** | ethers, Pieverse facilitator | 6 |
| **블록체인 (AIN)** | @ainblockchain/ain-js | 1.14 |
| **MCP** | @modelcontextprotocol/sdk | 1.27 |
| **인증** | next-auth (GitHub + Kite Passport OAuth), WebAuthn | 5 |
| **UI** | Tailwind CSS, Radix UI, lucide-react | 4 |
| **터미널** | @xterm/xterm | 6 |
| **스마트 컨트랙트** | Solidity, Hardhat | 0.8.20 |
| **결제 프로토콜** | x402 (@x402/core, @x402/evm) | latest |
| **서버 캐싱** | React Query (@tanstack/react-query) | latest |

---

## 3. 핵심 통합 포인트

### 3.1 x402 결제 플로우 (단계별 상세)

x402는 Coinbase가 창안한 인터넷 네이티브 결제 오픈 표준으로, HTTP 402 (Payment Required) 상태 코드를 활용하여 API 호출에 마이크로페이먼트를 부착합니다.

#### 양방향 x402 구현 (Bidirectional)

본 프로젝트는 **Service Provider(결제 수신)와 Agent Client(결제 실행) 양쪽 모두** 구현한 드문 사례입니다.

```
┌──────────┐                    ┌──────────────┐                 ┌─────────────┐
│  Client   │                    │  API Server   │                 │  Facilitator │
│ (Agent)   │                    │ (Next.js API) │                 │  (Pieverse)  │
└─────┬────┘                    └──────┬───────┘                 └──────┬──────┘
      │                                │                                │
      │ 1. POST /api/x402/unlock-stage │                                │
      │    (X-Payment 헤더 없음)        │                                │
      │ ─────────────────────────────► │                                │
      │                                │                                │
      │ 2. HTTP 402 Payment Required   │                                │
      │    + accepts: [{               │                                │
      │        scheme: "gokite-aa",    │                                │
      │        network: "kite-testnet",│                                │
      │        maxAmountRequired,      │                                │
      │        asset: Test USDT,       │                                │
      │        payTo: merchant wallet  │                                │
      │      }]                        │                                │
      │ ◄───────────────────────────── │                                │
      │                                │                                │
      │ 3. MCP 도구 호출:              │                                │
      │    get_payer_addr              │                                │
      │    → 사용자 AA 월렛 주소       │                                │
      │                                │                                │
      │ 4. MCP 도구 호출:              │                                │
      │    approve_payment             │                                │
      │    → 서명된 X-Payment 토큰     │                                │
      │                                │                                │
      │ 5. 재요청 (X-Payment 헤더 포함)│                                │
      │ ─────────────────────────────► │                                │
      │                                │                                │
      │                                │ 6. POST /v2/verify             │
      │                                │    (X-Payment 검증)            │
      │                                │ ──────────────────────────────►│
      │                                │                                │
      │                                │ 7. 검증 결과 반환               │
      │                                │ ◄──────────────────────────────│
      │                                │                                │
      │                                │ 8. POST /v2/settle             │
      │                                │    (온체인 정산 실행)           │
      │                                │ ──────────────────────────────►│
      │                                │                                │
      │                                │                          9-10. │
      │                                │                    transferWith│
      │                                │                    Authorization│
      │                                │                    (EIP-3009)  │
      │                                │                    → on-chain  │
      │                                │                                │
      │                                │ 11. 정산 완료 응답              │
      │                                │ ◄──────────────────────────────│
      │                                │                                │
      │ 12. HTTP 200 OK                │                                │
      │     + 서비스 응답 데이터        │                                │
      │     + 트랜잭션 해시             │                                │
      │ ◄───────────────────────────── │                                │
```

#### 402 응답 포맷 (Kite 공식 Weather API와 동일한 12개 필드)

```json
{
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "gokite-aa",
    "network": "kite-testnet",
    "maxAmountRequired": "1000000000000000000",
    "resource": "/api/x402/unlock-stage",
    "description": "Unlock learning stage",
    "mimeType": "application/json",
    "outputSchema": { ... },
    "payTo": "0xc0078d495e80fd3b1e92f0803d0bc7c279165d8c",
    "maxTimeoutSeconds": 30,
    "asset": "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    "extra": { ... },
    "merchantName": "Papers with Claude Code"
  }]
}
```

#### 에러 핸들링 매트릭스

| 에러 코드 | HTTP 상태 | 처리 방식 | 사용자 안내 |
|-----------|-----------|-----------|------------|
| `insufficient_funds` | 402 | 잔액 부족 감지 | Faucet URL + 현재 잔액 표시 |
| `payment_required` | 402 | Kite Passport 미연결 | MCP 연결 안내 |
| `SessionExpired` | 401 | 세션 만료 | 재인증 플로우 시작 |
| `InsufficientBudget` | 402 | 세션 한도 초과 | Standing Intent 재설정 안내 |
| `Unauthorized` | 401 | OAuth 토큰 만료 | OAuth 재시작 |
| `InvalidPayment` | 400 | 위조/만료 토큰 | 결제 재시도 안내 |

### 3.2 에이전트 신원 인증 (Kite Passport + MCP)

본 프로젝트는 **사용자 OAuth와 에이전트 자기인증 두 가지 모드**를 모두 지원합니다.

#### 듀얼 인증 아키텍처

```
┌─────────────────────── 인증 모드 ───────────────────────┐
│                                                          │
│  모드 A: 사용자 OAuth (Mode 1: Client Agent with MCP)   │
│  ─────────────────────────────────────────────────────   │
│  [Login Page]                                            │
│      ├─ "Sign in with GitHub"                            │
│      │   → GitHub OAuth → redirect → Passkey → /explore  │
│      └─ "Sign in with Kite Passport"                     │
│          → Kite OAuth → redirect → Passkey → /explore    │
│                                                          │
│  OAuth Endpoints:                                        │
│  - Authorize: neo.dev.gokite.ai/v1/oauth/authorize      │
│  - Token:     neo.dev.gokite.ai/v1/oauth/token           │
│  - Scope:     payment                                    │
│                                                          │
│  모드 B: 에이전트 자기인증 (client_credentials)          │
│  ─────────────────────────────────────────────────────   │
│  passport-auth.ts → authenticateAgent()                  │
│  ├── KITE_AGENT_ID + KITE_AGENT_SECRET 환경변수          │
│  ├── client_credentials OAuth 플로우 (사람 개입 0)       │
│  ├── 자동 토큰 캐싱 + 만료 감지                          │
│  └── ensureMcpConnected() 매 요청마다 자기인증 시도      │
│                                                          │
│  에이전트 부팅 시:                                        │
│  authenticateAgent() → ensureMcpConnected()               │
│  → Kite MCP 연결 → 결제 준비 상태 자동 진입              │
└──────────────────────────────────────────────────────────┘
```

#### 3단계 계층적 신원 모델 (Kite AI)

```
Tier 1: 사용자 신원 (Root Authority)
  └── Private key: HSM / Secure Enclave에 저장
  └── EOA wallet: 모든 권한의 루트
  └── 에이전트에 절대 노출 안 됨

Tier 2: 에이전트 신원 (Delegated Authority)
  └── BIP-32 계층적 키 도출로 결정론적 주소 생성
  └── DID: did:kite:learner.eth/claude-tutor/v1
  └── KitePass: User → Agent → Action 신뢰 체인
  └── Verifiable Credentials: 능력/자격 증명

Tier 3: 세션 신원 (Ephemeral Authority)
  └── 완전 랜덤, 1회용 키
  └── 자동 만료
  └── Perfect Forward Secrecy 보장
```

#### WebAuthn Passkey 통합

본 프로젝트는 WebAuthn P-256 패스키를 활용하여 하드웨어 바운드 키를 생성합니다:

```
WebAuthn Passkey (P-256)
    │
    ├── 패스키 등록 → P-256 공개키 추출
    │                    │
    │                    ├── AIN 주소 도출 (SHA-256 → 20바이트)
    │                    └── EVM 주소 도출 (Keccak-256 → 20바이트)
    │
    └── 패스키 인증 → 서명 검증 → 트랜잭션 서명
```

### 3.3 온체인 학습 증명 (LearningLedger + AIN Blockchain)

#### LearningLedger 스마트 컨트랙트

Kite AI Testnet(Chain ID: 2368)에 배포된 학습 진행 기록 컨트랙트입니다.

| 항목 | 값 |
|------|-----|
| **컨트랙트 주소** | `0xaffB053eE4fb81c0D3450fDA6db201f901214A72` |
| **네트워크** | Kite AI Testnet (Chain ID: 2368) |
| **Solidity 버전** | 0.8.20 |
| **Explorer** | https://testnet.kitescan.ai/address/0xaffB053eE4fb81c0D3450fDA6db201f901214A72 |

```solidity
contract LearningLedger {
    struct Enrollment {
        uint256 enrolledAt;       // 등록 타임스탬프
        uint256 currentStage;     // 현재 진행 스테이지
        uint256 totalPaid;        // 총 지불 금액 (wei)
        bool isActive;            // 활성 상태
    }

    struct StageCompletion {
        uint256 completedAt;      // 완료 타임스탬프
        uint256 score;            // 퀴즈 점수 (0-100)
        uint256 amountPaid;       // 스테이지 잠금해제 비용
        bytes32 attestationHash;  // 완료 증명 해시
    }

    // 주요 함수
    function enrollCourse(string paperId) external payable;
    function completeStage(string paperId, uint256 stageNum, uint256 score) external payable;
    function getProgress(address agent, string paperId) external view returns (...);
    function getStageCompletion(address agent, string paperId, uint256 stageNum) external view returns (...);

    // 이벤트
    event CourseEnrolled(address indexed agent, string paperId, uint256 timestamp);
    event StageCompleted(address indexed agent, string paperId, uint256 stageNum, uint256 score);
    event PaymentReceived(address indexed from, string paperId, uint256 amount);
}
```

#### 온체인 증명 해시 (Attestation Hash)

각 스테이지 완료 시 다음 데이터의 `keccak256` 해시가 온체인에 기록됩니다:

```
attestationHash = keccak256(
    abi.encodePacked(
        msg.sender,    // 에이전트 주소
        paperId,       // 논문/코스 ID
        stageNum,      // 스테이지 번호
        score,         // 퀴즈 점수
        block.timestamp // 완료 시간
    )
)
```

이 해시는 KiteScan에서 누구나 검증할 수 있는 **불변의 학습 증명**입니다.

#### AIN Blockchain 학습 이벤트

Kite Chain의 결제 기록과 별도로, AIN Blockchain에는 더 풍부한 학습 이벤트가 기록됩니다:

| 이벤트 유형 | 기록 내용 | 체인 |
|------------|----------|------|
| `course_enter` | 코스 진입 타임스탬프, 논문 ID | AIN |
| `stage_complete` | 스테이지 번호, 점수, 소요 시간 | AIN |
| `quiz_pass` | 퀴즈 결과, 정답률, 난이도 | AIN |
| 결제 정산 | USDT 이체, 가스비, 영수증 | Kite |
| 학습 증명 | SHA-256 해시, attestationHash | 듀얼 |

### 3.4 Claude AI 자율 결제 (Autonomous Payment)

#### 자율 결제 플로우

```
학습자가 퀴즈 통과
    │
    ▼
ClaudeTerminal 감지 (useLearningStore.isQuizPassed === true)
    │
    ▼
Claude 에이전트가 터미널에 메시지 표시:
  "축하합니다! Stage 3을 85점으로 통과했습니다!
   지금 Stage 4를 잠금 해제하겠습니다..."
    │
    ▼
에이전트가 /api/x402/unlock-stage 호출 (Session Key로 서명)
    │
    ▼
x402 플로우 자동 실행:
  HTTP 402 → get_payer_addr → approve_payment → X-Payment 헤더 → 재요청
    │
    ▼
Pieverse facilitator가 온체인 정산 실행
    │
    ▼
성공 시 터미널 메시지:
  "Stage 4 잠금 해제 완료! 결제: 0.001 USDT
   Tx: 0x1234...abcd (KiteScan에서 확인)
   학습 진행이 온체인에 기록되었습니다."
    │
    ▼
setDoorUnlocked(true) → 스테이지 문 열림
```

#### 실패 시 자동 처리

```
잔액 부족:
  "Stage 4 잠금 해제를 위한 USDT 잔액이 부족합니다.
   현재 잔액: 0.0005 USDT | 필요: 0.001 USDT
   테스트 토큰 받기: https://faucet.gokite.ai"

한도 초과:
  "일일 지출 한도에 도달했습니다 (0.1 USDT).
   Agent Dashboard에서 Standing Intent를 업데이트해주세요."

네트워크 오류:
  "네트워크 오류로 결제에 실패했습니다. 5초 후 재시도..."
  → 최대 3회 자동 재시도
```

---

## 4. 듀얼체인 아키텍처

### 4.1 아키텍처 개요

본 프로젝트는 **결제와 학습 증명을 서로 다른 체인에 분리**하는 듀얼체인 아키텍처를 채택했습니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    듀얼체인 아키텍처                           │
│                                                               │
│   ┌─────────────────────┐      ┌─────────────────────┐      │
│   │    Kite Chain        │      │   AIN Blockchain     │      │
│   │    (결제 레이어)      │      │   (학습 증명 레이어)  │      │
│   │                      │      │                      │      │
│   │ - USDT 결제 정산     │      │ - 학습 이벤트 기록   │      │
│   │ - LearningLedger     │      │ - 증명 해시 저장     │      │
│   │   컨트랙트           │      │ - 지식 그래프        │      │
│   │ - Pieverse 정산      │      │ - 토픽 관계 맵       │      │
│   │ - 가스리스 전송      │      │                      │      │
│   │   (EIP-3009)         │      │                      │      │
│   │                      │      │                      │      │
│   │ Chain ID: 2368       │      │ AIN Network          │      │
│   │ Test USDT:           │      │                      │      │
│   │ 0x0fF539...27e63     │      │                      │      │
│   └──────────┬───────────┘      └──────────┬───────────┘      │
│              │                              │                  │
│              └──────────┬───────────────────┘                  │
│                         │                                      │
│                    ┌────┴────┐                                 │
│                    │ Next.js │                                 │
│                    │ Backend │                                 │
│                    └─────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 체인별 역할 분담

| 역할 | Kite Chain | AIN Blockchain |
|------|-----------|----------------|
| **목적** | 결제 정산, 경제적 트랜잭션 | 학습 증명, 데이터 무결성 |
| **기록 내용** | 결제 금액, 영수증, 정산 상태 | 이벤트, 점수, 해시, 그래프 |
| **트랜잭션 비용** | Sub-cent (~$0.001) | Fire-and-forget |
| **사용 토큰** | Test USDT, KITE | AIN |
| **검증 방법** | KiteScan Explorer | AIN SDK 조회 |
| **정합성** | Pieverse facilitator 보장 | 이벤트 트래커 보장 |

### 4.3 듀얼체인 설계의 이점

1. **관심사 분리 (Separation of Concerns):** 결제와 증명이 독립적으로 동작하여 한쪽 체인에 장애가 발생해도 다른 쪽이 영향받지 않음
2. **데이터 풍부성:** 결제 기록만으로는 학습 증명으로 불충분 — 점수, 진행률, 지식 그래프 등 추가 메타데이터를 AIN에 기록
3. **비용 최적화:** 고빈도 학습 이벤트는 비용이 낮은 AIN에, 중요한 결제 정산은 Kite에 기록
4. **포터블 크레덴셜:** AIN의 학습 증명은 다른 교육 플랫폼에서도 검증 가능한 표준화된 형식

---

## 5. 바운티 평가 기준 대응 전략

### 5.1 Agent Autonomy (에이전트 자율성)

> **평가 포인트:** "사람의 개입을 최소화"

| 자율화 구현 | 설명 |
|------------|------|
| **자기인증** | `authenticateAgent()` — `client_credentials` OAuth, 사람 개입 0 |
| **자동 MCP 연결** | `ensureMcpConnected()` — 매 요청마다 연결 상태 확인 + 자동 재연결 |
| **자동 결제** | `tryMcpPayment()` — 402 감지 → MCP 도구 호출 → 서명 → 재시도 |
| **자동 진행 기록** | 퀴즈 통과 → `completeStage()` 온체인 호출 → 자동 기록 |
| **자동 실패 처리** | 잔액 부족/한도 초과/네트워크 오류 시 사용자 안내 메시지 + 재시도 |

```
전체 자동화 파이프라인:

authenticateAgent()
    → ensureMcpConnected()
        → tryMcpPayment()
            → settle
                → recordOnChain()

사람이 하는 일: 환경변수 1회 설정
이후 모든 과정: 완전 자동화
```

### 5.2 Correct x402 Usage (올바른 x402 사용)

> **평가 포인트:** "결제와 액션 간의 명확한 매핑, 잔액 부족 처리"

| 구현 사항 | 설명 |
|-----------|------|
| **402 응답 포맷** | Kite 공식 Weather API와 동일한 12개 필드 검증 완료 |
| **양방향 구현** | Service Provider(402 반환) + Agent Client(402 처리) 모두 구현 |
| **결제-액션 매핑** | 1 API 호출 = 1 x402 결제, 로그/UI에 명확히 표시 |
| **gokite-aa scheme** | Kite Account Abstraction 스킴 정확히 구현 |
| **Pieverse 연동** | `/v2/verify` → `/v2/settle` 정산 흐름 완전 구현 |
| **잔액 부족 처리** | 에러 메시지 + Faucet URL + Dashboard 링크 제공 |
| **한도 초과 처리** | Standing Intent 재설정 안내 메시지 |
| **세션 만료 처리** | 자동 재인증 플로우 시작 |

### 5.3 Security & Safety (보안 및 안전성)

> **평가 포인트:** "키 관리, 범위 제한, 한도 설정"

| 보안 조치 | 구현 |
|-----------|------|
| **키 격리** | WebAuthn P-256 키는 비내보내기(hardware-bound) |
| **CSRF 보호** | OAuth state 파라미터 검증 |
| **토큰 보안** | 서버 사이드 MCP 프록시 — 브라우저가 access token에 접근 불가 |
| **세션 관리** | 60초 버퍼를 둔 자동 만료 감지 |
| **민감 데이터** | payer 주소, 인증 토큰 캐싱 없음 — 매 요청 시 fresh fetch |
| **Bounded Loss** | Standing Intent 한도 = 최대 손실 상한 |
| **서버-클라이언트 분리** | `KITE_AGENT_PRIVATE_KEY`는 서버 전용, `NEXT_PUBLIC_*`만 클라이언트 노출 |

```
보안 계층도:

┌─────────────────────────────────────┐
│ Layer 1: WebAuthn Hardware Binding   │  ← 물리적 키 보호
├─────────────────────────────────────┤
│ Layer 2: OAuth + CSRF Protection     │  ← 인증 보안
├─────────────────────────────────────┤
│ Layer 3: Server-side MCP Proxy       │  ← 토큰 노출 방지
├─────────────────────────────────────┤
│ Layer 4: Standing Intent Limits      │  ← 지출 한도 보호
├─────────────────────────────────────┤
│ Layer 5: On-chain Audit Trail        │  ← 감사 추적
└─────────────────────────────────────┘
```

### 5.4 Developer Experience (개발자 경험)

> **평가 포인트:** "문서화, 사용성, 어댑터 패턴"

| DX 기능 | 설명 |
|---------|------|
| **어댑터 패턴** | `KiteX402Adapter`(실제) / `MockX402Adapter`(목) — 환경변수 1개로 전환 |
| **원라인 결제** | `x402Fetch(url)` 하나로 전체 402 → 결제 → 재시도 플로우 처리 |
| **명확한 API 라우트** | `/api/kite-mcp/{config,status,tools,oauth,oauth/callback}` |
| **타입 안전성** | 모든 결제 타입에 대한 TypeScript 인터페이스 export |
| **환경 설정** | `.env.local` 파일 하나에 모든 Kite + AIN 변수 |
| **오픈 소스** | MIT 라이선스, GitHub 공개 레포지토리 |

```typescript
// 개발자가 결제를 통합하는 데 필요한 코드량:
// === 1줄 ===
const response = await x402Fetch('/api/x402/unlock-stage', { method: 'POST', body });

// 내부적으로:
// 1. 첫 요청 → 402 수신
// 2. PAYMENT-REQUIRED 파싱
// 3. MCP get_payer_addr 호출
// 4. MCP approve_payment 호출
// 5. X-Payment 헤더로 재요청
// 6. 200 OK 수신
```

### 5.5 Real-world Applicability (실제 적용 가능성)

> **평가 포인트:** "교육 플랫폼이라는 실제 시장"

| 적용 가능성 | 설명 |
|------------|------|
| **실제 교육 시장** | 학술 논문 기반 LMS — EdTech 실제 시장 |
| **마이크로페이먼트** | 0.001 USDT/스테이지, sub-cent 수수료 |
| **학습 증명** | 온체인 attestation → 포터블 Verifiable Credential |
| **확장성** | 어댑터 패턴으로 다른 체인/결제 수단 교체 가능 |
| **AI 에이전트 경제** | "AI 에이전트가 API 접근을 위해 결제하는" 패턴은 EdTech 수익 모델에 직접 매핑 |

---

## 6. 확장 계획

### 6.1 멀티 에이전트 협업

현재의 3자 협업 구조를 더 확장한 멀티 에이전트 아키텍처:

```
현재 (구현 완료):
┌──────────┐    ┌──────────────┐    ┌──────────┐
│ Student   │ ←→ │ Server Agent  │ ←→ │ Kite MCP │
│ Agent     │    │ (Next.js,    │    │ Server   │
│ (Browser) │    │  self-auth)  │    │          │
└──────────┘    └──────────────┘    └──────────┘

확장 계획:
┌──────────┐    ┌──────────────┐    ┌──────────┐
│ Student   │ ←→ │ Tutor Agent   │ ←→ │ Kite MCP │
│ Agent     │    │ (Claude AI)   │    │ Server   │
└──────────┘    └──────────────┘    └──────────┘
                       ↕
                ┌──────────────┐
                │ Quiz Verifier │    ← 독립 검증 에이전트
                │ Agent         │
                └──────────────┘
                       ↕
                ┌──────────────┐
                │ Attestation   │    ← 증명 기록 에이전트
                │ Agent         │
                └──────────────┘
```

### 6.2 가스리스 UX (Gasless Transactions)

Pieverse facilitator가 가스비를 대납하므로 사용자는 USDT만 지불합니다.

```
현재:
  사용자 → USDT 결제 → Pieverse가 가스비 대납 → 온체인 정산

확장 (ERC-4337 AA SDK Paymaster):
  사용자 → USDT 결제만 → AA Wallet이 가스비 스폰서링
                          → UserOperation 생성
                          → Paymaster가 가스비 대납
                          → 사용자 가스비 인식 0
```

EIP-3009 `transferWithAuthorization`을 통한 가스리스 스테이블코인 전송:

| 항목 | 설명 |
|------|------|
| **메커니즘** | EIP-3009 오프체인 서명 → 온체인 실행 분리 |
| **지원 토큰** | USDC (`0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e`), Test USDT |
| **사용자 경험** | 가스비 없이 USDT/USDC 전송 가능 |
| **기술** | `transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)` |

### 6.3 크로스체인 확장 (LayerZero V2)

Kite AI는 LayerZero V2(Endpoint ID: 30406)를 지원하므로, 크로스체인 학습 증명이 가능합니다.

```
향후 크로스체인 플로우:

┌──────────┐  LayerZero V2  ┌──────────────┐  LayerZero V2  ┌──────────┐
│ Kite     │ ──────────────→ │ Base Sepolia  │ ──────────────→ │ Ethereum │
│ Testnet  │                 │              │                 │ Mainnet  │
│          │                 │ 결제 기록    │                 │ 증명서   │
│ 결제+증명│                 │ 미러링       │                 │ NFT 발행 │
└──────────┘                 └──────────────┘                 └──────────┘
```

현재 듀얼체인 지원(Kite + Base Sepolia)이 이미 구현되어 있으며, LayerZero를 통해 추가 체인으로 확장 가능합니다:

| 체인 | 용도 | 상태 |
|------|------|------|
| Kite Testnet (2368) | 결제 정산 | 구현 완료 |
| Base Sepolia | 추가 결제 채널 | 구현 완료 |
| Ethereum (via LayerZero) | 증명서 NFT 발행 | 확장 계획 |
| Arbitrum (via LayerZero) | 저비용 증명 저장 | 확장 계획 |

### 6.4 Goldsky 인덱싱

Kite AI의 Goldsky 통합(slug: `kite-ai`)을 활용한 실시간 데이터 인덱싱:

```
┌──────────┐    ┌──────────────┐    ┌──────────┐
│ Kite     │ ──→ │   Goldsky    │ ──→ │ Frontend │
│ Chain    │    │  Indexer     │    │ Dashboard│
│          │    │              │    │          │
│ Events:  │    │ Subgraph:    │    │ 실시간:  │
│ Enrolled │    │ - 결제 내역  │    │ - 차트   │
│ Completed│    │ - 진행 현황  │    │ - 테이블 │
│ Payment  │    │ - 통계       │    │ - 알림   │
└──────────┘    └──────────────┘    └──────────┘
```

Goldsky 인덱싱을 통해:
- LearningLedger 이벤트를 실시간으로 인덱싱
- Agent Dashboard에 실시간 결제/학습 통계 제공
- 글로벌 리더보드 및 학습 분석 대시보드 구현 가능

---

## 7. 경쟁 우위 분석

### 7.1 대부분의 바운티 프로젝트 vs 우리 프로젝트

| 구분 | 일반적 바운티 프로젝트 | Papers with Claude Code |
|------|----------------------|------------------------|
| **범위** | Weather API 호출 + 결제 데모 | 완전한 교육 플랫폼 |
| **인터페이스** | CLI 도구 | 2D 던전 맵 + AI 터미널 + Dashboard |
| **x402 방향** | Agent Client만 (결제 실행) | **양방향** — Service Provider + Agent Client |
| **블록체인** | 단일 체인 | **듀얼체인** — Kite(결제) + AIN(증명) |
| **인증** | 사용자 OAuth만 | **듀얼 인증** — 사용자 OAuth + 에이전트 자기인증 |
| **자율성** | 사용자 승인 필요 | **완전 자율** — 환경변수 설정 후 개입 0 |
| **실용성** | 기술 데모 | **실제 EdTech 사용 사례** |
| **아키텍처** | 해커톤 프로토타입 | **프로덕션 아키텍처** — Next.js 16, Zustand, 어댑터 패턴 |

### 7.2 6가지 핵심 차별점

```
┌─────────────────────────────────────────────────────┐
│              6가지 핵심 차별점                         │
├─────────────────────────────────────────────────────┤
│                                                       │
│  1. 양방향 x402 (Bidirectional)                      │
│     Service Provider + Agent Client 모두 구현         │
│     → 대부분 프로젝트는 한쪽만 구현                   │
│                                                       │
│  2. 듀얼 블록체인 (Dual Blockchain)                   │
│     Kite Chain(결제) + AIN Blockchain(학습 증명)      │
│     → 결제 이상의 의미 있는 온체인 데이터              │
│                                                       │
│  3. 실제 사용 사례 (Real Use Case)                    │
│     논문 기반 교육 플랫폼 = "AI 에이전트가 유료       │
│     서비스를 소비하는" 가장 자연스러운 예시            │
│                                                       │
│  4. 풍부한 UI (Rich UI)                              │
│     2D 던전 맵 + AI 터미널 + Agent Dashboard          │
│     + 결제 모달 + 지식 그래프                         │
│     → 단순 CLI 데모가 아닌 시각적 경험                │
│                                                       │
│  5. 듀얼 인증 모드 (Dual Auth)                        │
│     사용자 OAuth + 에이전트 자기인증 모두 지원         │
│     → Mode 1(사용자 제어) + 자율 에이전트 패턴 시연   │
│                                                       │
│  6. 프로덕션 아키텍처 (Production Architecture)       │
│     Next.js 16, Zustand, 어댑터 패턴, React Query     │
│     → 실제 제품처럼 구축, 해커톤 프로토타입이 아님    │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 7.3 바운티 성공 기준 충족도

| 성공 기준 | 충족 여부 | 구현 증거 |
|-----------|----------|-----------|
| AI 에이전트 자기인증 | **충족** | `passport-auth.ts` — `client_credentials` 플로우 |
| 유료 액션 실행 | **충족** | 스테이지 잠금해제 = 온체인 마이크로페이먼트 |
| 온체인 정산/증명 | **충족** | Kite: 결제 정산 + AIN: 학습 attestation |
| 프로덕션 라이브 데모 | **충족** | Vercel 배포, 공개 URL |
| 멀티 에이전트 협업 (보너스) | **충족** | Student Agent ↔ Server Agent ↔ Kite MCP 3자 협업 |
| 가스리스 트랜잭션 (보너스) | **충족** | Pieverse facilitator 가스비 대납 |
| 보안 제어 (보너스) | **충족** | OAuth CSRF, 서버사이드 MCP 프록시, 토큰 비캐싱 |

---

## 8. 기술적 구현 세부사항

### 8.1 주요 파일 맵

#### Kite AI 통합 파일

| 파일 | 역할 | 설명 |
|------|------|------|
| `src/lib/kite/mcp-client.ts` | MCP 클라이언트 | Kite MCP 서버 연결 싱글톤, `get_payer_addr`/`approve_payment` 래핑 |
| `src/lib/kite/passport-auth.ts` | 듀얼 인증 | 사용자 OAuth + 에이전트 `client_credentials` 자기인증 |
| `src/lib/kite/x402-fetch.ts` | x402 래퍼 | 402 자동 감지 → MCP 결제 → 재시도 페치 래퍼 |
| `src/lib/kite/contracts.ts` | 체인 상수 | Kite 테스트넷 설정, Test USDT 주소, Pieverse URL |
| `src/lib/auth/kite-passport-provider.ts` | NextAuth 프로바이더 | Kite Passport OAuth 커스텀 프로바이더 |

#### x402 결제 API 라우트

| 파일 | 역할 | 설명 |
|------|------|------|
| `src/app/api/x402/_lib/x402-nextjs.ts` | SP 미들웨어 | 402 응답 생성, Pieverse verify/settle |
| `src/app/api/x402/unlock-stage/route.ts` | 스테이지 잠금해제 | x402-gated 결제 + AIN 블록체인 기록 |
| `src/app/api/kite-mcp/tools/route.ts` | MCP 프록시 | 브라우저 ↔ MCP 보안 브릿지 |
| `src/app/api/kite-mcp/oauth/route.ts` | OAuth 시작 | CSRF state 포함 인증 URL 생성 |
| `src/app/api/kite-mcp/oauth/callback/route.ts` | OAuth 콜백 | 코드 교환 + MCP 연결 + state 검증 |

#### 블록체인 & 증명

| 파일 | 역할 | 설명 |
|------|------|------|
| `kiteAi/contracts/contracts/LearningLedger.sol` | 스마트 컨트랙트 | 등록/스테이지 완료/진행 조회 |
| `src/lib/ain/event-tracker.ts` | AIN 이벤트 | Fire-and-forget 학습 이벤트 트래킹 |
| `src/lib/ain/passkey.ts` | WebAuthn | P-256 키 관리, 듀얼 주소 도출 |

#### 어댑터 & UI

| 파일 | 역할 | 설명 |
|------|------|------|
| `src/lib/adapters/x402.ts` | 결제 어댑터 | `KiteX402Adapter` + MCP 자동 결제 폴백 |
| `src/components/agent/KiteMcpConfig.tsx` | MCP UI | Kite Passport 연결 관리 패널 |
| `src/app/agent-dashboard/page.tsx` | 대시보드 | 월렛, MCP 상태, 결제 내역, 증명, 그래프 |

### 8.2 컨트랙트 주소 & 온체인 참조

| 구분 | 주소 / 값 |
|------|-----------|
| **LearningLedger** | `0xaffB053eE4fb81c0D3450fDA6db201f901214A72` |
| **Test USDT** | `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63` |
| **USDC (Mainnet)** | `0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e` |
| **GokiteAccount (AA)** | `0x93F5310eFd0f09db0666CA5146E63CA6Cdc6FC21` |
| **Merchant Wallet** | `0xc0078d495e80fd3b1e92f0803d0bc7c279165d8c` |
| **Pieverse Facilitator** | `https://facilitator.pieverse.io` |
| **Kite MCP Server** | `https://neo.dev.gokite.ai/v1/mcp` |
| **Kite Testnet RPC** | `https://rpc-testnet.gokite.ai/` |
| **Chain ID** | 2368 (테스트넷) / 2366 (메인넷) |
| **LayerZero EID** | 30406 |
| **Goldsky Slug** | `kite-ai` |

### 8.3 환경변수 참조

```bash
# ===== Kite AI 인증 =====
KITE_OAUTH_CLIENT_ID=             # Kite 포털에서 발급
KITE_OAUTH_CLIENT_SECRET=         # Kite 포털에서 발급
KITE_OAUTH_BASE_URL=https://neo.dev.gokite.ai

# ===== 에이전트 자기인증 =====
KITE_AGENT_ID=                    # 에이전트 ID
KITE_AGENT_SECRET=                # 에이전트 시크릿

# ===== x402 결제 =====
NEXT_PUBLIC_USE_KITE_CHAIN=true   # true: 실체인 / false: Mock
NEXT_PUBLIC_KITE_CHAIN_ID=2368
NEXT_PUBLIC_KITE_RPC_URL=https://rpc-testnet.gokite.ai/
NEXT_PUBLIC_KITE_EXPLORER_URL=https://testnet.kitescan.ai/
NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS=0xaffB053eE4fb81c0D3450fDA6db201f901214A72

# ===== 서버 전용 (절대 클라이언트 노출 금지) =====
KITE_AGENT_PRIVATE_KEY=           # 에이전트 프라이빗 키
KITE_MERCHANT_WALLET=0xc0078d495e80fd3b1e92f0803d0bc7c279165d8c

# ===== AIN Blockchain =====
NEXT_PUBLIC_AIN_PROVIDER_URL=     # AIN 프로바이더
AIN_PRIVATE_KEY=                  # AIN 프라이빗 키 (서버 전용)
```

### 8.4 API 엔드포인트 요약

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/courses` | 공개 | 코스 목록 (GitHub에서 fetch, 10분 캐시) |
| GET | `/api/courses/[courseId]` | 공개 | 코스 상세 정보 |
| GET | `/api/courses/[courseId]/stages/[stageNumber]` | 공개 | 스테이지 TMJ 맵 + 데이터 |
| POST | `/api/x402/unlock-stage` | x402 | 스테이지 잠금해제 (결제 필요) |
| GET | `/api/kite-mcp/config` | 인증 | MCP 설정 정보 |
| GET | `/api/kite-mcp/status` | 인증 | MCP 연결 상태 |
| POST | `/api/kite-mcp/tools` | 인증 | MCP 도구 프록시 |
| GET | `/api/kite-mcp/oauth` | 인증 | OAuth 인증 URL 생성 |
| GET | `/api/kite-mcp/oauth/callback` | - | OAuth 콜백 처리 |
| GET | `/api/terminal/[...path]` | 인증 | K8s 웹 터미널 프록시 |

---

## 부록 A: 용어 사전

| 용어 | 설명 |
|------|------|
| **x402** | HTTP 402 기반 인터넷 네이티브 결제 오픈 표준 (Coinbase 창안) |
| **gokite-aa** | Kite Account Abstraction 결제 스킴 |
| **Pieverse** | Kite Chain의 x402 facilitator 서비스 |
| **MCP** | Model Context Protocol — AI 에이전트 도구 프로토콜 |
| **Standing Intent** | 사용자가 서명한 에이전트 지출 한도 선언 |
| **KitePass** | 에이전트의 암호화 신원 크레덴셜 |
| **DID** | Decentralized Identifier (분산 식별자) |
| **AA** | Account Abstraction (계정 추상화, ERC-4337) |
| **EIP-3009** | `transferWithAuthorization` — 가스리스 토큰 전송 표준 |
| **LayerZero V2** | 크로스체인 메시징 프로토콜 |
| **Goldsky** | 블록체인 데이터 인덱싱 서비스 |
| **TMJ** | Tiled Map JSON — 2D 타일맵 포맷 |
| **BFF** | Backend for Frontend 패턴 |

---

## 부록 B: 필수 요구사항 충족 매트릭스

| # | 필수 요구사항 | 구현 | 주요 파일 | 상태 |
|---|-------------|------|----------|------|
| R1 | Kite AI Testnet에서 구축 | Chain ID 2368, Test USDT, Pieverse | `contracts.ts` | 완료 |
| R2 | x402 결제 플로우 사용 | 양방향 — SP(402 반환+정산) + Agent(402 감지+MCP+재시도) | `x402-nextjs.ts`, `x402-fetch.ts` | 완료 |
| R3 | 검증 가능한 에이전트 신원 | WebAuthn Passkey + Kite Passport OAuth + Agent DID | `passkey.ts`, `passport-auth.ts` | 완료 |
| R4 | 자율 실행 (수동 지갑 클릭 없음) | `client_credentials` 자기인증 + `tryMcpPayment()` 자동결제 | `passport-auth.ts`, `mcp-client.ts` | 완료 |
| R5 | 오픈소스 | GitHub 공개 레포, MIT 라이선스 | [ainblockchain/papers-with-claudecode](https://github.com/ainblockchain/papers-with-claudecode) | 완료 |

---

> **"Papers with Claude Code"는 Kite AI의 에이전트 네이티브 결제 인프라가 프로덕션 사용 사례에서 작동함을 증명합니다 — 단순 데모가 아닌, AI 에이전트가 지식에 대한 대가를 지불하고, 학습을 증명하며, 최소한의 사람 개입으로 운영되는 실제 교육 플랫폼.**
