# K8s Cluster Setup Guide

A runbook documenting the entire process of building a k3s single-node cluster on the <SERVER2> server.
Following this document, you can reproduce the same environment from scratch.

---

## Environment Summary

### Target Server

| Item | Value |
|------|-------|
| Server | <SERVER2> (Dell PowerEdge T640) |
| ESXi IP | <ESXI_SERVER_1_IP> |
| CPU | 20-core Xeon Silver 4210 @ 2.20GHz |
| RAM | 255.62 GB |
| Storage | datastore1 (765.5GB) + datastore2 (1.82TB) |

### VM to Create

| Item | Value |
|------|-------|
| Hostname | k8s-node |
| IP | <K8S_NODE_IP> (static) |
| OS | Ubuntu 22.04 LTS Server |
| vCPU | 8 (ESXi license limitation) |
| RAM | 240 GB |
| Disk | 1 TB (thin provisioned) |
| K8s | k3s (single node, serving as both master + worker) |

### Network Access Requirements

```bash
# 1. VPN connection (company VPN)
# 2. Add routing
sudo route add -net <SUBNET> -interface ppp0
```

---

## Phase 0: Environment Verification

### Server Access Test

```bash
ping <ESXI_SERVER_1_IP>   # <SERVER2> (ESXi)
ping <ESXI_SERVER_3_IP>  # T640
ping <ESXI_SERVER_4_IP>   # T550
ping <ESXI_SERVER_2_IP>   # <SERVER1> (unavailable — 22 VMs, RAM 91%)
```

### ESXi Web UI Access

Access `https://<ESXI_SERVER_1_IP>/ui` in the browser → log in as root

### Server Survey Results

| Server | IP | VM Count | RAM Usage | Verdict |
|--------|-----|----------|-----------|---------|
| <SERVER1> | <ESXI_SERVER_2_IP> | 22 | 91% | Unavailable (company services) |
| **<SERVER2>** | **<ESXI_SERVER_1_IP>** | **14** | **44%** | **For K8s — VM deletion approved** |
| T640 | <ESXI_SERVER_3_IP> | 2 | Unconfirmed | Future Worker expansion (T4 GPU x 4) |
| T550 | <ESXI_SERVER_4_IP> | 4 | Unconfirmed | Future Worker expansion (A2 GPU x 4) |

---

## Phase 1: VM Creation + Ubuntu Installation

### 1-1. Delete Existing VMs

ESXi Web UI → Virtual Machines → Power off each VM → Delete from disk
- Delete all 14 existing VMs on <SERVER2>
- Confirm 0 virtual machines after deletion

### 1-2. Verify Datastore

```bash
# SSH into ESXi
ssh root@<ESXI_SERVER_1_IP>

# Check datastore capacity
df -h /vmfs/volumes/datastore1 /vmfs/volumes/datastore2
# datastore1: 765.5G (used 7.7G)
# datastore2: 1.8T  (used 3.3G) ← VM creation location

# Check ISO (reuse existing ISO)
ls /vmfs/volumes/datastore2/
# ubuntu-22.04.2-live-server-amd64.iso (1.8G) ← already exists
```

If ISO is not present:
```bash
cd /vmfs/volumes/datastore2/
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso
```

Clean up leftover folders:
```bash
# Delete if empty folders remain
rmdir /vmfs/volumes/datastore2/delcom2-vm5
```

### 1-3. Create VM

ESXi Web UI → Virtual Machines → Create/Register VM → Create a new virtual machine

| Item | Value | Notes |
|------|-------|-------|
| Name | k8s-node | |
| Guest OS | Linux / Ubuntu Linux (64-bit) | |
| Storage | datastore2 | 1.82TB capacity |
| CPU | 8 | ESXi license limitation (free edition 8 vCPU limit) |
| Memory | 240 GB | 240GB out of host's 255GB |
| Hard Disk | 1 TB | **Must use thin provisioning** |
| CD/DVD | Datastore ISO → ubuntu-22.04.2 | **Check "Connect at power on"** |
| Network | VM Network | VMXNET 3 |

> **Warning**: Setting disk provisioning to "Thick" will immediately allocate 1TB.
> Be sure to set it to "Thin".

### 1-4. Install Ubuntu

Power on VM → Open console → Proceed with Ubuntu installation

