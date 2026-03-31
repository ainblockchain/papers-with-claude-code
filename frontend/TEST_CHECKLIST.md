# Test Checklist — Learning Progress & Blockchain

## 1. 코스 진입 & 대시보드 표시
- [ ] 새 코스 첫 진입 → 대시보드 Active Courses에 표시
- [ ] 코스 진입 후 퀴즈 안 풀고 나감 → 대시보드에 표시
- [ ] 코스 진입 후 퀴즈 풀고 나감 → 대시보드에 표시
- [ ] 결제/skip 후 다음 스테이지 진입 후 나감 → 대시보드에 표시
- [ ] explore에서 purchase/skip → 학습환경 진입 → exit → 대시보드에 표시
- [ ] explore 진입 시 `POST /api/topics/register` 500 폭탄 없음 (이미 등록된 토픽 skip)

## 2. Resume (나갔다 돌아오기)
- [ ] 퀴즈 통과한 스테이지로 resume → 퀴즈 다시 안 뜸, portal 소용돌이
- [ ] 결제/skip한 스테이지로 resume → portal 소용돌이, "Enter Stage N →" 버튼 표시
- [ ] 퀴즈만 통과하고 결제 안 한 상태로 resume → portal 소용돌이, E 누르면 결제 모달
- [ ] 아무것도 안 한 스테이지로 resume → portal 빨간 X, E 누르면 퀴즈

## 3. 결제(unlock) 블록체인 기록
- [ ] x402 결제 성공 → 블록체인에 `stage_unlock` (depth=1) 기록
- [ ] skip 클릭 → 블록체인에 `stage_unlock` (depth=1, paymentMethod=skip) 기록
- [ ] free unlock (에러 후 fallback) → 블록체인에 `stage_unlock` 기록
- [ ] 이미 unlock한 스테이지 재방문 → 중복 `stage_unlock` 기록 안 됨

## 4. 중복 기록 방지
- [ ] 같은 스테이지 재진입 → `stage_enter` 중복 기록 안 됨
- [ ] 같은 스테이지 퀴즈 재통과 → `stage_complete` 중복 기록 안 됨
- [ ] 같은 스테이지 재결제/re-skip → `stage_unlock` 중복 기록 안 됨

## 5. 대시보드 진도 표시
- [ ] completedStages 기준으로 "Stage X/Y" 표시 (enter 기준 아님)
- [ ] progress bar가 completedStages/totalStages 비율
- [ ] Stages Cleared 총합이 completedStages 합계
- [ ] 코스 전체 완료 시 Completed Courses 섹션으로 이동

## 6. Identity 복구
- [ ] localStorage 삭제 후 /login → 블록체인에서 identity 복구 → 기존 지갑 주소 유지
- [ ] 복구 후 대시보드에 기존 학습 데이터 표시

## 7. Streak
- [ ] 어제 + 오늘 활동 → streak 2 days
- [ ] 오늘만 활동 → streak 1 day
- [ ] 어제 활동, 오늘 미활동 → streak 1 day (grace period)

## 8. Portal 시각 상태
- [ ] 퀴즈 미통과 → 빨간 X
- [ ] 퀴즈 통과 (결제 전 포함) → 시안 소용돌이
- [ ] 결제 완료 → 시안 소용돌이
