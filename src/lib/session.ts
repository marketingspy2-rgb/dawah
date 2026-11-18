import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { newSecret, readSession, signSession } from "./auth";
import { loadDb, mutate } from "./db";
import type { UiLang, User } from "./types";

export const USER_COOKIE = "dawah_user";
export const LANG_COOKIE = "dawah_lang";
/** Where to go after signing in, set when a share arrives before the person has signed in. */
export const AFTER_LOGIN_COOKIE = "dawah_next";

export async function getUiLang(): Promise<UiLang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return value === "en" ? "en" : "ar";
}

/** The key that signs session cookies: SESSION_SECRET if configured, else one kept with the data. */
export async function sessionSecret() {
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= 16) return env;
  const db = await loadDb();
  if (db.settings.sessionSecret) return db.settings.sessionSecret;
  return mutate((d) => (d.settings.sessionSecret ??= newSecret()));
}

export async function sessionCookieFor(userId: string) {
  return signSession(await sessionSecret(), userId);
}

/** The signed-in user from the cookie, or null. */
export async function userIdFromCookie(value: string | undefined) {
  return readSession(await sessionSecret(), value);
}

export async function getCurrentUser(): Promise<User | null> {
  const id = await userIdFromCookie((await cookies()).get(USER_COOKIE)?.value);
  if (!id) return null;
  const db = await loadDb();
  const user = db.users.find((u) => u.id === id);
  // Someone who has left can no longer sign in.
  return user && user.status !== "left" ? user : null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
