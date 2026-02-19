# Sandbox 보안 시뮬레이션 가이드

유저가 샌드박스 Pod 내부에서 시도할 수 있는 공격 시나리오를 재현하고 방어 상태를 검증하는 테스트 스크립트.

## 사전 조건

```bash
export KUBECONFIG=~/.kube/config-k8s-node
NAMESPACE=claudecode-terminal

# 테스트용 세션 생성 (또는 기존 세션 사용)
SESSION_POD=$(kubectl get pods -n $NAMESPACE -l app=claudecode-sandbox --no-headers -o custom-columns=":metadata.name" | head -1)
echo "테스트 대상: $SESSION_POD"
```

## 시뮬레이션 항목

### 1. 정상 API 호출 (프록시 경유)

Claude Code가 프록시를 통해 Anthropic API를 정상 호출할 수 있는지 확인.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  curl -s -X POST http://api-proxy.claudecode-terminal.svc.cluster.local:8080/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: dummy" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":30,"messages":[{"role":"user","content":"2+2는?"}]}'
```

**기대 결과**: 200 OK, 정상 응답 (`"content":[{"type":"text","text":"..."}]`)
**실제 결과 (2026-02-18)**: ✅ PASS — `"2+2는 **4**입니다."`

---

### 2. API 키 탈취 시도

유저가 환경변수, 설정 파일에서 진짜 API 키를 찾으려는 시도.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  sh -c 'echo "=== env ===" && env | grep -i anthropic && echo "=== .claude.json ===" && grep primaryApiKey ~/.claude.json'
```

**기대 결과**: `ANTHROPIC_API_KEY`와 `primaryApiKey` 모두 `sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxx...` (더미키)
**실제 결과 (2026-02-18)**: ✅ PASS — 더미키만 노출

---

### 3. 더미 키로 직접 Anthropic API 호출

프록시를 우회하여 직접 Anthropic API에 더미 키로 요청하는 시도.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  curl -s -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxxxxxxxxxxxxxxxxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

**기대 결과**: `authentication_error` — invalid x-api-key
**실제 결과 (2026-02-18)**: ✅ PASS — `{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}`

---

### 4. 프록시 경유 관리 API 접근

프록시의 화이트리스트를 벗어나는 경로로 접근하는 시도.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  curl -s http://api-proxy.claudecode-terminal.svc.cluster.local:8080/v1/models
```

**기대 결과**: 403 Forbidden — Path not allowed
**실제 결과 (2026-02-18)**: ✅ PASS — `{"error":{"type":"forbidden","message":"Path /v1/models is not allowed through this proxy."}}`

---

### 5. K8s API 접근 시도

ServiceAccount 토큰으로 클러스터 조작을 시도.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  sh -c 'ls /var/run/secrets/kubernetes.io/serviceaccount/ 2>&1; curl -sk https://kubernetes.default.svc/api --connect-timeout 3 2>&1'
```

**기대 결과**: SA 토큰 디렉토리 없음 + API 서버 401 Unauthorized
**실제 결과 (2026-02-18)**: ✅ PASS — `No such file or directory` + `"reason":"Unauthorized"`

---

### 6. 권한 상승 시도

sudo로 root 권한 획득을 시도.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  sh -c 'sudo id 2>&1; whoami; id'
```

**기대 결과**: sudo 바이너리 없음, uid=1000(claude)
**실제 결과 (2026-02-18)**: ✅ PASS — `sudo: not found`, `uid=1000(claude) gid=1000(claude)`

---

### 7. 외부 네트워크 접근

Pod에서 인터넷으로 직접 통신 가능한지 확인.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  curl -s -o /dev/null -w "HTTP %{http_code}" https://google.com --connect-timeout 5
```

**기대 결과 (NetworkPolicy 적용 시)**: 타임아웃 또는 연결 거부
**기대 결과 (NetworkPolicy 미적용 시)**: HTTP 301 (외부 접근 가능)
**실제 결과 (2026-02-18)**: ⚠️ WARN — `HTTP 301` (NetworkPolicy 미적용, Flannel CNI)

---

### 8. 보안 설정 파일 변조 시도

managed-settings.json을 덮어쓰려는 시도.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  sh -c 'echo "{}" > /etc/claude-code/managed-settings.json 2>&1; ls -la /etc/claude-code/managed-settings.json'
```

**기대 결과**: Permission denied, 파일 퍼미션 444 (읽기 전용), root 소유
**실제 결과 (2026-02-18)**: ✅ PASS — `Permission denied`, `-r--r--r-- root root`

---

## 결과 요약

| # | 시나리오 | 결과 | 방어 레이어 |
|---|---------|------|------------|
| 1 | 정상 API 호출 | ✅ PASS | API Proxy |
| 2 | API 키 탈취 | ✅ PASS | 더미키 (L1) |
| 3 | 더미키로 직접 호출 | ✅ PASS | 더미키 (L1) |
| 4 | 관리 API 접근 | ✅ PASS | Proxy 화이트리스트 (L5) |
| 5 | K8s API 접근 | ✅ PASS | SA 토큰 비활성화 (L4) |
| 6 | 권한 상승 | ✅ PASS | sudo 제거 (L3) |
| 7 | 외부 네트워크 | ⚠️ WARN | NetworkPolicy 미적용 (L6) |
| 8 | 설정 파일 변조 | ✅ PASS | 파일 퍼미션 444 |

**7/8 PASS, 1 WARN** — NetworkPolicy 적용 시 8/8 달성 가능.
