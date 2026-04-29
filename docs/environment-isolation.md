# Environment Isolation

`localhost` (개발), 스테이징, `paperswithclaudecode.com` (프로덕션)이 **같은 AIN devnet 블록체인**을 공유하면서도 사용자 데이터가 섞이지 않게 만든 방법을 정리한 문서.

같은 사람이 같은 GitHub 계정으로 dev와 prod 양쪽에 로그인해도 **별개의 wallet/학습기록**으로 분리되어야 한다는 게 운영상 요구사항이다. 이 문서는 그 격리가 어떤 메커니즘으로 보장되는지 설명한다.

## 격리의 두 축

| 축 | 매체 | 격리 단위 |
|---|---|---|
| 1. 블록체인 publicKey 암호화 | `AIN_PRIVATE_KEY` 또는 `AUTH_SECRET` | 환경별 secret |
| 2. localStorage | 브라우저 origin 정책 | 도메인 (host:port) |

이 둘이 직교한다. 두 축 모두를 우회해야만 환경이 섞인다 — 의도적으로 하지 않는 한 그런 일은 없다.

## 1. 블록체인 publicKey 암호화

블록체인의 identity 데이터는 **공유 path**에 저장되지만, `publicKey`는 환경별 키로 암호화된다:

```
/apps/knowledge/topics/identity/{userId}
└── keys/
    ├── key_{ts1}: { encryptedPublicKey, provider, createdAt, avatarUrl? }   ← 어떤 env가 썼는지 표시 없음
    ├── key_{ts2}: { encryptedPublicKey, provider, createdAt, avatarUrl? }
    └── ...
```

**암호화 키 파생** (`frontend/src/lib/ain/identity-crypto.ts:17-23`):

```ts
const secret = process.env.AIN_PRIVATE_KEY || process.env.AUTH_SECRET;
return crypto.createHash('sha256').update(secret).digest();
```

- AES-256-GCM, IV 12바이트 + ciphertext + authTag 16바이트
- `AIN_PRIVATE_KEY` 우선, 없으면 `AUTH_SECRET` (JS OR — concat 아님)
- **두 환경의 secret이 다르면 서로의 keys를 복호화 불가**

### GET 시 동작 (`frontend/src/app/api/ain/identity/route.ts`)

```
keys/ 순회 → decryptPublicKey(entry.encryptedPublicKey) 시도
  → 성공한 첫 번째 entry의 publicKey 반환
  → 모두 실패하면 data: null
```

**효과**: 같은 userId 하의 다른 환경 entry는 "decryption error"로 자연스럽게 무시됨. dev는 dev가 쓴 key만, prod는 prod가 쓴 key만 본다.

### POST 시 동작

- 동일 publicKey 중복 방지(409): 기존 keys를 모두 해독 시도해서 같은 publicKey가 있나 확인. 다른 env가 쓴 entry는 해독 못 하니 무시됨 → 자연스럽게 새 key로 추가
- 결과: 한 userId의 keys/에 dev key + prod key가 공존. 충돌 없음

### 시나리오

```
사용자 X (GitHub id=12345)가 dev에 가입:
  /identity/12345/keys/key_aaa = enc_dev(P_dev)
  → dev wallet = derive(P_dev) = 0x_DEV

같은 사용자 X가 prod에 가입:
  prod GET /identity/12345 → key_aaa 해독 실패 → data: null
  prod POST → key_bbb = enc_prod(P_prod) 추가
  /identity/12345/keys/{ key_aaa: enc_dev(P_dev), key_bbb: enc_prod(P_prod) }
  → prod wallet = derive(P_prod) = 0x_PROD ≠ 0x_DEV
```

dev/prod 모두 자기 publicKey만 보고, 자기 wallet만 사용. ✓

## 2. localStorage origin 분리

브라우저 standard: localStorage는 origin(scheme + host + port)별로 격리됨.

- `http://localhost:3000` 의 localStorage ≠ `https://paperswithclaudecode.com` 의 localStorage
- 같은 이메일/같은 OAuth 계정으로 양쪽에서 로그인해도, localStorage의 `ain_passkey_info`는 별개

**효과**: 로그인 직후 `usePasskeyRestore`가 localStorage를 먼저 보는데, 환경별로 다른 PasskeyInfo가 나오니 즉시 다른 wallet으로 분기.

## 3. 격리 흐름 종합

| 자원 | 공유 | 격리 |
|---|---|---|
| 블록체인 entry path (`/identity/{userId}`) | ✅ | — |
| `userId` (GitHub numeric id, Google sub) | ✅ | — |
| `keys/{keyId}/encryptedPublicKey` (값) | ✅ (저장됨) | 🔐 환경 secret으로만 복호화 가능 |
| 평문 publicKey | ❌ | 🔐 평문은 어느 환경에도 안 남음 |
| Wallet address (AIN/EVM) | ❌ | 🔐 publicKey에서 파생되므로 환경별 |
| localStorage `ain_passkey_info` | ❌ | 🌐 origin별 |
| 학습 데이터 (`/explorations/{address}`) | ✅ (저장됨) | 🔐 wallet address가 환경별이라 path가 다름 |

