import { INDIA, inP } from "@/lib/indiaMap";
import CMAPS from "@/lib/cmaps.json";

/** Explanatory campaign-area maps from the prototype: real boundary outlines with routes, places and a scale. Not historical operational maps. */
type Pt = [number, number];
type Place = [string, number, number, "town" | "cap" | "clash" | "out", number?, number?, string?];
type Route = { k: "adv" | "adv2" | "air"; pts: Pt[]; label?: string; lx?: number; ly?: number };
type Overlay = { km: number; inset: "bl" | "br"; regions: [string, number, number][]; rivers: { n: string; pts: Pt[]; lx?: number; ly?: number }[]; places: Place[]; routes: Route[]; legend: [string, string][]; note: string };
type MapData = { W: number; H: number; bb: [number, number, number, number]; ind: string; sea?: string; foreign?: string; internal?: string; focus?: string; focusLine?: string };

const OV: Record<string, Overlay> = {
  goa: { km: 10, inset: "bl",
    regions: [["ARABIAN SEA", 73.66, 15.12], ["MAHARASHTRA", 74.2, 15.8], ["KARNATAKA", 74.32, 15.05], ["GOA", 74.13, 15.2]], rivers: [],
    places: [["Panjim", 73.8278, 15.4989, "cap", -8, -10, "end"], ["Mapusa", 73.809, 15.591, "town", -8, 4, "end"], ["Bicholim", 73.951, 15.588, "town", 8, 4], ["Banastarim", 73.955, 15.483, "town", 8, 4], ["Ponda", 74.015, 15.403, "town", 8, 12], ["Vasco da Gama", 73.813, 15.397, "town", -8, 12, "end"], ["Margao", 73.958, 15.273, "town", 8, 4], ["Mollem", 74.233, 15.383, "town", 0, 16, "middle"]],
    routes: [
      { k: "adv", pts: [[73.79, 15.72], [73.80, 15.63], [73.809, 15.591], [73.82, 15.51]], label: "2 Sikh LI", lx: 73.66, ly: 15.66 },
      { k: "adv", pts: [[74.03, 15.72], [73.951, 15.588], [73.955, 15.49], [73.86, 15.495]], label: "1 Para", lx: 74.0, ly: 15.66 },
      { k: "adv", pts: [[74.16, 15.66], [74.08, 15.47], [74.03, 15.415]], label: "2 Para", lx: 74.17, ly: 15.55 },
      { k: "adv2", pts: [[74.33, 15.39], [74.233, 15.383], [74.03, 15.40], [73.97, 15.29]], label: "17 Infantry Division", lx: 74.06, ly: 15.32 }],
    legend: [["adv", "50 (Independent) Parachute Brigade, his command"], ["adv2", "17 Infantry Division"], ["cap", "Capital, reached on 19 December 1961"]],
    note: "Explanatory map by SSRF. Routes are approximate and follow the official history (Khera 1974) and published accounts of the three columns of 50 Parachute Brigade." },
  nathula: { km: 10, inset: "bl",
    regions: [["TIBET (CHINA)", 88.95, 27.9], ["SIKKIM", 88.42, 27.62], ["BHUTAN", 89.05, 27.12], ["WEST BENGAL", 88.4, 27.05], ["Chumbi Valley", 89.0, 27.64]], rivers: [],
    places: [["Gangtok", 88.6065, 27.3389, "town", -8, 4, "end"], ["Nathu La", 88.8306, 27.3864, "clash", -12, 16, "end"], ["Cho La", 88.79, 27.43, "clash", -10, -6, "end"], ["Jelep La", 88.8667, 27.3667, "out", 12, 18], ["Yadong", 88.905, 27.48, "town", 8, -6]],
    routes: [],
    legend: [["clash", "Pass held by 17 Mountain Division in 1967"], ["out", "Pass vacated in 1965"]],
    note: "Explanatory map by SSRF. Pass positions are approximate. The boundary shown is India's official boundary." },
  meghna: { km: 25, inset: "bl",
    regions: [["BANGLADESH (then East Pakistan)", 90.75, 24.75], ["MEGHALAYA", 91.3, 25.22], ["TRIPURA", 91.62, 23.6], ["ASSAM", 92.35, 24.95]],
    rivers: [{ n: "Meghna", pts: [[91.3, 24.62], [91.15, 24.38], [91.04, 24.18], [90.985, 24.05], [90.92, 23.97], [90.86, 23.87], [90.78, 23.68], [90.72, 23.52], [90.66, 23.35], [90.64, 23.17]], lx: 90.62, ly: 23.45 },
      { n: "Surma", pts: [[91.87, 24.9], [91.7, 24.96], [91.52, 24.88], [91.38, 24.73], [91.3, 24.62]], lx: 91.55, ly: 25.0 }],
    places: [["Sylhet", 91.87, 24.9, "town", 8, -6], ["Bhairab Bazar", 90.985, 24.055, "town", -8, -6, "end"], ["Ashuganj", 91.0, 24.03, "town", 10, -8], ["Brahmanbaria", 91.11, 23.96, "town", 8, 12], ["Akhaura", 91.2, 23.87, "town", 8, 12], ["Raipura", 90.86, 23.97, "town", 0, -12, "middle"], ["Narsingdi", 90.72, 23.92, "town", 0, 22, "middle"], ["Dhaka", 90.41, 23.81, "cap", 0, -14, "middle"], ["Comilla", 91.18, 23.46, "town", 8, 4]],
    routes: [
      { k: "adv", pts: [[91.28, 23.84], [91.2, 23.87], [91.11, 23.96], [91.02, 24.02]], label: "57 Mountain Division", lx: 91.38, ly: 23.98 },
      { k: "air", pts: [[91.08, 23.99], [90.95, 23.93], [90.88, 23.955]], label: "Helicopter lift across the Meghna", lx: 90.95, ly: 23.8 },
      { k: "adv", pts: [[90.84, 23.95], [90.72, 23.92], [90.6, 23.87], [90.45, 23.82]] },
      { k: "air", pts: [[92.03, 24.5], [91.96, 24.7], [91.89, 24.87]], label: "Heliborne landing near Sylhet", lx: 91.72, ly: 24.64 }],
    legend: [["adv", "IV Corps advance"], ["air", "Helicopter lift"], ["cap", "Dhaka, surrender on 16 December 1971"]],
    note: "Explanatory map by SSRF. Rivers, routes and landing areas are approximate and follow published accounts; original operational maps are wanted. The boundary shown is India's official boundary." },
};

