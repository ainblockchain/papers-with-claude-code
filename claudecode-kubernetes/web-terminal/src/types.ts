// 세션 및 설정 타입 정의

export interface Session {
  id: string;
  podName: string;
  namespace: string;
  status: 'creating' | 'running' | 'terminating' | 'terminated';
  createdAt: Date;
  repoUrl?: string;
  userId?: string;
}

export interface AppConfig {
  sandboxImage: string;
  sandboxNamespace: string;
  podCpuRequest: string;
  podCpuLimit: string;
  podMemoryRequest: string;
  podMemoryLimit: string;
  sessionTimeoutSeconds: number;
  maxSessions: number;
  port: number;
}
