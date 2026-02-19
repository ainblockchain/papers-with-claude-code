// 샌드박스 Pod 스펙 생성
// 세션마다 격리된 Pod을 생성하기 위한 K8s Pod 매니페스트를 빌드
// Pod은 sleep infinity로 유지되고, exec으로 claude를 직접 실행
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

export function buildSandboxPodSpec(sessionId: string, config: AppConfig): V1Pod {
  const shortId = sessionId.slice(0, 8);
  const podName = `claude-session-${shortId}`;

  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: podName,
      namespace: config.sandboxNamespace,
      labels: {
        app: 'claudecode-sandbox',
        'session-id': sessionId,
      },
      annotations: {
        'claudecode/created-at': new Date().toISOString(),
      },
    },
    spec: {
      activeDeadlineSeconds: config.sessionTimeoutSeconds,
      restartPolicy: 'Never',
      // K8s API 서버 접근 차단 — SA 토큰 마운트 비활성화
      automountServiceAccountToken: false,
      containers: [
        {
          name: 'sandbox',
          image: config.sandboxImage,
          imagePullPolicy: 'Never',
          command: ['sleep', 'infinity'],
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
              // 더미 API 키 — 프록시에서 진짜 키로 교체됨
              name: 'ANTHROPIC_API_KEY',
              value: SANDBOX_DUMMY_API_KEY,
            },
            {
              // API 프록시 주소 — Claude Code가 이 URL로 API 요청을 보냄
              name: 'ANTHROPIC_BASE_URL',
              value: API_PROXY_URL,
            },
          ],
        },
      ],
    },
  };
}
