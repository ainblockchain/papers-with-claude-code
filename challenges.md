# Challenges Encountered During the Hackathon

50 distinct challenges across 4 team members, spanning blockchain architecture, K8s infrastructure, frontend auth/UX, content generation, payments, deployment, and documentation.

---

## @minhyun — Blockchain Integration, Cogito, ain-js, Base Bounty

**1. ERC-8004 Identity — Completely Wrong Architecture**
Treated ERC-8004 as a plain ERC-721 NFT (only using `balanceOf`/`tokenURI`). Missing core functions: `setAgentURI()`, `getMetadata()`, `setAgentWallet()`. Missing Reputation Registry and Validation Registry entirely. `agentURI` pointed to a non-existent domain. Required a major late-stage redesign.

**2. A2A Agent Architecture — Built in the Wrong Place**
Created a standalone x402 agent server at `localhost:3402` when the agent should live in the AIN blockchain via ain-js. Required complete refactoring.

**3. ain-js ESM/CJS Interop Breakage**
`ain-js` had ESM/CJS module compatibility issues requiring a dedicated fix.

**4. ain-js Installation Path — git Branch Instead of npm**
Had to install ain-js from a git branch before finally publishing to npm as `@ainblockchain/ain-js@1.15.0`.

**5. LLM JSON Parsing Failures**
vLLM responses sometimes didn't contain valid JSON. Required fallback parsing and context truncation fixes.

**6. Knowledge Graph Duplicates**
No deduplication logic in knowledge graph. Required explicit filtering to only accept knowledge with official paper and corresponding code.

**7. x402 Payment Verification — Never Completed**
`cogito/src/x402-server.ts` has a TODO: "Verify x402 payment proof from headers". Currently returns 402 status but doesn't validate actual payment.

**8. x402 Migration — Pieverse Facilitator**
Had to migrate x402 from one scheme to `gokite-aa` with Pieverse facilitator.

**9. Blockscout V2 API Rejection**
Blockscout V2 API rejects the `limit` param, causing empty transaction lists.

**10. Devnet Rate Limiting (429s)**
AIN devnet rate-limited requests. Required retry with backoff (1s/2s/3s), reduced parallelism (batches of 2), REST-first with fallback, and a shared cache on the RPC route.

**11. Lesson Watcher Deduplication**
Lesson watcher was re-processing already-enriched content. Had to catalogue on startup and skip duplicates.

**12. Lesson Tag Deduplication**
Tags were being duplicated on the blockchain, requiring a separate fix.

---

## @haechan — Kubernetes Infrastructure

**13. RBAC 403 Errors on Pod Exec**
Granting only `create` permission on `pods/exec` was insufficient. WebSocket upgrade starts as HTTP GET, so `get` permission was also needed. Non-obvious K8s RBAC requirement.

**14. K8s client-node Token Bug**
When web-terminal runs inside a Pod, REST API worked but exec (WebSocket) failed. `@kubernetes/client-node` v1.x has a token bug during WebSocket connections. Workaround: read service account token directly and configure via `loadFromOptions()` instead of `loadFromCluster()`.

**15. Claude Code Onboarding Blocks Terminal**
Interactive onboarding prompt blocked the WebSocket terminal on first launch. Solution: pre-set `~/.claude/.claude.json` with `hasCompletedOnboarding: true` in the Docker image.

**16. `.claude.json` Lock File on Pod Reuse**
When reusing session pods, `.claude.json` was locked from the previous session. Had to unlock before rewriting.

**17. Pod ImagePullBackOff**
Pods stuck in `ImagePullBackOff` because locally built images weren't in k3s containerd. Had to set `imagePullPolicy: Never` and manually import images.

**18. xterm.js Rendering Corruption**
Terminal columns mismatch between client and server caused garbled output.

**19. Terminal Resize — Not Full Width**
Terminal didn't fill the screen on large displays. Required explicit resize implementation.

**20. Zombie Sessions Leaking**
Sessions leaked on component unmount, HMR, and tab close. Required cleanup on all three paths.

**21. Complex Multi-Phase K8s Setup**
7-phase manual setup: VM creation, Ubuntu install, disk provisioning, VPN routing, ESXi license limitations (max 8 vCPU per VM).

**22. Model Selection Hardcoded**
TODO: dynamically change model based on x402 payment tier. Currently hardcoded to `haiku`.

