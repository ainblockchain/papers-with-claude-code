import NextAuth from "next-auth"
import { AUTH_PROVIDERS, type AuthProviderId, findAuthProvider } from "@/lib/auth/providers"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: AUTH_PROVIDERS.map((p) =>
    typeof p.provider === "function" ? p.provider() : p.provider
  ),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user, profile, account }) {
      if (account?.provider) {
        token.provider = account.provider as AuthProviderId
      }
      // Provider-specific field mapping is delegated to the plugin.
      const plugin = findAuthProvider(account?.provider ?? token.provider)
      if (profile && plugin) {
        plugin.mapJWT({ token, user, profile })
      } else if (user?.id && !token.id) {
        // Fallback for callbacks where profile isn't present (e.g. session refresh).
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id
      if (token.username) session.user.username = token.username
      if (token.avatarUrl) session.user.avatarUrl = token.avatarUrl
      if (token.provider) session.user.provider = token.provider
      return session
    },
  },
})

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username: string
      avatarUrl: string
      provider?: AuthProviderId
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    username: string
    avatarUrl: string
    provider?: AuthProviderId
  }
}
