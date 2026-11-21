import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { get, type Campaign } from "@/lib/api";
import { Unavailable, Empty } from "@/components/ui";
import CampaignPage from "./[id]/page";

export const metadata: Metadata = pageMeta("Campaigns: Goa 1961, Nathu La 1967, Meghna 1971", "The campaigns of Lt Gen Sagat Singh: the liberation of Goa, the defence of Nathu La and Cho La, and the Meghna crossing to Dhaka, each with sources.", "/campaigns");

/** Like the prototype, the Campaigns page opens on the first campaign with tabs for the others. */
export default async function Campaigns() {
  const camps = await get<Campaign[]>("/api/campaigns");
  if (!camps) return (<><h2>Campaigns</h2><Unavailable /></>);
  if (!camps.length) return (<><h2>Campaigns</h2><Empty>No campaigns have been published yet.</Empty></>);
  const first = [...camps].sort((a, b) => a.order - b.order)[0];
  return <CampaignPage params={Promise.resolve({ id: first.id })} />;
}
