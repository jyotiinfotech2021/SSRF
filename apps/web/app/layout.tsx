import type { Metadata, Viewport } from "next";
import { Big_Shoulders_Stencil, Source_Serif_4 } from "next/font/google";
import "./ssrf.css";
import "./extra.css";
import Link from "next/link";
import { me, isEditor, get, type Source } from "@/lib/api";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import AnimatedFavicon from "@/components/AnimatedFavicon";
import { Mark } from "@/components/Mark";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import { SITE, SITE_NAME, OG_DEFAULT } from "@/lib/seo";

// Self-hosted at build time: no render-blocking request to Google Fonts, so the first paint is not held up.
const stencil = Big_Shoulders_Stencil({ subsets: ["latin"], display: "swap", variable: "--f-stencil" });
const serif = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], weight: ["400", "600"], display: "swap", variable: "--f-serif" });

const DESC = "A documented, source-referenced record of the life and campaigns of Lt Gen Sagat Singh, with evidence classifications, an archive and a learning centre.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Sagat Singh Research Foundation: Lt Gen Sagat Singh, 1919–2001", template: "%s | SSRF" },
  description: DESC,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  alternates: { canonical: "/" },
  openGraph: { title: "Sagat Singh Research Foundation (SSRF)", description: DESC, url: "/", siteName: SITE_NAME, type: "website", locale: "en_IN", images: [{ url: OG_DEFAULT, width: 1200, height: 630, alt: "Lt Gen Sagat Singh, 1919–2001: Sagat Singh Research Foundation" }] },
  twitter: { card: "summary_large_image", title: "Sagat Singh Research Foundation (SSRF)", description: DESC, images: [OG_DEFAULT] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: false, email: false, address: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#2F391C" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const who = await me();
  const settings = await get<Record<string, { contact?: string; governance?: string; email?: string }>>("/api/site");
  const contact = settings?.settings as { email?: string; social?: string } | undefined;
  void (null as Source | null);
  // Only real, published links go into structured data: social profiles come from the foundation's own settings.
  const sameAs = (contact?.social ?? "").split("\n").map((l) => l.split("|")[1]?.trim()).filter((u): u is string => !!u && /^https:\/\//.test(u));
  return (
    <html lang="en-IN" className={`${stencil.variable} ${serif.variable}`}>
      <body>
        <JsonLd data={[
          { "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE}/#organization`, name: SITE_NAME, alternateName: "SSRF", url: SITE, logo: `${SITE}/apple-icon.png`,
            description: "A research foundation that preserves the evidence of Lt Gen Sagat Singh's career, researches his campaigns and makes that history usable by schools, researchers and the public.",
            ...(contact?.email ? { email: contact.email } : {}), ...(sameAs.length ? { sameAs } : {}) },
          { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: SITE_NAME, inLanguage: "en-IN", publisher: { "@id": `${SITE}/#organization` },
            potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
        ]} />
        <BreadcrumbLd site={SITE} />
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
        <AnimatedFavicon />
      </body>
    </html>
  );
}
