export interface PasskeyCredential {
  credentialId: string;
  publicKey: string; // hex-encoded compressed P256 public key
  ainAddress: string;
  createdAt: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ExplorationInput {
  topicPath: string;
  title: string;
  content: string;
  summary: string;
  depth: number;
  tags: string[];
  parentEntry?: {
    ownerAddress: string;
    topicPath: string;
    entryId: string;
  };
  relatedEntries?: Array<{
    ownerAddress: string;
    topicPath: string;
    entryId: string;
    type?: string;
  }>;
}

export interface GraphNode {
  id: string;
  address: string;
  topic_path: string;
  entry_id: string;
  title: string;
  depth: number;
  created_at: number;
  content?: string;
  summary?: string;
  tags?: string[];
}

export interface GraphEdge {
  type: 'extends' | 'related' | 'prerequisite';
  created_at: number;
  created_by: string;
}

export interface TopicStats {
  explorer_count: number;
  max_depth: number;
  avg_depth: number;
}

export interface FrontierMapEntry {
  topicPath: string;
  explorer_count: number;
  max_depth: number;
  avg_depth: number;
}

export interface TopicInfo {
  title: string;
  description: string;
  subtopics?: Record<string, any>;
}

export interface ExplorationEntry {
  entryId: string;
  title: string;
  depth: number;
  summary: string;
  content?: string;
  created_at: number;
  tags?: string[];
}

export interface AccessReceipt {
  key: string;
  seller: string;
  topicPath: string;
  entryId: string;
  amount: string;
  currency: string;
  accessedAt: number;
}

export interface LearnerProgress {
  address: string;
  totalTopics: number;
  totalEntries: number;
  totalPurchases: number;
  topics: Array<{
    topicPath: string;
    entryCount: number;
    maxDepth: number;
    entries: Array<{
      entryId: string;
      nodeId?: string;
      title: string;
      depth: number;
      summary: string;
      price: string | null;
      createdAt: number;
      connections?: Array<{ nodeId: string; type: string }>;
    }>;
  }>;
  purchases: Array<{
    key: string;
    seller: string;
    topicPath: string;
    entryId: string;
    amount: string;
    currency: string;
    accessedAt: number;
  }>;
}
