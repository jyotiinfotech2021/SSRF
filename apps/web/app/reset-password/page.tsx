import type { Metadata } from "next";
import { ResetForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ email?: string; token?: string }> }) {
  const { email = "", token = "" } = await searchParams;
  return <ResetForm email={email} token={token} />;
}
