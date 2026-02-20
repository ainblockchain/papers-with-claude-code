// 세션 관리 REST API 라우터
// 세션 생성(POST), 목록 조회(GET), 상세 조회(GET :id), 삭제(DELETE :id)를 제공.
// 세션 데이터는 인메모리 Map에 저장 (MVP).
//
// Pod 재사용 전략:
//   유저당 1개의 Pod을 유지하고, 세션은 여러 개가 동일 Pod을 공유.
//   POST에서 기존 Pod이 있으면 재사용, 없으면 새로 생성.
//   DELETE에서 Pod은 삭제하지 않고 세션 레코드만 제거.
//   프론트엔드가 제공하는 claudeMdUrl에서 해당 디렉토리 전체를 fetch하여
//   /home/claude/papers/{courseId}/ 에 배치 (GitHub → tarball, 그 외 → CLAUDE.md만).

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig, Session } from '../types.js';
import { PodManager } from '../k8s/pod-manager.js';

const sessions = new Map<string, Session>();
const podManager = new PodManager();

/** claudeMdUrl 검증 — HTTPS URL만 허용 */
function validateClaudeMdUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** claudeMdUrl에서 courseId를 파생
 *  GitHub raw URL: raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}/CLAUDE.md
 *  → {path} 부분을 하이픈으로 연결 (e.g., "attention-is-all-you-need-bible")
 *  일반 URL: 마지막 2개 경로 세그먼트를 사용 */
