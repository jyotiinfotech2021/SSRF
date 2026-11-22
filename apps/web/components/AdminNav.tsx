import Link from "next/link";

/** Tabs shared by the two editorial pages, so an editor or administrator can move between them in one click. */
export default function AdminNav({ current, admin }: { current: "review" | "tools"; admin: boolean }) {
  return (
    <nav className="adminnav" aria-label="Editorial pages">
      <Link href="/admin/review" aria-current={current === "review" ? "page" : undefined}><b>Review</b><span>Approve contributions, corrections and requests</span></Link>
      {admin && <Link href="/admin/tools" aria-current={current === "tools" ? "page" : undefined}><b>Administration</b><span>Accounts, site settings, backups and imports</span></Link>}
    </nav>
  );
}
