# 클러스터 아키텍처

k3s 기반 Kubernetes 클러스터의 전체 아키텍처.

---

## 현재 구성: 단일 노드

<SERVER2> 위의 k8s-node VM에서 k3s 단일 노드(Master + Worker 겸용)로 운영 중.

| 항목 | 값 |
|------|-----|
| VM | k8s-node |
| IP | <K8S_NODE_IP> |
| vCPU / RAM / Disk | 8 / 240GB / 1TB |
| K8s 배포판 | k3s v1.34.4+k3s1 |
| SSH | `<USERNAME>@<K8S_NODE_IP>` |

## 시스템 컴포넌트

k3s가 기본 제공하는 시스템 컴포넌트 (kube-system 네임스페이스):

| 컴포넌트 | 역할 |
|----------|------|
| CoreDNS | 클러스터 내부 DNS |
| Traefik | Ingress Controller (L7 로드밸런서) |
| Metrics Server | CPU/메모리 메트릭 수집 |
| Local Path Provisioner | 로컬 디스크 기반 PV 동적 프로비저닝 |

## 웹 터미널 서비스 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  사용자 브라우저                                         │
│  ┌─────────────────────┐                                │
│  │  xterm.js (CDN)     │                                │
│  │  + FitAddon          │                                │
│  └────────┬────────────┘                                │
│           │ WebSocket (ws://<K8S_NODE_IP>:31000)        │
└───────────┼─────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────┐
│  K8s 클러스터 (k8s-node)                                │
│           v                                              │
│  ┌─────────────────────────┐    claudecode-terminal NS   │
│  │ web-terminal-service    │                             │
│  │ (Express + ws)          │                             │
│  │                         │    REST API                 │
│  │ POST /api/sessions ─────┼──> Pod 생성 (kubectl)       │
│  │ DELETE /api/sessions/:id┼──> Pod 삭제                 │
│  │                         │                             │
│  │ WebSocket /terminal ────┼──> K8s exec (attach)        │
│  └────────┬────────────────┘                             │
│           │ @kubernetes/client-node                      │
│           v                                              │
│  ┌─────────────────────────┐                             │
│  │ claudecode-sandbox Pod  │  (동적 생성/삭제)            │
│  │ ├── Ubuntu 22.04        │                             │
│  │ ├── Node.js 20          │                             │
│  │ ├── Claude Code CLI     │                             │
│  │ └── /bin/bash (exec)    │                             │
│  └─────────────────────────┘                             │
└──────────────────────────────────────────────────────────┘
```

### 동작 흐름

1. 사용자가 브라우저에서 "New Session" 클릭
2. REST API로 세션 생성 요청 → K8s API로 샌드박스 Pod 생성
3. Pod Ready 후 WebSocket 연결 수립
4. WebSocket ↔ K8s exec 브릿지를 통해 터미널 I/O 중계
5. 세션 종료 시 Pod 자동 삭제

### 핵심 설계 결정

- **loadFromOptions() 사용**: `loadFromCluster()`의 `authProvider: tokenFile` 방식은 `@kubernetes/client-node` v1.x의 WebSocket exec에서 토큰이 전달되지 않음. 서비스어카운트 토큰을 직접 읽어서 `loadFromOptions()`로 주입.
- **RBAC pods/exec**: WebSocket 업그레이드가 GET으로 시작되므로 `pods/exec`에 `get` + `create` 모두 필요.
- **imagePullPolicy: Never**: 로컬 이미지를 사용하므로 외부 레지스트리 접근 불필요.

## 네임스페이스 전략

| 네임스페이스 | 용도 | 상태 |
|-------------|------|------|
| kube-system | k3s 시스템 컴포넌트 | 운영 중 |
| claudecode-terminal | 웹 터미널 서비스 + 샌드박스 Pod | 운영 중 |
| papers-frontend | Papers 프론트엔드 | 매니페스트 생성됨 |
| papers-backend | Papers 백엔드 | 매니페스트 생성됨 |
| papers-blockchain | Papers 블록체인 | 매니페스트 생성됨 |

## 향후 확장 계획: 3노드 클러스터

```
              ┌─────────────────────┐
              │ Master: <SERVER2>     │
              │ k8s-node            │
              │ <K8S_NODE_IP>       │
              │ 8vCPU / 240GB / 1TB │
              │ (CPU 워크로드)       │
              └──────┬──────────────┘
                     │
          ┌──────────┼──────────┐
          v                     v
┌──────────────────┐  ┌──────────────────┐
│ Worker 1: T640   │  │ Worker 2: T550   │
│ <ESXI_SERVER_3_IP>    │  │ <ESXI_SERVER_4_IP>     │
│ NVIDIA T4 x4     │  │ NVIDIA A2 x4     │
│ (GPU 추론)       │  │ (GPU 보조)       │
└──────────────────┘  └──────────────────┘
```

### Worker 노드 추가 절차

```bash
# 1. Master에서 조인 토큰 확인
ssh <USERNAME>@<K8S_NODE_IP> "sudo cat /var/lib/rancher/k3s/server/node-token"

# 2. Worker에서 k3s agent 설치 (join)
curl -sfL https://get.k3s.io | K3S_URL=https://<K8S_NODE_IP>:6443 K3S_TOKEN=<토큰> sh -
```

매니페스트(YAML) 변경 없이 인프라만 확장하면 된다. GPU 워크로드는 `nodeSelector`나 `tolerations`로 GPU 노드에 스케줄링.
