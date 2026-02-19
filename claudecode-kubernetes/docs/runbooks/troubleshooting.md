# 트러블슈팅 가이드

실제 구축 과정에서 발생한 이슈와 해결 방법.

---

## RBAC 403 on exec

**증상**: 웹 터미널에서 Pod exec 시도 시 `403 Forbidden` 에러.

**원인**: `pods/exec` 리소스에 `create` 권한만 부여하면 안 됨. WebSocket 업그레이드가 HTTP GET으로 시작되기 때문에 `get` 권한도 필요하다.

**해결**:

```yaml
# rbac.yaml
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["get", "create"]  # get 누락하면 403 발생
```

**파일**: `k8s-manifests/rbac.yaml`

---

## K8s client-node exec 토큰 이슈

**증상**: Pod 내부에서 실행되는 web-terminal-service가 `loadFromCluster()`로 K8s 클라이언트를 초기화하면, REST API는 정상 동작하지만 exec(WebSocket)에서 인증 실패.

**원인**: `@kubernetes/client-node` v1.x의 `loadFromCluster()`는 `authProvider: tokenFile` 방식을 사용하는데, 이 프로바이더가 WebSocket 연결 시 토큰을 헤더에 포함시키지 않는 버그가 있음.

**해결**: `loadFromCluster()` 대신 서비스어카운트 토큰을 직접 읽어서 `loadFromOptions()`로 수동 구성.

```typescript
// web-terminal/src/k8s/client.ts
const token = readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf-8').trim();
kc.loadFromOptions({
  clusters: [{ name: 'in-cluster', server: 'https://kubernetes.default.svc', caFile: SA_CA_PATH }],
  users: [{ name: 'sa-user', token }],
  contexts: [{ name: 'in-cluster-ctx', cluster: 'in-cluster', user: 'sa-user' }],
  currentContext: 'in-cluster-ctx',
});
```

**파일**: `web-terminal/src/k8s/client.ts`

---

## Claude Code 온보딩 스킵

**증상**: 샌드박스 Pod에서 Claude Code CLI 첫 실행 시 대화형 온보딩이 뜨면서 WebSocket 터미널에서 진행 불가.

**해결**: `~/.claude/.claude.json`에 온보딩 완료 플래그를 미리 설정.

```json
{
  "hasCompletedOnboarding": true
}
```

Docker 이미지 빌드 시 `start-claude.sh`에서 이 파일을 자동 생성하도록 구성.

**파일**: `docker/claudecode-sandbox/start-claude.sh`

---

## Pod ImagePullBackOff

**증상**: Pod가 `ImagePullBackOff` 상태에서 시작되지 않음.

**원인**: 로컬에서 빌드한 이미지를 사용하는데 K8s가 기본적으로 레지스트리에서 pull 시도.

**해결**: Deployment의 `imagePullPolicy`를 `Never`로 설정.

```yaml
containers:
  - name: web-terminal
    image: web-terminal-service:latest
    imagePullPolicy: Never  # 로컬 이미지 사용
```

이미지를 k3s containerd에 직접 임포트해야 함:

```bash
docker save web-terminal-service:latest | sudo k3s ctr images import -
docker save claudecode-sandbox:latest | sudo k3s ctr images import -
```

**파일**: `k8s-manifests/deployment.yaml`

---

## SSH 접속 불가

**증상**: `ssh 192.168.1.100` 접속 시 permission denied 또는 연결 거부.

**확인 사항**:

1. 사용자명 확인: `k8sadm@192.168.1.100` (root 아님)
2. VPN 연결 상태 확인
3. 라우팅 추가 확인: `sudo route add -net 192.168.1.0/24 -interface ppp0`
4. SSH 키가 등록되어 있는지: `ssh-copy-id k8sadm@192.168.1.100`

---

## Mac에서 kubectl 접속 안 됨

**증상**: `kubectl get nodes` 실행 시 연결 타임아웃 또는 인증 실패.

**확인 사항**:

```bash
# 1. KUBECONFIG 설정 확인
echo $KUBECONFIG
# 출력: ~/.kube/config-k8s-node 이어야 함

# 2. kubeconfig의 서버 IP 확인
grep server ~/.kube/config-k8s-node
# 출력: server: https://192.168.1.100:6443 이어야 함 (127.0.0.1 아님)

# 3. VPN + 라우팅 확인
ping 192.168.1.100

# 4. VM 방화벽 확인
ssh k8sadm@192.168.1.100 "sudo ufw status"
# 출력: inactive 이어야 함
```

---

## Pod 로그 확인

문제 발생 시 가장 먼저 확인할 것:

```bash
# web-terminal-service 로그
kubectl logs -n claudecode-terminal deployment/web-terminal-service -f

# 특정 샌드박스 Pod 로그
kubectl logs -n claudecode-terminal <pod-name>

# Pod 상태 및 이벤트 확인
kubectl describe pod -n claudecode-terminal <pod-name>

# 전체 이벤트 확인
kubectl get events -n claudecode-terminal --sort-by=.lastTimestamp
```

---

## k3s 서비스 문제

```bash
# k3s 서비스 상태
sudo systemctl status k3s

# k3s 로그 (실시간)
sudo journalctl -u k3s -f

# k3s 재시작
sudo systemctl restart k3s
```
