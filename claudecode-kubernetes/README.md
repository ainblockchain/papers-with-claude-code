# Kubernetes Infrastructure

Builds a k3s-based Kubernetes cluster on on-premises GPU servers and provides a terminal service that allows using Claude Code from a web browser.

## Architecture

```
Browser (xterm.js)
    │ WebSocket
    v
Web Terminal Service (Node.js + Express + ws)
    │ @kubernetes/client-node
    v
K8s API → Pod (claudecode-sandbox)           API Proxy Service
           └── Claude Code CLI (Read-only)     (ClusterIP :8080)
           └── Only holds dummy API key     ─→  Real key injection → api.anthropic.com
           └── ANTHROPIC_BASE_URL=proxy
```

- When a user clicks "New Session", a K8s Pod is dynamically created
- Browser terminal ↔ Pod exec connection via WebSocket
- Pod is automatically deleted when the session ends

### Security Architecture

- **API Key Protection**: Real API key exists only in the API Proxy Pod. Only a dummy key is injected into sandbox Pods.
- **Tool Restrictions**: Bash, Edit, Write, etc. are blocked via `managed-settings.json`. Only Read/Glob/Grep are allowed.
- **Network Isolation**: NetworkPolicy allows sandbox Pod communication only to API Proxy + DNS (requires CNI support).
- **Least Privilege**: sudo removed, ServiceAccount token mount disabled.

## Directory Structure

```
claudecode-kubernetes/
├── api-proxy/                      # API reverse proxy (dummy key → real key replacement)
│   ├── src/                        #   Express + http-proxy-middleware
│   └── Dockerfile                  #   node:20-alpine multi-stage build
├── docker/                         # Container images
│   ├── claudecode-sandbox/         #   User sandbox (Ubuntu + Node.js + Claude Code CLI)
│   └── web-terminal/               #   Backend service (Express + WebSocket)
├── web-terminal/                   # Web terminal application
│   ├── public/index.html           #   Frontend (xterm.js, CDN, no build required)
│   └── src/                        #   Backend TypeScript source
│       ├── server.ts               #     Express + WebSocket entry point
│       ├── types.ts                #     Session/config types
│       ├── routes/sessions.ts      #     REST API (session CRUD)
│       ├── routes/stages.ts        #     Stage definition query API
│       ├── routes/progress.ts      #     Per-user progress query API
│       ├── db/progress.ts          #     SQLite progress store
│       ├── ws/terminal-bridge.ts   #     WebSocket ↔ K8s exec bridge
│       └── k8s/                    #     K8s client (Pod create/delete/exec)
├── k8s-manifests/                  # Kubernetes manifests
│   ├── namespace.yaml              #   claudecode-terminal namespace
│   ├── rbac.yaml                   #   ServiceAccount + Role (Pod exec permissions)
│   ├── configmap.yaml              #   Sandbox configuration values
│   ├── secret.yaml                 #   Claude API key secret (template)
│   ├── deployment.yaml             #   web-terminal-service deployment
│   ├── service.yaml                #   NodePort 31000 service
│   ├── api-proxy-deployment.yaml   #   API Proxy deployment
│   ├── api-proxy-service.yaml      #   API Proxy ClusterIP service
│   ├── network-policy.yaml         #   Sandbox network isolation (requires CNI support)
│   ├── cluster/                    #   Cluster common resources (namespaces, quotas)
│   ├── base/                       #   Common infrastructure (Ingress, monitoring)
│   ├── apps/                       #   Per-app deployments (frontend, knowledge-graph, blockchain)
│   ├── gpu/                        #   NVIDIA GPU support (future use)
│   └── overlays/                   #   Kustomize per-environment overlays (dev, production)
├── scripts/                        # Utility scripts
│   ├── setup-kubeconfig.sh         #   kubeconfig auto-setup (Mac → k3s)
│   └── verify-node.sh              #   Node status verification
└── docs/                           # Documentation
    ├── cluster-setup.md            #   k3s cluster setup guide (Phase 0~7)
    ├── inventory.md                #   Hardware inventory
    ├── architecture.md             #   Cluster architecture
    ├── frontend-integration-guide.md #  Frontend integration API specification
    ├── paper-repo-claude-md-template.md # Paper repo CLAUDE.md authoring guide
    ├── future-architecture-plan.md #   GitHub OAuth + passkey + blockchain architecture plan
    └── runbooks/                   #   Operations guides
        ├── gpu-setup.md            #     GPU node setup (future)
        └── troubleshooting.md      #     Troubleshooting
```

## Quick Start

### Prerequisites
- VPN connection + `sudo route add -net <SUBNET> -interface ppp0`
- kubeconfig: `export KUBECONFIG=~/.kube/config-k8s-node`

### Local Development (Mac)

```bash
cd web-terminal
npm install
KUBECONFIG=~/.kube/config-k8s-node npm run dev
# Access terminal UI at http://localhost:3000
```

### K8s Deployment (k8s-node server)

```bash
# 1. Build Docker images (run on k8s-node)
docker build -f docker/claudecode-sandbox/Dockerfile -t claudecode-sandbox:latest docker/claudecode-sandbox/
docker build -f docker/web-terminal/Dockerfile -t web-terminal-service:latest web-terminal/
cd api-proxy && npm install && cd ..
docker build -f api-proxy/Dockerfile -t claudecode-api-proxy:latest api-proxy/

# 2. Import images to k3s containerd
docker save claudecode-sandbox:latest | sudo k3s ctr images import -
docker save web-terminal-service:latest | sudo k3s ctr images import -
docker save claudecode-api-proxy:latest | sudo k3s ctr images import -

# 3. Deploy K8s resources
kubectl apply -f k8s-manifests/namespace.yaml
kubectl apply -f k8s-manifests/rbac.yaml
kubectl apply -f k8s-manifests/configmap.yaml
kubectl apply -f k8s-manifests/secret.yaml           # API key secret (must be pre-created)
kubectl apply -f k8s-manifests/api-proxy-deployment.yaml
kubectl apply -f k8s-manifests/api-proxy-service.yaml
kubectl apply -f k8s-manifests/deployment.yaml
kubectl apply -f k8s-manifests/service.yaml
# (Optional) If the CNI supports NetworkPolicy:
# kubectl apply -f k8s-manifests/network-policy.yaml

# 4. Verify access
open http://<K8S_NODE_IP>:31000
```

## Infrastructure Status

| Item | Value |
|------|-------|
| K8s Node | k8s-node (<K8S_NODE_IP>) |
| Host | <SERVER2> (Dell PowerEdge T640) |
| K8s Distribution | k3s v1.34.4+k3s1 |
| vCPU / RAM | 8 / 240 GB |
| Service Port | NodePort 31000 |
| Concurrent Sessions | Up to 4 |
