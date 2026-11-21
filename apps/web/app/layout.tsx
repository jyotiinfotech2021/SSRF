import type { Metadata, Viewport } from "next";
import "./ssrf.css";
import "./extra.css";
import Link from "next/link";
import { me, isEditor, get, type Source } from "@/lib/api";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import { Mark } from "@/components/Mark";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "Sagat Singh Research Foundation (SSRF)", template: "%s | SSRF" },
  description: "The Sagat Singh Research Foundation: a documented, source-referenced record of the life and campaigns of Lt Gen Sagat Singh.",
  openGraph: { siteName: "Sagat Singh Research Foundation", type: "website" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#2F391C" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const who = await me();
  const settings = await get<Record<string, { contact?: string; governance?: string; email?: string }>>("/api/site");
  const contact = settings?.settings;
  void (null as Source | null);
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Stencil+Display:wght@600;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Header signedIn={!!who.id} editor={isEditor(who)} />
        <main className="wrap" id="main" tabIndex={-1}>{children}</main>
        <footer id="siteFooter">
          <div className="wrap ft-wrap">
            <div className="ft-brand">
              <div className="hdr-brand ft-brandrow"><Mark /><span><b>SSRF</b><small>Sagat Singh Research Foundation</small></span></div>
              <p className="ft-motto">Preserving history. Researching the evidence. Honouring the legacy.</p>
              <p className="ft-about">The foundation researches and preserves the record of Lt Gen Sagat Singh&apos;s life and campaigns. Every entry on this site cites its sources.</p>
            </div>
            <div className="ft-cols">
              <nav className="ft-col" aria-label="Explore"><h2>Explore</h2><ul><li><Link href="/biography">Biography</Link></li><li><Link href="/campaigns">Campaigns</Link></li><li><Link href="/archive">Archive</Link></li><li><Link href="/library">Library</Link></li></ul></nav>
              <nav className="ft-col" aria-label="Participate"><h2>Participate</h2><ul><li><Link href="/account">Contribute</Link></li><li><Link href="/stories">Stories</Link></li><li><Link href="/members">Membership</Link></li><li><Link href="/events">Events</Link></li></ul></nav>
              <nav className="ft-col" aria-label="Foundation"><h2>Foundation</h2><ul><li><Link href="/about">About</Link></li><li><Link href="/about/standards">Research standards</Link></li><li><Link href="/about/governance">Governance</Link></li></ul></nav>
              <nav className="ft-col" aria-label="Connect"><h2>Connect</h2><ul><li>{contact?.email ? <a href={`mailto:${contact.email}`}>Contact</a> : <Link href="/about">Contact</Link>}</li><li><Link href="/about/corrections">Corrections and data requests</Link></li></ul></nav>
            </div>
            <div className="ft-base"><p>A historical research and preservation initiative.</p><p>© {new Date().getFullYear()} Sagat Singh Research Foundation. India boundary: DataMeet (CC BY 4.0). Country outlines and rivers: Natural Earth (public domain).</p></div>
          </div>
        </footer>
        <Toast />
      </body>
    </html>
  );
}
