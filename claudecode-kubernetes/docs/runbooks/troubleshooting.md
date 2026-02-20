# Troubleshooting Guide

Issues encountered during the actual setup process and their solutions.

---

## RBAC 403 on exec

**Symptom**: `403 Forbidden` error when attempting Pod exec from the web terminal.

**Cause**: Granting only `create` permission to the `pods/exec` resource is insufficient. Since the WebSocket upgrade starts with an HTTP GET, `get` permission is also required.

**Solution**:

```yaml
# rbac.yaml
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["get", "create"]  # Missing get causes 403
```

**File**: `k8s-manifests/rbac.yaml`

---

## K8s client-node exec Token Issue

**Symptom**: When web-terminal-service running inside a Pod initializes the K8s client with `loadFromCluster()`, the REST API works normally but exec (WebSocket) fails authentication.

**Cause**: `loadFromCluster()` in `@kubernetes/client-node` v1.x uses the `authProvider: tokenFile` approach, which has a bug where the token is not included in the header during WebSocket connections.

**Solution**: Instead of `loadFromCluster()`, read the ServiceAccount token directly and configure manually with `loadFromOptions()`.

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

**File**: `web-terminal/src/k8s/client.ts`

---

## Claude Code Onboarding Skip

**Symptom**: When running Claude Code CLI for the first time in a sandbox Pod, an interactive onboarding screen appears and cannot be completed in the WebSocket terminal.

**Solution**: Pre-set the onboarding completion flag in `~/.claude/.claude.json`.

```json
{
  "hasCompletedOnboarding": true
}
```

Configured to automatically generate this file in `start-claude.sh` during Docker image build.

**File**: `docker/claudecode-sandbox/start-claude.sh`

---

## Pod ImagePullBackOff

**Symptom**: Pod does not start and remains in `ImagePullBackOff` status.

**Cause**: Using locally built images, but K8s attempts to pull from a registry by default.

**Solution**: Set `imagePullPolicy` to `Never` in the Deployment.

```yaml
containers:
  - name: web-terminal
    image: web-terminal-service:latest
    imagePullPolicy: Never  # Use local images
```

Images must be directly imported into k3s containerd:

```bash
docker save web-terminal-service:latest | sudo k3s ctr images import -
docker save claudecode-sandbox:latest | sudo k3s ctr images import -
```

**File**: `k8s-manifests/deployment.yaml`

---

## Cannot SSH

**Symptom**: Permission denied or connection refused when attempting `ssh <K8S_NODE_IP>`.

**Checklist**:

1. Verify username: `<USERNAME>@<K8S_NODE_IP>` (not root)
2. Check VPN connection status
3. Verify routing is added: `sudo route add -net <SUBNET> -interface ppp0`
4. Check if SSH key is registered: `ssh-copy-id <USERNAME>@<K8S_NODE_IP>`

---

## Cannot Connect kubectl from Mac

**Symptom**: Connection timeout or authentication failure when running `kubectl get nodes`.

**Checklist**:

```bash
# 1. Check KUBECONFIG setting
echo $KUBECONFIG
# Output should be: ~/.kube/config-k8s-node

# 2. Check server IP in kubeconfig
grep server ~/.kube/config-k8s-node
# Output should be: server: https://<K8S_NODE_IP>:6443 (not 127.0.0.1)

# 3. Check VPN + routing
ping <K8S_NODE_IP>

# 4. Check VM firewall
ssh <USERNAME>@<K8S_NODE_IP> "sudo ufw status"
# Output should be: inactive
```

---

## Checking Pod Logs

First thing to check when issues occur:

```bash
# web-terminal-service logs
kubectl logs -n claudecode-terminal deployment/web-terminal-service -f

# Specific sandbox Pod logs
kubectl logs -n claudecode-terminal <pod-name>

# Check Pod status and events
kubectl describe pod -n claudecode-terminal <pod-name>

# Check all events
kubectl get events -n claudecode-terminal --sort-by=.lastTimestamp
```

---

## k3s Service Issues

```bash
# k3s service status
sudo systemctl status k3s

# k3s logs (real-time)
sudo journalctl -u k3s -f

# Restart k3s
sudo systemctl restart k3s
```
