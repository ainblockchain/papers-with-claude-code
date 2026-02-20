# API Proxy

A reverse proxy that relays Anthropic API requests from sandbox Pods. Replaces the dummy API key in the Pod with the real key loaded from a K8s Secret, then forwards to `api.anthropic.com`.

## Structure

```
api-proxy/
├── src/
│   ├── server.ts        # Express entry point, health check
│   ├── proxy.ts         # Core proxy logic (x-api-key header replacement, SSE streaming)
│   └── rate-limiter.ts  # Pod IP-based rate limiting at 30 requests per minute
├── Dockerfile           # node:20-alpine multi-stage build
├── package.json
└── tsconfig.json
```

## Allowed Paths

API paths accessible through the proxy (all others return 403):
- `POST /v1/messages` — Message creation (including SSE streaming)
- `POST /v1/messages/count_tokens` — Token count calculation

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Real Anthropic API key (injected from K8s Secret) |
| `PORT` | No | Listening port (default: 8080) |

## Build & Deploy

```bash
# Local build
npm install && npm run build

# Docker image
docker build -t claudecode-api-proxy:latest .

# k3s import
docker save claudecode-api-proxy:latest | sudo k3s ctr images import -

# K8s deployment
kubectl apply -f ../k8s-manifests/api-proxy-deployment.yaml
kubectl apply -f ../k8s-manifests/api-proxy-service.yaml
```
