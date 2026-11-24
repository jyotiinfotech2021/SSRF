"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ShareBar from "./ShareBar";

/**
 * "Share this page" for every public page. It reads the page's own title, description and canonical address once the page is
 * on screen, so a link shared from a filtered view (?camp=…) is the clean page address. It stays hidden on pages that are
 * not meant to be shared: the admin and account areas, sign-in and search, and anything marked noindex (such as the 404 page).
 */
const PRIVATE = /^\/(admin|account|login|register|forgot-password|reset-password|search)(\/|$)/;
type Data = { url: string; title: string; text: string };

export default function PageShare({ inline = false }: { inline?: boolean }) {
  const path = usePathname() ?? "/";
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    // The page's <title> and tags are updated just after a client-side navigation, so read them a moment later.
    const t = setTimeout(() => {
      const meta = (sel: string, attr: string) => document.querySelector(sel)?.getAttribute(attr) ?? "";
      if (PRIVATE.test(path) || /noindex/i.test(meta('meta[name="robots"]', "content"))) return setData(null);
      const url = meta('link[rel="canonical"]', "href") || window.location.origin + path;
      const title = document.title.replace(/\s*\|\s*SSRF\s*$/, "").trim() || "Sagat Singh Research Foundation";
      setData({ url, title, text: meta('meta[name="description"]', "content") });
    }, 200);
    return () => clearTimeout(t);
  }, [path]);
  if (!data) return null;
  const bar = <ShareBar url={data.url} title={data.title} text={data.text} label="Share this page" />;
  return inline ? <div className="sharerow">{bar}</div> : <div className="pageshare"><div className="wrap">{bar}</div></div>;
}
