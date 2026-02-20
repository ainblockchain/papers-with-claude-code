# Cluster Architecture

Overall architecture of the k3s-based Kubernetes cluster.

---

## Current Configuration: Single Node

Running as a k3s single node (serving as both Master + Worker) on the k8s-node VM on <SERVER2>.

| Item | Value |
|------|-------|
| VM | k8s-node |
| IP | <K8S_NODE_IP> |
| vCPU / RAM / Disk | 8 / 240GB / 1TB |
| K8s Distribution | k3s v1.34.4+k3s1 |
| SSH | `<USERNAME>@<K8S_NODE_IP>` |

## System Components

System components provided by k3s out of the box (kube-system namespace):

| Component | Role |
|-----------|------|
| CoreDNS | Cluster internal DNS |
| Traefik | Ingress Controller (L7 load balancer) |
| Metrics Server | CPU/memory metrics collection |
| Local Path Provisioner | Local disk-based dynamic PV provisioning |

## Web Terminal Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User Browser                                            │
│  ┌─────────────────────┐                                │
│  │  xterm.js (CDN)     │                                │
│  │  + FitAddon          │                                │
│  └────────┬────────────┘                                │
│           │ WebSocket (ws://<K8S_NODE_IP>:31000)        │
└───────────┼─────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────┐
│  K8s Cluster (k8s-node)                                 │
│           v                                              │
│  ┌─────────────────────────┐    claudecode-terminal NS   │
│  │ web-terminal-service    │                             │
│  │ (Express + ws)          │                             │
│  │                         │    REST API                 │
│  │ POST /api/sessions ─────┼──> Pod creation (kubectl)   │
│  │ DELETE /api/sessions/:id┼──> Pod deletion             │
│  │                         │                             │
│  │ WebSocket /terminal ────┼──> K8s exec (attach)        │
│  └────────┬────────────────┘                             │
│           │ @kubernetes/client-node                      │
│           v                                              │
│  ┌─────────────────────────┐                             │
│  │ claudecode-sandbox Pod  │  (dynamically created/deleted) │
│  │ ├── Ubuntu 22.04        │                             │
│  │ ├── Node.js 20          │                             │
│  │ ├── Claude Code CLI     │                             │
│  │ └── /bin/bash (exec)    │                             │
│  └─────────────────────────┘                             │
└──────────────────────────────────────────────────────────┘
```

### Operation Flow

1. User clicks "New Session" in the browser
2. Session creation request via REST API → Sandbox Pod creation via K8s API
3. WebSocket connection established after Pod is Ready
4. Terminal I/O relayed through WebSocket ↔ K8s exec bridge
5. Pod is automatically deleted when the session ends

### Key Design Decisions

- **Using loadFromOptions()**: The `authProvider: tokenFile` approach of `loadFromCluster()` does not pass the token in WebSocket exec with `@kubernetes/client-node` v1.x. The ServiceAccount token is read directly and injected via `loadFromOptions()`.
- **RBAC pods/exec**: Since the WebSocket upgrade starts with a GET, both `get` + `create` verbs are required for `pods/exec`.
- **imagePullPolicy: Never**: Using local images, so no external registry access is needed.

## Namespace Strategy

| Namespace | Purpose | Status |
|-----------|---------|--------|
| kube-system | k3s system components | In operation |
| claudecode-terminal | Web terminal service + sandbox Pods | In operation |
| papers-frontend | Papers frontend | Manifests created |
| papers-backend | Papers backend | Manifests created |
| papers-blockchain | Papers blockchain | Manifests created |

## Future Expansion Plan: 3-Node Cluster

```
              ┌─────────────────────┐
              │ Master: <SERVER2>     │
              │ k8s-node            │
              │ <K8S_NODE_IP>       │
              │ 8vCPU / 240GB / 1TB │
              │ (CPU workloads)      │
              └──────┬──────────────┘
                     │
          ┌──────────┼──────────┐
          v                     v
┌──────────────────┐  ┌──────────────────┐
│ Worker 1: T640   │  │ Worker 2: T550   │
│ <ESXI_SERVER_3_IP>    │  │ <ESXI_SERVER_4_IP>     │
│ NVIDIA T4 x4     │  │ NVIDIA A2 x4     │
│ (GPU inference)  │  │ (GPU auxiliary)  │
└──────────────────┘  └──────────────────┘
```

### Worker Node Addition Procedure

```bash
# 1. Check join token on Master
ssh <USERNAME>@<K8S_NODE_IP> "sudo cat /var/lib/rancher/k3s/server/node-token"

# 2. Install k3s agent on Worker (join)
curl -sfL https://get.k3s.io | K3S_URL=https://<K8S_NODE_IP>:6443 K3S_TOKEN=<token> sh -
```

Only the infrastructure needs to be expanded without any manifest (YAML) changes. GPU workloads are scheduled to GPU nodes using `nodeSelector` or `tolerations`.