function deriveCourseId(claudeMdUrl: string): string {
  const url = new URL(claudeMdUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  parts.pop(); // CLAUDE.md 파일명 제거

  // raw.githubusercontent.com: owner/repo/branch 3개 건너뛰고 나머지가 코스 경로
  if (url.hostname === 'raw.githubusercontent.com' && parts.length > 3) {
    return parts.slice(3).join('-').toLowerCase();
  }

  // 일반 URL: 마지막 의미있는 세그먼트들 사용
  const meaningful = parts.length > 2 ? parts.slice(-2) : parts;
  return (meaningful.join('-') || 'default').toLowerCase();
}

/** GitHub raw URL에서 레포 정보를 파싱하여 tarball 다운로드에 필요한 정보 반환.
 *  raw.githubusercontent.com/{owner}/{repo}/{branch}/{dirPath}/CLAUDE.md 형태만 지원. */
function parseGitHubRawUrl(claudeMdUrl: string): {
  owner: string; repo: string; branch: string; dirPath: string;
} | null {
  try {
    const url = new URL(claudeMdUrl);
    if (url.hostname !== 'raw.githubusercontent.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    // owner/repo/branch/.../CLAUDE.md → 최소 4개 세그먼트 필요
    if (parts.length < 4) return null;
    const owner = parts[0];
    const repo = parts[1];
    const branch = parts[2];
    const dirPath = parts.slice(3, -1).join('/'); // CLAUDE.md 제거
    if (!dirPath) return null;
    return { owner, repo, branch, dirPath };
  } catch {
    return null;
  }
}

/** userId로부터 Pod 라벨용 podId를 생성 (pod-template.ts와 동일 로직) */
function toPodId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toLowerCase();
}

/** 세션 ID로 세션을 조회 (server.ts의 WebSocket 핸들러에서도 사용) */
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

/** 현재 활성 세션 수를 반환 */
export function getActiveSessionCount(): number {
  let count = 0;
  for (const session of sessions.values()) {
    if (session.status === 'creating' || session.status === 'running') {
      count++;
    }
  }
  return count;
}

/** 세션 관리 라우터 생성 */
export function createSessionRouter(config: AppConfig): Router {
  const router = Router();

  // POST /api/sessions — 새 세션 생성 (기존 Pod 재사용 로직 포함)
  router.post('/sessions', async (req: Request, res: Response) => {
    try {
      const { claudeMdUrl, userId, resumeStage } = req.body as {
        claudeMdUrl?: string;
        userId?: string;
        resumeStage?: number;
      };

      if (claudeMdUrl && !validateClaudeMdUrl(claudeMdUrl)) {
        res.status(400).json({ error: 'Invalid claudeMdUrl: only HTTPS URLs are allowed' });
        return;
      }

      // resumeStage 검증 — bash -c에 보간되므로 반드시 정수 검증 (커맨드 인젝션 방지)
      let validatedStage: number | undefined;
      if (resumeStage != null) {
        validatedStage = Number(resumeStage);
        if (!Number.isInteger(validatedStage) || validatedStage < 0 || validatedStage > 999) {
          res.status(400).json({ error: 'resumeStage must be an integer between 0 and 999' });
          return;
        }
      }

      const activeCount = getActiveSessionCount();
      if (activeCount >= config.maxSessions) {
        res.status(429).json({
          error: 'Max sessions reached',
          maxSessions: config.maxSessions,
          activeSessions: activeCount,
        });
        return;
      }

      const sessionId = uuidv4();
      const courseId = claudeMdUrl ? deriveCourseId(claudeMdUrl) : undefined;
      const session: Session = {
        id: sessionId,
        podName: '',
        namespace: config.sandboxNamespace,
        status: 'creating',
        createdAt: new Date(),
        claudeMdUrl,
        userId,
        courseId,
      };
      sessions.set(sessionId, session);

      console.log(`[sessions] Creating session: ${sessionId}${courseId ? ` (course: ${courseId})` : ''}`);

      // 기존 Pod 재사용 시도
      let podName: string | null = null;
      let podReused = false;

      if (userId) {
        const podId = toPodId(userId);
        podName = await podManager.findUserPod(podId, config.sandboxNamespace);
        if (podName) {
          podReused = true;
          console.log(`[sessions] Reusing existing pod: ${podName} for user: ${userId}`);
        }
      }

      // 기존 Pod이 없으면 새로 생성
      if (!podName) {
        podName = await podManager.createPod(sessionId, config, userId);
        await podManager.waitForPodReady(podName, config.sandboxNamespace);
        console.log(`[sessions] New pod created: ${podName}`);
      }

      session.podName = podName;

      // claudeMdUrl이 있으면 해당 디렉토리 전체를 fetch하여 논문 디렉토리에 배치
      if (claudeMdUrl && courseId) {
        const paperPath = `/home/claude/papers/${courseId}`;
        const ghInfo = parseGitHubRawUrl(claudeMdUrl);

        if (ghInfo) {
          // GitHub raw URL → tarball로 디렉토리 전체 다운로드
          // tarball 내부 경로: {repo}-{branch}/{dirPath}/
          const tarballUrl = `https://github.com/${ghInfo.owner}/${ghInfo.repo}/archive/refs/heads/${ghInfo.branch}.tar.gz`;
          const stripPrefix = `${ghInfo.repo}-${ghInfo.branch}/${ghInfo.dirPath}`;

          console.log(`[sessions] Fetching course directory: ${ghInfo.dirPath} from ${ghInfo.owner}/${ghInfo.repo}`);

          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'mkdir', '-p', paperPath,
          ]);
          // tarball 다운로드 → /tmp에 풀기 → 필요한 디렉토리만 복사 → 정리
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'bash', '-c',
            `curl -fsSL "${tarballUrl}" | tar xz -C /tmp && ` +
            `cp -a "/tmp/${stripPrefix}/." "${paperPath}/" && ` +
            `rm -rf "/tmp/${ghInfo.repo}-${ghInfo.branch}"`,
          ]);
          console.log(`[sessions] Course directory fetched: ${ghInfo.dirPath} → ${paperPath}`);
        } else {
          // GitHub이 아닌 URL → CLAUDE.md만 단일 다운로드 (폴백)
          console.log(`[sessions] Non-GitHub URL, fetching CLAUDE.md only: ${claudeMdUrl}`);
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'mkdir', '-p', paperPath,
          ]);
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'curl', '-fsSL', '-o', `${paperPath}/CLAUDE.md`, claudeMdUrl,
          ]);
        }
      }

      // resumeStage가 있으면 재개 컨텍스트를 Pod에 주입 (validatedStage는 검증 완료된 정수)
      if (validatedStage != null) {
        console.log(`[sessions] Setting resume stage: ${validatedStage}`);
        await podManager.execInPod(session.podName, config.sandboxNamespace, [
          'bash', '-c', `echo RESUME_FROM_STAGE=${validatedStage} > /tmp/resume-context`,
        ]);
      }

      session.status = 'running';

      console.log(`[sessions] Session ready: ${sessionId} (pod: ${podName}, reused: ${podReused})`);

      res.status(201).json({
        sessionId: session.id,
        podName: session.podName,
        status: session.status,
        claudeMdUrl: session.claudeMdUrl,
        userId: session.userId,
        courseId: session.courseId,
        podReused,
      });
    } catch (err) {
      console.error('[sessions] Failed to create session:', err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // GET /api/sessions — 전체 세션 목록
  router.get('/sessions', async (_req: Request, res: Response) => {
    try {
      const result: Session[] = [];

      for (const session of sessions.values()) {
        // running 상태인 세션은 실제 Pod 상태를 확인하여 동기화
        if (session.status === 'running') {
          try {
            const phase = await podManager.getPodStatus(
              session.podName,
              session.namespace
            );
            if (phase !== 'Running') {
              session.status = 'terminated';
            }
          } catch {
            session.status = 'terminated';
          }
        }
        result.push(session);
      }

      res.json(result);
    } catch (err) {
      console.error('[sessions] Failed to list sessions:', err);
      res.status(500).json({ error: 'Failed to list sessions' });
    }
  });

  // GET /api/sessions/:id — 세션 상세 조회
  router.get('/sessions/:id', async (req: Request, res: Response) => {
    const session = sessions.get(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // 실제 Pod 상태를 확인하여 동기화
    if (session.status === 'running') {
      try {
        const phase = await podManager.getPodStatus(
          session.podName,
          session.namespace
        );
        if (phase !== 'Running') {
          session.status = 'terminated';
        }
      } catch {
        session.status = 'terminated';
      }
    }

    res.json(session);
  });

  // DELETE /api/sessions/:id — 세션 삭제 (Pod은 유지, 세션 레코드만 제거)
  router.delete('/sessions/:id', async (req: Request, res: Response) => {
    const session = sessions.get(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    try {
      console.log(
        `[sessions] Removing session: ${session.id} (pod: ${session.podName} kept alive)`
      );

      session.status = 'terminated';
      sessions.delete(session.id);

      console.log(`[sessions] Session removed: ${session.id}`);
      res.status(204).send();
    } catch (err) {
      console.error(`[sessions] Failed to delete session ${session.id}:`, err);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  return router;
}
