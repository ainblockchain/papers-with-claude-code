# nginx-ingress/

Ingress Controller reference guide.

## k3s and Traefik

k3s includes **Traefik** as the default Ingress Controller, so a separate NGINX Ingress installation is not needed.

### Check Traefik Status

```bash
# Check Traefik Pod
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik

# Check Traefik Service
kubectl get svc -n kube-system traefik
```

### Using Ingress Resources

Traefik supports standard Kubernetes Ingress resources:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
spec:
  rules:
    - host: example.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
```

### If NGINX Ingress Is Needed

If NGINX Ingress is required for a specific reason, disable Traefik first before installing it:

```bash
# Disable Traefik during k3s installation (requires reinstall)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
```

For now, Traefik meets all requirements, so no separate installation is needed.
