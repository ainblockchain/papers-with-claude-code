# 하드웨어 인벤토리

온프렘 서버 자산과 네트워크 구성 현황.

---

## 서버 목록

| 서버 | IP | CPU | RAM | Storage | GPU | 용도 | 비고 |
|------|-----|-----|-----|---------|-----|------|------|
| <SERVER1> | <ESXI_SERVER_2_IP> | 20-core Xeon | ~256GB | - | 없음 | 회사 서비스 | VM 22개, RAM 91% 사용, 사용 불가 |
| **<SERVER2>** | **<ESXI_SERVER_1_IP>** | 20-core Xeon Silver 4210 @ 2.20GHz | 255.62GB | 2.57TB (datastore1: 765.5GB, datastore2: 1.82TB) | 없음 | **K8s 마스터** | ESXi → VM: k8s-node (8vCPU/240GB/1TB) |
| T640 | <ESXI_SERVER_3_IP> | - | - | - | T4 x4 | 향후 Worker 1 | GPU 추론용 |
| T550 | <ESXI_SERVER_4_IP> | - | - | - | A2 x4 | 향후 Worker 2 | GPU 보조 |

## VM 현황

현재 <SERVER2> 위에 k8s-node VM 1대만 운영 중.

| VM | 호스트 | IP | vCPU | RAM | Disk | OS | 역할 |
|----|--------|-----|------|-----|------|----|------|
| k8s-node | <SERVER2> | <K8S_NODE_IP> | 8 | 240GB | 1TB (thin) | Ubuntu 22.04 LTS | k3s 단일 노드 (Master + Worker) |

- ESXi 무료판 라이센스 제한으로 vCPU 최대 8개
- 디스크는 씬 프로비저닝 (실제 사용량만 점유)

## 네트워크

- **서브넷**: <SUBNET>
- **접속 조건**: 회사 VPN 연결 + 라우팅 추가 필요

```bash
# VPN 연결 후 라우팅 추가
sudo route add -net <SUBNET> -interface ppp0
```

## ESXi 웹 UI

각 서버의 ESXi 관리 인터페이스에 접근 가능 (HTTPS 필수, root 로그인).

| 서버 | URL |
|------|-----|
| <SERVER1> | https://<ESXI_SERVER_2_IP>/ui |
| <SERVER2> | https://<ESXI_SERVER_1_IP>/ui |
| T640 | https://<ESXI_SERVER_3_IP>/ui |
| T550 | https://<ESXI_SERVER_4_IP>/ui |
