# nginx-ingress/

Ingress Controller related guide.

## k3s and Traefik

k3s includes **Traefik** as its default Ingress Controller, so there is no need to install a separate NGINX Ingress.

### Check Traefik Status

```bash
# Check Traefik Pod
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik

# Check Traefik Service
kubectl get svc -n kube-system traefik
```

### Ingress Resource Usage

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

If you need NGINX Ingress for a specific reason, you must disable Traefik before installing it:

```bash
# Disable Traefik during k3s installation (requires reinstallation)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
```

For now, Traefik meets all requirements, so a separate installation is unnecessary.
