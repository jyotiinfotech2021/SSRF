import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { get, type Campaign } from "@/lib/api";
import { PageHead, Unavailable, Empty } from "@/components/ui";

export const metadata: Metadata = pageMeta("Campaigns: Goa 1961, Nathu La 1967, Meghna 1971", "The campaigns of Lt Gen Sagat Singh: the liberation of Goa, the defence of Nathu La and Cho La, and the Meghna crossing to Dhaka, each with sources.", "/campaigns");

export default async function Campaigns() {
  const camps = await get<Campaign[]>("/api/campaigns");
  return (
    <>
      <PageHead title="Campaigns" lead="Each campaign has a chronology, command structure, claims and open questions." />
      {!camps && <Unavailable />}
      {camps && !camps.length && <Empty>No campaigns have been published yet.</Empty>}
      <div className="grid2">
        {camps?.map((c) => (
          <Link key={c.id} href={`/campaigns/${c.id}`} className="card">
            <h3>{c.name}</h3><p className="meta">{String(c.data.theatre ?? "")} · {String(c.data.dates ?? "")}</p><p>{String(c.data.lead ?? "")}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
