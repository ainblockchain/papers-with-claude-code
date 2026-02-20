import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import KitePassport from "@/lib/auth/kite-passport-provider"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub, KitePassport()],
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
      if (user?.id) {
        token.id = user.id
      }
      if (account?.provider) {
        token.provider = account.provider as "github" | "kite-passport"
      }
      if (profile) {
        if (token.provider === "github") {
          token.username = (profile as { login?: string }).login ?? user?.name ?? ""
          token.avatarUrl = (profile as { avatar_url?: string }).avatar_url ?? user?.image ?? ""
        } else {
          token.username = user?.name ?? profile.name ?? "Kite User"
          token.avatarUrl = ""
        }
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
      provider?: "github" | "kite-passport"
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    username: string
    avatarUrl: string
    provider?: "github" | "kite-passport"
  }
}
