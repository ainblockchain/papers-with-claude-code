# GPU Node Setup Guide

Guide for adding T640 (T4 x4) and T550 (A2 x4) servers as K8s Worker nodes and enabling GPU access.

> Currently not implemented. Follow this document when adding GPU nodes.

---

## Prerequisites

- <SERVER2>'s k3s Master node is running normally
- Target servers (T640/T550) have ESXi installed and are accessible
- VPN + routing setup is complete

## Step 1: ESXi GPU Passthrough

GPU passthrough must be enabled in BIOS and ESXi.

### 1-1. BIOS Settings

Reboot the server -> Enter BIOS:

1. **Enable VT-d (Intel Virtualization Technology for Directed I/O)**
   - Advanced -> Processor Settings -> Intel VT for Directed I/O -> **Enabled**
2. Save and reboot

### 1-2. ESXi DirectPath I/O Configuration

In the ESXi Web UI:

1. Manage -> Hardware -> PCI Devices
2. Select the NVIDIA GPU device -> Click **Toggle Passthrough**
3. Reboot the ESXi host (required)

### 1-3. Assign GPU to VM

1. Edit VM settings -> Add PCI device
2. Select the passthrough-configured NVIDIA GPU
3. **Memory reservation**: Set full memory as reserved (required for GPU Passthrough)

## Step 2: Ubuntu VM Setup

Create an Ubuntu 22.04 VM and perform basic K8s setup, same as Phase 1.
Refer to `docs/cluster-setup.md` Phase 1.

### 2-1. NVIDIA Driver Installation

```bash
# Disable nouveau driver
cat <<EOF | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
blacklist nouveau
options nouveau modeset=0
EOF
sudo update-initramfs -u
sudo reboot

# Install NVIDIA driver
sudo apt update
sudo apt install -y nvidia-driver-535
sudo reboot

# Verify installation
nvidia-smi
# GPU list and driver version should be displayed
```

### 2-2. NVIDIA Container Toolkit Installation

NVIDIA Container Toolkit is required to use GPUs inside containers.

```bash
# Add repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Install
sudo apt update
sudo apt install -y nvidia-container-toolkit

# Configure containerd integration
sudo nvidia-ctk runtime configure --runtime=containerd
sudo systemctl restart containerd
```

## Step 3: k3s Worker Join

```bash
# Check token on Master
ssh <USERNAME>@<K8S_NODE_IP> "sudo cat /var/lib/rancher/k3s/server/node-token"

# Install k3s agent on Worker
curl -sfL https://get.k3s.io | K3S_URL=https://<K8S_NODE_IP>:6443 K3S_TOKEN=<token> sh -

# Verify nodes on Master
kubectl get nodes
# k8s-node    Ready    control-plane   ...
# t640-node   Ready    <none>          ...
```

## Step 4: Deploy NVIDIA Device Plugin

The NVIDIA Device Plugin DaemonSet is required for K8s to recognize GPU resources.

```bash
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.1/nvidia-device-plugin.yml
```

Verify deployment:

```bash
# Check DaemonSet status
kubectl get daemonset -n kube-system nvidia-device-plugin-daemonset

# Check GPU resources
kubectl describe node t640-node | grep nvidia.com/gpu
# Allocatable: nvidia.com/gpu: 4
```

## Step 5: Verification

### GPU Test Pod

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
    # Schedule only on GPU nodes
    kubernetes.io/hostname: t640-node
```

```bash
kubectl apply -f gpu-test-pod.yaml
kubectl logs gpu-test
# nvidia-smi output should be visible

# Cleanup
kubectl delete pod gpu-test
```

## GPU Specifications Reference

| GPU | VRAM | Primary Use | Notes |
|-----|------|-------------|-------|
| NVIDIA T4 | 16GB | Inference, light training | INT8/FP16 Tensor Core |
| NVIDIA A2 | 16GB | Edge inference | Low power, auxiliary workloads |
