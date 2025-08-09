import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider
      }
      if (profile && typeof profile === "object") {
        // Add basic profile fields if available
        // @ts-ignore - social profile can vary
        token.name = token.name || profile.name
        // @ts-ignore
        token.picture = token.picture || profile.picture
      }
      return token
    },
    async session({ session, token }) {
      // Expose provider on session if needed by UI
      // @ts-ignore
      session.provider = token.provider
      return session
    },
  },
}
