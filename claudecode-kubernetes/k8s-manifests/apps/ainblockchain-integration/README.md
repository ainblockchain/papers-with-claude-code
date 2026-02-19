# apps/ainblockchain-integration/

AIN Blockchain 연동 서비스의 Kubernetes 배포를 위한 디렉토리.

## 관련 코드

모노레포 내 `ainblockchain-integration/` 디렉토리에 AIN 블록체인 연동 코드가 있습니다. 해당 앱의 컨테이너화 및 K8s 매니페스트가 준비되면 이 디렉토리에 추가합니다.

## 향후 작업

1. Dockerfile 작성 (`docker/ainblockchain-integration/`)
2. Deployment + Service 매니페스트 작성
3. 블록체인 노드 연결 설정 (ConfigMap / Secret)
4. papers-blockchain 네임스페이스에 배포
