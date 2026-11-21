"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { call } from "@/lib/client";

type Mode = "login" | "register";

/** Shared sign-in / create-account form. Email and password only; signs the person in and sends them on. */
export default function AuthForm({ mode, next, notice }: { mode: Mode; next: string; notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; exists?: boolean } | null>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const reg = mode === "register";
  const longEnough = password.length >= 8;
  const other = `${reg ? "/login" : "/register"}${next && next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (reg && !longEnough) { setError({ text: "Use at least 8 characters for your password." }); pwRef.current?.focus(); return; }
    setBusy(true);
    const r = await call("POST", `/api/auth/${mode}`, { email: email.trim(), password });
    if (!r.ok) {
      setBusy(false);
      setError({ text: r.error, exists: r.status === 409 });
      pwRef.current?.focus();
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{reg ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-lead">{reg ? "Just an email and a password. You can add your details later, or never." : "Sign in to contribute, suggest corrections and follow your submissions."}</p>

        {notice && <div className="auth-ok" role="status">{notice}</div>}
        <form onSubmit={submit} noValidate={false} aria-describedby={error ? "auth-error" : undefined}>
          {error && (
            <div id="auth-error" className="auth-error" role="alert">
              {error.text}{" "}
              {error.exists && <Link href={`/login${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link>}
            </div>
          )}

          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            required autoFocus maxLength={256} value={email} onChange={(e) => setEmail(e.target.value)} />

          <div className="auth-pwhead">
            <label htmlFor="auth-password">Password</label>
            <span className="auth-pwlinks">{!reg && <Link className="auth-forgot" href={`/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}>Forgot password?</Link>}<button type="button" className="auth-show" onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? "Hide" : "Show"}</button></span>
          </div>
          <input id="auth-password" ref={pwRef} name="password" type={show ? "text" : "password"} autoComplete={reg ? "new-password" : "current-password"}
            required minLength={reg ? 8 : 1} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)}
            aria-describedby={reg ? "auth-hint" : undefined} />
          {reg && <p id="auth-hint" className={`auth-hint${longEnough ? " ok" : ""}`}>{longEnough ? "✓ Good. That is long enough." : "At least 8 characters. A few words together works well."}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>{busy ? (reg ? "Creating account…" : "Signing in…") : reg ? "Create account" : "Sign in"}</button>
        </form>

                <p className="auth-switch">{reg ? "Already have an account?" : "New here?"} <Link href={other}>{reg ? "Sign in" : "Create an account"}</Link></p>
        {reg && <p className="auth-fine">By creating an account you can read everything, suggest corrections and register for events. Contributing stories and archive items needs an invitation from the editors.</p>}
      </div>
    </div>
  );
}
