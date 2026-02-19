# K8s 클러스터 구축 가이드

<SERVER2> 서버에 k3s 단일 노드 클러스터를 구축하는 전체 과정을 기록한 runbook.
이 문서를 따라하면 처음부터 동일한 환경을 재현할 수 있다.

---

## 환경 요약

### 대상 서버

| 항목 | 값 |
|------|-----|
| 서버 | <SERVER2> (Dell PowerEdge T640) |
| ESXi IP | <ESXI_SERVER_1_IP> |
| CPU | 20코어 Xeon Silver 4210 @ 2.20GHz |
| RAM | 255.62 GB |
| Storage | datastore1 (765.5GB) + datastore2 (1.82TB) |

### 생성할 VM

| 항목 | 값 |
|------|-----|
| 호스트명 | k8s-node |
| IP | <K8S_NODE_IP> (고정) |
| OS | Ubuntu 22.04 LTS Server |
| vCPU | 8 (ESXi 라이센스 제한) |
| RAM | 240 GB |
| Disk | 1 TB (thin provisioned) |
| K8s | k3s (single node, master + worker 겸용) |

### 네트워크 접속 조건

```bash
# 1. VPN 연결 (회사 VPN)
# 2. 라우팅 추가
sudo route add -net <SUBNET> -interface ppp0
```

---

## Phase 0: 환경 확인

### 서버 접근 테스트

```bash
ping <ESXI_SERVER_1_IP>   # <SERVER2> (ESXi)
ping <ESXI_SERVER_3_IP>  # T640
ping <ESXI_SERVER_4_IP>   # T550
ping <ESXI_SERVER_2_IP>   # <SERVER1> (사용 불가 — VM 22개, RAM 91%)
```

### ESXi 웹 UI 접근

브라우저에서 `https://<ESXI_SERVER_1_IP>/ui` 접속 → root 로그인

### 서버 현황 조사 결과

| 서버 | IP | VM 수 | RAM 사용 | 판정 |
|------|-----|-------|---------|------|
| <SERVER1> | <ESXI_SERVER_2_IP> | 22개 | 91% | 사용 불가 (회사 서비스) |
| **<SERVER2>** | **<ESXI_SERVER_1_IP>** | **14개** | **44%** | **K8s용 — VM 삭제 승인 완료** |
| T640 | <ESXI_SERVER_3_IP> | 2개 | 미확인 | 향후 Worker 확장용 (T4 GPU × 4) |
| T550 | <ESXI_SERVER_4_IP> | 4개 | 미확인 | 향후 Worker 확장용 (A2 GPU × 4) |

---

## Phase 1: VM 생성 + Ubuntu 설치

### 1-1. 기존 VM 삭제

ESXi 웹 UI → 가상 시스템 → 각 VM 전원 끄기 → 디스크에서 삭제
- <SERVER2>의 기존 VM 14개 전부 삭제
- 삭제 후 가상 시스템 0개 확인

### 1-2. 데이터스토어 확인

```bash
# ESXi SSH 접속
ssh root@<ESXI_SERVER_1_IP>

# 데이터스토어 용량 확인
df -h /vmfs/volumes/datastore1 /vmfs/volumes/datastore2
# datastore1: 765.5G (사용 7.7G)
# datastore2: 1.8T  (사용 3.3G) ← VM 생성 위치

# ISO 확인 (기존에 있던 ISO 재활용)
ls /vmfs/volumes/datastore2/
# ubuntu-22.04.2-live-server-amd64.iso (1.8G) ← 이미 존재
```

ISO가 없는 경우:
```bash
cd /vmfs/volumes/datastore2/
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso
```

잔여 폴더 정리:
```bash
# 빈 폴더가 남아있으면 삭제
rmdir /vmfs/volumes/datastore2/delcom2-vm5
```

### 1-3. VM 생성

ESXi 웹 UI → 가상 시스템 → VM 생성/등록 → 새 가상 시스템 생성

| 항목 | 값 | 비고 |
|------|-----|------|
| 이름 | k8s-node | |
| 게스트 OS | Linux / Ubuntu Linux (64-bit) | |
| 스토리지 | datastore2 | 1.82TB 용량 |
| CPU | 8 | ESXi 라이센스 제한 (무료판 8 vCPU 제한) |
| 메모리 | 240 GB | 호스트 255GB 중 240GB |
| 하드 디스크 | 1 TB | **반드시 씬 프로비저닝** |
| CD/DVD | 데이터스토어 ISO → ubuntu-22.04.2 | **전원 켤 때 연결 체크** |
| 네트워크 | VM Network | VMXNET 3 |

> **주의**: 디스크 프로비저닝을 "씩(Thick)"으로 하면 1TB를 즉시 할당함.
> 반드시 "씬(Thin)"으로 설정할 것.

### 1-4. Ubuntu 설치

VM 전원 켜기 → 콘솔 열기 → Ubuntu 설치 진행

