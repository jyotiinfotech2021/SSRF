"use client";
import { usePathname } from "next/navigation";
import { GROUPS } from "@/lib/ref";
import JsonLd from "./JsonLd";

/** BreadcrumbList for the current page: Home > section > page > (item). Built from the same section map as the menu. */
export default function BreadcrumbLd({ site }: { site: string }) {
  const path = usePathname() ?? "/";
  if (path === "/") return null;
  const parts = path.split("/").filter(Boolean);
  const first = "/" + parts[0];
  const grp = GROUPS.find((g) => g[2].some((x) => x[0] === first));
  const label = (href: string) => GROUPS.flatMap((g) => g[2]).find((x) => x[0] === href)?.[2];
  const items: { name: string; url: string }[] = [{ name: "Home", url: site + "/" }];
  if (grp && grp[2].length > 1) items.push({ name: grp[1], url: site + grp[2][0][0] });
  const top = label(first) ?? decodeURIComponent(parts[0]).replace(/-/g, " ");
  items.push({ name: top.charAt(0).toUpperCase() + top.slice(1), url: site + first });
  if (parts.length > 1) items.push({ name: decodeURIComponent(parts.slice(1).join(" / ")).replace(/-/g, " "), url: site + path });
  return <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })) }} />;
}
