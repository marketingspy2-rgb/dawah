import { redirect } from "next/navigation";

/** "My day" now lives on the home page; old links keep working. */
export default async function TodayRedirect({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = new URLSearchParams(await searchParams).toString();
  redirect(q ? `/?${q}` : "/");
}
