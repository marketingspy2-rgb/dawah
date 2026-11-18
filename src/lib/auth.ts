/**
 * Passwords and the session cookie, with Web Crypto only so the same code runs on
 * Node and on Cloudflare Workers.
 *
 * - Passwords: PBKDF2-SHA256 with a random salt, stored as "pbkdf2$<iterations>$<salt>$<hash>".
 * - Session: the cookie holds "<userId>.<HMAC>", so nobody can sign in as someone else
 *   by editing it. The key is SESSION_SECRET when set, otherwise one kept in the data.
 */
const enc = new TextEncoder();
const ITERATIONS = 100_000;

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (buf: ArrayBuffer) => b64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITERATIONS))}`;
}

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string | undefined) {
  const [kind, iter, salt, hash] = (stored ?? "").split("$");
  if (kind !== "pbkdf2" || !salt || !hash) return false;
  return sameText(b64(await pbkdf2(password, unb64(salt), Number(iter))), hash);
}

/** A password must be at least this long, so it is not easy to guess. */
export const MIN_PASSWORD = 8;

export function newSecret() {
  return b64url(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

export async function signSession(secret: string, userId: string) {
  return `${userId}.${await hmac(secret, userId)}`;
}

/** The user id in a session cookie, or null when the signature does not match. */
export async function readSession(secret: string, cookie: string | undefined) {
  if (!cookie) return null;
  const i = cookie.lastIndexOf(".");
  if (i <= 0) return null;
  const id = cookie.slice(0, i);
  return sameText(cookie.slice(i + 1), await hmac(secret, id)) ? id : null;
}
