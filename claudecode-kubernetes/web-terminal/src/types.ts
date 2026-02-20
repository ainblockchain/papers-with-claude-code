// Session and configuration type definitions

export interface Session {
  id: string;
  podName: string;
  namespace: string;
  status: 'creating' | 'running' | 'terminating' | 'terminated';
  createdAt: Date;
  claudeMdUrl?: string;
  userId?: string;
  courseId?: string;
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
  // x402 payment settings (facilitator-based)
  x402MerchantWallet: string;
  x402StagePrice: string;
  x402FacilitatorUrl: string;
}
