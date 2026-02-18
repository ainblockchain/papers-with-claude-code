import { StageConfig } from '@/types/learning';

/**
 * Mock stage data for the BitDance paper (bitdance-2602).
 * 5 stages progressing from foundational concepts to advanced techniques
 * in autoregressive generative models with binary tokens.
 */
export const MOCK_STAGES_BITDANCE: StageConfig[] = [
  {
    id: 'bitdance-stage-1',
    stageNumber: 1,
    title: 'Autoregressive Image Generation Basics',
    concepts: [
      {
        id: 'c1-1',
        title: 'Autoregressive Models for Images',
        content:
          'Autoregressive models generate images one token at a time, predicting each token conditioned on all previously generated tokens. Unlike diffusion models that denoise an entire image simultaneously, autoregressive approaches decompose image generation into a sequential decision process. This enables the use of powerful language-model architectures like transformers for image synthesis, treating visual generation as a next-token prediction task.',
        position: { x: 3, y: 4 },
      },
      {
        id: 'c1-2',
        title: 'Visual Tokenization with VQ-VAE',
        content:
          'Before an autoregressive model can process images, continuous pixel values must be converted into discrete tokens. Vector Quantized Variational Autoencoders (VQ-VAE) accomplish this by encoding image patches into a learned codebook of discrete embeddings. Each patch is mapped to its nearest codebook entry, producing a grid of token indices that the autoregressive model can predict sequentially, similar to words in a sentence.',
        position: { x: 14, y: 9 },
      },
    ],
    quiz: {
      id: 'q1',
      question: 'What is the primary advantage of using autoregressive models for image generation compared to diffusion models?',
      type: 'multiple-choice',
      options: [
        'They always produce higher quality images',
        'They decompose generation into sequential token prediction, enabling use of transformer architectures',
        'They require no training data',
        'They generate all pixels simultaneously for faster inference',
      ],
      correctAnswer: 'They decompose generation into sequential token prediction, enabling use of transformer architectures',
    },
    roomWidth: 20,
    roomHeight: 15,
  },
  {
    id: 'bitdance-stage-2',
    stageNumber: 2,
    title: 'Binary Tokenization Strategy',
    concepts: [
      {
        id: 'c2-1',
        title: 'From Discrete Codebooks to Binary Tokens',
        content:
          'Traditional VQ-VAE uses a large codebook (e.g., 8192 entries) where each token is a single integer index. BitDance instead represents each visual token as a sequence of binary bits. A codebook of size 2^B can be represented by B binary tokens per spatial position. This decomposition dramatically reduces the effective vocabulary size to just 2 (0 and 1), simplifying the prediction task for the autoregressive model while maintaining the same representational capacity.',
        position: { x: 5, y: 3 },
      },
      {
        id: 'c2-2',
        title: 'Benefits of Binary Representation',
        content:
          'Binary tokenization offers several key advantages: (1) The vocabulary size shrinks to 2, making the softmax classification trivial and reducing memory footprint. (2) The model can learn fine-grained correlations between individual bits across spatial positions. (3) Binary tokens enable efficient bitwise operations and compact storage. (4) The approach scales naturally — increasing resolution simply means predicting more binary tokens without changing the vocabulary or model architecture.',
        position: { x: 15, y: 10 },
      },
    ],
    quiz: {
      id: 'q2',
      question: 'How does BitDance represent visual tokens differently from traditional VQ-VAE approaches?',
      type: 'multiple-choice',
      options: [
        'It uses floating point values instead of discrete tokens',
        'It replaces codebook indices with sequences of binary bits, reducing vocabulary size to 2',
        'It eliminates tokenization entirely and works directly on pixels',
        'It uses a much larger codebook with 1 million entries',
      ],
      correctAnswer: 'It replaces codebook indices with sequences of binary bits, reducing vocabulary size to 2',
    },
    roomWidth: 20,
    roomHeight: 15,
  },
  {
    id: 'bitdance-stage-3',
    stageNumber: 3,
    title: 'Diffusion-Based Binary Prediction',
    concepts: [
      {
        id: 'c3-1',
        title: 'Absorbing Diffusion on Binary Tokens',
        content:
          'BitDance employs an absorbing diffusion process on binary tokens. During training, random bits are "absorbed" (masked) according to a noise schedule, and the model learns to predict the original bit values. Unlike Gaussian diffusion used in continuous models, absorbing diffusion naturally handles discrete binary states. The forward process progressively masks bits to a special [MASK] state, while the reverse process iteratively predicts and unmasks them, generating coherent binary token sequences.',
        position: { x: 4, y: 5 },
      },
      {
        id: 'c3-2',
        title: 'Hybrid Autoregressive-Diffusion Architecture',
        content:
          'BitDance combines autoregressive and diffusion paradigms in a hybrid architecture. The model processes tokens in raster-scan order autoregressively (left-to-right, top-to-bottom), but within each spatial position, the binary bits are generated using the diffusion process. This means the model captures long-range spatial dependencies through autoregression while using diffusion to efficiently decode the binary representation at each position, achieving the best of both approaches.',
        position: { x: 14, y: 8 },
      },
    ],
    quiz: {
      id: 'q3',
      question: 'What type of diffusion process does BitDance use for binary token generation?',
      type: 'multiple-choice',
      options: [
        'Gaussian diffusion with continuous noise',
        'Score-based diffusion with Langevin dynamics',
        'Absorbing diffusion where bits are progressively masked and then predicted',
        'Flow matching with optimal transport paths',
      ],
      correctAnswer: 'Absorbing diffusion where bits are progressively masked and then predicted',
    },
    roomWidth: 20,
    roomHeight: 15,
  },
  {
    id: 'bitdance-stage-4',
    stageNumber: 4,
    title: 'Scaling and Efficiency',
    concepts: [
      {
        id: 'c4-1',
        title: 'Computational Efficiency of Binary Prediction',
        content:
          'Predicting binary tokens is computationally cheaper than predicting over large discrete codebooks. The softmax over a vocabulary of 2 requires minimal computation compared to softmax over 8192+ entries. BitDance exploits this by using lightweight prediction heads for each bit position. Combined with the absorbing diffusion process that can unmask multiple bits in parallel during inference, the model achieves significant speedups — up to 3-5x faster generation compared to standard autoregressive approaches at the same resolution.',
        position: { x: 3, y: 7 },
      },
      {
        id: 'c4-2',
        title: 'Scaling Laws for Binary Token Models',
        content:
          'BitDance demonstrates favorable scaling properties: as model size increases (from 300M to 3B parameters), performance improves smoothly and predictably on standard image generation benchmarks (FID, IS). The binary tokenization scheme means the sequence length grows linearly with resolution rather than quadratically, enabling efficient scaling to higher resolutions. The paper shows that binary token models follow similar scaling laws to large language models, suggesting that further scaling will continue to yield improvements.',
        position: { x: 15, y: 4 },
      },
    ],
    quiz: {
      id: 'q4',
      question: 'Why is BitDance more computationally efficient during inference than standard autoregressive image models?',
      type: 'multiple-choice',
      options: [
        'It uses a smaller transformer architecture with fewer layers',
        'Binary vocabulary (size 2) makes softmax trivial, and absorbing diffusion enables parallel bit unmasking',
        'It skips the tokenization step entirely',
        'It generates images at lower resolution and upsamples afterward',
      ],
      correctAnswer: 'Binary vocabulary (size 2) makes softmax trivial, and absorbing diffusion enables parallel bit unmasking',
    },
    roomWidth: 20,
    roomHeight: 15,
  },
  {
    id: 'bitdance-stage-5',
    stageNumber: 5,
    title: 'Results and Applications',
    concepts: [
      {
        id: 'c5-1',
        title: 'Benchmark Performance and Comparisons',
        content:
          'BitDance achieves state-of-the-art results on ImageNet 256x256 generation with an FID score competitive with leading diffusion and autoregressive models. The model reaches an FID of approximately 2.5 while being significantly faster at inference. Compared to approaches like DALL-E (discrete tokens, large codebook) and LlamaGen (continuous tokens), BitDance demonstrates that binary tokenization does not sacrifice quality. The paper also shows strong results on higher resolutions (512x512) where the efficiency gains become even more pronounced.',
        position: { x: 5, y: 4 },
      },
      {
        id: 'c5-2',
        title: 'Future Directions and Multi-Modal Extension',
        content:
          'The binary token paradigm opens exciting future directions: (1) Unified multi-modal generation where text, images, and audio are all represented as binary sequences, enabling a single model architecture. (2) Extreme compression for efficient storage and transmission of generated content. (3) Hardware-optimized inference on binary-native accelerators. (4) Extension to video generation where the temporal dimension adds even more tokens, making the efficiency of binary representation critical. BitDance establishes binary tokenization as a viable foundation for next-generation generative AI systems.',
        position: { x: 14, y: 10 },
      },
    ],
    quiz: {
      id: 'q5',
      question: 'What FID-level performance does BitDance achieve on ImageNet 256x256, and what is a key advantage over existing methods?',
      type: 'multiple-choice',
      options: [
        'FID ~10.0, advantage is simpler training procedure',
        'FID ~2.5, advantage is competitive quality with significantly faster inference',
        'FID ~0.1, advantage is perfect image reconstruction',
        'FID ~50.0, advantage is that it works without GPUs',
      ],
      correctAnswer: 'FID ~2.5, advantage is competitive quality with significantly faster inference',
    },
    roomWidth: 20,
    roomHeight: 15,
  },
];
