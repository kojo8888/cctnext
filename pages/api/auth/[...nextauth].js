import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import StravaProvider from "next-auth/providers/strava";

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    StravaProvider({
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
    }),
  ],
};

export default NextAuth(authOptions);
