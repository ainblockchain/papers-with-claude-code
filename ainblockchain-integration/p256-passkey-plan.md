# P256/Passkey Support for AIN + Debug Frontend

## Context

Users should log in via GitHub OAuth and use passkeys (Google Password Manager / iCloud Keychain) as their AIN wallet — no seed phrases, no private key management. This requires adding P256 signature verification natively to the AIN blockchain, updating ain-js, then building a debug frontend.

### Repositories

- **ain-js**: [github.com/ainblockchain/ain-js](https://github.com/ainblockchain/ain-js) — local path: `/home/comcom/git/ain-js/`
- **ain-blockchain**: [github.com/ainblockchain/ain-blockchain](https://github.com/ainblockchain/ain-blockchain) — local path: `/home/comcom/git/ain-blockchain/`
- **debug-frontend**: `/home/comcom/git/papers-with-claudecode/ainblockchain-integration/debug-frontend/` (new)

---

## Phase 1: ain-js — Add P256 crypto functions

**Repository:** [ainblockchain/ain-js](https://github.com/ainblockchain/ain-js)

The [`@ainblockchain/ain-util`](https://github.com/ainblockchain/ain-util) crypto layer is bundled inside ain-js as an npm dependency. We need P256 counterparts for all crypto functions.

### Files to modify:

**[`src/ain-util.ts`](https://github.com/ainblockchain/ain-js/blob/master/src/ain-util.ts)** (or wherever `ecSignMessage`, `ecSignTransaction`, `ecVerifySig`, `createAccount` live — currently in the `@ainblockchain/ain-util` package)
- Add `createP256Account()` — generate P256 keypair via `crypto.generateKeyPairSync('ec', {namedCurve: 'prime256v1'})`, derive address via same keccak-256(pubkey) approach
- Add `p256Sign(msgHash, privateKey)` — ECDSA sign with P256 curve, returns `{r, s, recovery}`
- Add `p256Verify(msgHash, signature, publicKey)` — verify P256 ECDSA signature
- Add `p256PubKeyToAddress(publicKey)` — same as `pubToAddress` but accepts P256 format

**[`src/wallet.ts`](https://github.com/ainblockchain/ain-js/blob/master/src/wallet.ts)** (line ~319-334)
- `Account` type: add `keyType?: 'secp256k1' | 'p256'` field
- `Wallet.create(keyType?)` — routes to `createAccount()` or `createP256Account()`
- `Wallet.sign()` — checks account keyType, routes to secp256k1 or P256 signing
- `Wallet.signTransaction()` — same routing
- `Wallet.verifySignature()` — detects curve from signature prefix

**[`src/types.ts`](https://github.com/ainblockchain/ain-js/blob/master/src/types.ts)**
- Add `keyType` to `Account` interface

### Signature format (critical design decision):
```
secp256k1: 0x{hash(32)}{r(32)}{s(32)}{v(1)}     — 66 bytes (existing)
P256:      0x02{compressedPubKey(33)}{r(32)}{s(32)} — 98 bytes (new)
```
- Prefix `0x02` identifies P256 signatures
- Include compressed public key because P256 recovery is unreliable
- Existing signatures (no prefix or `0x` prefix) treated as secp256k1 (backward compat)

### Dependencies:
- Node.js built-in `crypto` module — supports P256 natively via `crypto.sign('SHA256', data, key)`
- No extra npm packages needed

---

## Phase 2: ain-blockchain — Verify P256 signatures

**Repository:** [ainblockchain/ain-blockchain](https://github.com/ainblockchain/ain-blockchain)

### Files to modify:

**[`tx-pool/transaction.js`](https://github.com/ainblockchain/ain-blockchain/blob/master/tx-pool/transaction.js)** (lines 183-200)
- `verifyTransaction()`: detect signature type from prefix byte
  - No prefix / `0x01` prefix → existing secp256k1 path
  - `0x02` prefix → new P256 verification path
- P256 path: extract pubkey + r,s from signature → verify ECDSA → derive address from pubkey → compare with tx.address

**[`common/common-util.js`](https://github.com/ainblockchain/ain-blockchain/blob/master/common/common-util.js)** (lines 32-79)
- `getAddressFromSignature()`: add P256 branch
  - Parse signature format → if P256, extract compressed pubkey → decompress → keccak-256 → address
- Add `p256Verify(hash, r, s, publicKey)` utility using Node.js `crypto.verify()`

**[`json_rpc/transaction.js`](https://github.com/ainblockchain/ain-blockchain/blob/master/json_rpc/transaction.js)** (lines 15-65)
- No changes needed — it passes signatures as-is to Transaction.create()

### Backward compatibility:
- Old signatures (secp256k1) continue to work unchanged
- P256 signatures are a superset — old nodes will reject them (need node upgrade)
- For local testnet: upgrade all 3 nodes simultaneously

---

## Phase 3: Build & Test P256 end-to-end

1. Build ain-js: `cd /home/comcom/git/ain-js && npm run build`
2. Restart local blockchain nodes (3 nodes at ports 8081/8082/8083)
3. Test:
```javascript
const Ain = require('./lib/ain.js').default;
const ain = new Ain('http://localhost:8081');

// Create P256 account
const addr = ain.wallet.create('p256');
console.log('P256 address:', addr);

// Fund it (using genesis account)
// ...

// Sign and send a transaction
const result = await ain.db.ref('/test/p256').setValue({
  value: 'hello from P256',
  nonce: -1
});
console.log('TX result:', result);
```

---

## Phase 4: Debug Frontend with Passkey Auth

**Location:** `/home/comcom/git/papers-with-claudecode/ainblockchain-integration/debug-frontend/`

### Auth + Wallet Flow:
1. User clicks "Sign in with GitHub" → NextAuth.js OAuth
2. After auth, frontend calls `navigator.credentials.create({publicKey: ...})` with `alg: -7` (ES256/P256) → passkey created in Google Password Manager / iCloud Keychain
3. Frontend sends the passkey's P256 public key to server → server derives AIN address
4. For blockchain calls: frontend calls `navigator.credentials.get()` → passkey signs challenge → P256 signature sent to server → server formats as AIN P256 signature → submits transaction
5. User never sees a private key. Passkey IS the wallet.

### File Structure:
```
debug-frontend/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── .env.local                 # GITHUB_ID, GITHUB_SECRET, NEXTAUTH_SECRET, AIN_PROVIDER_URL
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout + SessionProvider
│   │   ├── page.tsx           # Debug dashboard
│   │   ├── globals.css
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── ain/
│   │       │   ├── config/route.ts
│   │       │   ├── whoami/route.ts
│   │       │   └── setup-app/route.ts
│   │       ├── topics/
│   │       │   ├── route.ts           # listTopics
│   │       │   ├── register/route.ts  # registerTopic
│   │       │   ├── info/route.ts      # getTopicInfo + listSubtopics
│   │       │   ├── stats/route.ts     # getTopicStats
│   │       │   ├── frontier/route.ts  # getFrontier
│   │       │   └── explorers/route.ts # getExplorers
│   │       ├── explorations/
│   │       │   ├── route.ts           # explore / getExplorations
│   │       │   └── by-user/route.ts   # getExplorationsByUser
│   │       ├── frontier-map/route.ts  # getFrontierMap
│   │       └── access/route.ts        # x402 access
│   ├── lib/
│   │   ├── ain-client.ts      # Server-side Ain instance
│   │   ├── passkey.ts         # WebAuthn helpers (create credential, sign, format for AIN)
│   │   └── types.ts
│   └── components/
│       ├── AuthGate.tsx       # GitHub login + passkey registration
│       ├── ConfigPanel.tsx    # Provider URL
│       ├── WalletInfo.tsx     # Passkey-derived address
│       ├── SetupAppButton.tsx
│       ├── ApiCallCard.tsx    # Reusable form + request/response JSON
│       ├── JsonDisplay.tsx    # Pretty JSON with copy
│       ├── SectionCollapsible.tsx
│       ├── TopicBrowser.tsx   # Recursive topic tree
│       ├── ExploreForm.tsx
│       ├── ExplorationViewer.tsx
│       ├── FrontierMapViz.tsx # CSS bar charts
│       ├── FrontierView.tsx
│       └── AccessPanel.tsx
```

### Dashboard sections:
1. **Auth & Wallet** (default open) — GitHub user info + passkey address + provider config
2. **Topics** — browse/register topics
3. **Explore** — submit explorations
4. **Explorations** — query by user/topic
5. **Frontier** — frontier map visualization + single topic stats
6. **Access** — x402 payment testing

---

## Implementation Order

1. ain-js: P256 crypto functions in ain-util
2. ain-js: Wallet dual-curve support
3. ain-js: Build (`npm run build`)
4. ain-blockchain: P256 signature verification in [transaction.js](https://github.com/ainblockchain/ain-blockchain/blob/master/tx-pool/transaction.js) + [common-util.js](https://github.com/ainblockchain/ain-blockchain/blob/master/common/common-util.js)
5. Restart local chain, test P256 account creation + transaction signing
6. Frontend: scaffold (package.json, Next.js configs, TailwindCSS)
7. Frontend: auth (NextAuth GitHub OAuth + WebAuthn passkey registration)
8. Frontend: ain-client.ts + API routes for all 15 Knowledge methods
9. Frontend: dashboard components
10. End-to-end: GitHub login → passkey → explore topic → verify on chain

---

## Verification

### Phase 1-3 (P256 in AIN):
1. `cd /home/comcom/git/ain-js && npm run build` — compiles with P256 support
2. Restart ain-blockchain nodes
3. Create P256 account, fund it, send a transaction → verify on chain
4. Verify secp256k1 transactions still work (backward compat)

### Phase 4 (Debug frontend):
1. Create GitHub OAuth app at [github.com/settings/developers](https://github.com/settings/developers)
2. `cd debug-frontend && npm install && npm run dev`
3. Open http://localhost:3005
4. Sign in with GitHub → register passkey → see AIN address
5. Test all Knowledge module operations through dashboard

---

## Critical source files

| File | Repository | Description |
|------|-----------|-------------|
| [`src/wallet.ts`](https://github.com/ainblockchain/ain-js/blob/master/src/wallet.ts) | [ain-js](https://github.com/ainblockchain/ain-js) | Wallet signing |
| [`src/types.ts`](https://github.com/ainblockchain/ain-js/blob/master/src/types.ts) | [ain-js](https://github.com/ainblockchain/ain-js) | Account type |
| [`src/signer/default-signer.ts`](https://github.com/ainblockchain/ain-js/blob/master/src/signer/default-signer.ts) | [ain-js](https://github.com/ainblockchain/ain-js) | Default signer impl |
| [`tx-pool/transaction.js`](https://github.com/ainblockchain/ain-blockchain/blob/master/tx-pool/transaction.js) | [ain-blockchain](https://github.com/ainblockchain/ain-blockchain) | TX verification (lines 183-200) |
| [`common/common-util.js`](https://github.com/ainblockchain/ain-blockchain/blob/master/common/common-util.js) | [ain-blockchain](https://github.com/ainblockchain/ain-blockchain) | Signature recovery (lines 32-79) |
| [`src/knowledge/index.ts`](https://github.com/ainblockchain/ain-js/blob/master/src/knowledge/index.ts) | [ain-js](https://github.com/ainblockchain/ain-js) | Knowledge module API |
| [`@ainblockchain/ain-util`](https://github.com/ainblockchain/ain-util) | [ain-util](https://github.com/ainblockchain/ain-util) | Core crypto functions (secp256k1) |
