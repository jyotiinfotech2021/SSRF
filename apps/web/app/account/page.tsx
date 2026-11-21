import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { get, me, canContribute, type Campaign, type Chapter } from "@/lib/api";
import { PageHead } from "@/components/ui";
import AccountPanel from "@/components/AccountPanel";

export const metadata: Metadata = { title: "Join and my account", description: "Create your member profile, follow your contributions, and make data or privacy requests." };

export default async function Account() {
  const who = await me();
  if (!who.id) redirect("/login?next=/account");
  const [profile, subs, chapters, camps] = who.id
    ? await Promise.all([get<Record<string, unknown>>("/api/me/profile"), get<Sub[]>("/api/me/submissions"), get<Chapter[]>("/api/chapters"), get<Campaign[]>("/api/campaigns")])
    : [null, null, null, null];
  return (
    <>
      <PageHead title="My account" />
      <AccountPanel who={who} canContribute={canContribute(who)} profile={profile} subs={subs ?? []} chapters={(chapters ?? []).map((c) => c.name)} camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
type Sub = { id: string; kind: string; status: string; createdAt: string; data: Record<string, string>; history: { at: string; status: string; note?: string }[] };
