// Sandbox Pod spec generation
// Creates one Pod per user and persists conversation history and cloned repos via PV.
// The Pod stays alive with sleep infinity, and claude is executed directly via exec.
//
// Persistence strategy (hostPath + subPath):
//   /data/claude-users/{userId}/dot-claude → /home/claude/.claude (session data)
//   /data/claude-users/{userId}/papers     → /home/claude/papers  (CLAUDE.md + learning data)
// Since subPath mounts are used, the image's .bashrc, CLAUDE.md, etc. are preserved.
//
// Note 1: .claude/settings.json is baked into the image but
//          gets hidden by the PV mount. Resolved with a restore command at container startup.
//          Actual security enforcement is handled by /etc/claude-code/managed-settings.json.
//
// Note 2: There is a K8s issue where fsGroup is not applied to subPath mounts,
//          so permissions are set directly with chown in an initContainer.
//
// Security: The real API key is not injected into the Pod.
// Configured with a dummy key + ANTHROPIC_BASE_URL (proxy),
// where the proxy replaces it with the real key before forwarding to the Anthropic API.

import { V1Pod } from '@kubernetes/client-node';
import { AppConfig } from '../types.js';

// Dummy API key — harmless even if exposed inside the Pod
const SANDBOX_DUMMY_API_KEY =
  'sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxxxxxxxxxxxxxxxxxx';

// Internal cluster address of the API Proxy service
const API_PROXY_URL =
  'http://api-proxy.claudecode-terminal.svc.cluster.local:8080';

// Base path for user data hostPath
const USER_DATA_BASE_PATH = '/data/claude-users';

export function buildSandboxPodSpec(
  sessionId: string,
  config: AppConfig,
  userId?: string,
): V1Pod {
  // Per-user Pod: based on userId if available, otherwise based on sessionId (fallback)
  const podId = userId
    ? userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toLowerCase()
    : sessionId.slice(0, 8);
  const podName = userId ? `claude-user-${podId}` : `claude-session-${podId}`;
  const userDataPath = `${USER_DATA_BASE_PATH}/${podId}`;

  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: podName,
      namespace: config.sandboxNamespace,
      labels: {
        app: 'claudecode-sandbox',
        ...(userId ? { 'user-id': podId } : { 'session-id': sessionId }),
      },
      annotations: {
        'claudecode/created-at': new Date().toISOString(),
        ...(userId && { 'claudecode/user-id': userId }),
      },
    },
    spec: {
      activeDeadlineSeconds: config.sessionTimeoutSeconds,
      restartPolicy: 'Never',
      automountServiceAccountToken: false,
      securityContext: {
        fsGroup: 1000,
      },
      // initContainer: fsGroup is not applied to subPath mounts, so chown directly
      initContainers: [
        {
          name: 'fix-permissions',
          image: 'busybox:1.36',
          command: ['sh', '-c', 'mkdir -p /data/dot-claude /data/papers && chown -R 1000:1000 /data'],
          volumeMounts: [
            {
              name: 'user-data',
              mountPath: '/data',
            },
          ],
        },
      ],
      containers: [
        {
          name: 'sandbox',
          image: config.sandboxImage,
          imagePullPolicy: 'Never',
          // Restore settings.json hidden by PV mount, then sleep infinity
          command: ['sh', '-c', [
            'cp -n /etc/claude-code/managed-settings.json /dev/null 2>&1',
            'mkdir -p /home/claude/.claude',
            'test -f /home/claude/.claude/settings.json || cp /etc/claude-defaults/settings.json /home/claude/.claude/settings.json 2>/dev/null',
            'exec sleep infinity',
          ].join(' ; ')],
          resources: {
            requests: {
              cpu: config.podCpuRequest,
              memory: config.podMemoryRequest,
            },
            limits: {
              cpu: config.podCpuLimit,
              memory: config.podMemoryLimit,
            },
          },
          env: [
            {
              name: 'TERM',
              value: 'xterm-256color',
            },
            {
              name: 'ANTHROPIC_API_KEY',
              value: SANDBOX_DUMMY_API_KEY,
            },
            {
              name: 'ANTHROPIC_BASE_URL',
              value: API_PROXY_URL,
            },
          ],
          volumeMounts: [
            {
              // Persist Claude Code session/conversation data
              name: 'user-data',
              mountPath: '/home/claude/.claude',
              subPath: 'dot-claude',
            },
            {
              // Persist CLAUDE.md + learning session data
              name: 'user-data',
              mountPath: '/home/claude/papers',
              subPath: 'papers',
            },
          ],
        },
      ],
      volumes: [
        {
          name: 'user-data',
          hostPath: {
            path: userDataPath,
            type: 'DirectoryOrCreate',
          },
        },
      ],
    },
  };
}
