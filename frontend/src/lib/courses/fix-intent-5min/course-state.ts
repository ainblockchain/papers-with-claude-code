export interface IntentRow {
  sessionId: string;
  createdAt: string;
  intent: string;
  userMessage: string;
  assistantContent: string;
}

export interface SelectedIntent {
  setId: string;
  row: IntentRow;
}

export interface NotionState {
  agent: string | null;
  title: string | null;
  assignee: string | null;
  status: string | null;
  season: string | null;
  workType: string | null;
  problemAnalysis: string | null;
  solutionDirection: string | null;
  workContent: string | null;
  result: string | null;
}

export interface SheetEditState {
  tab: string | null;
  cell: string | null;
  value: string | null;
}

export interface ChatbotInteractionState {
  question: string | null;
  answer: string | null;
}

// Detail captured at Stage 3 completion so Stage 4 can auto-fill the
// result block with the exact intent row + trigger sentences the learner
// wrote. Persisted to blockchain alongside workContent so a cross-session
// reload can still render the auto-fill blocks.
export interface SheetArtifact {
  addedIntent: {
    sheetId: string;
    intent: string;
    leadSentence: string;
    prompt: string;
    createdAt: string;
  };
  triggers: { intent: string; sentence: string }[];
  snapshotAt: number;
}

export interface CourseState {
  selectedIntents: SelectedIntent[];
  representativeIntent: SelectedIntent | null;
  notion: NotionState;
  sheetEdit: SheetEditState;
  chatbotInteraction: ChatbotInteractionState;
  sheetArtifact: SheetArtifact | null;
  updatedAt: number;
}

export const initialCourseState: CourseState = {
  selectedIntents: [],
  representativeIntent: null,
  notion: {
    agent: null,
    title: null,
    assignee: null,
    status: null,
    season: null,
    workType: null,
    problemAnalysis: null,
    solutionDirection: null,
    workContent: null,
    result: null,
  },
  sheetEdit: { tab: null, cell: null, value: null },
  chatbotInteraction: { question: null, answer: null },
  sheetArtifact: null,
  updatedAt: 0,
};

export type NotionFieldId =
  | 'agent'
  | 'title'
  | 'assignee'
  | 'status'
  | 'season'
  | 'workType'
  | 'problemAnalysis'
  | 'solutionDirection'
  | 'workContent'
  | 'result';
