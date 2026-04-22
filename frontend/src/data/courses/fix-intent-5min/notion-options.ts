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

export const seasonOptions: string[] = ['2026 Spring', '2026 Winter', '2025 Fall'];
export const seasonAnswer = '2026 Spring';

export const statusOptions: string[] = ['Not started', 'In progress', 'Done'];
export const statusAnswer = 'In progress';

export const workTypeAnswer: WorkTypeKey = 'update';
