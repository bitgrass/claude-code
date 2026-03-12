import NextAuth, { type AuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";

export const authOptions: AuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      profile(profile) {
        return {
          id: profile.data.id,
          name: profile.data.username,
          email: null,
          image: profile.data.profile_image_url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.twitterId = (profile as { data?: { id?: string } })?.data?.id || token.sub;
        token.username = (profile as { data?: { username?: string } })?.data?.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { twitterId?: string }).twitterId = token.twitterId as string;
        (session.user as { username?: string }).username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
