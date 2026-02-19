# cluster/

클러스터 수준의 공통 리소스 정의 (네임스페이스, 리소스 쿼터 등).

## 파일 구조

```
cluster/
├── namespaces.yaml       # papers-frontend / papers-backend / papers-blockchain 네임스페이스
└── resource-quotas.yaml  # 네임스페이스별 CPU/메모리 제한
```

## 적용 순서

```bash
kubectl apply -f namespaces.yaml
kubectl apply -f resource-quotas.yaml
```

네임스페이스가 먼저 존재해야 리소스 쿼터를 적용할 수 있습니다.
