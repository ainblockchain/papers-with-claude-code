# GPU Node Setup Guide

A guide for adding T640 (T4 x4) and T550 (A2 x4) servers as K8s Worker nodes and configuring them for GPU usage.

> Not yet implemented. Follow this document when adding GPU nodes.

---

## Prerequisites

- k3s Master node on <SERVER2> is operating normally
- ESXi is installed and accessible on the target servers (T640/T550)
- VPN + routing configuration completed

## Step 1: ESXi GPU Passthrough

GPU Passthrough must be enabled in both BIOS and ESXi.

### 1-1. BIOS Settings

Reboot server → Enter BIOS:

1. **Enable VT-d (Intel Virtualization Technology for Directed I/O)**
   - Advanced → Processor Settings → Intel VT for Directed I/O → **Enabled**
2. Save and reboot

### 1-2. ESXi DirectPath I/O Settings

In ESXi Web UI:

1. Manage → Hardware → PCI Devices
2. Select NVIDIA GPU device → Click **Toggle Passthrough**
3. Reboot ESXi host (required)

### 1-3. Assign GPU to VM

1. Edit VM settings → Add PCI device
2. Select the NVIDIA GPU configured for Passthrough
3. **Memory reservation**: Set full memory as reserved (GPU Passthrough mandatory requirement)

## Step 2: Ubuntu VM Configuration

Create an Ubuntu 22.04 VM and proceed with K8s base configuration, same as Phase 1.
See Phase 1 in `docs/cluster-setup.md`.

### 2-1. Install NVIDIA Drivers

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

### 2-2. Install NVIDIA Container Toolkit

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

# Verify nodes from Master
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
# nvidia-smi output should be displayed

# Clean up
kubectl delete pod gpu-test
```

## GPU Specifications Reference

| GPU | VRAM | Primary Use | Notes |
|-----|------|-------------|-------|
| NVIDIA T4 | 16GB | Inference, light training | INT8/FP16 Tensor Core |
| NVIDIA A2 | 16GB | Edge inference | Low power, auxiliary workloads |
