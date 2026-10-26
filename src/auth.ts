import NextAuth, { type Profile } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { findOrCreateExternalUser } from "@/lib/db/users";

type KeycloakProfile = Profile & {
  email_verified?: boolean;
  preferred_username?: string;
};

async function getLocalUser(profile: Profile | undefined) {
  const keycloakProfile = profile as KeycloakProfile | undefined;
  if (
    !keycloakProfile ||
    typeof keycloakProfile.sub !== "string" ||
    typeof keycloakProfile.email !== "string" ||
    keycloakProfile.email_verified !== true
  ) {
    return null;
  }

  return findOrCreateExternalUser({
    provider: "keycloak",
    externalId: keycloakProfile.sub,
    email: keycloakProfile.email,
    emailVerified: true,
    name:
      typeof keycloakProfile.name === "string"
        ? keycloakProfile.name
        : keycloakProfile.preferred_username ?? keycloakProfile.email,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "keycloak") return false;
      return (await getLocalUser(profile)) !== null;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "keycloak" && profile) {
        const user = await getLocalUser(profile);
        if (user) token.appUserId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.appUserId === "string") {
        session.user.id = token.appUserId;
      }
      return session;
    },
  },
});
