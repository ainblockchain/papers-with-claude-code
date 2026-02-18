export interface PasskeyCredential {
  credentialId: string;
  publicKey: string; // hex-encoded compressed P256 public key
  ainAddress: string;
  createdAt: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}
