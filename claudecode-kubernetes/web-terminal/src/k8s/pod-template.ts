// 샌드박스 Pod 스펙 생성
// 유저당 1개의 Pod을 생성하고, PV로 대화 내역과 클론된 레포를 영속화.
// Pod은 sleep infinity로 유지되고, exec으로 claude를 직접 실행.
//
// 영속화 전략 (hostPath + subPath):
//   /data/claude-users/{userId}/dot-claude → /home/claude/.claude (세션 데이터)
//   /data/claude-users/{userId}/papers     → /home/claude/papers  (CLAUDE.md + 학습 데이터)
// subPath 마운트라 이미지의 .bashrc, CLAUDE.md 등은 보존됨.
//
// 주의 1: .claude/settings.json이 이미지에 baked-in 되어 있으나
//          PV 마운트로 가려짐. 컨테이너 시작 시 복원 커맨드로 해결.
//          실제 보안 강제는 /etc/claude-code/managed-settings.json이 담당.
//
// 주의 2: fsGroup은 subPath 마운트에 적용되지 않는 K8s 이슈가 있어
//          initContainer에서 직접 chown으로 권한을 설정함.
//
// 보안: 진짜 API 키는 Pod에 주입되지 않음.
// 더미 키 + ANTHROPIC_BASE_URL(프록시)로 구성되어
// 프록시에서 진짜 키로 교체 후 Anthropic API에 전달.

import { V1Pod } from '@kubernetes/client-node';
import { AppConfig } from '../types.js';

// 더미 API 키 — Pod 내부에서 노출되어도 무해
const SANDBOX_DUMMY_API_KEY =
  'sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxxxxxxxxxxxxxxxxxx';

// API Proxy 서비스의 클러스터 내부 주소
const API_PROXY_URL =
  'http://api-proxy.claudecode-terminal.svc.cluster.local:8080';

// 유저 데이터 hostPath 베이스 경로
const USER_DATA_BASE_PATH = '/data/claude-users';

export function buildSandboxPodSpec(
  sessionId: string,
  config: AppConfig,
  userId?: string,
): V1Pod {
  // 유저당 Pod: userId가 있으면 userId 기반, 없으면 sessionId 기반 (폴백)
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
      // initContainer: subPath 마운트에는 fsGroup이 적용되지 않아 직접 chown
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
          // PV 마운트로 가려진 settings.json을 복원한 뒤 sleep infinity
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
              // Claude Code 세션/대화 데이터 영속화
              name: 'user-data',
              mountPath: '/home/claude/.claude',
              subPath: 'dot-claude',
            },
            {
              // CLAUDE.md + 학습 세션 데이터 영속화
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
