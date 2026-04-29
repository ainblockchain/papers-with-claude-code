import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
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
        token.provider = account.provider as "github"
      }
      if (profile) {
        if (token.provider === "github") {
          // Use GitHub's stable numeric ID, not NextAuth's random UUID
          token.id = String((profile as { id?: number }).id ?? user?.id ?? "")
          token.username = (profile as { login?: string }).login ?? user?.name ?? ""
          token.avatarUrl = (profile as { avatar_url?: string }).avatar_url ?? user?.image ?? ""
        } else if (user?.id) {
          token.id = user.id
        }
      } else if (user?.id && !token.id) {
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
      provider?: "github"
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    username: string
    avatarUrl: string
    provider?: "github"
  }
}
