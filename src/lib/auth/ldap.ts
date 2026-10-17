import "server-only";
import { Client, InvalidCredentialsError, escapeFilter, type Entry } from "ldapts";

/**
 * Active Directory sign-in over LDAP.
 *
 * Flow: bind with a read-only service account, search for the user by
 * sAMAccountName, then bind as that user's DN with the password typed in the
 * form. The password is never compared locally.
 *
 * Required env: LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN, LDAP_BIND_PASSWORD.
 * Use an ldaps:// URL in production so passwords aren't sent in clear text.
 */

export type DirectoryResult =
  | { ok: true; externalId: string; email: string; name: string }
  | { ok: false; reason: "invalid" | "unavailable" | "no_email" | "not_configured" };

// sAMAccountName allows letters, digits and . _ - (plus @ for UPN-style input).
// Rejecting everything else up front keeps odd input away from the directory.
const USERNAME_PATTERN = /^[A-Za-z0-9._@-]{1,64}$/;

const REQUEST_TIMEOUT_MS = 10_000;

function config() {
  const url = process.env.LDAP_URL;
  const baseDn = process.env.LDAP_BASE_DN;
  const bindDn = process.env.LDAP_BIND_DN;
  const bindPassword = process.env.LDAP_BIND_PASSWORD;
  if (!url || !baseDn || !bindDn || !bindPassword) return null;
  return { url, baseDn, bindDn, bindPassword };
}

export function isLdapConfigured() {
  return config() !== null;
}

// Attribute names are matched case-insensitively. LDAP names are case-insensitive,
// but the client library's key casing can differ from the name it was asked for.
function firstValue(entry: Entry, attribute: string): string | undefined {
  const key = Object.keys(entry).find((k) => k.toLowerCase() === attribute.toLowerCase());
  if (!key) return undefined;
  const value = entry[key];
  const first = Array.isArray(value) ? value[0] : value;
  if (first === undefined) return undefined;
  return Buffer.isBuffer(first) ? first.toString("utf8") : String(first);
}

export async function authenticateDirectoryUser(
  username: string,
  password: string,
): Promise<DirectoryResult> {
  const settings = config();
  if (!settings) return { ok: false, reason: "not_configured" };
  if (!USERNAME_PATTERN.test(username) || password.length === 0) {
    return { ok: false, reason: "invalid" };
  }

  const client = new Client({
    url: settings.url,
    timeout: REQUEST_TIMEOUT_MS,
    connectTimeout: REQUEST_TIMEOUT_MS,
    strictDN: true,
  });

  try {
    await client.bind(settings.bindDn, settings.bindPassword);

    const { searchEntries } = await client.search(settings.baseDn, {
      scope: "sub",
      filter: escapeFilter`(&(objectCategory=person)(objectClass=user)(sAMAccountName=${username}))`,
      // Lowercase on purpose: mixed-case names in the request come back empty from some client versions.
      attributes: ["dn", "samaccountname", "mail", "userprincipalname", "displayname"],
      sizeLimit: 2,
    });

    // Zero or several matches are both treated as "no such user".
    if (searchEntries.length !== 1) return { ok: false, reason: "invalid" };
    const entry = searchEntries[0];

    // Binding as the user is the password check. A wrong password throws
    // InvalidCredentialsError; any other error means the directory is unreachable or misbehaving.
    await client.bind(entry.dn, password);

    const sam = firstValue(entry, "sAMAccountName") ?? username;
    const email = firstValue(entry, "mail") ?? firstValue(entry, "userPrincipalName");
    if (!email) return { ok: false, reason: "no_email" };

    return {
      ok: true,
      externalId: sam.toLowerCase(),
      email,
      name: firstValue(entry, "displayName") ?? sam,
    };
  } catch (error) {
    if (error instanceof InvalidCredentialsError) return { ok: false, reason: "invalid" };
    console.error("LDAP sign-in failed:", error instanceof Error ? error.message : error);
    return { ok: false, reason: "unavailable" };
  } finally {
    await client.unbind().catch(() => undefined);
  }
}
