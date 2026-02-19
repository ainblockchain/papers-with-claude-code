# monitoring/

모니터링 스택 (Prometheus + Grafana) 설정을 위한 디렉토리.

## 현재 상태

아직 구성되지 않은 플레이스홀더입니다. 향후 모니터링이 필요할 때 여기에 매니페스트를 추가합니다.

## k3s 내장 메트릭

k3s에는 **metrics-server**가 기본 포함되어 있어 기본적인 리소스 모니터링이 가능합니다:

```bash
# 노드 리소스 사용량
kubectl top nodes

# Pod 리소스 사용량
kubectl top pods -A
```

## 향후 계획

1. **Prometheus** - 메트릭 수집 및 알림
2. **Grafana** - 대시보드 시각화
3. **Loki** - 로그 수집 (선택)

### Helm을 이용한 설치 (권장)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```
