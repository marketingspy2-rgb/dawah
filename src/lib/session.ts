import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readDb } from "./db";
import type { UiLang, User } from "./types";

export const USER_COOKIE = "dawah_user";
export const LANG_COOKIE = "dawah_lang";

export async function getUiLang(): Promise<UiLang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return value === "en" ? "en" : "ar";
}

export async function getCurrentUser(): Promise<User | null> {
  const id = (await cookies()).get(USER_COOKIE)?.value;
  if (!id) return null;
  return readDb().users.find((u) => u.id === id) ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
