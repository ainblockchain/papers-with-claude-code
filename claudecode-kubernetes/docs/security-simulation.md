# Sandbox Security Simulation Guide

Test scripts that reproduce attack scenarios a user could attempt inside a sandbox Pod and verify the defense status.

## Prerequisites

```bash
export KUBECONFIG=~/.kube/config-k8s-node
NAMESPACE=claudecode-terminal

# Create a test session (or use an existing one)
SESSION_POD=$(kubectl get pods -n $NAMESPACE -l app=claudecode-sandbox --no-headers -o custom-columns=":metadata.name" | head -1)
echo "Test target: $SESSION_POD"
```

## Simulation Items

### 1. Normal API Call (via Proxy)

Verify that Claude Code can successfully call the Anthropic API through the proxy.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  curl -s -X POST http://api-proxy.claudecode-terminal.svc.cluster.local:8080/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: dummy" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":30,"messages":[{"role":"user","content":"2+2=?"}]}'
```

**Expected Result**: 200 OK, normal response (`"content":[{"type":"text","text":"..."}]`)
**Actual Result (2026-02-18)**: ✅ PASS — `"2+2 is **4**."`

---

### 2. API Key Exfiltration Attempt

User attempting to find the real API key from environment variables and configuration files.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  sh -c 'echo "=== env ===" && env | grep -i anthropic && echo "=== .claude.json ===" && grep primaryApiKey ~/.claude.json'
```

**Expected Result**: Both `ANTHROPIC_API_KEY` and `primaryApiKey` show `sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxx...` (dummy key)
**Actual Result (2026-02-18)**: ✅ PASS — Only dummy key exposed

---

### 3. Direct Anthropic API Call with Dummy Key

Attempting to bypass the proxy and call the Anthropic API directly with the dummy key.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  curl -s -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxxxxxxxxxxxxxxxxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

**Expected Result**: `authentication_error` — invalid x-api-key
**Actual Result (2026-02-18)**: ✅ PASS — `{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}`

---

### 4. Management API Access via Proxy

Attempting to access a path outside the proxy's whitelist.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  curl -s http://api-proxy.claudecode-terminal.svc.cluster.local:8080/v1/models
```

**Expected Result**: 403 Forbidden — Path not allowed
**Actual Result (2026-02-18)**: ✅ PASS — `{"error":{"type":"forbidden","message":"Path /v1/models is not allowed through this proxy."}}`

---

### 5. K8s API Access Attempt

Attempting to manipulate the cluster using a ServiceAccount token.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  sh -c 'ls /var/run/secrets/kubernetes.io/serviceaccount/ 2>&1; curl -sk https://kubernetes.default.svc/api --connect-timeout 3 2>&1'
```

**Expected Result**: SA token directory not found + API server 401 Unauthorized
**Actual Result (2026-02-18)**: ✅ PASS — `No such file or directory` + `"reason":"Unauthorized"`

---

### 6. Privilege Escalation Attempt

Attempting to gain root privileges via sudo.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  sh -c 'sudo id 2>&1; whoami; id'
```

**Expected Result**: sudo binary not found, uid=1000(claude)
**Actual Result (2026-02-18)**: ✅ PASS — `sudo: not found`, `uid=1000(claude) gid=1000(claude)`

---

### 7. External Network Access

Verify whether the Pod can communicate directly with the internet.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  curl -s -o /dev/null -w "HTTP %{http_code}" https://google.com --connect-timeout 5
```

**Expected Result (with NetworkPolicy applied)**: Timeout or connection refused
**Expected Result (without NetworkPolicy)**: HTTP 301 (external access possible)
**Actual Result (2026-02-18)**: ⚠️ WARN — `HTTP 301` (NetworkPolicy not applied, Flannel CNI)

---

### 8. Security Configuration File Tampering Attempt

Attempting to overwrite managed-settings.json.

```bash
kubectl exec $SESSION_POD -n $NAMESPACE -- \
  sh -c 'echo "{}" > /etc/claude-code/managed-settings.json 2>&1; ls -la /etc/claude-code/managed-settings.json'
```

**Expected Result**: Permission denied, file permission 444 (read-only), owned by root
**Actual Result (2026-02-18)**: ✅ PASS — `Permission denied`, `-r--r--r-- root root`

---

## Results Summary

| # | Scenario | Result | Defense Layer |
|---|----------|--------|---------------|
| 1 | Normal API call | ✅ PASS | API Proxy |
| 2 | API key exfiltration | ✅ PASS | Dummy key (L1) |
| 3 | Direct call with dummy key | ✅ PASS | Dummy key (L1) |
| 4 | Management API access | ✅ PASS | Proxy whitelist (L5) |
| 5 | K8s API access | ✅ PASS | SA token disabled (L4) |
| 6 | Privilege escalation | ✅ PASS | sudo removed (L3) |
| 7 | External network | ⚠️ WARN | NetworkPolicy not applied (L6) |
| 8 | Config file tampering | ✅ PASS | File permission 444 |

**7/8 PASS, 1 WARN** — 8/8 achievable when NetworkPolicy is applied.
