#!/bin/bash
# k8s-node kubeconfig 설정 자동화 스크립트
# k8s-node에서 kubeconfig를 가져와 Mac에 설정합니다.

set -euo pipefail

K8S_NODE_IP="${1:-<K8S_NODE_IP>}"
K8S_NODE_USER="${2:-<USERNAME>}"
KUBECONFIG_PATH="$HOME/.kube/config-k8s-node"

echo "[1/3] k8s-node에서 kubeconfig 복사 중..."
scp "${K8S_NODE_USER}@${K8S_NODE_IP}:/etc/rancher/k3s/k3s.yaml" "$KUBECONFIG_PATH"

echo "[2/3] 서버 주소를 로컬에서 접근 가능하도록 수정 중..."
# 127.0.0.1 → 실제 노드 IP로 변경
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|https://127.0.0.1:6443|https://${K8S_NODE_IP}:6443|g" "$KUBECONFIG_PATH"
else
  sed -i "s|https://127.0.0.1:6443|https://${K8S_NODE_IP}:6443|g" "$KUBECONFIG_PATH"
fi

echo "[3/3] 연결 확인 중..."
KUBECONFIG="$KUBECONFIG_PATH" kubectl get nodes

echo ""
echo "설정 완료! 사용법:"
echo "  export KUBECONFIG=$KUBECONFIG_PATH"
echo "  kubectl get nodes"
echo ""
echo "또는 매번 지정:"
echo "  KUBECONFIG=$KUBECONFIG_PATH kubectl get nodes"
