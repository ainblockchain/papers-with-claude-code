/** Event types for blockchain location tracking */

export type EventType =
  | 'village_enter'
  | 'course_enter'
  | 'stage_enter'
  | 'stage_complete'
  | 'course_complete'
  | 'concept_view'
  | 'quiz_pass'
  | 'heartbeat';

interface BaseEvent {
  type: EventType;
  timestamp: number;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface VillageEvent extends BaseEvent {
  type: 'village_enter' | 'heartbeat';
  scene: 'village';
}

export interface CourseEnterEvent extends BaseEvent {
  type: 'course_enter';
  scene: 'village';
  paperId: string;
}

export interface CourseEvent extends BaseEvent {
  type: 'stage_enter' | 'stage_complete' | 'course_complete' | 'concept_view' | 'quiz_pass';
  scene: 'course';
  paperId: string;
  stageIndex: number;
  conceptId?: string;
  stageTitle?: string;
}

export type LocationEvent = VillageEvent | CourseEnterEvent | CourseEvent;

/** Events that should also be written to the knowledge graph */
export const LEARNING_EVENT_TYPES: EventType[] = [
  'course_enter',
  'stage_enter',
  'concept_view',
  'quiz_pass',
  'stage_complete',
  'course_complete',
];
