# gpu/

Kubernetes manifests for NVIDIA GPU support.

## Current Status

GPU nodes have not yet been added to the cluster, so these manifests are **prepared for future use**.

## File Structure

```
gpu/
├── nvidia-device-plugin.yaml   # NVIDIA Device Plugin DaemonSet (v0.17.0)
└── gpu-test-pod.yaml           # nvidia-smi test Pod
```

## Steps When Adding a GPU Node

1. Join a node with GPU drivers installed to the k3s cluster
2. Install NVIDIA Container Toolkit
3. Deploy the Device Plugin: `kubectl apply -f nvidia-device-plugin.yaml`
4. Test GPU: `kubectl apply -f gpu-test-pod.yaml && kubectl logs gpu-test -f`

## Prerequisites

- NVIDIA GPU drivers (on the host)
- NVIDIA Container Toolkit (`nvidia-ctk`)
- k3s containerd configured to use the NVIDIA runtime
