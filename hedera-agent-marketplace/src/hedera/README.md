# hedera/

Hedera 테스트넷 연동 모듈 — HCS/HTS 트랜잭션 실행 및 에스크로 인프라 관리

## 파일 구조

| 파일 | 역할 |
|------|------|
| `context.ts` | 공유 인터페이스(`HederaContext`, `AgentAccount`, `HCSMessage`) + 클라이언트 초기화 + 계정 생성 |
| `hcs.ts` | HCS (Hedera Consensus Service) — 토픽 생성, 메시지 게시/조회 |
| `hts.ts` | HTS (Hedera Token Service) — 토큰 생성, Association, 전송, 잔액 조회 |
| `escrow.ts` | 에스크로 해제 + 마켓플레이스 인프라 셋업 (계정·토큰·토픽 일괄 프로비저닝) |
| `utils.ts` | HashScan 탐색기 URL 생성 유틸 |
| `client.ts` | Barrel re-export — 외부 import 경로(`hedera/client.js`) 호환 유지 |

## 의존성 그래프

```
utils.ts        ← 독립
context.ts      ← 독립 (@hashgraph/sdk)
hcs.ts          ← context.ts
hts.ts          ← context.ts
escrow.ts       ← context.ts + hcs.ts + hts.ts + types/marketplace.ts
client.ts       ← 모든 서브모듈 re-export (로직 없음)
```

## 외부에서 import하는 법

기존과 동일하게 `hedera/client.js`에서 import하면 됩니다:

```typescript
import { createContext, createTopic, submitMessage } from './hedera/client.js';
```
