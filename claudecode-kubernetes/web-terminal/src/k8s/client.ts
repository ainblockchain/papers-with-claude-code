// Kubernetes 클라이언트 초기화
// 로딩 전략: KUBECONFIG 환경변수가 있으면 해당 파일에서 로드,
// 없으면 클러스터 내부 서비스어카운트 토큰으로 수동 구성,
// 그것도 실패하면 기본 kubeconfig(~/.kube/config)에서 로드
//
// [중요] in-cluster 모드에서 loadFromCluster()는 authProvider: tokenFile 방식을 사용하는데,
// @kubernetes/client-node v1.x의 Exec(WebSocket)에서 이 토큰이 전달되지 않는 이슈가 있음.
// 따라서 in-cluster 모드에서는 loadFromOptions()로 토큰을 직접 포함시켜 구성한다.

import * as k8s from '@kubernetes/client-node';
import { readFileSync, existsSync } from 'fs';

const kc = new k8s.KubeConfig();

const SA_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';
const SA_CA_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';

if (process.env.KUBECONFIG) {
  kc.loadFromFile(process.env.KUBECONFIG);
  console.log(`[k8s-client] Loaded kubeconfig from file: ${process.env.KUBECONFIG}`);
} else if (existsSync(SA_TOKEN_PATH)) {
  // in-cluster: loadFromOptions()로 토큰을 직접 포함하여 구성
  // loadFromCluster() 대신 사용하여 Exec WebSocket에서도 토큰이 정상 전달되도록 함
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
