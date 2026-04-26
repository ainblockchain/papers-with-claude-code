import type { NotionFieldId } from './course-state';

export type MissionPhase =
  | 'intro'
  | 'dashboard'
  | 'notion'
  | 'quest-clear'
  | 'stage2-page'
  | 'quest-clear-2'
  | 'sheet-edit'
  | 'quest-clear-3'
  | 'chatbot-test'
  | 'stage4-result-page'
  | 'course-complete';

export type SheetPhase =
  | 'add-intent'
  | 'run-intent-script'
  | 'add-triggers'
  | 'run-trigger-script'
  | 'complete';

export interface MissionInput {
  phase: MissionPhase;
  currentFieldId: NotionFieldId | null;
  sheetPhase: SheetPhase | null;
  panelOpen: boolean;
  hasChatbotAnswer: boolean;
  // Stage 3 add-intent sub-phase inputs. `sheetRowFilled` null means no
  // row has been added yet (keep showing the "+ 인텐트 행 추가" nudge).
  // Once the row exists, the object reports per-column fill so the
  // MissionBar + sub-phase QuestModal step through intent → leadSentence
  // → (related-copy | prompt-paste) copy. Undefined at call sites that
  // don't care (outside sheet-edit), treated as null/false.
  sheetRowFilled?: {
    intent: boolean;
    leadSentence: boolean;
    prompt: boolean;
  } | null;
  relatedInfoCopied?: boolean;
  // Stage 4 result-field 3-step mission inputs. Both optional — irrelevant
  // outside the `stage4-result-page` phase with `currentFieldId==='result'`.
  // `workAutoFilled` — has "작업 내용 불러오기" been clicked?
  // `captureVisible` — has "테스트 결과 불러오기" been clicked?
  workAutoFilled?: boolean;
  captureVisible?: boolean;
}

export interface MissionCopy {
  stageLabel: string;
  message: string;
}

// Returns the mission to surface in the persistent MissionBar. Each
// returned message is tuned for a single truncatable line (~ ≤ 70 chars).
// Returns null for orientation / celebration-only phases where the bar
// should be hidden.
//
// quest-clear* branches intentionally preview the NEXT stage's first
// mission: the celebration modal is layered on top, and dismissing it
// advances `phase`, so showing the upcoming mission behind avoids a
// visible swap at the exact moment the modal closes.
export function getMissionCopy(input: MissionInput): MissionCopy | null {
  const {
    phase,
    currentFieldId,
    sheetPhase,
    panelOpen,
    hasChatbotAnswer,
    sheetRowFilled,
    relatedInfoCopied,
    workAutoFilled,
    captureVisible,
  } = input;

  switch (phase) {
    case 'intro':
    case 'course-complete':
      return null;

    case 'dashboard':
      return {
        stageLabel: 'STAGE 1 · 문제 발견',
        message: '문제가 있는 인텐트의 행을 클릭하세요',
      };

    case 'notion':
      if (!panelOpen) {
        return {
          stageLabel: 'STAGE 1 · 이슈 등록',
          message: "노션 페이지 하단에서 '새로 만들기' 버튼으로 Task 를 추가하세요",
        };
      }
      return {
        stageLabel: 'STAGE 1 · 이슈 등록',
        message: getStage1FieldMessage(currentFieldId),
      };

    case 'quest-clear':
      return {
        stageLabel: 'STAGE 2 · 수정 방향',
        message: '어떤 방향으로 고칠지 한 줄 이상 적어 제출하세요',
      };

    case 'stage2-page':
      return {
        stageLabel: 'STAGE 2 · 수정 방향',
        message: '어떤 방향으로 고칠지 한 줄 이상 적어 제출하세요',
      };

    case 'quest-clear-2':
      return {
        stageLabel: 'STAGE 3 · Step 1/4',
        message: '알맞은 탭에서 "+ 인텐트 행 추가"로 행을 만드세요',
      };

    case 'sheet-edit':
      if (sheetPhase === 'complete') {
        return {
          stageLabel: 'STAGE 4 · 검증',
          message: 'Stage 1 문제 발화를 Dev 챗봇에 그대로 입력해 보세요',
        };
      }
      return getSheetEditMission(sheetPhase, sheetRowFilled, relatedInfoCopied);

    case 'quest-clear-3':
      return {
        stageLabel: 'STAGE 4 · 검증',
        message: 'Stage 1 문제 발화를 Dev 챗봇에 그대로 입력해 보세요',
      };

    case 'chatbot-test':
      return hasChatbotAnswer
        ? {
            stageLabel: 'STAGE 4 · 검증',
            message: "'Notion 으로' 버튼을 눌러 결과를 기록하러 가세요",
          }
        : {
            stageLabel: 'STAGE 4 · 검증',
            message: 'Stage 1 문제 발화를 Dev 챗봇에 그대로 입력해 보세요',
          };

    case 'stage4-result-page':
      if (currentFieldId === 'status') {
        return {
          stageLabel: 'STAGE 4 · 마무리',
          message: 'Status 를 Done 으로 바꿔 작업 완료를 표시하세요',
        };
      }
      if (currentFieldId === 'result') {
        // 3-step sub-phase mirror: load work → load capture → submit.
        // Mirrors tooltip-copy.ts so MissionBar + briefing modal stay in
        // lockstep with the tooltip wording for each sub-phase.
        if (!workAutoFilled) {
          return {
            stageLabel: 'STAGE 4 · 마무리',
            message: '"작업 내역 불러오기" 버튼으로 작업 내역을 자동으로 채워주세요',
          };
        }
        if (!captureVisible) {
          return {
            stageLabel: 'STAGE 4 · 마무리',
            message: '"테스트 결과 불러오기" 버튼으로 Dev 챗봇 응답 캡처를 붙여주세요',
          };
        }
        return {
          stageLabel: 'STAGE 4 · 마무리',
          message: '결과에 후기를 한 줄 적고 제출 버튼을 눌러 코스를 마무리하세요',
        };
      }
      return {
        stageLabel: 'STAGE 4 · 마무리',
        message: '작업을 마무리하세요',
      };
  }
}