주요 설정:
- **언어/키보드**: English (기본값)
- **네트워크**: 고정 IP <K8S_NODE_IP>/24, 게이트웨이 <GATEWAY_IP>, DNS 8.8.8.8
- **스토리지**: LVM 사용, **ubuntu-lv 크기를 최대(~1020G)로 변경** (기본값 100G → 수동 확장 필요)
- **프로필**: username `<USERNAME>`, hostname `k8s-node`
- **SSH**: Install OpenSSH server **체크**
- **Ubuntu Pro**: Skip
- **Featured Snaps**: 아무것도 선택하지 않음

> **주의**: Ubuntu 설치 시 LVM 루트 볼륨이 기본 100GB만 할당됨.
> 반드시 ubuntu-lv를 전체 용량으로 수동 확장할 것.

### 1-5. K8s 기본 설정

Ubuntu 설치 완료 후 SSH 접속하여 설정:

```bash
# swap 비활성화 (K8s 필수 요구사항)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab

# 커널 모듈 로드
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay
sudo modprobe br_netfilter

# sysctl 네트워크 설정
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system

# 패키지 업데이트
sudo apt update && sudo apt upgrade -y
```

검증:
```bash
free -h | grep Swap        # Swap: 0B 확인
lsmod | grep br_netfilter  # 모듈 로드 확인
sysctl net.ipv4.ip_forward # = 1 확인
```

### 1-6. SSH 키 + sudo 설정

Mac에서 실행:
```bash
# SSH 키가 없으면 생성
ssh-keygen -t ed25519

# 서버에 공개키 복사
ssh-copy-id <USERNAME>@<K8S_NODE_IP>
```

서버에서 실행 (비밀번호 없이 sudo 가능하게):
```bash
sudo visudo
# 맨 아래에 추가:
# <USERNAME> ALL=(ALL) NOPASSWD:ALL
```

검증:
```bash
# Mac에서 비밀번호 없이 접속 + sudo 실행 확인
ssh <USERNAME>@<K8S_NODE_IP> "sudo whoami"
# 출력: root
```

### 1-7. ESXi 스냅샷

ESXi 웹 UI → k8s-node → 스냅샷 → 스냅샷 찍기
- 이름: `clean-ubuntu-base`
- 설명: Ubuntu 22.04 + swap off + kernel modules + sysctl + SSH key

---

## Phase 2: k3s 설치

### k3s 설치

```bash
ssh <USERNAME>@<K8S_NODE_IP> "curl -sfL https://get.k3s.io | sh -"
```

### 설치 검증

```bash
# 노드 상태 확인
ssh <USERNAME>@<K8S_NODE_IP> "sudo kubectl get nodes"
# NAME       STATUS   ROLES           AGE   VERSION
# k8s-node   Ready    control-plane   66s   v1.34.4+k3s1

# 시스템 Pod 확인
ssh <USERNAME>@<K8S_NODE_IP> "sudo kubectl get pods -A"
# kube-system   coredns-...                  Running
# kube-system   traefik-...                  Running
# kube-system   metrics-server-...           Running
# kube-system   local-path-provisioner-...   Running
```

### kubeconfig 설정 (Mac에서 kubectl 사용)

```bash
# kubeconfig 복사 + IP 수정
mkdir -p ~/.kube
ssh <USERNAME>@<K8S_NODE_IP> "sudo cat /etc/rancher/k3s/k3s.yaml" \
  | sed 's/127.0.0.1/<K8S_NODE_IP>/' > ~/.kube/config-k8s-node

# 사용법
KUBECONFIG=~/.kube/config-k8s-node kubectl get nodes
```

---

## Phase 7: Claude Code 웹 서비스 배포

웹 브라우저에서 Claude Code를 사용할 수 있는 터미널 서비스를 배포한다.

### 7-1. Docker 설치 (k8s-node)

이미지 빌드를 위해 Docker가 필요하다 (k3s의 containerd와 별도).

```bash
ssh <USERNAME>@<K8S_NODE_IP>

# Docker 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 재접속하여 docker 그룹 반영
exit
ssh <USERNAME>@<K8S_NODE_IP>

# 설치 확인
docker --version
```

### 7-2. 소스 코드 전송

프로젝트 소스를 k8s-node 서버로 전송한다.

```bash
# Mac에서 실행
scp -r claudecode-kubernetes/ <USERNAME>@<K8S_NODE_IP>:~/claudecode-kubernetes/
```

### 7-3. Docker 이미지 빌드

```bash
ssh <USERNAME>@<K8S_NODE_IP>
cd ~/claudecode-kubernetes

# 1. 샌드박스 이미지 (유저 환경: Ubuntu + Node.js + Claude Code CLI)
docker build -f docker/claudecode-sandbox/Dockerfile -t claudecode-sandbox:latest .

# 2. 웹 터미널 서비스 이미지 (Express + WebSocket 백엔드)
docker build -f docker/web-terminal/Dockerfile -t web-terminal-service:latest web-terminal/
```

### 7-4. k3s containerd에 이미지 임포트

k3s는 Docker가 아닌 containerd를 사용하므로, 빌드한 이미지를 containerd로 임포트해야 한다.

