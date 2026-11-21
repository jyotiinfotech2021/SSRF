import type { Metadata } from "next";
import { get, me, type Claim } from "@/lib/api";
import { PageHead, ClaimCard, sourceMap, Unavailable, Empty, CitePanel } from "@/components/ui";

export const metadata: Metadata = { title: "Biography", description: "The documented life of Lt Gen Sagat Singh, claim by claim, with sources and evidence classification." };

export default async function Biography() {
  const [claims, sources, who] = await Promise.all([get<Claim[]>("/api/claims?scope=life"), sourceMap(), me()]);
  return (
    <>
      <PageHead title="Biography" lead="Each statement is a separate claim with its own sources. Where evidence is thin the label says so." />
      {!claims && <Unavailable />}
      {claims && !claims.length && <Empty>No biography claims have been published yet.</Empty>}
      {claims?.map((c) => <ClaimCard key={c.id} c={c} sources={sources} signedIn={!!who.id} />)}
      <CitePanel title="Biography" path="/biography" />
    </>
  );
}
