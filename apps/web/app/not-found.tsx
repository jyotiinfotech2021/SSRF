import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>That page doesn&apos;t exist, or it has not been published. <Link href="/">Return to the home page</Link> or <Link href="/search">search the site</Link>.</p>
    </>
  );
}
