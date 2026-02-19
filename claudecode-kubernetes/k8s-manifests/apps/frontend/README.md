# apps/frontend/

Papers with Claude Code 프로젝트의 프론트엔드 웹 애플리케이션 배포.

## 현재 상태

`nginx:alpine` 이미지를 사용하는 플레이스홀더 배포입니다. 실제 프론트엔드 앱이 준비되면 이미지를 교체합니다.

## 파일 구조

```
frontend/
├── deployment.yaml   # 1 replica, nginx:alpine
└── service.yaml      # ClusterIP, port 80
```

## 배포

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```