function getStage1FieldMessage(fieldId: NotionFieldId | null): string {
  switch (fieldId) {
    case 'agent':
      return '알맞은 Agent 를 선택하세요';
    case 'title':
      return '이슈 내용이 드러나는 제목을 한 줄로 작성하세요';
    case 'assignee':
      return '이슈를 맡을 Assignee 를 지정하세요';
    case 'status':
      return '작업의 현재 Status 를 선택하세요';
    case 'season':
      return '이슈가 속할 Season 을 지정하세요';
    case 'workType':
      return '카탈로그에서 유사 인텐트를 먼저 확인하고 수정 유형을 고르세요';
    case 'problemAnalysis':
      return '채팅 로그를 복사해 붙이고 문제를 한 줄로 정리하세요';
    default:
      return '이슈를 정리하며 Task 를 채워주세요';
  }
}

function getSheetEditMission(
  sheetPhase: SheetPhase | null,
  sheetRowFilled?: {
    intent: boolean;
    leadSentence: boolean;
    prompt: boolean;
  } | null,
  relatedInfoCopied?: boolean,
): MissionCopy {
  switch (sheetPhase) {
    case 'add-intent':
      // Step 1 splits into sub-steps once the learner has added the intent
      // row. Each sub-step mirrors the per-sub-phase tooltip copy in
      // `tooltip-copy.ts` so the MissionBar + sub-phase briefing modal
      // walk the learner through intent → leadSentence → related-copy →
      // prompt-paste without drifting back to the stale "+ 인텐트 행
      // 추가" nudge the learner already completed.
      if (!sheetRowFilled) {
        return {
          stageLabel: 'STAGE 3 · Step 1/4',
          message: '알맞은 탭에서 "+ 인텐트 행 추가"로 행을 만드세요',
        };
      }
      if (!sheetRowFilled.intent) {
        return {
          stageLabel: 'STAGE 3 · Step 1/4',
          message: '새 인텐트의 이름을 정해주세요 (예: 출결_공결_시험결석)',
        };
      }
      if (!sheetRowFilled.leadSentence) {
        return {
          stageLabel: 'STAGE 3 · Step 1/4',
          message: '이 인텐트로 매칭될 대표 문장을 한 줄 적어주세요',
        };
      }
      if (!sheetRowFilled.prompt) {
        return relatedInfoCopied
          ? {
              stageLabel: 'STAGE 3 · Step 1/4',
              message: 'Prompt 칸을 클릭해 클립보드 내용을 붙여넣어 주세요',
            }
          : {
              stageLabel: 'STAGE 3 · Step 1/4',
              message:
                '아래 Related Information 의 "복사" 버튼을 눌러 참고 자료를 클립보드에 담아주세요',
            };
      }
      return {
        stageLabel: 'STAGE 3 · Step 1/4',
        message: '알맞은 탭에서 "+ 인텐트 행 추가"로 행을 만드세요',
      };
    case 'run-intent-script':
      return {
        stageLabel: 'STAGE 3 · Step 2/4',
        message: 'Custom Scripts > "Update Intent Prompts (dev)" 를 실행하세요',
      };
    case 'add-triggers':
      return {
        stageLabel: 'STAGE 3 · Step 3/4',
        message: '방금 만든 인텐트에 트리거 문장을 2개 이상 추가하세요',
      };
    case 'run-trigger-script':
      return {
        stageLabel: 'STAGE 3 · Step 4/4',
        message: 'Custom Scripts > "Update Intent Triggers (dev)" 를 실행하세요',
      };
    default:
      return {
        stageLabel: 'STAGE 3 · Dev Sheet',
        message: 'Dev Sheet 에서 인텐트와 트리거 문장을 수정하세요',
      };
  }
}
