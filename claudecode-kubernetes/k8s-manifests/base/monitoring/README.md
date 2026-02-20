# monitoring/

Directory for monitoring stack (Prometheus + Grafana) configuration.

## Current Status

This is an unconfigured placeholder. Manifests will be added here when monitoring is needed.

## k3s Built-in Metrics

k3s includes **metrics-server** by default, enabling basic resource monitoring:

```bash
# Node resource usage
kubectl top nodes

# Pod resource usage
kubectl top pods -A
```

## Future Plans

1. **Prometheus** - Metric collection and alerting
2. **Grafana** - Dashboard visualization
3. **Loki** - Log collection (optional)

### Installation via Helm (Recommended)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```
