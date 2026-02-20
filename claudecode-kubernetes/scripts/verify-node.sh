#!/bin/bash
# k3s node status verification script
# Run from Mac to check the status of k8s-node.

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
