"use client";
import { useEffect } from "react";

/**
 * Animated tab icon: the round SSRF badge with a twinkling star and a glint travelling round the ring.
 * Browsers only animate tab icons when the page swaps the image, so this draws each frame on a small canvas.
 * Stays still (the static icon) when the visitor prefers reduced motion.
 */
const OLIVE = "#2F391C", GOLD = "#D9B45C", STAR = "#E9C468", GLINT = "#FFF3C4";

// Created lazily: Path2D only exists in the browser, and this file is also loaded on the server.
let starPath: Path2D | undefined;
const STAR_D = "M20 8.5l1.6 4.9h5.1l-4.1 3 1.6 4.9-4.2-3-4.2 3 1.6-4.9-4.1-3h5.1z";

/** Draws the badge in the same 40-unit space as the header mark (star above, SSRF lettering below), scaled up to the 64px canvas. */
function draw(ctx: CanvasRenderingContext2D, t: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 64, 64); ctx.setTransform(1.6, 0, 0, 1.6, 0, 0);
  ctx.beginPath(); ctx.arc(20, 20, 19.8, 0, Math.PI * 2); ctx.fillStyle = OLIVE; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.arc(20, 20, 18.5, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 0.7; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(20, 20, 15, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  // twinkling star: swells and glows once every 3.6 s
  const phase = (t % 3.6) / 3.6, pulse = Math.max(0, Math.sin(phase * Math.PI * 2 - 0.4)) ** 2, k = 1 + 0.24 * pulse;
  ctx.save(); ctx.translate(20, 15.4); ctx.scale(k, k); ctx.translate(-20, -15.4);
  ctx.shadowColor = "rgba(255,230,150,0.95)"; ctx.shadowBlur = 7 * pulse; ctx.fillStyle = STAR; ctx.fill((starPath ??= new Path2D(STAR_D))); ctx.restore();
  // lettering
  ctx.fillStyle = GOLD; ctx.font = "700 6.6px Georgia, 'Times New Roman', serif"; ctx.textAlign = "center"; ctx.fillText("SSRF", 20, 31);
  // glint running round the outer ring: one lap every 5 s
  const a0 = (t / 5) * Math.PI * 2 - Math.PI / 2;
  ctx.save(); ctx.lineCap = "round"; ctx.lineWidth = 2.2; ctx.strokeStyle = GLINT; ctx.shadowColor = "rgba(255,235,160,0.9)"; ctx.shadowBlur = 3;
  ctx.beginPath(); ctx.arc(20, 20, 18.5, a0, a0 + 0.62); ctx.stroke(); ctx.restore();
}

export default function AnimatedFavicon() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Reduced motion: a still badge, never animated.
      const still = document.createElement("link"); still.rel = "icon"; still.href = "/favicon.ico"; still.id = "ssrf-static-icon";
      document.head.appendChild(still);
      return () => still.remove();
    }
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    // Replace the static icon links with one we can update frame by frame.
    const old = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    const link = document.createElement("link"); link.rel = "icon"; link.type = "image/png"; link.id = "ssrf-animated-icon";
    old.forEach((l) => l.remove()); document.head.appendChild(link);
    const start = performance.now();
    const tick = () => { draw(ctx, (performance.now() - start) / 1000); link.href = canvas.toDataURL("image/png"); };
    tick();
    const id = window.setInterval(tick, 125); // 8 frames a second
    return () => { window.clearInterval(id); link.remove(); old.forEach((l) => document.head.appendChild(l)); };
  }, []);
  return null;
}
