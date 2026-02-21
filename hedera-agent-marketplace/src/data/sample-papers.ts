// 샘플 논문 데이터 — 실제 환경에서는 LLM이 동적으로 추출
// 현재는 데모용 하드코딩 데이터

export interface KnowledgeNode {
  id: string;
  concept: string;
  description: string;
  connections: string[];
  confidence: number;
}

export interface PaperData {
  title: string;
  nodes: KnowledgeNode[];
}

export const SAMPLE_PAPERS: Record<string, PaperData> = {
  'attention-is-all-you-need': {
    title: 'Attention Is All You Need (Vaswani et al., 2017)',
    nodes: [
      {
        id: 'self-attention',
        concept: 'Self-Attention Mechanism',
        description: 'Each token attends to every other token in the sequence.',
        connections: ['multi-head-attention', 'scaled-dot-product'],
        confidence: 0.95,
      },
      {
        id: 'multi-head-attention',
        concept: 'Multi-Head Attention',
        description: 'Parallel attention with different learned projections.',
        connections: ['self-attention', 'transformer-encoder'],
        confidence: 0.93,
      },
      {
        id: 'positional-encoding',
        concept: 'Positional Encoding',
        description: 'Sinusoidal functions inject sequence order information.',
        connections: ['transformer-encoder'],
        confidence: 0.91,
      },
    ],
  },
  'bert': {
    title: 'BERT: Pre-training of Deep Bidirectional Transformers (Devlin et al., 2019)',
    nodes: [
      {
        id: 'masked-lm',
        concept: 'Masked Language Modeling',
        description: 'Randomly mask tokens and predict them, enabling bidirectional context.',
        connections: ['pre-training', 'fine-tuning'],
        confidence: 0.94,
      },
      {
        id: 'nsp',
        concept: 'Next Sentence Prediction',
        description: 'Binary classification: is sentence B the actual next sentence?',
        connections: ['pre-training'],
        confidence: 0.88,
      },
    ],
  },
};
