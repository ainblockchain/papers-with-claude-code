#!/bin/bash
# k3s 노드 상태 검증 스크립트
# Mac에서 실행하여 k8s-node의 상태를 확인합니다.

KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config-k8s-node}"
export KUBECONFIG

echo "=== K8s Node Status ==="
kubectl get nodes -o wide

echo ""
echo "=== System Pods ==="
kubectl get pods -n kube-system

echo ""
echo "=== Claude Code Terminal Namespace ==="
kubectl get all -n claudecode-terminal 2>/dev/null || echo "Namespace not found (not yet created)"

echo ""
echo "=== Node Resources ==="
kubectl top nodes 2>/dev/null || echo "Metrics not available"

echo ""
echo "=== Storage ==="
kubectl get pv,pvc --all-namespaces 2>/dev/null || echo "No persistent volumes"
