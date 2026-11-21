import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { get, me } from "@/lib/api";
import { ForgotForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if ((await me()).id) redirect("/account");
  const caps = await get<{ emailReset: boolean }>("/api/auth/capabilities");
  const { email } = await searchParams;
  return <ForgotForm emailConfigured={!!caps?.emailReset} prefill={email} />;
}
