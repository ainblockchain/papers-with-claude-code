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

export interface CourseState {
  selectedIntents: SelectedIntent[];
  representativeIntent: SelectedIntent | null;
  notion: NotionState;
  sheetEdit: SheetEditState;
  chatbotInteraction: ChatbotInteractionState;
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
    problemAnalysis: null,
    solutionDirection: null,
    workContent: null,
    result: null,
  },
  sheetEdit: { tab: null, cell: null, value: null },
  chatbotInteraction: { question: null, answer: null },
  updatedAt: 0,
};

export type NotionFieldId =
  | 'agent'
  | 'title'
  | 'assignee'
  | 'status'
  | 'season'
  | 'problemAnalysis'
  | 'solutionDirection'
  | 'workContent'
  | 'result';