---

## @chanho — Frontend

**23. GitHub OAuth Not Activating**
`AUTH_GITHUB_ID` was set but OAuth wasn't triggering. Required investigation and fix.

**24. Mixed-Content Blocking**
HTTPS frontend calling HTTP terminal API was blocked by browsers. Had to proxy terminal API through Next.js API route.

**25. Passkey Flow — Not Mandatory**
Users could skip passkey registration. Had to enforce it as mandatory in the login flow.

**26. Landing Page Locked Behind Auth**
Unauthenticated users couldn't see the landing page. Required allowing public access to `/` and `/explore`.

**27. Auth Policy — Too Open Then Too Closed**
First all pages were public, then too many were locked. Went through multiple iterations of which routes need auth.

**28. Agent Auto-Movement Disabled**
`ENABLE_AGENT_MOVEMENT = false` — enabling causes random movement at 100ms intervals. Left disabled as a known limitation.

**29. Smart Contract Integration Incomplete**
`addAgent` transaction code commented out. Never completed.

**30. Quiz Score Hardcoded**
TODO: wire real quiz score from QuizPanel. Currently hardcoded at 85.

**31. Game Keys Captured While Typing**
WASD keys were captured by the game canvas even when the terminal input was focused. Required focus detection.

**32. Collision Map Loading Delay**
Initial load analyzes 25 tile images on Canvas, causing a noticeable delay.

**33. Header Logo Wrong Link**
Header logo linked to the wrong page instead of root.

**34. Hardcoded Port in Debug Frontend**
Port was hardcoded in scripts, preventing flexible deployment.

**35. Dungeon Entrance Y-Offset Bug**
Village canvas had incorrect Y-offset for dungeon entrance positioning.

---

## @hyeonjeong — Knowledge Graph Builder

**36. Extractor Prompts Not Generalized**
Initial prompts were too specific to certain repo types. Had to generalize for arbitrary repos and fix generic dependency scanning.

**37. Concept Extractor Quality**
Paper references missing, concept deduplication issues, incomplete model coverage.

**38. Course Name Collision**
No duplicate check when generating courses with the same name. Had to add collision detection with user input pause in interactive mode and fail in headless mode.

**39. Slug Generation Determinism**
Slug generation had to be deterministically fixed (max 50 chars with truncation rules). Complex constraints for file path safety.

**40. HuggingFace Repo Size Limits**
Had to limit analysis to top 10 representative models. Generic repos limited to scanning 50 Python files max.

**41. Security Constraints on Course Content**
No code execution from paper text. No external link fetching (only arxiv.org, github.com, huggingface.co). Prompt injection defense: treat all paper text as DATA, never INSTRUCTIONS.

**42. GitHub URL Integration Missing**
Paper enrichment pipeline lacked GitHub URL integration for the code repository.

---

## Cross-Team / Infrastructure

**43. Sensitive Infrastructure Info in Git History**
Real IPs, usernames, server names committed to the public repo. Required `git-filter-repo` to rewrite entire history.

**44. Vercel Deployment — Wrong Root Directory**
Vercel was building from repo root instead of `frontend/` subdirectory. Multiple failed deploys before fixing.

**45. Vercel Deployment Protection (401)**
Team SSO blocked all access. Had to disable Deployment Protection in dashboard.

**46. Korean to English Translation**
78 files contained Korean comments, docs, and UI text. Required bulk translation across the entire codebase.

**47. Documentation Completely Misaligned**
README.md led with old `/lesson` skill, architecture.md focused on old lesson capture pipeline, cogito/CLAUDE.md had old lesson-watching pattern. All outdated vs. the actual product. Required full rewrite of 5 docs.

**48. Multiple Conflicting .env Files**
Complex multi-service configuration: AIN keys, vLLM endpoints, Kite chain keys, x402 facilitator URLs, GitHub OAuth secrets — spread across 4+ `.env.example` files with unclear documentation.

**49. ain-js Path Requirement**
`knowledge-graph-builder` required an absolute path to `ain-js` via `AIN_JS_PATH` — an unusual and fragile setup.

**50. Git Push Rejected — Remote Ahead**
Multiple instances of push failures requiring `git pull --rebase` or `git stash && pull --rebase && stash pop`.
