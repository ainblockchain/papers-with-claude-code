# API Proxy

샌드박스 Pod의 Anthropic API 요청을 중계하는 역방향 프록시. Pod 내의 더미 API 키를 K8s Secret에서 로드한 진짜 키로 교체 후 `api.anthropic.com`으로 전달.

## 구조

```
api-proxy/
├── src/
│   ├── server.ts        # Express 진입점, health check
│   ├── proxy.ts         # 핵심 프록시 로직 (x-api-key 헤더 교체, SSE 스트리밍)
│   └── rate-limiter.ts  # Pod IP 기반 분당 30회 요청 제한
├── Dockerfile           # node:20-alpine 멀티스테이지 빌드
├── package.json
└── tsconfig.json
```

## 허용 경로

프록시를 통해 접근 가능한 API 경로 (나머지는 403):
- `POST /v1/messages` — 메시지 생성 (SSE 스트리밍 포함)
- `POST /v1/messages/count_tokens` — 토큰 수 계산

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Yes | 진짜 Anthropic API 키 (K8s Secret에서 주입) |
| `PORT` | No | 리스닝 포트 (기본: 8080) |

## 빌드 & 배포

```bash
# 로컬 빌드
npm install && npm run build

# Docker 이미지
docker build -t claudecode-api-proxy:latest .

# k3s 임포트
docker save claudecode-api-proxy:latest | sudo k3s ctr images import -

# K8s 배포
kubectl apply -f ../k8s-manifests/api-proxy-deployment.yaml
kubectl apply -f ../k8s-manifests/api-proxy-service.yaml
```
