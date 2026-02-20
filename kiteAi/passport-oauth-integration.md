# Kite Agent Passport — OAuth Login Integration

> **Status:** COMPLETED
> **Date:** 2026-02-21
> **Related Requirement:** R3 (Verifiable Agent Identity) — Kite Passport as OAuth login provider

---

## Overview

Kite Agent Passport가 NextAuth v5 OAuth 프로바이더로 통합되었습니다.
사용자는 GitHub 또는 Kite Passport 중 하나를 선택하여 로그인할 수 있으며, 이후 Passkey(WebAuthn) 인증을 거쳐 AIN 월렛을 생성합니다.

### Login Flow

```
[Login Page]
    ├─ "Sign in with GitHub"     → GitHub OAuth → redirect → Passkey → /explore
    └─ "Sign in with Kite Passport" → Kite OAuth  → redirect → Passkey → /explore
```

---

## File Map

### Created Files

| File | Description |
|------|-------------|
| `frontend/src/lib/auth/kite-passport-provider.ts` | Custom NextAuth v5 OAuth provider for Kite Agent Passport |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/src/auth.ts` | Added KitePassport provider, multi-provider JWT callback, `provider` field in Session/JWT types |
| `frontend/src/app/login/page.tsx` | Two login buttons (GitHub + Kite Passport), "or" divider, StepIndicator "1. Sign In → 2. Passkey" |
| `frontend/src/components/layout/Header.tsx` | Generic "Sign in" button (LogIn icon, GitHub-specific branding removed) |
| `frontend/src/stores/useAuthStore.ts` | `provider?: 'github' \| 'kite-passport'` field added to User interface |
| `frontend/src/hooks/useAuthSync.ts` | Syncs `session.user.provider` from NextAuth to Zustand store |
| `frontend/.env.local` | Added `KITE_OAUTH_CLIENT_ID`, `KITE_OAUTH_CLIENT_SECRET`, `KITE_OAUTH_BASE_URL` |
| `frontend/.env.example` | Added Kite OAuth env var documentation |

---

## Key Implementation Details

### 1. Kite Passport NextAuth Provider (`kite-passport-provider.ts`)

```typescript
// Provider Configuration
id: "kite-passport"
name: "Kite Passport"
type: "oauth"

// OAuth Endpoints
authorization: `${KITE_OAUTH_BASE}/v1/oauth/authorize` (scope: "payment")
token:         `${KITE_OAUTH_BASE}/v1/oauth/token`
userinfo:      Custom — no real endpoint, derived from access_token

// User Identity
// Kite Passport has no userinfo endpoint.
// User ID is derived from SHA-256 hash of access_token:
//   sub: "kite-<sha256(access_token).slice(0,16)>"
//   name: "Kite User"
```

### 2. Multi-Provider JWT Callback (`auth.ts`)

```typescript
jwt({ token, user, profile, account }) {
  // Store provider type in JWT
  if (account?.provider) {
    token.provider = account.provider  // "github" | "kite-passport"
  }
  // Branch profile mapping by provider
  if (token.provider === "github") {
    token.username = profile.login
    token.avatarUrl = profile.avatar_url
  } else {
    token.username = user?.name ?? "Kite User"
    token.avatarUrl = ""
  }
}
```

### 3. Login Page UI

- **Step 1: Sign In** — Two buttons:
  - `signIn('github', { redirectTo: '/login?from=oauth' })`
  - `signIn('kite-passport', { redirectTo: '/login?from=oauth' })`
- **Step 2: Passkey** — Same flow for both providers (WebAuthn registration or verification)
- **Mock mode** — Both buttons create mock users with respective `provider` labels

---

## Environment Variables

```bash
# Required for Kite Passport OAuth login
KITE_OAUTH_CLIENT_ID=        # From Kite Agent Passport portal
KITE_OAUTH_CLIENT_SECRET=    # From Kite Agent Passport portal
KITE_OAUTH_BASE_URL=https://neo.dev.gokite.ai  # OAuth server base URL
```

### How to Get Client Credentials

OAuth Client ID and Secret are issued by Kite (service provider side):

1. **Kite Portal** — https://x402-portal-eight.vercel.app/ (login required)
2. **Direct contact** with Kite team if portal registration is not available
3. Register with **Redirect URI**: `https://<your-domain>/api/auth/callback/kite-passport`

---

## OAuth Endpoints Reference

| Endpoint | Method | URL |
|----------|--------|-----|
| Authorize | GET | `https://neo.dev.gokite.ai/v1/oauth/authorize?scope=payment&client_id=...` |
| Token | POST | `https://neo.dev.gokite.ai/v1/oauth/token` |
| Callback | GET | `https://<domain>/api/auth/callback/kite-passport` (NextAuth auto-handled) |

---

## Verification Checklist

- [x] `yarn build` passes
- [x] Login page shows both GitHub and Kite Passport buttons
- [x] StepIndicator: "1. Sign In → 2. Passkey"
- [x] Header: generic "Sign in" button (no GitHub branding)
- [x] GitHub OAuth: redirects to `github.com/login` with correct params
- [x] Kite Passport OAuth: redirects to `neo.dev.gokite.ai/v1/oauth/authorize` with correct params
- [x] Mock mode: both buttons work with mock login → Passkey step
- [x] Playwright UI verification passed

---

## Relationship to Other Kite Integrations

This file implements **login authentication** only. Other Kite integrations in the project:

| Component | File | Purpose |
|-----------|------|---------|
| **Passport OAuth Login** (this) | `src/lib/auth/kite-passport-provider.ts` | User login via Kite OAuth |
| MCP Connection | `src/lib/kite/passport-auth.ts` | Kite MCP server connection (tools: `get_payer_addr`, `approve_payment`) |
| MCP API Routes | `src/app/api/kite-mcp/` | Server-side MCP proxy endpoints |
| x402 Payment | `src/app/api/x402/` | On-chain payment via x402 protocol |
| Smart Contracts | `kiteAi/contracts/` | LearningLedger.sol on Kite Testnet |
| Agent Wallet | `src/lib/ain/passkey.ts` | WebAuthn-based wallet creation |
