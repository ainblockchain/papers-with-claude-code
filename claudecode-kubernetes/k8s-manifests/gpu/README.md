# gpu/

NVIDIA GPU 지원을 위한 Kubernetes 매니페스트.

## 현재 상태

GPU 노드가 아직 클러스터에 추가되지 않았으므로 이 매니페스트들은 **향후 사용을 위한 준비**입니다.

## 파일 구조

```
gpu/
├── nvidia-device-plugin.yaml   # NVIDIA Device Plugin DaemonSet (v0.17.0)
└── gpu-test-pod.yaml           # nvidia-smi 테스트 Pod
```

## GPU 노드 추가 시 순서

1. GPU 드라이버가 설치된 노드를 k3s 클러스터에 조인
2. NVIDIA Container Toolkit 설치
3. Device Plugin 배포: `kubectl apply -f nvidia-device-plugin.yaml`
4. GPU 테스트: `kubectl apply -f gpu-test-pod.yaml && kubectl logs gpu-test -f`

## 사전 요구사항

- NVIDIA GPU 드라이버 (호스트)
- NVIDIA Container Toolkit (`nvidia-ctk`)
- k3s의 containerd가 NVIDIA runtime을 사용하도록 설정
