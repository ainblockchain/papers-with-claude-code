# BLIP3-o: Unified Multimodal Models Learning Path

A Claude Code-powered interactive learning path based on
"BLIP3-o: A Family of Fully Open Unified Multimodal Models" by Chen et al., 2025.

## Getting Started

1. Open Claude Code in this directory:
   ```
   cd blip3-o/
   claude
   ```
2. Start learning — just chat naturally:
   ```
   explore              # see the knowledge graph
   teach me <concept>   # start a lesson
   give me a challenge  # get a quiz
   done                 # mark complete, move on
   ```

## Sharing Progress with Friends

1. Create your learner branch:
   ```
   git checkout -b learner/your-name
   ```
2. Commit progress as you learn:
   ```
   git add .learner/
   git commit -m "Progress update"
   git push origin learner/your-name
   ```
3. Fetch friends' branches:
   ```
   git fetch --all
   friends
   ```

## Course Structure

- **Multimodal AI Foundations** (4 concepts): Background concepts for understanding unified image understanding and generation
- **BLIP3-o Core Architecture** (6 concepts): The key architectural innovations and components of BLIP3-o
- **Training Strategy & Design Decisions** (7 concepts): How BLIP3-o is trained and the key design choices that led to its success
- **Evaluation & Benchmarks** (2 concepts): How BLIP3-o's performance is measured and compared
- **Impact & Future Directions** (3 concepts): The broader impact of BLIP3-o and future research directions it enables

## Stats

- 22 concepts across 5 courses
- 4 foundational, 10 intermediate, 5 advanced, 3 frontier concepts

## Key Paper Highlights

BLIP3-o introduces several important innovations:

1. **CLIP Feature Generation**: Instead of generating VAE latents like Stable Diffusion, BLIP3-o generates semantically rich CLIP features, enabling better prompt alignment

2. **Sequential Pretraining**: First trains understanding, then freezes backbone and trains generation — preserving both capabilities

3. **Flow Matching**: Uses flow matching instead of MSE for more diverse, higher-quality outputs

4. **Fully Open**: Models, code, datasets, and training scripts are all publicly released

## Benchmarks

| Task | Benchmark | BLIP3-o 8B |
|------|-----------|------------|
| Understanding | MME-Perception | 1682.6 |
| Understanding | MMMU | 50.6 |
| Understanding | VQAv2 | 83.1 |
| Generation | GenEval | 0.84 |
| Generation | WISE | 0.62 |
