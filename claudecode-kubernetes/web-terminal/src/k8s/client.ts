// Kubernetes client initialization
// Loading strategy: use KUBECONFIG env var if set,
// otherwise manually configure with in-cluster service account token,
// and fall back to default kubeconfig (~/.kube/config) if that also fails.
//
// [Important] In-cluster mode: loadFromCluster() uses authProvider: tokenFile,
// but @kubernetes/client-node v1.x Exec (WebSocket) fails to pass the token.
// So in-cluster mode uses loadFromOptions() to embed the token directly.

import * as k8s from '@kubernetes/client-node';
import { readFileSync, existsSync } from 'fs';

const kc = new k8s.KubeConfig();

const SA_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';
const SA_CA_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';

if (process.env.KUBECONFIG) {
  kc.loadFromFile(process.env.KUBECONFIG);
  console.log(`[k8s-client] Loaded kubeconfig from file: ${process.env.KUBECONFIG}`);
} else if (existsSync(SA_TOKEN_PATH)) {
  // in-cluster: configure with loadFromOptions() to embed token directly
  // Used instead of loadFromCluster() so the token is properly passed in Exec WebSocket
  const token = readFileSync(SA_TOKEN_PATH, 'utf-8').trim();
  kc.loadFromOptions({
    clusters: [{
      name: 'in-cluster',
      server: 'https://kubernetes.default.svc',
      caFile: SA_CA_PATH,
    }],
    users: [{
      name: 'sa-user',
      token,
    }],
    contexts: [{
      name: 'in-cluster-ctx',
      cluster: 'in-cluster',
      user: 'sa-user',
    }],
    currentContext: 'in-cluster-ctx',
  });
  console.log('[k8s-client] Loaded in-cluster config (manual token injection for exec support)');
} else {
  try {
    kc.loadFromDefault();
    console.log('[k8s-client] Loaded default kubeconfig (~/.kube/config)');
  } catch {
    console.error('[k8s-client] Failed to load any kubeconfig');
  }
}

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

export { kc, k8sApi };
