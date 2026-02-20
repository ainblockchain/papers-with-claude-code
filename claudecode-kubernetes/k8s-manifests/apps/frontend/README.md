# apps/frontend/

Frontend web application deployment for the Papers with Claude Code project.

## Current Status

This is a placeholder deployment using the `nginx:alpine` image. Replace the image when the actual frontend app is ready.

## File Structure

```
frontend/
├── deployment.yaml   # 1 replica, nginx:alpine
└── service.yaml      # ClusterIP, port 80
```

## Deployment

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```
