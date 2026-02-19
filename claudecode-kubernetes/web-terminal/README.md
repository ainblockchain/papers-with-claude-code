# Web Terminal Backend

Express + WebSocket 서버로, 브라우저 xterm.js 클라이언트와 K8s 샌드박스 Pod 사이를 중계하는 백엔드 서비스.

## 구조

```
web-terminal/
  src/
    server.ts            # 진입점 (Express + WebSocket 서버)
    types.ts             # Session, AppConfig 타입 정의
    k8s/
      client.ts          # KubeConfig 로드 및 K8s API 클라이언트 초기화
      pod-template.ts    # 샌드박스 Pod 스펙 빌더
      pod-manager.ts     # Pod 생성/삭제/상태 관리
    ws/
      terminal-bridge.ts # WebSocket <-> K8s exec 브릿지 (핵심 모듈)
    routes/
      sessions.ts        # REST API 라우터 (세션 CRUD)
  public/                # 정적 프론트엔드 파일 (xterm.js UI)
  .env.example           # 환경변수 예시
```

## 의존성

- `@kubernetes/client-node` - K8s API 접근 (Pod 관리, exec)
- `express` - HTTP REST API
- `ws` - WebSocket 서버
- `uuid` - 세션 ID 생성

## 개발

```bash
npm install
npm run dev     # tsx watch 모드
npm run build   # TypeScript 컴파일
npm start       # 프로덕션 실행
```

## 연관

- Docker 이미지: `../docker/web-terminal/Dockerfile`
- K8s 배포: `../k8s-manifests/deployment.yaml`
