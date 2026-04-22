// TODO: replace placeholders with real option sets provided by the user.

import type { WorkTypeKey } from './work-types';

export const agentOptions: string[] = [
  '🎯 AIN Space | Uncommon Village',
  '💪 Inbody 버디',
  '🎯 Unblock Media 기자10인',
  '🧑‍🍳 Walkerhill AI Guide',
  '🎯 Walkerhill WISE',
  '🤵 Walkerhill 해리스',
  '🦁 궁금하냥',
  '😈 깨비',
  '👩‍💼 동아사이언스 SEO',
  '🎯 한양 스페이스 관리자(챗봇 Intent Manager Agent)',
];
export const agentAnswer = '🦁 궁금하냥';

// Distractor assignees — uncommon Korean given names written in English.
// The logged-in user's GitHub ID is prepended at render time; the correct
// answer is "this row equals the user's own GitHub ID" (see validate.ts).
export const assigneeOptions: string[] = [
  'Haram Baek',
  'Saebit Ryu',
  'Gyeol Seo',
];

// Shared hint for any "wrong person" pick. The lesson context is: if someone
// else were fixing the issue you reported, picking them would be fine —
// but here you're about to fix it yourself, so Assignee should be you.
export const assigneeHint =
  'Assignee 를 다른 사람으로 지정하면 그 사람이 이 이슈를 맡아 수정하는 상황이에요. 지금은 본인이 직접 고칠 참이니, Assignee 는 본인으로 지정해주세요.';

export const seasonOptions: string[] = ['2026 Spring', '2026 Winter', '2025 Fall'];
export const seasonAnswer = '2026 Spring';

export const statusOptions: string[] = [
  'Not Started',
  'In Progress',
  'Revisions Requested',
  'Done',
  'Prod Launch',
  'Close',
];
export const statusAnswer = 'In Progress';

// Per-option hint surfaced when the learner picks a wrong status. Each
// message explains what that status actually means so the user can reason
// toward "I'm about to start the fix now" → In Progress.
export const statusHints: Record<string, string> = {
  'Not Started':
    'Not Started 는 이슈를 기록만 하고 수정 작업은 아직 시작하지 않은 상태예요. 지금은 이슈를 발견해서 직접 수정을 시작할 참이니, 작업 중임을 나타내는 상태를 골라주세요.',
  'Revisions Requested':
    'Revisions Requested 는 PM이 완료된 수정에 보완을 요청한 상태예요. 아직 처음 작업을 시작하는 시점이라 맞지 않아요. 작업을 시작한다는 의미의 상태가 필요합니다.',
  Done: 'Done 은 수정 작업을 모두 마쳤을 때 선택해요. 지금은 아직 작업을 시작하기 전이니까, 작업을 막 시작할 때 어울리는 상태를 골라보세요.',
  'Prod Launch':
    'Prod Launch 는 PM이 운영 환경에 반영까지 마친 최종 상태예요. 지금은 Dev 에서 수정을 시작할 참이라 맞지 않아요. 먼저 수정 중임을 나타내는 상태가 필요해요.',
  Close:
    'Close 는 이슈를 수정하지 않기로 결정했을 때 선택해요. 우리는 수정 작업을 진행할 거니까, 작업을 시작한다는 의미의 상태를 골라주세요.',
};

export const workTypeAnswer: WorkTypeKey = 'update';
