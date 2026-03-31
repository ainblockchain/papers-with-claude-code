import type { OAuthConfig } from "next-auth/providers"

interface KiteProfile {
  sub: string
  name: string
}

const KITE_OAUTH_BASE =
  process.env.KITE_OAUTH_BASE_URL || "https://neo.dev.gokite.ai"

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16)
}

export default function KitePassport(): OAuthConfig<KiteProfile> {
  return {
    id: "kite-passport",
    name: "Kite Passport",
    type: "oauth",
    authorization: {
      url: `${KITE_OAUTH_BASE}/v1/oauth/authorize`,
      params: { scope: "payment" },
    },
    token: `${KITE_OAUTH_BASE}/v1/oauth/token`,
    userinfo: {
      url: `${KITE_OAUTH_BASE}/v1/mcp`, // placeholder — overridden by request()
      async request({ tokens }: { tokens: { access_token: string } }) {
        // Kite Passport has no userinfo endpoint.
        // Derive a deterministic user ID from the access token.
        const tokenId = await hashToken(tokens.access_token)
        return {
          sub: `kite-${tokenId}`,
          name: "Kite User",
        }
      },
    },
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: null,
        image: null,
      }
    },
    clientId: process.env.KITE_OAUTH_CLIENT_ID,
    clientSecret: process.env.KITE_OAUTH_CLIENT_SECRET || "placeholder",
  }
}
