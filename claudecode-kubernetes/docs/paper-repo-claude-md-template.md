# Paper Repo CLAUDE.md Authoring Guide

Adding this file to a paper repo enables it to be used as a dungeon-style learning course on the Papers with Claude Code platform.

## File Structure

CLAUDE.md consists of two parts:
1. **JSON metadata block** (automatically parsed by the platform)
2. **Markdown learning guide** (used by Claude Code as behavioral instructions)

## Stage JSON Schema

Each stage follows the same structure as the frontend's StageConfig type:

```typescript
interface StageConfig {
  id: string;
  stageNumber: number;           // starts from 1
  title: string;
  concepts: {
    id: string;
    title: string;
    content: string;             // concept description (100~300 characters recommended)
    position: { x: number; y: number }; // position within dungeon canvas (0-19, 0-14)
  }[];
  quiz: {
    id: string;
    question: string;
    type: 'multiple-choice' | 'free-response' | 'code-challenge';
    options?: string[];          // only needed for multiple-choice
    correctAnswer?: string;
  };
  roomWidth: number;             // 20 recommended
  roomHeight: number;            // 15 recommended
}
```

## Example (BitDance Paper, 5 Stages)

```json
{
  "stages": [
    {
      "id": "stage-1",
      "stageNumber": 1,
      "title": "Autoregressive Image Generation Basics",
      "concepts": [
        {
          "id": "c1-1",
          "title": "Autoregressive Models for Images",
          "content": "Autoregressive models generate images one token at a time, predicting each token conditioned on all previously generated tokens. Unlike diffusion models, autoregressive approaches decompose image generation into a sequential decision process.",
          "position": { "x": 3, "y": 4 }
        },
        {
          "id": "c1-2",
          "title": "Visual Tokenization with VQ-VAE",
          "content": "VQ-VAE converts continuous pixel values into discrete tokens by mapping image patches to a learned codebook of discrete embeddings, producing a grid of token indices for autoregressive prediction.",
          "position": { "x": 14, "y": 9 }
        }
      ],
      "quiz": {
        "id": "q1",
        "question": "What is the primary advantage of using autoregressive models for image generation?",
        "type": "multiple-choice",
        "options": [
          "They always produce higher quality images",
          "They decompose generation into sequential token prediction, enabling transformer architectures",
          "They require no training data",
          "They generate all pixels simultaneously"
        ],
        "correctAnswer": "They decompose generation into sequential token prediction, enabling transformer architectures"
      },
      "roomWidth": 20,
      "roomHeight": 15
    },
    {
      "id": "stage-2",
      "stageNumber": 2,
      "title": "Binary Tokenization Strategy",
      "concepts": [
        {
          "id": "c2-1",
          "title": "From Discrete Codebooks to Binary Tokens",
          "content": "BitDance represents each visual token as a sequence of binary bits instead of a single integer index. A codebook of size 2^B is represented by B binary tokens per position, reducing vocabulary size to just 2.",
          "position": { "x": 5, "y": 3 }
        },
        {
          "id": "c2-2",
          "title": "Benefits of Binary Representation",
          "content": "Binary tokenization reduces vocabulary to 2, making softmax trivial. It enables efficient bitwise operations, compact storage, and scales naturally to higher resolutions.",
          "position": { "x": 15, "y": 10 }
        }
      ],
      "quiz": {
        "id": "q2",
        "question": "How does BitDance represent visual tokens differently from traditional VQ-VAE?",
        "type": "multiple-choice",
        "options": [
          "It uses floating point values",
          "It replaces codebook indices with sequences of binary bits, reducing vocabulary size to 2",
          "It eliminates tokenization entirely",
          "It uses a much larger codebook"
        ],
        "correctAnswer": "It replaces codebook indices with sequences of binary bits, reducing vocabulary size to 2"
      },
      "roomWidth": 20,
      "roomHeight": 15
    },
    {
      "id": "stage-3",
      "stageNumber": 3,
      "title": "Diffusion-Based Binary Prediction",
      "concepts": [
        {
          "id": "c3-1",
          "title": "Absorbing Diffusion on Binary Tokens",
          "content": "BitDance uses absorbing diffusion where random bits are masked during training and the model learns to predict original values. The forward process progressively masks bits to [MASK]; the reverse iteratively unmasks them.",
          "position": { "x": 4, "y": 5 }
        },
        {
          "id": "c3-2",
          "title": "Hybrid Autoregressive-Diffusion Architecture",
          "content": "BitDance combines autoregressive (spatial ordering) and diffusion (binary bit prediction) paradigms. Autoregression captures long-range spatial dependencies; diffusion efficiently decodes binary representation at each position.",
          "position": { "x": 14, "y": 8 }
        }
      ],
      "quiz": {
        "id": "q3",
        "question": "What type of diffusion does BitDance use for binary token generation?",
        "type": "multiple-choice",
        "options": [
          "Gaussian diffusion",
          "Score-based diffusion",
          "Absorbing diffusion where bits are progressively masked and predicted",
          "Flow matching"
        ],
        "correctAnswer": "Absorbing diffusion where bits are progressively masked and predicted"
      },
      "roomWidth": 20,
      "roomHeight": 15
    },
    {
      "id": "stage-4",
      "stageNumber": 4,
      "title": "Scaling and Efficiency",
      "concepts": [
        {
          "id": "c4-1",
          "title": "Computational Efficiency",
          "content": "Binary prediction is cheaper than large discrete codebooks. Softmax over vocabulary-2 is trivial. Absorbing diffusion enables parallel bit unmasking during inference, achieving 3-5x speedup.",
          "position": { "x": 3, "y": 7 }
        },
        {
          "id": "c4-2",
          "title": "Scaling Laws for Binary Models",
          "content": "BitDance shows favorable scaling: performance improves predictably from 300M to 3B parameters. Sequence length grows linearly (not quadratically) with resolution, enabling efficient scaling.",
          "position": { "x": 15, "y": 4 }
        }
      ],
      "quiz": {
        "id": "q4",
        "question": "Why is BitDance more efficient at inference than standard autoregressive image models?",
        "type": "multiple-choice",
        "options": [
          "It uses fewer transformer layers",
          "Binary vocabulary (size 2) makes softmax trivial, and absorbing diffusion enables parallel bit unmasking",
          "It skips tokenization",
          "It generates at lower resolution"
        ],
        "correctAnswer": "Binary vocabulary (size 2) makes softmax trivial, and absorbing diffusion enables parallel bit unmasking"
      },
      "roomWidth": 20,
      "roomHeight": 15
    },
    {
      "id": "stage-5",
      "stageNumber": 5,
      "title": "Results and Future Directions",
      "concepts": [
        {
          "id": "c5-1",
          "title": "Benchmark Performance",
          "content": "BitDance achieves FID ~2.5 on ImageNet 256x256, competitive with leading models while being significantly faster. Results hold at 512x512 where efficiency gains are even more pronounced.",
          "position": { "x": 5, "y": 4 }
        },
        {
          "id": "c5-2",
          "title": "Future Directions",
          "content": "Binary tokens open paths to unified multi-modal generation, extreme compression, hardware-optimized inference on binary-native accelerators, and video generation where temporal scaling makes efficiency critical.",
          "position": { "x": 14, "y": 10 }
        }
      ],
      "quiz": {
        "id": "q5",
        "question": "What FID performance does BitDance achieve on ImageNet 256x256, and what is its key advantage?",
        "type": "multiple-choice",
        "options": [
          "FID ~10.0, simpler training",
          "FID ~2.5, competitive quality with significantly faster inference",
          "FID ~0.1, perfect reconstruction",
          "FID ~50.0, no GPU needed"
        ],
        "correctAnswer": "FID ~2.5, competitive quality with significantly faster inference"
      },
      "roomWidth": 20,
      "roomHeight": 15
    }
  ]
}
```

