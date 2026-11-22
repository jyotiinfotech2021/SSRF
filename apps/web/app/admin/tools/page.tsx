import type { Metadata } from "next";
import { me, isAdmin, get } from "@/lib/api";
import { PageHead } from "@/components/ui";
import AdminNav from "@/components/AdminNav";
import AdminTools from "@/components/AdminTools";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };
type U = { id: string; email: string; legacyUid?: string; roles: string[] };

export default async function Tools() {
  const who = await me();
  if (!isAdmin(who)) return (<><PageHead title="Administration" /><p className="empty">This page is for the foundation&apos;s administrators.</p></>);
  const [users, site] = await Promise.all([get<U[]>("/api/editorial/users"), get<Record<string, Record<string, string>>>("/api/site")]);
  return (
    <>
      <PageHead title="Administration" lead="Everything for running the site in one place: who can do what, the contact details and member numbers shown to the public, backups, data import and the home-page portrait." />
      <AdminNav current="tools" admin />
      <AdminTools users={users ?? []} selfId={who.id!} settings={site?.settings ?? {}} />
    </>
  );
}
