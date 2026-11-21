"use client";
import { useEffect, useState } from "react";

export function toast(msg: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ssrf-toast", { detail: msg }));
}

export default function Toast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => { setMsg((e as CustomEvent<string>).detail); clearTimeout(t); t = setTimeout(() => setMsg(""), 3800); };
    window.addEventListener("ssrf-toast", on);
    return () => { window.removeEventListener("ssrf-toast", on); clearTimeout(t); };
  }, []);
  return <div id="toast" role="status" aria-live="polite" style={{ display: msg ? "block" : "none" }}>{msg}</div>;
}
