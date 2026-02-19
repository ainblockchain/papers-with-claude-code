# 논문 레포 CLAUDE.md 작성 가이드

논문 레포에 이 파일을 추가하면 Papers with Claude Code 플랫폼에서 던전 방식의 학습 코스로 사용할 수 있습니다.

## 파일 구조

CLAUDE.md는 두 부분으로 구성됩니다:
1. **JSON 메타데이터 블록** (플랫폼이 자동 파싱)
2. **마크다운 학습 가이드** (Claude Code가 행동 지침으로 사용)

## 스테이지 JSON 스키마

각 스테이지는 프론트엔드의 StageConfig 타입과 동일한 구조를 따릅니다:

```typescript
interface StageConfig {
  id: string;
  stageNumber: number;           // 1부터 시작
  title: string;
  concepts: {
    id: string;
    title: string;
    content: string;             // 개념 설명 (100~300자 권장)
    position: { x: number; y: number }; // 던전 캔버스 내 위치 (0-19, 0-14)
  }[];
  quiz: {
    id: string;
    question: string;
    type: 'multiple-choice' | 'free-response' | 'code-challenge';
    options?: string[];          // multiple-choice만 필요
    correctAnswer?: string;
  };
  roomWidth: number;             // 20 권장
  roomHeight: number;            // 15 권장
}
```

## 예시 (BitDance 논문, 5스테이지)

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

## 학습 가이드 섹션 (Claude Code용)

JSON 블록 아래에 각 스테이지별 학습 지침을 작성합니다:

---

## Stage 1: Autoregressive Image Generation Basics

학생에게 설명할 핵심 내용:
- 이미지 생성에서 autoregressive 접근법이 왜 강력한지
- VQ-VAE가 픽셀을 어떻게 discrete token으로 변환하는지

참조할 파일: `README.md`, `model/tokenizer.py` (존재하는 경우)

퀴즈 출제 후 정답 시:
```
[STAGE_COMPLETE:1]
```

## Stage 2: Binary Tokenization Strategy

학생에게 설명할 핵심 내용:
- 기존 codebook 방식과 binary tokenization의 차이점
- Binary representation의 장점 (vocabulary 축소, 효율적인 연산)

참조할 파일: `model/binary_tokenizer.py`, `model/vqvae.py` (존재하는 경우)

퀴즈 출제 후 정답 시:
```
[STAGE_COMPLETE:2]
```

## Stage 3: Diffusion-Based Binary Prediction

학생에게 설명할 핵심 내용:
- Absorbing diffusion이 binary token에 어떻게 적용되는지
- Autoregressive + diffusion 하이브리드 구조의 장점

참조할 파일: `model/diffusion.py`, `model/transformer.py` (존재하는 경우)

퀴즈 출제 후 정답 시:
```
[STAGE_COMPLETE:3]
```

## Stage 4: Scaling and Efficiency

학생에게 설명할 핵심 내용:
- Binary prediction이 왜 연산 효율적인지
- Scaling law에서 BitDance가 보이는 특성

참조할 파일: `configs/`, `train.py` (존재하는 경우)

퀴즈 출제 후 정답 시:
```
[STAGE_COMPLETE:4]
```

## Stage 5: Results and Future Directions

학생에게 설명할 핵심 내용:
- ImageNet 벤치마크에서의 성능 (FID, IS)
- Binary token 기반 모델의 미래 가능성

참조할 파일: `eval/`, `results/` (존재하는 경우)

퀴즈 출제 후 정답 시:
```
[STAGE_COMPLETE:5]
```

## 전체 완료 시
```
[DUNGEON_COMPLETE]
```
