# overlays/

Kustomize 환경별 오버레이. 동일한 base 매니페스트를 환경에 맞게 커스터마이징합니다.

## 디렉토리 구조

```
overlays/
├── dev/                    # 개발 환경 (1 replica, 최소 리소스)
│   └── kustomization.yaml
└── production/             # 프로덕션 환경 (2+ replicas, 충분한 리소스)
    └── kustomization.yaml
```

## 사용법

```bash
# 개발 환경 적용
kubectl apply -k overlays/dev/

# 프로덕션 환경 적용
kubectl apply -k overlays/production/

# 적용 전 미리보기
kubectl kustomize overlays/dev/
```
