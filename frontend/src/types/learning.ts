export interface Concept {
  id: string;
  title: string;
  content: string;
  position: { x: number; y: number };
}

export interface Quiz {
  id: string;
  question: string;
  type: 'multiple-choice' | 'code-challenge' | 'free-response';
  options?: string[];
  correctAnswer?: string;
}

export interface StageConfig {
  id: string;
  stageNumber: number;
  title: string;
  concepts: Concept[];
  quiz: Quiz;
  roomWidth: number;
  roomHeight: number;
}

export interface UserProgress {
  paperId: string;
  currentStage: number;
  totalStages: number;
  completedStages: { stageNumber: number; completedAt: string; quizScore?: number }[];
  lastAccessedAt: string;
}

export interface StageContext {
  paperId: string;
  paperTitle: string;
  stageNumber: number;
  stageTitle: string;
  concepts: Concept[];
}
