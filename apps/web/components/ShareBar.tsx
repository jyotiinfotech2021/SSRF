"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "./Toast";

/**
 * A small "Share" control for one article, video or post. It opens a menu of ready-made links, each with the
 * message already written in the right format for that service:
 *   WhatsApp  *Title* on its own line, a one-line summary, then the link (WhatsApp shows *…* in bold)
 *   Facebook  the link only: Facebook builds the card itself from the page's Open Graph tags
 *   X         the title and the link
 *   LinkedIn  the link only (same reason as Facebook)
 *   Telegram  the link with the title as its text
 *   Email     a subject, then title, summary and link in the body
 * On a phone the device's own share sheet is offered as well. Nothing is sent to us: no tracking, no scripts from the services.
 */
type Props = { url: string; title: string; text?: string; label?: string };

const enc = encodeURIComponent;
const ICON: Record<string, string> = {
  whatsapp: "M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a14 14 0 0 1-5.7-5c-.4-.6-1-1.7-1-2.7 0-1 .5-1.4.7-1.7.2-.2.4-.2.6-.2h.4c.1 0 .3 0 .5.4l.7 1.7c.1.1 0 .3 0 .4l-.3.5-.3.3c-.1.1-.2.3-.1.5a8 8 0 0 0 1.5 1.9c.6.5 1.2.8 1.6 1 .2.1.4.1.5-.1l.7-.9c.2-.2.3-.2.5-.1l1.7.8c.2.1.3.2.4.3 0 .1 0 .7-.2 1.3Z",
  facebook: "M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.4H7.6V14h2.7v8h3.2Z",
  x: "M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L2 3h6.3l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z",
  linkedin: "M6.9 8.9H3.6V20h3.3V8.9ZM5.3 3.6a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 13.5c0-3-1.6-4.8-4.1-4.8-1.4 0-2.3.8-2.7 1.4V8.9h-3.2V20h3.3v-6c0-1.6.3-3.1 2.3-3.1s2 1.8 2 3.2V20h3.3l.1-6.5Z",
  telegram: "M21.5 4.4 2.9 11.6c-1.3.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.1.8.8.8.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.7-.8l3.2-15.1c.3-1.2-.5-1.8-1.5-1.4Zm-3.1 3.4-8.2 7.4-.3 3.4-1.4-4.5 9.9-6.3Z",
  email: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1.4 2 7.6 5.7L19.6 7H4.4ZM4 17h16V9.2l-8 6-8-6V17Z",
  copy: "M8 3h10a2 2 0 0 1 2 2v12h-2V5H8V3Zm-3 4h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v10h10V9H5Z",
  share: "M18 16a3 3 0 0 0-2.4 1.2l-6.5-3.6a3 3 0 0 0 0-3.2l6.5-3.6A3 3 0 1 0 15 5c0 .3 0 .6.1.9L8.7 9.5a3 3 0 1 0 0 5l6.4 3.6A3 3 0 1 0 18 16Z",
};
const Icon = ({ k }: { k: string }) => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d={ICON[k]} fill="currentColor" /></svg>;

export default function ShareBar({ url, title, text, label = "Share" }: Props) {
  const [open, setOpen] = useState(false);
  const [native, setNative] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => { setNative(typeof navigator !== "undefined" && typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches); }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); (box.current?.querySelector("button.share-btn") as HTMLElement | null)?.focus(); } };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const blurb = (text ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
  const links: [string, string, string][] = [
    ["whatsapp", "WhatsApp", `https://wa.me/?text=${enc(`*${title}*\n${blurb ? blurb + "\n" : ""}${url}`)}`],
    ["facebook", "Facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`],
    ["x", "X (Twitter)", `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`],
    ["linkedin", "LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`],
    ["telegram", "Telegram", `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`],
    ["email", "Email", `mailto:?subject=${enc(title)}&body=${enc(`${title}\n\n${blurb ? blurb + "\n\n" : ""}${url}`)}`],
  ];
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast("Link copied"); }
    catch { const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); toast("Link copied"); } catch { toast("Copy failed. Press and hold the address to copy it."); } t.remove(); }
    setOpen(false);
  };
  const nativeShare = async () => { try { await navigator.share({ title, text: blurb || title, url }); } catch { /* the person closed the sheet */ } setOpen(false); };

  return (
    <span className="share" ref={box}>
      <button type="button" className="share-btn" aria-expanded={open} aria-haspopup="true" aria-label={`${label}: ${title}`} onClick={() => setOpen((o) => !o)}><Icon k="share" /> {label}</button>
      {open && (
        <ul className="share-menu" role="list">
          {native && <li><button type="button" onClick={nativeShare}><Icon k="share" /> Share using your phone…</button></li>}
          {links.map(([k, name, href]) => (
            <li key={k}><a href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}><Icon k={k} /> {name}</a></li>))}
          <li><button type="button" onClick={copy}><Icon k="copy" /> Copy link</button></li>
        </ul>)}
    </span>
  );
}
