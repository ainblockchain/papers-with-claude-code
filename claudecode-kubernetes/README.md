# Kubernetes Infrastructure

온프렘 GPU 서버에 k3s 기반 Kubernetes를 구축하고, 웹 브라우저에서 Claude Code를 사용할 수 있는 터미널 서비스를 제공합니다.

## 아키텍처

```
Browser (xterm.js)
    │ WebSocket
    v
Web Terminal Service (Node.js + Express + ws)
    │ @kubernetes/client-node
    v
K8s API → Pod (claudecode-sandbox)           API Proxy Service
           └── Claude Code CLI (Read-only)     (ClusterIP :8080)
           └── 더미 API 키만 보유          ─→  진짜 키 주입 → api.anthropic.com
           └── ANTHROPIC_BASE_URL=proxy
```

- 유저가 "New Session"을 클릭하면 K8s Pod가 동적으로 생성됨
- WebSocket을 통해 브라우저 터미널 ↔ Pod exec 연결
- 세션 종료 시 Pod 자동 삭제

### 보안 아키텍처

- **API Key 보호**: 진짜 API 키는 API Proxy Pod에만 존재. 샌드박스 Pod에는 더미 키만 주입.
- **도구 제한**: `managed-settings.json`으로 Bash, Edit, Write 등 차단. Read/Glob/Grep만 허용.
- **네트워크 격리**: NetworkPolicy로 샌드박스 Pod → API Proxy + DNS만 통신 허용 (CNI 지원 필요).
- **권한 최소화**: sudo 제거, ServiceAccount 토큰 마운트 비활성화.

## 디렉토리 구조

```
claudecode-kubernetes/
├── api-proxy/                      # API 역방향 프록시 (더미키→진짜키 교체)
│   ├── src/                        #   Express + http-proxy-middleware
│   └── Dockerfile                  #   node:20-alpine 멀티스테이지 빌드
├── docker/                         # 컨테이너 이미지
│   ├── claudecode-sandbox/         #   유저 샌드박스 (Ubuntu + Node.js + Claude Code CLI)
│   └── web-terminal/               #   백엔드 서비스 (Express + WebSocket)
├── web-terminal/                   # 웹 터미널 애플리케이션
│   ├── public/index.html           #   프론트엔드 (xterm.js, CDN, 빌드 불필요)
│   └── src/                        #   백엔드 TypeScript 소스
│       ├── server.ts               #     Express + WebSocket 진입점
│       ├── types.ts                #     세션/설정 타입
│       ├── routes/sessions.ts      #     REST API (세션 CRUD)
│       ├── routes/stages.ts        #     스테이지 정의 조회 API
│       ├── routes/progress.ts      #     유저별 진행도 조회 API
│       ├── db/progress.ts          #     SQLite 진행도 저장소
│       ├── ws/terminal-bridge.ts   #     WebSocket ↔ K8s exec 브릿지
│       └── k8s/                    #     K8s 클라이언트 (Pod 생성/삭제/exec)
├── k8s-manifests/                  # Kubernetes 매니페스트
│   ├── namespace.yaml              #   claudecode-terminal 네임스페이스
│   ├── rbac.yaml                   #   ServiceAccount + Role (Pod exec 권한)
│   ├── configmap.yaml              #   샌드박스 설정값
│   ├── secret.yaml                 #   Claude API 키 시크릿 (템플릿)
│   ├── deployment.yaml             #   web-terminal-service 배포
│   ├── service.yaml                #   NodePort 31000 서비스
│   ├── api-proxy-deployment.yaml   #   API Proxy 배포
│   ├── api-proxy-service.yaml      #   API Proxy ClusterIP 서비스
│   ├── network-policy.yaml         #   샌드박스 네트워크 격리 (CNI 지원 필요)
│   ├── cluster/                    #   클러스터 공통 리소스 (네임스페이스, 쿼터)
│   ├── base/                       #   공통 인프라 (Ingress, 모니터링)
│   ├── apps/                       #   앱별 배포 (frontend, knowledge-graph, blockchain)
│   ├── gpu/                        #   NVIDIA GPU 지원 (향후 사용)
│   └── overlays/                   #   Kustomize 환경별 오버레이 (dev, production)
├── scripts/                        # 유틸리티 스크립트
│   ├── setup-kubeconfig.sh         #   kubeconfig 자동 설정 (Mac → k3s)
│   └── verify-node.sh              #   노드 상태 검증
└── docs/                           # 문서
    ├── cluster-setup.md            #   k3s 클러스터 구축 가이드 (Phase 0~7)
    ├── inventory.md                #   하드웨어 인벤토리
    ├── architecture.md             #   클러스터 아키텍처
    ├── frontend-integration-guide.md #  프론트엔드 통합 API 명세서
    ├── paper-repo-claude-md-template.md # 논문 레포 CLAUDE.md 작성 가이드
    ├── future-architecture-plan.md #   GitHub OAuth + passkey + 블록체인 아키텍처 계획
    └── runbooks/                   #   운영 가이드
        ├── gpu-setup.md            #     GPU 노드 셋업 (향후)
        └── troubleshooting.md      #     트러블슈팅
```

## 빠른 시작

### 사전 요구사항
- VPN 연결 + `sudo route add -net 192.168.1.0/24 -interface ppp0`
- kubeconfig: `export KUBECONFIG=~/.kube/config-k8s-node`

### 로컬 개발 (Mac)

```bash
cd web-terminal
npm install
KUBECONFIG=~/.kube/config-k8s-node npm run dev
# http://localhost:3000 에서 터미널 UI 접근
```

### K8s 배포 (k8s-node 서버)

```bash
# 1. Docker 이미지 빌드 (k8s-node에서 실행)
docker build -f docker/claudecode-sandbox/Dockerfile -t claudecode-sandbox:latest docker/claudecode-sandbox/
docker build -f docker/web-terminal/Dockerfile -t web-terminal-service:latest web-terminal/
cd api-proxy && npm install && cd ..
docker build -f api-proxy/Dockerfile -t claudecode-api-proxy:latest api-proxy/

# 2. k3s containerd에 이미지 임포트
docker save claudecode-sandbox:latest | sudo k3s ctr images import -
docker save web-terminal-service:latest | sudo k3s ctr images import -
docker save claudecode-api-proxy:latest | sudo k3s ctr images import -

# 3. K8s 리소스 배포
kubectl apply -f k8s-manifests/namespace.yaml
kubectl apply -f k8s-manifests/rbac.yaml
kubectl apply -f k8s-manifests/configmap.yaml
kubectl apply -f k8s-manifests/secret.yaml           # API 키 시크릿 (사전 생성 필요)
kubectl apply -f k8s-manifests/api-proxy-deployment.yaml
kubectl apply -f k8s-manifests/api-proxy-service.yaml
kubectl apply -f k8s-manifests/deployment.yaml
kubectl apply -f k8s-manifests/service.yaml
# (선택) CNI가 NetworkPolicy 지원하는 경우:
# kubectl apply -f k8s-manifests/network-policy.yaml

# 4. 접속 확인
open http://192.168.1.100:31000
```

## 인프라 현황

| 항목 | 값 |
|------|-----|
| K8s 노드 | k8s-node (192.168.1.100) |
| 호스트 | DELCOM2 (Dell PowerEdge T640) |
| K8s 배포판 | k3s v1.34.4+k3s1 |
| vCPU / RAM | 8 / 240 GB |
| 서비스 포트 | NodePort 31000 |
| 동시 세션 | 최대 4개 |
