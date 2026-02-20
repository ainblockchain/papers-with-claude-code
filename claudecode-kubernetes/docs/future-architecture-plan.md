# Future Architecture Plan: GitHub OAuth + Passkey + Blockchain

> This document is a future architecture plan separated from a README.md merge conflict.
> It describes the deployment structure based on GitHub OAuth authentication + P256 passkey blockchain wallets.

---

Kubernetes configurations and manifests for deploying the Papers with Claude Code platform.

## Architecture

The platform uses **GitHub OAuth for identity + P256 passkeys as AIN blockchain wallets**. No private keys are exposed to users — the passkey IS the wallet. See [docs/github-login.md](../docs/github-login.md) for the full auth flow.

## Prerequisites

- Kubernetes cluster (1.26+)
- `kubectl` configured with cluster access
- Container images pushed to `ghcr.io` (via GitHub Actions)
- TLS cert-manager (passkeys require HTTPS)

## Deployment

1. Create namespace and secrets:
   ```bash
   kubectl apply -f base/namespace.yml
   kubectl apply -f base/secrets.yml   # edit with real values first
   ```

2. Deploy services:
   ```bash
   kubectl apply -f frontend/
   kubectl apply -f kg-extractor/
   ```

3. Apply TLS ingress:
   ```bash
   kubectl apply -f base/ingress.yml
   ```

## Secrets Required

| Secret | Keys | Description |
|--------|------|-------------|
| `github-oauth` | `GITHUB_ID`, `GITHUB_SECRET`, `NEXTAUTH_SECRET` | GitHub OAuth App credentials |
| `ain-blockchain` | `AIN_PROVIDER_URL`, `AIN_PRIVATE_KEY` | AIN blockchain node + server wallet |
| `vllm-config` | `VLLM_BASE_URL` | vLLM server for KG extractor |

## CI/CD

GitHub Actions workflows build and deploy on push to `main`. See [docs/github-login.md](../docs/github-login.md#6-kubernetes-cicd) for workflow details and secrets configuration.
