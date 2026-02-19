# GPU 노드 셋업 가이드

T640(T4 x4), T550(A2 x4) 서버를 K8s Worker 노드로 추가하고 GPU를 사용할 수 있게 구성하는 가이드.

> 현재 미구현. GPU 노드 추가 시 이 문서를 따라 진행한다.

---

## 사전 조건

- <SERVER2>의 k3s Master 노드가 정상 운영 중
- 대상 서버(T640/T550)에 ESXi가 설치되어 있고 접근 가능
- VPN + 라우팅 설정 완료

## 1단계: ESXi GPU Passthrough

BIOS와 ESXi에서 GPU 직접 연결(Passthrough)을 활성화해야 한다.

### 1-1. BIOS 설정

서버 재부팅 → BIOS 진입:

1. **VT-d (Intel Virtualization Technology for Directed I/O)** 활성화
   - Advanced → Processor Settings → Intel VT for Directed I/O → **Enabled**
2. 저장 후 재부팅

### 1-2. ESXi DirectPath I/O 설정

ESXi 웹 UI에서:

1. 관리 → 하드웨어 → PCI 디바이스
2. NVIDIA GPU 디바이스 선택 → **Passthrough 전환** 클릭
3. ESXi 호스트 재부팅 (반드시 필요)

### 1-3. VM에 GPU 할당

1. VM 설정 편집 → PCI 디바이스 추가
2. Passthrough 설정된 NVIDIA GPU 선택
3. **메모리 예약**: 전체 메모리를 예약으로 설정 (GPU Passthrough 필수 조건)

## 2단계: Ubuntu VM 설정

Phase 1과 동일하게 Ubuntu 22.04 VM을 생성하고 K8s 기본 설정을 진행한다.
`docs/cluster-setup.md`의 Phase 1 참고.

### 2-1. NVIDIA 드라이버 설치

```bash
# nouveau 드라이버 비활성화
cat <<EOF | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
blacklist nouveau
options nouveau modeset=0
EOF
sudo update-initramfs -u
sudo reboot

# NVIDIA 드라이버 설치
sudo apt update
sudo apt install -y nvidia-driver-535
sudo reboot

# 설치 확인
nvidia-smi
# GPU 목록과 드라이버 버전이 표시되어야 함
```

### 2-2. NVIDIA Container Toolkit 설치

컨테이너 내부에서 GPU를 사용하기 위해 NVIDIA Container Toolkit이 필요하다.

```bash
# 저장소 추가
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# 설치
sudo apt update
sudo apt install -y nvidia-container-toolkit

# containerd 연동 설정
sudo nvidia-ctk runtime configure --runtime=containerd
sudo systemctl restart containerd
```

## 3단계: k3s Worker 조인

```bash
# Master에서 토큰 확인
ssh <USERNAME>@<K8S_NODE_IP> "sudo cat /var/lib/rancher/k3s/server/node-token"

# Worker에서 k3s agent 설치
curl -sfL https://get.k3s.io | K3S_URL=https://<K8S_NODE_IP>:6443 K3S_TOKEN=<토큰> sh -

# Master에서 노드 확인
kubectl get nodes
# k8s-node    Ready    control-plane   ...
# t640-node   Ready    <none>          ...
```

## 4단계: NVIDIA Device Plugin 배포

K8s가 GPU 리소스를 인식하려면 NVIDIA Device Plugin DaemonSet이 필요하다.

```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.1/nvidia-device-plugin.yml
```

배포 확인:

```bash
# DaemonSet 상태 확인
kubectl get daemonset -n kube-system nvidia-device-plugin-daemonset

# GPU 리소스 확인
kubectl describe node t640-node | grep nvidia.com/gpu
# Allocatable: nvidia.com/gpu: 4
```

## 5단계: 검증

### GPU 테스트 Pod

```yaml
# gpu-test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  restartPolicy: Never
  containers:
    - name: cuda-test
      image: nvidia/cuda:12.2.0-base-ubuntu22.04
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
  nodeSelector:
    # GPU 노드에만 스케줄링
    kubernetes.io/hostname: t640-node
```

```bash
kubectl apply -f gpu-test-pod.yaml
kubectl logs gpu-test
# nvidia-smi 출력이 보여야 함

# 정리
kubectl delete pod gpu-test
```

## GPU별 특성 참고

| GPU | VRAM | 주요 용도 | 비고 |
|-----|------|----------|------|
| NVIDIA T4 | 16GB | 추론, 가벼운 학습 | INT8/FP16 Tensor Core |
| NVIDIA A2 | 16GB | 엣지 추론 | 저전력, 보조 워크로드 |
