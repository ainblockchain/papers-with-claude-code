# GitHub Login (Passkey-Based Authentication)

GitHub login in this project means: **GitHub OAuth for identity + P256 passkey as AIN blockchain wallet**. The user never manages private keys — the passkey IS the wallet.

## Table of Contents

- [1. Login Flow](#1-login-flow)
- [2. Setup: GitHub OAuth App](#2-setup-github-oauth-app)
- [3. How It Works (P256 Passkey)](#3-how-it-works-p256-passkey)
- [4. Frontend Integration](#4-frontend-integration)
- [5. KG Extractor Integration](#5-kg-extractor-integration)
- [6. Kubernetes CI/CD](#6-kubernetes-cicd)

---

## 1. Login Flow

```
User clicks "Sign in with GitHub"
  → GitHub OAuth (NextAuth) authenticates identity
  → After login, user registers a P256 passkey (WebAuthn)
     - Browser prompts biometric / device PIN
     - Creates ES256 (P256) keypair in OS keychain (Google Password Manager / iCloud Keychain)
  → P256 public key → keccak-256 hash → AIN blockchain address
  → Passkey IS the wallet. No seed phrase, no private key file.

For blockchain transactions:
  → navigator.credentials.get() signs a challenge with the passkey
  → P256 signature formatted for AIN blockchain
  → Transaction submitted on-chain
```

The two-step flow:
1. **GitHub OAuth** — proves "who you are" (username, email, avatar)
2. **Passkey registration** — creates "your wallet" (P256 keypair → AIN address)

---

## 2. Setup: GitHub OAuth App

1. Go to **https://github.com/settings/developers**
2. Click **"New OAuth App"**
3. Fill in:

| Field | Value |
|-------|-------|
| Application name | `Papers with Claude Code` |
| Homepage URL | `http://localhost:3000` (dev) or `https://paperswithclaudecode.com` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

4. Click **Register application**
5. Copy **Client ID** and generate a **Client Secret**

### Environment Variables

```env
# GitHub OAuth
GITHUB_ID=your_client_id
GITHUB_SECRET=your_client_secret

# NextAuth
AUTH_SECRET=generate_a_random_secret

# AIN Blockchain
AIN_PROVIDER_URL=http://localhost:8081
AIN_PRIVATE_KEY=server_wallet_private_key
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## 3. How It Works (P256 Passkey)

### P256 Signature Support in AIN

The AIN blockchain was extended to support P256 (in addition to secp256k1):

**Signature format:**
```
secp256k1: 0x{hash(32)}{r(32)}{s(32)}{v(1)}           — 66 bytes (existing)
P256:      0x02{compressedPubKey(33)}{r(32)}{s(32)}     — 98 bytes (new)
```

- Prefix `0x02` identifies P256 signatures
- Compressed public key is included (P256 recovery is unreliable)
- Backward compatible — existing secp256k1 signatures unchanged

### Key Files

| File | Purpose |
|------|---------|
| `ainblockchain-integration/debug-frontend/src/lib/passkey.ts` | WebAuthn helpers: registration, assertion, CBOR decode |
| `ainblockchain-integration/debug-frontend/src/components/AuthGate.tsx` | GitHub login + passkey registration UI |
| `ainblockchain-integration/debug-frontend/src/components/WalletInfo.tsx` | Passkey-derived AIN address display |
| `ainblockchain-integration/debug-frontend/src/lib/types.ts` | PasskeyCredential type |
| `ainblockchain-integration/p256-passkey-plan.md` | Full P256 implementation plan |

### Passkey Registration (WebAuthn)

```typescript
import {
  getRegistrationOptions,
  extractPublicKeyFromAttestation,
  bytesToHex,
} from '@/lib/passkey';

// 1. Create WebAuthn credential with P256/ES256
const options = getRegistrationOptions(userId, userName);
const credential = await navigator.credentials.create(options);

// 2. Extract P256 public key from attestation
const response = credential.response as AuthenticatorAttestationResponse;
const pubKey = extractPublicKeyFromAttestation(response.attestationObject);
// pubKey = 65 bytes: 04 || x(32) || y(32)

// 3. Derive AIN address from P256 public key
const hashBuffer = await crypto.subtle.digest('SHA-256', pubKey);
const ainAddress = '0x' + bytesToHex(new Uint8Array(hashBuffer)).slice(-40);

// 4. Store credential locally
localStorage.setItem('passkey_info', JSON.stringify({
  credentialId: bufferToBase64Url(credential.rawId),
  publicKey: bytesToHex(pubKey),
  ainAddress,
}));
```

### Passkey Signing (for blockchain transactions)

```typescript
import { getAssertionOptions } from '@/lib/passkey';

// 1. Create challenge (usually the transaction hash)
const challenge = new Uint8Array(txHash);

// 2. Sign with passkey
const credentialId = JSON.parse(localStorage.getItem('passkey_info')).credentialId;
const assertion = await navigator.credentials.get(
  getAssertionOptions(challenge, credentialId)
);

// 3. Extract R, S from the DER-encoded signature
const signature = assertion.response.signature;
// Parse DER → extract r(32), s(32)

// 4. Format as AIN P256 signature: 0x02 + compressedPubKey(33) + r(32) + s(32)
```

---

## 4. Frontend Integration

The main frontend (`frontend/` — live at [paperswithclaudecode.com](https://paperswithclaudecode.com/)) implements the passkey auth flow.

### Implementation

**1. Copy passkey library:**
```
debug-frontend/src/lib/passkey.ts → frontend/src/lib/passkey.ts
debug-frontend/src/lib/types.ts   → frontend/src/lib/types.ts (merge PasskeyCredential)
```

**2. Replace or extend AuthProvider:**

Currently the main frontend uses NextAuth v5 with JWT sessions. The passkey flow adds a second step after GitHub login:

```tsx
// frontend/src/providers/AuthProvider.tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSyncEffect />
      <PasskeyEffect />  {/* NEW: auto-check passkey after login */}
      {children}
    </SessionProvider>
  );
}
```

**3. Add passkey state to auth store:**

```typescript
// frontend/src/stores/useAuthStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // NEW: passkey/wallet fields
  passkeyCredentialId: string | null;
  ainAddress: string | null;
  hasPasskey: boolean;
  // ...
}
```

**4. Add passkey registration to login flow:**

After GitHub OAuth succeeds, prompt passkey registration:

```tsx
// frontend/src/app/login/page.tsx
// Step 1: GitHub OAuth
signIn('github', { redirectTo: '/setup-passkey' });

// Step 2: /setup-passkey page
// - Check if passkey exists in localStorage
// - If not, prompt "Register Passkey" button
// - On success, redirect to /explore
```

**5. Use passkey-derived address for blockchain calls:**

```typescript
// Instead of reading from blockchain/.env private key:
const ainAddress = useAuthStore(s => s.ainAddress);
// Use ainAddress for all ain.knowledge.* calls
```

### Identity Chain

```
GitHub OAuth          → session.user.username ("octocat")
                        session.user.id ("12345")
                        session.user.image (avatar URL)

Passkey Registration  → passkeyInfo.ainAddress ("0xABC...")
                        passkeyInfo.credentialId (base64url)
                        passkeyInfo.publicKey (hex)

On-Chain Identity     → /apps/knowledge/users/{ainAddress}/github_username = "octocat"
```

---

## 5. KG Extractor Integration

The KG extractor (`knowledge-graph-builder/`) generates course repos. It can use the GitHub identity in two ways:

### 5.1 Stamp Generated Courses with GitHub Identity

When a logged-in user triggers course generation from the frontend, pass their GitHub + passkey identity:

```python
# kg_extractor/scaffold.py — update profile generation
profile = {
    "name": github_username,              # from GitHub OAuth
    "avatar": github_avatar_url,          # GitHub avatar
    "started_at": date.today().isoformat(),
    "github_username": github_username,   # GitHub login handle
    "github_id": github_id,              # GitHub user ID
    "wallet_address": ain_address,        # from passkey registration
}
```

### 5.2 API Endpoint for Frontend-Triggered Generation

Add an HTTP endpoint so the frontend can trigger course generation with the authenticated user's context:

```python
# POST /api/generate-course
# Headers: Authorization (validated by frontend session)
# Body:
{
    "repo_url": "https://github.com/org/repo",
    "github_username": "octocat",       # from session
    "github_id": "12345",              # from session
    "ain_address": "0xABC...",         # from passkey
    "enable_blockchain": true
}
```

The generated course's `.learner/profile.json` will include the GitHub + wallet mapping.

### 5.3 Private Repo Access

For cloning private repos during course generation, set `GITHUB_TOKEN`:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

Git automatically uses this for HTTPS clones. Alternatively, the frontend can forward the user's OAuth access token.

---

## 6. Kubernetes CI/CD

### 6.1 Secrets

Store auth credentials as Kubernetes secrets:

```yaml
# claudecode-kubernetes/base/secrets.yml
apiVersion: v1
kind: Secret
metadata:
  name: github-oauth
  namespace: papers-lms
type: Opaque
stringData:
  GITHUB_ID: "<client-id>"
  GITHUB_SECRET: "<client-secret>"
  NEXTAUTH_SECRET: "<random-secret>"
---
apiVersion: v1
kind: Secret
metadata:
  name: ain-blockchain
  namespace: papers-lms
type: Opaque
stringData:
  AIN_PROVIDER_URL: "http://ain-node:8081"
  AIN_PRIVATE_KEY: "<server-wallet-key>"
```

### 6.2 Frontend Deployment

The frontend pod needs GitHub OAuth env vars for NextAuth and must serve on HTTPS (passkeys require a secure context):

```yaml
# claudecode-kubernetes/frontend/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: papers-lms
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: ghcr.io/your-org/papers-lms/frontend:latest
          ports:
            - containerPort: 3000
          env:
            - name: GITHUB_ID
              valueFrom:
                secretKeyRef:
                  name: github-oauth
                  key: GITHUB_ID
            - name: GITHUB_SECRET
              valueFrom:
                secretKeyRef:
                  name: github-oauth
                  key: GITHUB_SECRET
            - name: NEXTAUTH_SECRET
              valueFrom:
                secretKeyRef:
                  name: github-oauth
                  key: NEXTAUTH_SECRET
            - name: NEXTAUTH_URL
              value: "https://your-domain.com"
            - name: AIN_PROVIDER_URL
              valueFrom:
                secretKeyRef:
                  name: ain-blockchain
                  key: AIN_PROVIDER_URL
```

**Important:** WebAuthn/passkeys require HTTPS. The ingress must terminate TLS:

```yaml
# claudecode-kubernetes/base/ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: papers-lms
  namespace: papers-lms
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - your-domain.com
      secretName: papers-lms-tls
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

### 6.3 GitHub Actions Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository }}

jobs:
  frontend:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'frontend/')
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & push frontend
        uses: docker/build-push-action@v5
        with:
          context: frontend
          push: true
          tags: ${{ env.IMAGE_PREFIX }}/frontend:${{ github.sha }}

      - name: Deploy to K8s
        uses: azure/setup-kubectl@v3
      - run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config
          kubectl set image deployment/frontend \
            frontend=${{ env.IMAGE_PREFIX }}/frontend:${{ github.sha }} \
            -n papers-lms

  kg-extractor:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'knowledge-graph-builder/')
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & push kg-extractor
        uses: docker/build-push-action@v5
        with:
          context: knowledge-graph-builder
          push: true
          tags: ${{ env.IMAGE_PREFIX }}/kg-extractor:${{ github.sha }}

      - name: Deploy to K8s
        uses: azure/setup-kubectl@v3
      - run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config
          kubectl set image deployment/kg-extractor \
            kg-extractor=${{ env.IMAGE_PREFIX }}/kg-extractor:${{ github.sha }} \
            -n papers-lms
```

### 6.4 GitHub Actions Secrets

Add these in **Settings > Secrets and variables > Actions**:

| Secret | Description |
|--------|-------------|
| `KUBE_CONFIG` | Base64-encoded kubeconfig for cluster access |

> `GITHUB_TOKEN` is provided automatically by GitHub Actions.
> OAuth secrets (`GITHUB_ID`, `GITHUB_SECRET`) live in K8s secrets, not in GitHub Actions.

### 6.5 Passkey Considerations for Production

- **HTTPS required**: WebAuthn only works on `localhost` or HTTPS origins
- **RP ID**: The passkey's relying party ID (`rp.id`) must match the production domain. Update `passkey.ts`:
  ```typescript
  rp: {
    name: 'Papers with Claude Code',
    id: window.location.hostname, // automatically uses production domain
  }
  ```
- **Cross-device**: Passkeys created on one device can be used on another via QR code (platform-dependent)
- **Passkey storage**: Credentials are stored in `localStorage` on the client. For cross-browser persistence, consider storing the `credentialId → ainAddress` mapping server-side (keyed by GitHub user ID)

---

## Summary: Identity Mapping

| Layer | Identifier | Source |
|-------|-----------|--------|
| GitHub | `username` (e.g. `octocat`) | GitHub OAuth |
| Session | `session.user.id` + `.name` + `.image` | NextAuth JWT |
| Wallet | `ainAddress` (e.g. `0xABC...`) | P256 passkey (WebAuthn) |
| On-chain | `wallet_address` | AIN blockchain |
| Course | `.learner/profile.json` | Scaffold + setup |

The passkey bridges GitHub identity to on-chain identity. No private keys are ever exposed to the user.