```bash
docker save claudecode-sandbox:latest | sudo k3s ctr images import -
docker save web-terminal-service:latest | sudo k3s ctr images import -

# 임포트 확인
sudo k3s ctr images list | grep -E "claudecode-sandbox|web-terminal"
```

### 7-5. K8s 매니페스트 배포

순서가 중요하다. 네임스페이스 → RBAC → Secret → ConfigMap → Deployment → Service 순.

```bash
cd ~/claudecode-kubernetes

# 1. 네임스페이스 생성
kubectl apply -f k8s-manifests/namespace.yaml

# 2. RBAC (ServiceAccount + Role + RoleBinding)
kubectl apply -f k8s-manifests/rbac.yaml

# 3. Claude API 키 시크릿 (CLI로 생성 — YAML에 키를 넣지 않음)
kubectl create secret generic claude-api-key \
  -n claudecode-terminal \
  --from-literal=ANTHROPIC_API_KEY=<YOUR_ANTHROPIC_API_KEY>

# 4. ConfigMap (샌드박스 Pod 설정)
kubectl apply -f k8s-manifests/configmap.yaml

# 5. Deployment (웹 터미널 서비스)
kubectl apply -f k8s-manifests/deployment.yaml

# 6. Service (NodePort 31000)
kubectl apply -f k8s-manifests/service.yaml
```

### 7-6. 배포 검증

```bash
# Pod 상태 확인 (Running이어야 함)
kubectl get pods -n claudecode-terminal
# NAME                                    READY   STATUS    RESTARTS   AGE
# web-terminal-service-xxxxxxxxx-xxxxx    1/1     Running   0          30s

# 서비스 확인
kubectl get svc -n claudecode-terminal
# NAME                   TYPE       CLUSTER-IP    EXTERNAL-IP   PORT(S)
# web-terminal-service   NodePort   10.x.x.x     <none>        80:31000/TCP

# 로그 확인 (에러 없는지)
kubectl logs -n claudecode-terminal deployment/web-terminal-service

# 웹 UI 접속 테스트
curl -s http://<K8S_NODE_IP>:31000/health
# {"status":"ok"} 이면 정상

# 브라우저에서 접속
# http://<K8S_NODE_IP>:31000
```

### 7-7. 문제 발생 시

- `ImagePullBackOff`: `imagePullPolicy: Never` 확인, 이미지 임포트 확인
- `403 Forbidden` on exec: RBAC `pods/exec`에 `get` + `create` 확인
- 온보딩 화면이 뜨는 경우: 샌드박스 이미지에 `~/.claude/.claude.json` 포함 확인
- 상세 트러블슈팅: `docs/runbooks/troubleshooting.md` 참고

---

## 다음 단계 (미구현)

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 3 | 클러스터 기본 매니페스트 작성 | ✅ 완료 |
| Phase 4 | 첫 배포 및 검증 | ✅ 완료 |
| Phase 5 | GPU 지원 (ESXi Passthrough + NVIDIA Device Plugin) | ⬜ |
| Phase 6 | CI/CD 파이프라인 (GitHub Actions / Bitbucket) | ⬜ |
| Phase 7 | Claude Code 웹 서비스 (xterm.js + Pod 동적 생성) | ✅ 완료 |

### 향후 노드 확장 (Worker 추가)

Worker 노드를 추가할 때는 위 Phase 1의 VM 생성 + Ubuntu 설치를 반복한 후:

```bash
# Master 노드에서 토큰 확인
ssh <USERNAME>@<K8S_NODE_IP> "sudo cat /var/lib/rancher/k3s/server/node-token"

# Worker 노드에서 join
curl -sfL https://get.k3s.io | K3S_URL=https://<K8S_NODE_IP>:6443 K3S_TOKEN=<토큰> sh -
```

매니페스트(YAML) 변경 없이 인프라만 확장하면 된다.

---

## 트러블슈팅

### ESXi 웹 UI 접근 안 됨
- VPN 연결 확인
- `sudo route add -net <SUBNET> -interface ppp0` 실행 확인
- 브라우저에서 `https://` (http 아님) 사용

### VM이 ISO 부팅 안 됨
- VM 설정 → CD/DVD → "전원 켤 때 연결" 체크 확인
- CD/DVD 미디어에 ISO 경로 지정 확인

### Ubuntu LVM 루트 볼륨이 100GB만 할당됨
설치 시 수동 확장을 못 했을 경우 설치 후에도 확장 가능:
```bash
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
```

### k3s 설치 후 노드가 NotReady
```bash
# k3s 서비스 상태 확인
sudo systemctl status k3s

# 로그 확인
sudo journalctl -u k3s -f
```

### Mac에서 kubectl 접속 안 됨
- VPN + route 확인
- kubeconfig의 IP가 <K8S_NODE_IP>인지 확인: `cat ~/.kube/config-k8s-node | grep server`
- 방화벽 확인: `ssh <USERNAME>@<K8S_NODE_IP> "sudo ufw status"` (disabled여야 함)
