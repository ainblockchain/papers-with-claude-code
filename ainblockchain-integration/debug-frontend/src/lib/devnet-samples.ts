/**
 * Predefined constants for the AIN devnet debug frontend.
 * Includes known accounts, genesis papers, sample explorations, and debug paths.
 */

// --- Provider URLs ---
export const DEVNET_PROVIDER_URL = 'https://devnet-api.ainetwork.ai';
export const LOCALHOST_PROVIDER_URL = 'http://localhost:8081';

// --- Known Accounts ---
export const ADDR1 = '0x00ADEc28B6a845a085e03591bE7550dd68673C1C'; // Genesis papers owner
export const ADDR1_PK = 'b22c95ffc4a5c096f7d7d0487ba963ce6ac945bdc91c79b64ce209de289bec96';
export const ADDR2 = '0x01A0980d2B06EDcD52F1E513c1e0c1e8e35c35a4'; // Second test account
export const ADDR2_PK = '865aaa010be6ab719034bfabc7e29eb5f47d31414856605a1f7a7af0fcf4dd13';

export interface GenesisPaper {
  title: string;
  topicPath: string;
  entryId: string;
  ownerAddress: string;
}

// --- 14 Genesis Papers seeded on devnet ---
export const GENESIS_PAPERS: GenesisPaper[] = [
  {
    title: 'Attention Is All You Need (Transformer)',
    topicPath: 'ai/transformers/attention',
    entryId: 'transformer_2017',
    ownerAddress: ADDR1,
  },
  {
    title: 'GPT-1: Improving Language Understanding',
    topicPath: 'ai/transformers/decoder-only',
    entryId: 'gpt1_2018',
    ownerAddress: ADDR1,
  },
  {
    title: 'BERT: Pre-training of Deep Bidirectional Transformers',
    topicPath: 'ai/transformers/encoder-only',
    entryId: 'bert_2018',
    ownerAddress: ADDR1,
  },
  {
    title: 'Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context',
    topicPath: 'ai/transformers/decoder-only',
    entryId: 'transformer_xl_2019',
    ownerAddress: ADDR1,
  },
  {
    title: 'GPT-2: Language Models are Unsupervised Multitask Learners',
    topicPath: 'ai/transformers/decoder-only',
    entryId: 'gpt2_2019',
    ownerAddress: ADDR1,
  },
  {
    title: 'RoBERTa: A Robustly Optimized BERT Pretraining Approach',
    topicPath: 'ai/transformers/encoder-only',
    entryId: 'roberta_2019',
    ownerAddress: ADDR1,
  },
  {
    title: 'XLNet: Generalized Autoregressive Pretraining',
    topicPath: 'ai/transformers/encoder-only',
    entryId: 'xlnet_2019',
    ownerAddress: ADDR1,
  },
  {
    title: 'T5: Exploring Transfer Learning with a Unified Text-to-Text Transformer',
    topicPath: 'ai/transformers/encoder-decoder',
    entryId: 't5_2019',
    ownerAddress: ADDR1,
  },
  {
    title: 'ViT: An Image is Worth 16x16 Words',
    topicPath: 'ai/transformers/vision',
    entryId: 'vit_2020',
    ownerAddress: ADDR1,
  },
  {
    title: 'GPT-3: Language Models are Few-Shot Learners',
    topicPath: 'ai/transformers/decoder-only',
    entryId: 'gpt3_2020',
    ownerAddress: ADDR1,
  },
  {
    title: 'CLIP: Learning Transferable Visual Models From Natural Language Supervision',
    topicPath: 'ai/transformers/vision',
    entryId: 'clip_2021',
    ownerAddress: ADDR1,
  },
  {
    title: 'LLaMA: Open and Efficient Foundation Language Models',
    topicPath: 'ai/transformers/decoder-only',
    entryId: 'llama_2023',
    ownerAddress: ADDR1,
  },
  {
    title: 'Mistral 7B',
    topicPath: 'ai/transformers/decoder-only',
    entryId: 'mistral_2023',
    ownerAddress: ADDR1,
  },
  {
    title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
    topicPath: 'ai/state-space-models',
    entryId: 'mamba_2023',
    ownerAddress: ADDR1,
  },
];

export interface SampleExploration {
  label: string;
  topicPath: string;
  title: string;
  content: string;
  summary: string;
  depth: number;
  tags: string;
  parentEntry?: { ownerAddress: string; topicPath: string; entryId: string };
  relatedEntries?: { ownerAddress: string; topicPath: string; entryId: string; type: string }[];
}

