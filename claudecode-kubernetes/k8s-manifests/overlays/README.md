# overlays/

Kustomize environment-specific overlays. Customize the same base manifests for each environment.

## Directory Structure

```
overlays/
├── dev/                    # Development environment (1 replica, minimal resources)
│   └── kustomization.yaml
└── production/             # Production environment (2+ replicas, sufficient resources)
    └── kustomization.yaml
```

## Usage

```bash
# Apply development environment
kubectl apply -k overlays/dev/

# Apply production environment
kubectl apply -k overlays/production/

# Preview before applying
kubectl kustomize overlays/dev/
```
