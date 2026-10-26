# SSO IAM

A Next.js identity and access management starter with local email/password accounts, email verification, and Keycloak single sign-on. Federated authentication is handled by [Auth.js](https://authjs.dev/) with its Keycloak provider. Users, roles, and permissions are managed by the app.

## Configure Keycloak

1. Create an **OpenID Connect** client in Keycloak and enable client authentication.
2. Add this valid redirect URI to the client (replace the host for deployed environments):

   ```text
   http://localhost:3000/api/auth/callback/keycloak
   ```

3. Copy `.env.example` to `.env.local` and set `AUTH_SECRET`, `SESSION_SECRET`, `AUTH_KEYCLOAK_ID`, `AUTH_KEYCLOAK_SECRET`, and `AUTH_KEYCLOAK_ISSUER`. The issuer must include the realm, such as `https://keycloak.example.com/realms/my-realm`.
4. Configure Keycloak to return a verified email (`email_verified: true`). The app uses verified email addresses when linking SSO identities to existing local accounts.

Generate the Auth.js secret and set it as `AUTH_SECRET`:

```bash
npx auth secret
```

Generate the local-session secret and set it as `SESSION_SECRET`:

```bash
openssl rand -base64 32
```

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A pre-verified admin account is seeded for local testing: `demo@example.com` / `Password123!`.

## Notes

- New Keycloak identities are provisioned with the default **Member** role; administrators can assign other roles in the dashboard.
- The current user and role store is in memory and resets when the server restarts. Replace `src/lib/db/users.ts` with a persistent database before production use.