// --- 7 Sample Explorations with parent/related entries ---
export const SAMPLE_EXPLORATIONS: SampleExploration[] = [
  {
    label: 'Multi-Head Attention Deep Dive',
    topicPath: 'ai/transformers/attention',
    title: 'Multi-Head Attention: Mechanisms and Variants',
    content: 'A deep dive into multi-head attention, exploring how parallel attention heads capture different relationship types in sequence data. Covers scaled dot-product attention, cross-attention, and efficient variants like linear attention.',
    summary: 'Deep analysis of multi-head attention mechanisms and their variants',
    depth: 4,
    tags: 'attention, multi-head, scaled-dot-product, cross-attention',
    parentEntry: { ownerAddress: ADDR1, topicPath: 'ai/transformers/attention', entryId: 'transformer_2017' },
  },
  {
    label: 'GPT-4 and Scaling Laws',
    topicPath: 'ai/transformers/decoder-only',
    title: 'GPT-4 and the Implications of Scaling Laws',
    content: 'Examines how GPT-4 validates and extends scaling laws observed in GPT-3. Discusses emergent capabilities, instruction following, and multimodal understanding as consequences of scale.',
    summary: 'Analysis of GPT-4 scaling behavior building on GPT-3 foundations',
    depth: 3,
    tags: 'gpt-4, scaling-laws, emergent-capabilities',
    parentEntry: { ownerAddress: ADDR1, topicPath: 'ai/transformers/decoder-only', entryId: 'gpt3_2020' },
    relatedEntries: [
      { ownerAddress: ADDR1, topicPath: 'ai/transformers/decoder-only', entryId: 'llama_2023', type: 'related' },
    ],
  },
  {
    label: 'BERT vs GPT Paradigms',
    topicPath: 'ai/transformers/encoder-only',
    title: 'Bidirectional vs Autoregressive: BERT and GPT Paradigms Compared',
    content: 'A comparative study of the two dominant pretraining paradigms: BERT\'s masked language modeling (bidirectional) vs GPT\'s autoregressive approach (unidirectional). Analyzes trade-offs for different downstream tasks.',
    summary: 'Comparison of BERT bidirectional and GPT autoregressive paradigms',
    depth: 3,
    tags: 'bert, gpt, pretraining, masked-lm, autoregressive',
    parentEntry: { ownerAddress: ADDR1, topicPath: 'ai/transformers/encoder-only', entryId: 'bert_2018' },
    relatedEntries: [
      { ownerAddress: ADDR1, topicPath: 'ai/transformers/decoder-only', entryId: 'gpt1_2018', type: 'related' },
    ],
  },
  {
    label: 'ViT to CLIP Bridge',
    topicPath: 'ai/transformers/vision',
    title: 'From ViT to CLIP: Bridging Vision and Language',
    content: 'Traces the evolution from Vision Transformer (ViT) to CLIP, showing how contrastive learning on image-text pairs created a powerful multimodal foundation. Covers zero-shot transfer and emergent alignment.',
    summary: 'Evolution path from ViT to CLIP multimodal understanding',
    depth: 2,
    tags: 'vit, clip, vision-language, contrastive-learning',
    parentEntry: { ownerAddress: ADDR1, topicPath: 'ai/transformers/vision', entryId: 'vit_2020' },
    relatedEntries: [
      { ownerAddress: ADDR1, topicPath: 'ai/transformers/vision', entryId: 'clip_2021', type: 'prerequisite' },
    ],
  },
  {
    label: 'Mamba vs Transformers',
    topicPath: 'ai/state-space-models',
    title: 'Mamba and the Case Against Attention',
    content: 'Explores Mamba\'s selective state space approach as an alternative to transformer attention. Compares linear-time complexity vs quadratic attention, analyzing when SSMs outperform transformers and vice versa.',
    summary: 'Comparison of Mamba SSM approach vs transformer attention',
    depth: 2,
    tags: 'mamba, ssm, state-space, linear-attention, efficiency',
    parentEntry: { ownerAddress: ADDR1, topicPath: 'ai/state-space-models', entryId: 'mamba_2023' },
    relatedEntries: [
      { ownerAddress: ADDR1, topicPath: 'ai/transformers/attention', entryId: 'transformer_2017', type: 'related' },
    ],
  },
  {
    label: 'Fine-tuning GPT-2',
    topicPath: 'ai/transformers/decoder-only',
    title: 'Practical Fine-tuning of GPT-2 for Domain-Specific Tasks',
    content: 'A practical guide to fine-tuning GPT-2 for domain-specific text generation. Covers LoRA, prefix tuning, and full fine-tuning approaches with comparison of efficiency and quality.',
    summary: 'Practical fine-tuning techniques for GPT-2',
    depth: 2,
    tags: 'gpt-2, fine-tuning, lora, prefix-tuning',
    parentEntry: { ownerAddress: ADDR1, topicPath: 'ai/transformers/decoder-only', entryId: 'gpt2_2019' },
    relatedEntries: [
      { ownerAddress: ADDR1, topicPath: 'ai/transformers/decoder-only', entryId: 'mistral_2023', type: 'related' },
    ],
  },
  {
    label: 'BERT for Dense Retrieval',
    topicPath: 'ai/transformers/encoder-only',
    title: 'BERT-based Dense Retrieval and Semantic Search',
    content: 'Explores how BERT\'s bidirectional representations enable dense passage retrieval. Covers DPR, sentence-BERT, and contrastive fine-tuning for semantic similarity.',
    summary: 'Using BERT for dense retrieval and semantic search',
    depth: 2,
    tags: 'bert, dense-retrieval, semantic-search, dpr',
    parentEntry: { ownerAddress: ADDR1, topicPath: 'ai/transformers/encoder-only', entryId: 'bert_2018' },
    relatedEntries: [
      { ownerAddress: ADDR1, topicPath: 'ai/transformers/encoder-only', entryId: 'roberta_2019', type: 'related' },
      { ownerAddress: ADDR1, topicPath: 'ai/transformers/encoder-only', entryId: 'xlnet_2019', type: 'related' },
    ],
  },
];

// --- Debug Paths for quick-fill in debug inspector ---
export const DEBUG_PATHS = [
  '/apps/knowledge',
  '/apps/knowledge/topics',
  '/apps/knowledge/topics/ai',
  '/apps/knowledge/topics/ai/transformers',
  '/apps/knowledge/topics/ai/transformers/attention',
  '/apps/knowledge/topics/ai/transformers/decoder-only',
  '/apps/knowledge/topics/ai/transformers/encoder-only',
  '/apps/knowledge/topics/ai/transformers/vision',
  '/apps/knowledge/topics/ai/state-space-models',
  '/apps/knowledge/explorations',
  `/apps/knowledge/explorations/${ADDR1}`,
  '/apps/knowledge/graph',
  '/apps/knowledge/graph/nodes',
  '/apps/knowledge/graph/edges',
  '/apps/knowledge/access',
  '/apps/knowledge/frontier',
];