export const hasCampaignMap = (id: string) => id in OV;
export const campaignFocus = (id: string) => (CMAPS as unknown as Record<string, MapData>)[id]?.focus;
export const campaignFocusBox = (id: string) => { const m = (CMAPS as unknown as Record<string, MapData>)[id]; return m ? { W: m.W, H: m.H } : null; };

export default function CampaignMap({ id, name }: { id: string; name: string }) {
  const m = (CMAPS as unknown as Record<string, MapData>)[id], ov = OV[id];
  if (!m || !ov) return null;
  const [lon0, lon1, lat0, lat1] = m.bb, kx = m.W / (lon1 - lon0), ky = kx / Math.cos(((lat0 + lat1) / 2) * Math.PI / 180);
  const P = (lon: number, lat: number): Pt => [(lon - lon0) * kx, (lat1 - lat) * ky];
  const f = (n: number) => n.toFixed(1);
  const line = (pts: Pt[]) => pts.map((p, i) => (i ? "L" : "M") + P(p[0], p[1]).map(f).join(" ")).join("");
  const midLat = (lat0 + lat1) / 2, kmPx = (ov.km / (111.32 * Math.cos(midLat * Math.PI / 180))) * kx;
  const iw = 96, ih = (iw * INDIA.H) / INDIA.W, ix = ov.inset === "br" ? m.W - iw - 14 : 14, iy = m.H - ih - 14;
  const a = inP(lat1, lon0), b = inP(lat0, lon1), sc = iw / INDIA.W;
  const marker = (t: Place[3], x: number, y: number) =>
    t === "cap" ? <rect x={f(x - 6)} y={f(y - 6)} width="12" height="12" className="mp-cap" /> :
    t === "clash" ? <path d={`M${f(x)} ${f(y - 9)}L${f(x + 8)} ${f(y + 6)}L${f(x - 8)} ${f(y + 6)}Z`} className="mp-clash" /> :
    t === "out" ? <path d={`M${f(x)} ${f(y - 8)}L${f(x + 7)} ${f(y + 5)}L${f(x - 7)} ${f(y + 5)}Z`} className="mp-out" /> :
    <circle cx={f(x)} cy={f(y)} r="4" className="mp-town" />;
  return (
    <figure className="cmap">
      <div className="cmap-scroll">
        <svg viewBox={`0 0 ${m.W} ${m.H}`} role="img" aria-label={`Map of the ${name} campaign area`}>
          <defs>
            <marker id={`ar-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" className="mp-arrowhead" /></marker>
            <marker id={`ar2-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" className="mp-arrowhead2" /></marker>
          </defs>
          <rect width={m.W} height={m.H} className="mp-foreign" />
          {m.sea && <path d={m.sea} className="mp-sea" />}
          {m.foreign && <path d={m.foreign} className="mp-foreign" />}
          <path d={m.ind} className="mp-india" />
          {m.internal && <path d={m.internal} className="mp-internal" />}
          {m.focus && <path d={m.focus} className="mp-focus" />}
          {m.focusLine && <path d={m.focusLine} className="mp-focusline" />}
          {ov.rivers.map((r) => <g key={r.n}><path d={line(r.pts)} className="mp-river" />{r.lx != null && r.ly != null && <text x={f(P(r.lx, r.ly)[0])} y={f(P(r.lx, r.ly)[1])} className="mp-rlabel">{r.n}</text>}</g>)}
          {ov.regions.map(([t, lo, la]) => { const [x, y] = P(lo, la); return <text key={t} x={f(x)} y={f(y)} className="mp-region" textAnchor="middle">{t}</text>; })}
          {ov.routes.map((r, i) => (
            <g key={i}>
              <path d={line(r.pts)} className={`mp-${r.k}`} markerEnd={`url(#${r.k === "adv2" ? "ar2" : "ar"}-${id})`} />
              {r.label && r.lx != null && r.ly != null && <text x={f(P(r.lx, r.ly)[0])} y={f(P(r.lx, r.ly)[1])} className={`mp-rtlabel${r.k === "adv2" ? " two" : ""}`} textAnchor="middle">{r.label}</text>}
            </g>))}
          {ov.places.map(([n, lo, la, t, dx, dy, an]) => { const [x, y] = P(lo, la);
            return <g key={n}>{marker(t, x, y)}<text x={f(x + (dx ?? 0))} y={f(y + (dy ?? 0))} className={`mp-label${t === "cap" || t === "clash" ? " strong" : ""}`} textAnchor={(an as "start" | "middle" | "end") ?? "start"}>{n}</text></g>; })}
          <g transform={`translate(${f(m.W - kmPx - 28)} ${m.H - 28})`}><path d={`M0 0H${f(kmPx)}`} className="mp-scale" /><path d={`M0 -4V4M${f(kmPx)} -4V4`} className="mp-scale" /><text x={f(kmPx / 2)} y="-8" textAnchor="middle" className="mp-small">{ov.km} km</text></g>
          <g transform={`translate(${m.W - 30} 34)`}><path d="M0 -18L7 4L0 0L-7 4Z" className="mp-north" /><text y="18" textAnchor="middle" className="mp-small">N</text></g>
          <g transform={`translate(${ix} ${iy})`} className="mp-inset">
            <rect x="-6" y="-6" width={iw + 12} height={f(ih + 12)} className="mp-insetbg" />
            <path d={INDIA.d} transform={`scale(${sc.toFixed(4)})`} className="mp-insetland" />
            <rect x={f(a[0] * sc - 2)} y={f(a[1] * sc - 2)} width={f(Math.max(4, (b[0] - a[0]) * sc + 4))} height={f(Math.max(4, (b[1] - a[1]) * sc + 4))} className="mp-insetbox" />
          </g>
        </svg>
      </div>
      <p className="cmap-hint">Swipe sideways to see the whole map.</p>
      <figcaption>
        <ul className="mp-legend">{ov.legend.map(([k, t]) => (
          <li key={k}><svg viewBox="0 0 28 12" aria-hidden="true">{k === "adv" || k === "adv2" || k === "air" ? <path d="M1 6H25" className={`mp-${k}`} /> : k === "cap" ? <rect x="8" y="0" width="12" height="12" className="mp-cap" /> : <path d="M14 0L21 12H7Z" className={`mp-${k}`} />}</svg>{t}</li>))}</ul>
        <span>{ov.note}</span>
      </figcaption>
    </figure>
  );
}
