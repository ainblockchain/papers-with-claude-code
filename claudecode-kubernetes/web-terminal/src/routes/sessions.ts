// Session management REST API router
// Provides session creation (POST), list (GET), detail (GET :id), and deletion (DELETE :id).
// Session data is stored in an in-memory Map (MVP).
//
// Pod reuse strategy:
//   Maintains one Pod per user; multiple sessions can share the same Pod.
//   POST reuses an existing Pod if available, otherwise creates a new one.
//   DELETE removes only the session record, keeping the Pod alive.
//   Fetches the entire directory from the frontend-provided courseUrl
//   into /home/claude/papers/{courseId}/ (GitHub -> tarball, others -> CLAUDE.md only).

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig, Session, SessionMode } from '../types.js';
import { PodManager } from '../k8s/pod-manager.js';

const sessions = new Map<string, Session>();
const podManager = new PodManager();

/** Validate courseUrl — only HTTPS URLs allowed */
function validateCourseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Derive courseId from courseUrl
 *  GitHub raw URL: raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}/CLAUDE.md
 *  -> joins {path} segments with hyphens (e.g., "attention-is-all-you-need-bible")
 *  Other URLs: uses last 2 path segments */
function deriveCourseId(courseUrl: string): string {
  const url = new URL(courseUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  parts.pop(); // Remove CLAUDE.md filename

  // raw.githubusercontent.com: skip owner/repo/branch (3 segments), rest is course path
  if (url.hostname === 'raw.githubusercontent.com' && parts.length > 3) {
    return parts.slice(3).join('-').toLowerCase();
  }

  // Generic URL: use last meaningful segments
  const meaningful = parts.length > 2 ? parts.slice(-2) : parts;
  return (meaningful.join('-') || 'default').toLowerCase();
}

/** Parse GitHub raw URL to extract repo info needed for tarball download.
 *  Only supports raw.githubusercontent.com/{owner}/{repo}/{branch}/{dirPath}/CLAUDE.md format. */
function parseGitHubRawUrl(courseUrl: string): {
  owner: string; repo: string; branch: string; dirPath: string;
} | null {
  try {
    const url = new URL(courseUrl);
    if (url.hostname !== 'raw.githubusercontent.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    // owner/repo/branch/.../CLAUDE.md -> requires at least 4 segments
    if (parts.length < 4) return null;
    const owner = parts[0];
    const repo = parts[1];
    const branch = parts[2];
    const dirPath = parts.slice(3, -1).join('/'); // Remove CLAUDE.md
    if (!dirPath) return null;
    return { owner, repo, branch, dirPath };
  } catch {
    return null;
  }
}

/** Generate podId for Pod labels from userId (same logic as pod-template.ts) */
function toPodId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toLowerCase();
}

/** Look up a session by ID (also used by WebSocket handler in server.ts) */
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

/** Return the current active session count */
export function getActiveSessionCount(): number {
  let count = 0;
  for (const session of sessions.values()) {
    if (session.status === 'creating' || session.status === 'running') {
      count++;
    }
  }
  return count;
}

/** Create session management router */
export function createSessionRouter(config: AppConfig): Router {
  const router = Router();

  // POST /api/sessions — create a new session (includes Pod reuse logic)
  router.post('/sessions', async (req: Request, res: Response) => {
    try {
      const { courseUrl, userId, resumeStage, mode: rawMode } = req.body as {
        courseUrl?: string;
        userId?: string;
        resumeStage?: number;
        mode?: string;
      };
      const mode: SessionMode = rawMode === 'generator' ? 'generator' : 'learner';

      if (courseUrl && !validateCourseUrl(courseUrl)) {
        res.status(400).json({ error: 'Invalid courseUrl: only HTTPS URLs are allowed' });
        return;
      }

      // Validate resumeStage — must be an integer since it's interpolated in bash -c (prevent command injection)
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
      const courseId = courseUrl ? deriveCourseId(courseUrl) : undefined;
      const session: Session = {
        id: sessionId,
        podName: '',
        namespace: config.sandboxNamespace,
        status: 'creating',
        createdAt: new Date(),
        courseUrl,
        userId,
        courseId,
        mode,
      };
      sessions.set(sessionId, session);

      console.log(`[sessions] Creating ${mode} session: ${sessionId}${courseId ? ` (course: ${courseId})` : ''}`);

      // Attempt to reuse existing Pod
      let podName: string | null = null;
      let podReused = false;

      if (userId) {
        const podId = toPodId(userId);
        // Generator Pods use 'claude-gen-' prefix and are managed separately (filtered by mode label)
        podName = await podManager.findUserPod(podId, config.sandboxNamespace, mode);
        if (podName) {
          podReused = true;
          console.log(`[sessions] Reusing existing ${mode} pod: ${podName} for user: ${userId}`);
        }
      }

      // Create a new Pod if none exists
      if (!podName) {
        podName = await podManager.createPod(sessionId, config, userId, mode);
        await podManager.waitForPodReady(podName, config.sandboxNamespace);
        console.log(`[sessions] New ${mode} pod created: ${podName}`);
      }

      session.podName = podName;

      // Learner mode: if courseUrl is present, fetch the entire directory into the paper directory
      // Generator mode: repo clone is handled by start-claude.sh, so skip here
      if (mode === 'learner' && courseUrl && courseId) {
        const paperPath = `/home/claude/papers/${courseId}`;
        const ghInfo = parseGitHubRawUrl(courseUrl);

        if (ghInfo) {
          // GitHub raw URL -> download entire directory via tarball
          // Tarball internal path: {repo}-{branch}/{dirPath}/
          const tarballUrl = `https://github.com/${ghInfo.owner}/${ghInfo.repo}/archive/refs/heads/${ghInfo.branch}.tar.gz`;
          const stripPrefix = `${ghInfo.repo}-${ghInfo.branch}/${ghInfo.dirPath}`;

          console.log(`[sessions] Fetching course directory: ${ghInfo.dirPath} from ${ghInfo.owner}/${ghInfo.repo}`);

          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'mkdir', '-p', paperPath,
          ]);
          // Download tarball -> extract to /tmp -> copy needed directory -> clean up
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'bash', '-c',
            `curl -fsSL "${tarballUrl}" | tar xz -C /tmp && ` +
            `cp -a "/tmp/${stripPrefix}/." "${paperPath}/" && ` +
            `rm -rf "/tmp/${ghInfo.repo}-${ghInfo.branch}"`,
          ]);
          console.log(`[sessions] Course directory fetched: ${ghInfo.dirPath} → ${paperPath}`);
        } else {
          // Non-GitHub URL -> download only CLAUDE.md (fallback)
          console.log(`[sessions] Non-GitHub URL, fetching CLAUDE.md only: ${courseUrl}`);
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'mkdir', '-p', paperPath,
          ]);
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'curl', '-fsSL', '-o', `${paperPath}/CLAUDE.md`, courseUrl,
          ]);
        }
      }

      // If resumeStage is set, inject resume context into the Pod (validatedStage is already validated as integer)
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
        courseUrl: session.courseUrl,
        userId: session.userId,
        courseId: session.courseId,
        mode: session.mode,
        podReused,
      });
    } catch (err) {
      console.error('[sessions] Failed to create session:', err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // GET /api/sessions — list all sessions
  router.get('/sessions', async (_req: Request, res: Response) => {
    try {
      const result: Session[] = [];

      for (const session of sessions.values()) {
        // Sync running sessions with actual Pod status
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

  // GET /api/sessions/:id — get session details
  router.get('/sessions/:id', async (req: Request, res: Response) => {
    const session = sessions.get(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Sync with actual Pod status
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

  // DELETE /api/sessions/:id — delete session (keep Pod alive, remove session record only)
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
