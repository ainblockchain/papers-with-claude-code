# Hardware Inventory

On-premises server assets and network configuration status.

---

## Server List

| Server | IP | CPU | RAM | Storage | GPU | Purpose | Notes |
|--------|-----|-----|-----|---------|-----|---------|-------|
| <SERVER1> | <ESXI_SERVER_2_IP> | 20-core Xeon | ~256GB | - | None | Company services | 22 VMs, RAM 91% used, unavailable |
| **<SERVER2>** | **<ESXI_SERVER_1_IP>** | 20-core Xeon Silver 4210 @ 2.20GHz | 255.62GB | 2.57TB (datastore1: 765.5GB, datastore2: 1.82TB) | None | **K8s Master** | ESXi → VM: k8s-node (8vCPU/240GB/1TB) |
| T640 | <ESXI_SERVER_3_IP> | - | - | - | T4 x4 | Future Worker 1 | For GPU inference |
| T550 | <ESXI_SERVER_4_IP> | - | - | - | A2 x4 | Future Worker 2 | GPU auxiliary |

## VM Status

Currently only 1 k8s-node VM is running on <SERVER2>.

| VM | Host | IP | vCPU | RAM | Disk | OS | Role |
|----|------|-----|------|-----|------|----|------|
| k8s-node | <SERVER2> | <K8S_NODE_IP> | 8 | 240GB | 1TB (thin) | Ubuntu 22.04 LTS | k3s single node (Master + Worker) |

- Maximum 8 vCPUs due to ESXi free edition license limitation
- Disk uses thin provisioning (only actual usage is consumed)

## Network

- **Subnet**: <SUBNET>
- **Access Requirements**: Company VPN connection + routing addition required

```bash
# Add routing after VPN connection
sudo route add -net <SUBNET> -interface ppp0
```

## ESXi Web UI

The ESXi management interface is accessible for each server (HTTPS required, root login).

| Server | URL |
|------|-----|
| <SERVER1> | https://<ESXI_SERVER_2_IP>/ui |
| <SERVER2> | https://<ESXI_SERVER_1_IP>/ui |
| T640 | https://<ESXI_SERVER_3_IP>/ui |
| T550 | https://<ESXI_SERVER_4_IP>/ui |
