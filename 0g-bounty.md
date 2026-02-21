# Papers with Claude Code — 0G Bounty ($4,000)

> Best Developer Tooling or Education

**Live**: [paperswithclaudecode.com](https://paperswithclaudecode.com) — find the 0G course, enter the 2D RPG, learn with Claude Code as your tutor.

## What We Built

We turned 0G's 19,000-line documentation into two interactive courses on [paperswithclaudecode.com](https://paperswithclaudecode.com). Instead of reading docs, learners walk through a 2D dungeon as a Space Panda, interact with concept markers, answer quizzes, and ask Claude Code questions in a live terminal. The AI tutor is pre-loaded with 0G SDK patterns, contract addresses, network configs, and the five most common beginner mistakes. Zero to first Storage upload in five minutes.

**Basic Course**: 3 modules, 12 concepts — for developers with no blockchain experience. Covers what 0G is, wallet setup, first file upload, first AI inference, and a full storage-compute pipeline.

**Developer Course**: 5 modules, 25 concepts — for Web2/Ethereum developers. Covers Storage SDK (Log + KV), Compute CLI setup, smart contracts with `evmVersion: 'cancun'`, and advanced patterns like ERC-7857 and Goldsky indexing.

## Friction Points It Solves

The `evmVersion: 'cancun'` flag is buried in the docs — developers hit a cryptic error and don't know why. The Compute CLI's six steps are scattered across multiple pages. The Indexer URL and RPC URL look similar but serve different purposes. The rootHash must be saved immediately after upload or the file is lost forever. Our course surfaces all of these with warnings, the tutor auto-diagnoses them, and every code example handles them correctly.

## Reusable Course Format

Any protocol can create a course with four files: `paper.json` (metadata), `graph.json` (concepts + prerequisites), `courses.json` (lessons + exercises), and `CLAUDE.md` (tutor config with domain facts). This is a template, not a one-off tutorial.

## Quick Start

```bash
cd 0G/0g-basic-course
claude    # Opens Claude Code with the 0G tutor loaded
```

Or visit [paperswithclaudecode.com](https://paperswithclaudecode.com) and start the 0G course directly.
