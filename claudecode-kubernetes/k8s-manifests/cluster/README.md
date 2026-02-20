# cluster/

Cluster-level common resource definitions (namespaces, resource quotas, etc.).

## File Structure

```
cluster/
├── namespaces.yaml       # papers-frontend / papers-backend / papers-blockchain namespaces
└── resource-quotas.yaml  # Per-namespace CPU/memory limits
```

## Apply Order

```bash
kubectl apply -f namespaces.yaml
kubectl apply -f resource-quotas.yaml
```

Namespaces must exist before resource quotas can be applied.