## Learning Guide Section (For Claude Code)

Write learning instructions for each stage below the JSON block:

---

## Stage 1: Autoregressive Image Generation Basics

Key content to explain to students:
- Why the autoregressive approach is powerful in image generation
- How VQ-VAE converts pixels into discrete tokens

Reference files: `README.md`, `model/tokenizer.py` (if present)

After quiz is given and answered correctly:
```
[STAGE_COMPLETE:1]
```

## Stage 2: Binary Tokenization Strategy

Key content to explain to students:
- Differences between traditional codebook approach and binary tokenization
- Advantages of binary representation (vocabulary reduction, efficient computation)

Reference files: `model/binary_tokenizer.py`, `model/vqvae.py` (if present)

After quiz is given and answered correctly:
```
[STAGE_COMPLETE:2]
```

## Stage 3: Diffusion-Based Binary Prediction

Key content to explain to students:
- How absorbing diffusion is applied to binary tokens
- Advantages of the autoregressive + diffusion hybrid architecture

Reference files: `model/diffusion.py`, `model/transformer.py` (if present)

After quiz is given and answered correctly:
```
[STAGE_COMPLETE:3]
```

## Stage 4: Scaling and Efficiency

Key content to explain to students:
- Why binary prediction is computationally efficient
- Characteristics that BitDance exhibits in scaling laws

Reference files: `configs/`, `train.py` (if present)

After quiz is given and answered correctly:
```
[STAGE_COMPLETE:4]
```

## Stage 5: Results and Future Directions

Key content to explain to students:
- Performance on ImageNet benchmarks (FID, IS)
- Future potential of binary token-based models

Reference files: `eval/`, `results/` (if present)

After quiz is given and answered correctly:
```
[STAGE_COMPLETE:5]
```

## When Fully Completed
```
[DUNGEON_COMPLETE]
```