Key settings:
- **Language/Keyboard**: English (default)
- **Network**: Static IP <K8S_NODE_IP>/24, gateway <GATEWAY_IP>, DNS 8.8.8.8
- **Storage**: Use LVM, **change ubuntu-lv size to maximum (~1020G)** (default 100G → manual expansion required)
- **Profile**: username `<USERNAME>`, hostname `k8s-node`
- **SSH**: Install OpenSSH server **checked**
- **Ubuntu Pro**: Skip
- **Featured Snaps**: Do not select anything

> **Warning**: During Ubuntu installation, the LVM root volume is allocated only 100GB by default.
> Be sure to manually expand ubuntu-lv to full capacity.

### 1-5. K8s Base Configuration

After Ubuntu installation, connect via SSH and configure:

```bash
# Disable swap (K8s mandatory requirement)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# Load kernel modules
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay
sudo modprobe br_netfilter

# sysctl network configuration
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

# Update packages
sudo apt update && sudo apt upgrade -y
```

Verification:
```bash
free -h | grep Swap        # Confirm Swap: 0B
lsmod | grep br_netfilter  # Confirm module loaded
sysctl net.ipv4.ip_forward # Confirm = 1
```

### 1-6. SSH Key + sudo Configuration

Run on Mac:
```bash
# Generate SSH key if not present
ssh-keygen -t ed25519

# Copy public key to server
ssh-copy-id <USERNAME>@<K8S_NODE_IP>
```

Run on server (to enable passwordless sudo):
```bash
sudo visudo
# Add at the bottom:
# <USERNAME> ALL=(ALL) NOPASSWD:ALL
```

Verification:
```bash
# Confirm passwordless SSH + sudo from Mac
ssh <USERNAME>@<K8S_NODE_IP> "sudo whoami"
# Output: root
```

### 1-7. ESXi Snapshot

ESXi Web UI → k8s-node → Snapshots → Take snapshot
- Name: `clean-ubuntu-base`
- Description: Ubuntu 22.04 + swap off + kernel modules + sysctl + SSH key

---

## Phase 2: k3s Installation

### Install k3s

```bash
ssh <USERNAME>@<K8S_NODE_IP> "curl -sfL https://get.k3s.io | sh -"
```

### Installation Verification

```bash
# Check node status
ssh <USERNAME>@<K8S_NODE_IP> "sudo kubectl get nodes"
# NAME       STATUS   ROLES           AGE   VERSION
# k8s-node   Ready    control-plane   66s   v1.34.4+k3s1

# Check system Pods
ssh <USERNAME>@<K8S_NODE_IP> "sudo kubectl get pods -A"
# kube-system   coredns-...                  Running
# kube-system   traefik-...                  Running
# kube-system   metrics-server-...           Running
# kube-system   local-path-provisioner-...   Running
```

### kubeconfig Setup (Using kubectl from Mac)

```bash
# Copy kubeconfig + modify IP
mkdir -p ~/.kube
ssh <USERNAME>@<K8S_NODE_IP> "sudo cat /etc/rancher/k3s/k3s.yaml" \
  | sed 's/127.0.0.1/<K8S_NODE_IP>/' > ~/.kube/config-k8s-node

# Usage
KUBECONFIG=~/.kube/config-k8s-node kubectl get nodes
```

---

## Phase 7: Claude Code Web Service Deployment

Deploy a terminal service that enables using Claude Code from a web browser.

### 7-1. Install Docker (k8s-node)

Docker is needed for building images (separate from k3s containerd).

```bash
ssh <USERNAME>@<K8S_NODE_IP>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Reconnect to apply docker group membership
exit
ssh <USERNAME>@<K8S_NODE_IP>

# Verify installation
docker --version
```

### 7-2. Transfer Source Code

Transfer the project source to the k8s-node server.

```bash
# Run on Mac
scp -r claudecode-kubernetes/ <USERNAME>@<K8S_NODE_IP>:~/claudecode-kubernetes/
```

### 7-3. Build Docker Images

```bash
ssh <USERNAME>@<K8S_NODE_IP>
cd ~/claudecode-kubernetes

# 1. Sandbox image (user environment: Ubuntu + Node.js + Claude Code CLI)
docker build -f docker/claudecode-sandbox/Dockerfile -t claudecode-sandbox:latest .

# 2. Web terminal service image (Express + WebSocket backend)
docker build -f docker/web-terminal/Dockerfile -t web-terminal-service:latest web-terminal/
```

### 7-4. Import Images to k3s containerd

Since k3s uses containerd rather than Docker, built images must be imported into containerd.

