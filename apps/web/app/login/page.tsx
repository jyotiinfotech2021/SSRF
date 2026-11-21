import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { me } from "@/lib/api";
import { safeNext } from "@/lib/next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/account");
  if ((await me()).id) redirect(next);
  return <AuthForm mode="login" next={next} notice={sp.reset ? "Your password has been changed. Sign in with the new one." : undefined} />;
}
