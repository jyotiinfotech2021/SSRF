import type { Metadata } from "next";
import Link from "next/link";
import { me, isEditor, isAdmin } from "@/lib/api";
import { PageHead } from "@/components/ui";
import ReviewQueue from "@/components/ReviewQueue";

export const metadata: Metadata = { title: "Review", robots: { index: false, follow: false } };

export default async function Review() {
  const who = await me();
  if (!isEditor(who)) return (<><PageHead title="Review" /><p className="empty">This page is for the foundation&apos;s editors.</p></>);
  return (
    <>
      <PageHead title="Review" lead="Contributions, corrections, data requests and access requests. An item cannot be reviewed by its author." />
      {isAdmin(who) && <p><Link href="/admin/tools">Administration tools</Link></p>}
      <ReviewQueue uid={who.id!} />
    </>
  );
}
