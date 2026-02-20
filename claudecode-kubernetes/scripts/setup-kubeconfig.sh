#!/bin/bash
# k8s-node kubeconfig automated setup script
# Fetches kubeconfig from k8s-node and configures it on Mac.

set -euo pipefail

K8S_NODE_IP="${1:-<K8S_NODE_IP>}"
K8S_NODE_USER="${2:-<USERNAME>}"
KUBECONFIG_PATH="$HOME/.kube/config-k8s-node"

echo "[1/3] Copying kubeconfig from k8s-node..."
scp "${K8S_NODE_USER}@${K8S_NODE_IP}:/etc/rancher/k3s/k3s.yaml" "$KUBECONFIG_PATH"

echo "[2/3] Modifying server address to be accessible from local..."
# Change 127.0.0.1 → actual node IP
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|https://127.0.0.1:6443|https://${K8S_NODE_IP}:6443|g" "$KUBECONFIG_PATH"
else
  sed -i "s|https://127.0.0.1:6443|https://${K8S_NODE_IP}:6443|g" "$KUBECONFIG_PATH"
fi

echo "[3/3] Verifying connection..."
KUBECONFIG="$KUBECONFIG_PATH" kubectl get nodes

echo ""
echo "Setup complete! Usage:"
echo "  export KUBECONFIG=$KUBECONFIG_PATH"
echo "  kubectl get nodes"
echo ""
echo "Or specify each time:"
echo "  KUBECONFIG=$KUBECONFIG_PATH kubectl get nodes"