```bash
docker save claudecode-sandbox:latest | sudo k3s ctr images import -
docker save web-terminal-service:latest | sudo k3s ctr images import -

# Verify import
sudo k3s ctr images list | grep -E "claudecode-sandbox|web-terminal"
```

### 7-5. Deploy K8s Manifests

Order matters: Namespace → RBAC → Secret → ConfigMap → Deployment → Service.

```bash
cd ~/claudecode-kubernetes

# 1. Create namespace
kubectl apply -f k8s-manifests/namespace.yaml

# 2. RBAC (ServiceAccount + Role + RoleBinding)
kubectl apply -f k8s-manifests/rbac.yaml

# 3. Claude API key secret (create via CLI — do not put key in YAML)
kubectl create secret generic claude-api-key \
  -n claudecode-terminal \
  --from-literal=ANTHROPIC_API_KEY=<YOUR_ANTHROPIC_API_KEY>

# 4. ConfigMap (sandbox Pod configuration)
kubectl apply -f k8s-manifests/configmap.yaml

# 5. Deployment (web terminal service)
kubectl apply -f k8s-manifests/deployment.yaml

# 6. Service (NodePort 31000)
kubectl apply -f k8s-manifests/service.yaml
```

### 7-6. Deployment Verification

```bash
# Check Pod status (should be Running)
kubectl get pods -n claudecode-terminal
# NAME                                    READY   STATUS    RESTARTS   AGE
# web-terminal-service-xxxxxxxxx-xxxxx    1/1     Running   0          30s

# Check service
kubectl get svc -n claudecode-terminal
# NAME                   TYPE       CLUSTER-IP    EXTERNAL-IP   PORT(S)
# web-terminal-service   NodePort   10.x.x.x     <none>        80:31000/TCP

# Check logs (ensure no errors)
kubectl logs -n claudecode-terminal deployment/web-terminal-service

# Web UI access test
curl -s http://<K8S_NODE_IP>:31000/health
# {"status":"ok"} means success

# Access from browser
# http://<K8S_NODE_IP>:31000
```

### 7-7. If Issues Occur

- `ImagePullBackOff`: Verify `imagePullPolicy: Never`, verify image import
- `403 Forbidden` on exec: Verify RBAC `pods/exec` has `get` + `create`
- If onboarding screen appears: Verify sandbox image includes `~/.claude/.claude.json`
- Detailed troubleshooting: See `docs/runbooks/troubleshooting.md`

---

## Next Steps (Not Yet Implemented)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 3 | Write cluster base manifests | ✅ Done |
| Phase 4 | First deployment and verification | ✅ Done |
| Phase 5 | GPU support (ESXi Passthrough + NVIDIA Device Plugin) | ⬜ |
| Phase 6 | CI/CD pipeline (GitHub Actions / Bitbucket) | ⬜ |
| Phase 7 | Claude Code web service (xterm.js + dynamic Pod creation) | ✅ Done |

### Future Node Expansion (Adding Workers)

When adding Worker nodes, repeat VM creation + Ubuntu installation from Phase 1 above, then:

```bash
# Check token on Master node
ssh <USERNAME>@<K8S_NODE_IP> "sudo cat /var/lib/rancher/k3s/server/node-token"

# Join from Worker node
curl -sfL https://get.k3s.io | K3S_URL=https://<K8S_NODE_IP>:6443 K3S_TOKEN=<token> sh -
```

Only the infrastructure needs to be expanded without any manifest (YAML) changes.

---

## Troubleshooting

### Cannot Access ESXi Web UI
- Check VPN connection
- Verify `sudo route add -net <SUBNET> -interface ppp0` was executed
- Use `https://` (not http) in the browser

### VM Does Not Boot from ISO
- VM Settings → CD/DVD → Verify "Connect at power on" is checked
- Verify ISO path is specified in CD/DVD media

### Ubuntu LVM Root Volume Only Allocated 100GB
If manual expansion was not done during installation, it can be expanded after installation:
```bash
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
```

### Node is NotReady After k3s Installation
```bash
# Check k3s service status
sudo systemctl status k3s

# Check logs
sudo journalctl -u k3s -f
```

### Cannot Connect kubectl from Mac
- Check VPN + route
- Verify kubeconfig IP is <K8S_NODE_IP>: `cat ~/.kube/config-k8s-node | grep server`
- Check firewall: `ssh <USERNAME>@<K8S_NODE_IP> "sudo ufw status"` (should be disabled)
