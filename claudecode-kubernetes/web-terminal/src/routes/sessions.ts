// Session management REST API router
// Provides session creation (POST), listing (GET), detail retrieval (GET :id), and deletion (DELETE :id).
// Session data is stored in an in-memory Map (MVP).
//
// Pod reuse strategy:
//   Maintain one Pod per user; multiple sessions can share the same Pod.
//   On POST, reuse the existing Pod if available, otherwise create a new one.
//   On DELETE, only remove the session record without deleting the Pod.
//   Fetch the entire directory from the claudeMdUrl provided by the frontend
//   and place it at /home/claude/papers/{courseId}/ (GitHub -> tarball, others -> CLAUDE.md only).

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig, Session } from '../types.js';
import { PodManager } from '../k8s/pod-manager.js';

const sessions = new Map<string, Session>();
const podManager = new PodManager();

/** claudeMdUrl validation — only HTTPS URLs are allowed */
function validateClaudeMdUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Derive courseId from claudeMdUrl
 *  GitHub raw URL: raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}/CLAUDE.md
 *  -> Join the {path} portion with hyphens (e.g., "attention-is-all-you-need-bible")
 *  General URL: Use the last 2 path segments */
function deriveCourseId(claudeMdUrl: string): string {
  const url = new URL(claudeMdUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  parts.pop(); // Remove CLAUDE.md filename

  // raw.githubusercontent.com: Skip owner/repo/branch (3 segments) and the rest is the course path
  if (url.hostname === 'raw.githubusercontent.com' && parts.length > 3) {
    return parts.slice(3).join('-').toLowerCase();
  }

  // General URL: Use the last meaningful segments
  const meaningful = parts.length > 2 ? parts.slice(-2) : parts;
  return (meaningful.join('-') || 'default').toLowerCase();
}

/** Parse repo info from a GitHub raw URL and return the information needed for tarball download.
 *  Only supports the format raw.githubusercontent.com/{owner}/{repo}/{branch}/{dirPath}/CLAUDE.md. */
function parseGitHubRawUrl(claudeMdUrl: string): {
  owner: string; repo: string; branch: string; dirPath: string;
} | null {
  try {
    const url = new URL(claudeMdUrl);
    if (url.hostname !== 'raw.githubusercontent.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    // owner/repo/branch/.../CLAUDE.md -> At least 4 segments required
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

/** Generate a podId for Pod labels from userId (same logic as pod-template.ts) */
function toPodId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toLowerCase();
}

/** Look up a session by session ID (also used by the WebSocket handler in server.ts) */
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

/** Return the current number of active sessions */
export function getActiveSessionCount(): number {
  let count = 0;
  for (const session of sessions.values()) {
    if (session.status === 'creating' || session.status === 'running') {
      count++;
    }
  }
  return count;
}

/** Create the session management router */
export function createSessionRouter(config: AppConfig): Router {
  const router = Router();

  // POST /api/sessions — Create a new session (includes existing Pod reuse logic)
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

      // resumeStage validation — must validate as integer since it's interpolated in bash -c (command injection prevention)
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

      // Attempt to reuse an existing Pod
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

      // Create a new Pod if no existing one is found
      if (!podName) {
        podName = await podManager.createPod(sessionId, config, userId);
        await podManager.waitForPodReady(podName, config.sandboxNamespace);
        console.log(`[sessions] New pod created: ${podName}`);
      }

      session.podName = podName;

      // If claudeMdUrl is provided, fetch the entire directory and place it in the paper directory
      if (claudeMdUrl && courseId) {
        const paperPath = `/home/claude/papers/${courseId}`;
        const ghInfo = parseGitHubRawUrl(claudeMdUrl);

        if (ghInfo) {
          // GitHub raw URL -> Download the entire directory via tarball
          // Internal tarball path: {repo}-{branch}/{dirPath}/
          const tarballUrl = `https://github.com/${ghInfo.owner}/${ghInfo.repo}/archive/refs/heads/${ghInfo.branch}.tar.gz`;
          const stripPrefix = `${ghInfo.repo}-${ghInfo.branch}/${ghInfo.dirPath}`;

          console.log(`[sessions] Fetching course directory: ${ghInfo.dirPath} from ${ghInfo.owner}/${ghInfo.repo}`);

          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'mkdir', '-p', paperPath,
          ]);
          // Download tarball -> extract to /tmp -> copy only the needed directory -> cleanup
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'bash', '-c',
            `curl -fsSL "${tarballUrl}" | tar xz -C /tmp && ` +
            `cp -a "/tmp/${stripPrefix}/." "${paperPath}/" && ` +
            `rm -rf "/tmp/${ghInfo.repo}-${ghInfo.branch}"`,
          ]);
          console.log(`[sessions] Course directory fetched: ${ghInfo.dirPath} → ${paperPath}`);
        } else {
          // Non-GitHub URL -> Download only CLAUDE.md as a single file (fallback)
          console.log(`[sessions] Non-GitHub URL, fetching CLAUDE.md only: ${claudeMdUrl}`);
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'mkdir', '-p', paperPath,
          ]);
          await podManager.execInPod(session.podName, config.sandboxNamespace, [
            'curl', '-fsSL', '-o', `${paperPath}/CLAUDE.md`, claudeMdUrl,
          ]);
        }
      }

      // If resumeStage is provided, inject the resume context into the Pod (validatedStage is a validated integer)
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

  // GET /api/sessions — List all sessions
  router.get('/sessions', async (_req: Request, res: Response) => {
    try {
      const result: Session[] = [];

      for (const session of sessions.values()) {
        // Synchronize sessions in running state by checking actual Pod status
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

  // GET /api/sessions/:id — Get session details
  router.get('/sessions/:id', async (req: Request, res: Response) => {
    const session = sessions.get(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Synchronize by checking actual Pod status
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

  // DELETE /api/sessions/:id — Delete session (Pod is kept, only session record is removed)
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
