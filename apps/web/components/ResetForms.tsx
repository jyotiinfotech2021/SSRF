"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { call } from "@/lib/client";

/** Step 1: ask for a reset link. The answer is the same whether or not the email has an account. */
export function ForgotForm({ emailConfigured, prefill }: { emailConfigured: boolean; prefill?: string }) {
  const [email, setEmail] = useState(prefill ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!emailConfigured) {
    return (
      <div className="auth-wrap"><div className="auth-card">
        <h1>Reset your password</h1>
        <p className="auth-lead">Password reset by email is not set up on this server yet. Please <Link href="/about/governance">contact the foundation</Link> and an administrator can help you get back in.</p>
        <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
      </div></div>
    );
  }

  return (
    <div className="auth-wrap"><div className="auth-card">
      <h1>Forgot your password?</h1>
      {done ? (
        <>
          <p className="auth-lead" role="status">{done}</p>
          <p className="auth-note">Nothing in your inbox after a few minutes? Check spam, or try again.</p>
          <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
        </>
      ) : (
        <>
          <p className="auth-lead">Enter your email and we&apos;ll send you a link to choose a new one.</p>
          <form onSubmit={async (e) => {
            e.preventDefault(); if (busy) return; setBusy(true); setError(null);
            const r = await call<{ message: string }>("POST", "/api/auth/forgot", { email: email.trim() });
            setBusy(false);
            if (r.ok) setDone(r.data.message); else setError(r.error);
          }}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <label htmlFor="auth-email">Email</label>
            <input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required autoFocus maxLength={256} value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
          </form>
          <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
        </>
      )}
    </div></div>
  );
}

/** Step 2: the page the emailed link opens. Chooses a new password, then sends the person to sign in. */
export function ResetForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = password.length >= 8;
  const missing = !email || !token;

  return (
    <div className="auth-wrap"><div className="auth-card">
      <h1>Choose a new password</h1>
      {missing ? (
        <>
          <p className="auth-lead">This reset link is incomplete. Please use the link from your email, or ask for a new one.</p>
          <p className="auth-switch"><Link href="/forgot-password">Send me a new link</Link></p>
        </>
      ) : (
        <>
          <p className="auth-lead">For <b>{email}</b>. Use at least 8 characters. A few words together works well.</p>
          <form onSubmit={async (e) => {
            e.preventDefault(); if (busy) return; setError(null);
            if (!ok) { setError("Use at least 8 characters for your password."); return; }
            setBusy(true);
            const r = await call("POST", "/api/auth/reset", { email, token, password });
            setBusy(false);
            if (r.ok) { router.replace("/login?reset=1"); router.refresh(); } else setError(r.error);
          }}>
            {error && <div className="auth-error" role="alert">{error} {error.includes("not valid") && <Link href="/forgot-password">Send me a new link</Link>}</div>}
            <div className="auth-pwhead">
              <label htmlFor="auth-password">New password</label>
              <button type="button" className="auth-show" onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
            </div>
            <input id="auth-password" name="password" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="auth-hint" />
            <p id="auth-hint" className={`auth-hint${ok ? " ok" : ""}`}>{ok ? "✓ Good. That is long enough." : "At least 8 characters."}</p>
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
          </form>
        </>
      )}
    </div></div>
  );
}