핵심: **wallet address가 환경별로 다르므로, 학습 데이터를 비롯한 모든 wallet-keyed 데이터(explorations, payments, attestations)도 자동으로 분리됨.** 추가 처리 필요 없음.

## 4. 환경 변수 운영

각 환경의 `.env`/secrets:

| 변수 | 역할 | 격리 영향 |
|---|---|---|
| `AIN_PRIVATE_KEY` | identity-crypto encryption 1순위 | **달라야 함** (격리 핵심) |
| `AUTH_SECRET` | identity-crypto fallback + NextAuth JWT 서명 | 달라야 함 |
| `AUTH_GITHUB_ID/SECRET` | OAuth 클라이언트 | 콜백 URL이 환경별이라 보통 다른 OAuth app |
| `AUTH_GOOGLE_ID/SECRET` | 위와 동일 | 위와 동일 |
| `AIN_PROVIDER_URL` | AIN devnet RPC | 보통 같음 (devnet 공유) |

### 운영 원칙

1. **AIN_PRIVATE_KEY를 환경 간에 공유하지 않을 것.** 공유하면 격리가 깨진다 (서로의 publicKey를 복호화 가능해짐).
2. AUTH_SECRET도 마찬가지. fallback으로 쓰일 수 있으므로 다르게 유지.
3. OAuth 콜백 URL은 환경별로 등록 (`http://localhost:3000/api/auth/callback/{provider}` vs `https://paperswithclaudecode.com/api/auth/callback/{provider}`).
4. 동일 OAuth 앱을 여러 환경에서 공유 가능 (콜백 URL을 여러 개 등록), 단 OAuth client secret 자체는 git에 커밋 금지.

## 5. 향후 변경 시 격리 유지 가이드

새로 cross-provider 매칭이나 reverse index 같은 메커니즘을 추가할 때 격리를 깨지 않으려면:

### 원칙: **사용자 식별에 쓰이는 hash나 index 키는 환경 secret으로 derive할 것**

❌ 격리 깨짐:
```ts
const emailHash = sha256(email);   // 모든 환경이 같은 hash
```

✅ 격리 유지:
```ts
const emailHash = hmacSha256(AIN_PRIVATE_KEY, email);   // 환경별로 다른 hash
```

이러면:
- 같은 이메일이라도 dev와 prod의 hash가 다름
- index path도 다름 (`/_byEmailHash/{hash_dev}` vs `/_byEmailHash/{hash_prod}`)
- 환경 외부에서 hash를 역추적 불가능 (rainbow attack 방지)

### 검증 체크리스트

새 기능 추가 시 다음을 확인:

- [ ] 새로 저장되는 식별자가 환경 secret을 거쳤는가?
- [ ] 같은 사용자가 dev와 prod에서 동일 입력으로 가입해도 별개로 처리되는가?
- [ ] 한 환경의 secret이 유출되어도 다른 환경의 데이터는 안전한가?
- [ ] dev에서 디버깅 중 prod 데이터를 실수로 건드릴 위험이 있는가? (없어야 함)

## 6. 알려진 한계

- **OAuth provider sub의 환경 비의존성**: GitHub numeric id, Google sub 자체는 환경에 무관하게 같은 값. 이 ID 자체가 노출되어도 publicKey 복호화는 불가능하므로 wallet hijack은 안 일어나지만, "이 OAuth 계정이 우리 서비스에 가입되어 있다"는 사실은 노출됨. devnet은 공개 블록체인이므로 본질적 한계.
- **AIN devnet 공유**: `AIN_PROVIDER_URL`이 환경별로 다르면 (예: prod가 별도 노드 사용) 격리가 더 강해지지만, 현재는 devnet을 공유 중.

## 관련 코드

| 파일 | 역할 |
|---|---|
| `frontend/src/lib/ain/identity-crypto.ts` | encrypt/decrypt publicKey, 키 파생 |
| `frontend/src/app/api/ain/identity/route.ts` | GET/POST identity 매핑 (multi-key 처리) |
| `frontend/src/hooks/useIdentitySync.ts` | 로그인 후 환경 내 identity 자동 복구 흐름 |
| `frontend/src/lib/ain/passkey.ts` | publicKey → ainAddress/evmAddress 파생 |
| `frontend/.env` / `.env.example` | 환경별 secret 설정 |

## 관련 메모리

- `~/.claude/projects/-Users-comcom-Desktop-papers-with-claude-code/memory/project_blockchain_architecture.md`
- `~/.claude/projects/-Users-comcom-Desktop-papers-with-claude-code/memory/project_auth_wallet_flow.md`
