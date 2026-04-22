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

// Season labels mirror the real Notion database. The one currently
// tagged "진행중" is the correct answer — this Task is being filed
// *now*, so it belongs to whichever season is live.
export const seasonOptions: string[] = [
  '2-5(4/2~4/22)진행중',
  '2-4(3/12~4/1)',
  '2-3(2/19~3/11)',
  '2-2(1/29~2/18)',
  '2-1(1/2~1/28)',
  '1-5 (2025 12/11~1/1)',
  '1-4 (2025 11/27~12/10)',
  '1-3 (2025 11/13~11/26)',
  '1-2 (2025 10/30~11/12)',
  '1-1 (2025 10/15~10/29)',
  '0 시범운영 (9/4~10/1)',
];
export const seasonAnswer = '2-5(4/2~4/22)진행중';

// Per-option nudge shown when the learner picks a non-current season.
// Name the picked season's window and point back toward "now" without
// naming the correct label — learners should rescan the option list
// and spot which season is currently live.
export const seasonHints: Record<string, string> = {
  '2-4(3/12~4/1)':
    '2-4 시즌은 4/1에 끝난 바로 직전 시즌이에요. 이 Task는 지금 이슈를 발견해 기록하는 중이니, 오늘 시점이 어느 시즌 구간에 속하는지 옵션을 다시 살펴보세요.',
  '2-3(2/19~3/11)':
    '2-3 시즌은 3/11에 종료된 시즌이에요. 이슈를 기록하는 지금 시점이 어느 구간에 속하는지 다시 확인해보세요.',
  '2-2(1/29~2/18)':
    '2-2 시즌은 2월 중순에 이미 끝난 시즌이에요. 오늘 기록되고 있는 이 Task가 해당하는 시즌을 찾아보세요.',
  '2-1(1/2~1/28)':
    '2-1 시즌은 연초에 끝난 시즌이에요. 지금 이 시점이 어느 시즌에 속하는지 옵션 목록을 다시 훑어보세요.',
  '1-5 (2025 12/11~1/1)':
    '1-5 는 작년 말에 끝난 시즌이에요. 이 Task는 지금 기록되고 있으니, 현재 시점에 맞는 시즌을 찾아보세요.',
  '1-4 (2025 11/27~12/10)':
    '1-4 는 작년에 끝난 시즌이에요. 지금 시점의 이슈를 어느 시즌에 기록해야 할지 다시 확인해보세요.',
  '1-3 (2025 11/13~11/26)':
    '1-3 는 작년에 끝난 시즌이에요. 지금 이 Task가 기록되는 시점이 어느 시즌에 속하는지 살펴보세요.',
  '1-2 (2025 10/30~11/12)':
    '1-2 는 작년에 끝난 시즌이에요. 이 이슈를 기록하는 시점이 어느 시즌에 속하는지 찾아보세요.',
  '1-1 (2025 10/15~10/29)':
    '1-1 은 작년 가을에 끝난 시즌이에요. 지금 시점에 맞는 시즌을 골라주세요.',
  '0 시범운영 (9/4~10/1)':
    '시범운영은 서비스 초기 베타 시기의 라벨이에요. 정식 운영 중인 지금 시점에 해당하는 시즌을 옵션 목록에서 찾아보세요.',
};

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

// Multi-select answer — both keys must be present.
// - newIntent: 결시/병결 인텐트가 지금 시스템에 없으니 신규 생성이 필요
// - add:       방금 만든 인텐트에 유저 발화("시험 못보면 어떻게 되는거야")를
//              트리거 문장으로 등록해야 분류기가 그 인텐트로 라우팅
export const workTypeAnswer: readonly WorkTypeKey[] = ['newIntent', 'add'];

// Per-key hint surfaced when the learner *picks a wrong key*. Each
// sentence explains what that work type actually means and why it
// doesn't fit this case, without naming the correct answer labels so
// the learner still has to figure out the right combination.
export const workTypeHints: Record<WorkTypeKey, string> = {
  // 'add' / 'newIntent' are the correct keys, so these hints are never
  // surfaced from the "wrong key" branch. They're kept for symmetry
  // and in case future code paths reference them.
  add: 'Add Triggering Sentence 는 인텐트에 유저 발화(트리거 문장)를 연결하는 작업이에요.',
  newIntent:
    'New Intent 는 주제 자체가 시스템에 없을 때 인텐트를 새로 만드는 작업이에요.',
  update:
    'Update Intent 는 이미 존재하는 인텐트의 프롬프트를 보강하는 작업이에요. 이번 케이스에서는 기존 인텐트를 다듬는 것이 핵심이 아니라, 현재 답변이 아예 갈 곳이 없어서 엉뚱한 인텐트로 떨어지고 있는 상황이라는 점을 다시 살펴보세요.',
  newIntentDev:
    'New Intent+Dev 는 인텐트 신설에 더해 답변 생성 로직까지 개발해야 할 때 선택해요. 이 이슈는 분류만 바로잡으면 되는 수준이라 여기엔 맞지 않아요.',
  sql: 'SQL/Workflow 는 데이터 쿼리나 업무 워크플로를 손보는 작업이에요. 이번 이슈는 인텐트 정의·범위 문제라 데이터 파이프라인 쪽이 아닙니다.',
  bug: 'Bug Report/QA 는 코드 결함이나 QA에서 발견된 버그를 다룰 때 선택해요. 지금은 분류기가 고장난 게 아니라 인텐트 설계 구조 문제라 결이 달라요.',
};

// When only SOME of the required keys are picked, surface a nudge that
// hints toward the missing piece WITHOUT naming it. Key = the selected
// required key the learner already got right; value = a question that
// walks them toward what's still missing. The missing key's label must
// NOT appear verbatim in these strings.
export const workTypeNextHints: Partial<Record<WorkTypeKey, string>> = {
  newIntent:
    '인텐트를 새로 만든 것만으로는 분류기가 유저 질문을 그 인텐트로 자동으로 보내주지 않아요. 실제 유저 발화와 방금 만든 인텐트를 이어 줄 작업이 하나 더 필요해요. 어떤 유형이 여기에 해당할까요?',
  add: '트리거 문장을 어딘가에 붙이려면, 붙일 대상이 먼저 존재해야 해요. 이 케이스에서는 해당 주제 인텐트가 아직 없다는 점을 떠올려 보세요. 먼저 해야 할 작업이 무엇일까요?',
};
