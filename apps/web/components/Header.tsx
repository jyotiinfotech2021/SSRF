"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GROUPS } from "@/lib/ref";
import { Mark } from "./Mark";

function SearchBox({ id }: { id: string }) {
  return (
    <form role="search" action="/search" method="get" className="hdr-search">
      <label htmlFor={id} className="sr-only">Search the site</label>
      <input id={id} name="q" type="search" placeholder="Search the record" minLength={2} />
      <button type="submit" aria-label="Search">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M13 13l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    </form>
  );
}

export default function Header({ signedIn, editor }: { signedIn: boolean; editor: boolean }) {
  const path = usePathname() ?? "/";
  // The menu is open only for the page it was opened on, so it closes by itself on navigation.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const grp = GROUPS.find((g) => g[2].some((x) => active(x[0])));
  return (
    <header className="site-header">
      <div className="hdr-row">
        <Link href="/" className="hdr-brand" title="Sagat Singh Research Foundation, home">
          <Mark />
          <span><b>SSRF</b><small>Sagat Singh Research Foundation</small></span>
        </Link>

        <button className="hdr-toggle" aria-expanded={open} aria-controls="hdr-nav" onClick={() => setOpenAt(open ? null : path)}>
          <span className="bars" aria-hidden="true" /> Menu
        </button>

        <nav id="hdr-nav" className={`hdr-nav${open ? " open" : ""}`} aria-label="Sections">
          <ul>
            <li><Link href="/" aria-current={path === "/" ? "page" : undefined}>Home</Link></li>
            {GROUPS.map(([id, label, items]) => (
              <li key={id}><Link href={items[0][0]} aria-current={grp?.[0] === id ? "page" : undefined}>{label}</Link></li>
            ))}
          </ul>
          <div className="hdr-mobile-search"><SearchBox id="hq-m" /></div>
        </nav>

        <div className="hdr-actions">
          <SearchBox id="hq" />
          {editor && <Link href="/admin/review" className="hdr-link">Review</Link>}
          {signedIn ? <Link href="/account" className="hdr-cta">My account</Link> : <><Link href="/login" className="hdr-link">Sign in</Link><Link href="/register" className="hdr-cta">Join</Link></>}
        </div>
      </div>

      {grp && grp[2].length > 1 && (
        <nav className="hdr-sub" aria-label="Pages in this section">
          <ul>
            {grp[2].map(([href, key, label]) => (
              <li key={key}><Link href={href} aria-current={active(href) ? "page" : undefined}>{key === "account" && signedIn ? "My account" : label}</Link></li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
