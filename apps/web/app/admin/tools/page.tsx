import type { Metadata } from "next";
import { me, isAdmin, get } from "@/lib/api";
import { PageHead } from "@/components/ui";
import AdminTools from "@/components/AdminTools";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };
type U = { id: string; email: string; legacyUid?: string; roles: string[] };

export default async function Tools() {
  const who = await me();
  if (!isAdmin(who)) return (<><PageHead title="Administration" /><p className="empty">This page is for the foundation&apos;s administrators.</p></>);
  const users = (await get<U[]>("/api/editorial/users")) ?? [];
  return (<><PageHead title="Administration" lead="Accounts and roles, prototype data import, backups and the home-page portrait." /><AdminTools users={users} selfId={who.id!} /></>);
}
