# nginx-ingress/

Ingress Controller 관련 안내.

## k3s와 Traefik

k3s는 기본 Ingress Controller로 **Traefik**을 포함하고 있어 별도의 NGINX Ingress 설치가 필요 없습니다.

### Traefik 상태 확인

```bash
# Traefik Pod 확인
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik

# Traefik 서비스 확인
kubectl get svc -n kube-system traefik
```

### Ingress 리소스 사용법

Traefik은 표준 Kubernetes Ingress 리소스를 지원합니다:

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

### NGINX Ingress가 필요한 경우

특별한 이유로 NGINX Ingress가 필요하다면 Traefik을 비활성화한 후 설치해야 합니다:

```bash
# k3s 설치 시 Traefik 비활성화 (재설치 필요)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
```

현재로서는 Traefik이 모든 요구사항을 충족하므로 별도 설치가 불필요합니다.
