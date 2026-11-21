import { INDIA, inP } from "@/lib/indiaMap";

export type LCamp = { k: string; yr: string; lbl?: string; t: string; pin: [number, number, string]; facts: string[]; q: string; go: [string, string] };

/** The four chapters of his story, from the prototype's Learning Centre. Facts restate what the campaign pages already cite. */
export const LCAMPS: LCamp[] = [
  { k: "early", yr: "1919–1949", lbl: "1919", t: "Desert boyhood to the Gorkha Rifles", pin: [28.02, 73.31, "Bikaner"], facts: ["Born on 14 July 1919 in Kusumdesar, Bikaner State", "Enrolled as a Naik in the Bikaner Ganga Risala in 1938", "Joined the 3rd Gorkha Rifles of the Indian Army in February 1949"], q: "How did a soldier from a princely state's army rise to command a corps?", go: ["/biography", ""] },
  { k: "goa", yr: "1961", t: "The liberation of Goa", pin: [15.49, 73.83, "Goa"], facts: ["Commanded 50 Parachute Brigade in Operation Vijay", "His battalions raced to Panjim on 18 and 19 December", "2 Sikh Light Infantry were first into Panjim"], q: "Why did speed matter so much in Goa?", go: ["/campaigns/goa", "goa"] },
  { k: "nathula", yr: "1965–1967", lbl: "1967", t: "Holding Nathu La", pin: [27.39, 88.83, "Nathu La"], facts: ["Commanded 17 Mountain Division in Sikkim", "Refused in 1965 to vacate Nathu La", "Held Nathu La and Cho La against Chinese attacks in 1967"], q: "What would have changed if the pass had been given up?", go: ["/campaigns/nathula", "nathula"] },
  { k: "1971", yr: "1971", t: "Across the Meghna to Dhaka", pin: [24.05, 90.98, "Meghna"], facts: ["Commanded IV Corps in the east", "Moved troops across the Meghna by helicopter", "Pakistan's eastern command surrendered in Dhaka on 16 December"], q: "How did helicopters change what was possible?", go: ["/campaigns/meghna", "meghna"] },
];

export function HeroMap() {
  return (
    <figure className="lchmap">
      <svg viewBox={`0 0 ${INDIA.W} ${INDIA.H}`} aria-label="Map: Bikaner, Goa, Nathu La and the Meghna">
        <path d={INDIA.d} className="imap-land" />
        {LCAMPS.map((c) => {
          const [x, y] = inP(c.pin[0], c.pin[1]); const east = c.pin[1] > 86;
          return (
            <g key={c.k} className="ipin active" transform={`translate(${x.toFixed(0)} ${y.toFixed(0)})`}>
              <circle r="15" className="ipin-halo" /><circle r="7" />
              <text x={east ? -16 : 16} y="6" textAnchor={east ? "end" : "start"}>{c.pin[2]} {c.lbl ?? c.yr.split("–")[0]}</text>
            </g>);
        })}
      </svg>
      <figcaption>Where his story happened. Boundary: DataMeet India composite map (CC BY 4.0).</figcaption>
    </figure>
  );
}

export function MiniMap({ pin }: { pin: [number, number, string] }) {
  const [x, y] = inP(pin[0], pin[1]);
  return (
    <svg viewBox={`0 0 ${INDIA.W} ${INDIA.H}`} className="lmap" aria-hidden="true">
      <path d={INDIA.d} className="lmap-land" />
      {LCAMPS.map((c) => { const [a, b] = inP(c.pin[0], c.pin[1]); return <circle key={c.k} cx={a.toFixed(0)} cy={b.toFixed(0)} r="9" className="lmap-dim" />; })}
      <circle cx={x.toFixed(0)} cy={y.toFixed(0)} r="30" className="lmap-halo" /><circle cx={x.toFixed(0)} cy={y.toFixed(0)} r="14" className="lmap-pin" />
    </svg>
  );
}

/** Explanatory sketch of the 1971 Meghna crossing (not to scale), from the prototype. */
export function MeghnaMap() {
  return (
    <figure className="map">
      <svg viewBox="0 0 640 380" role="img" aria-label="Explanatory sketch of the Meghna crossing, not to scale">
        <defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--beret)" /></marker></defs>
        <path d="M400 0 C380 80 420 140 395 200 C370 260 410 320 390 380" fill="none" stroke="var(--river)" strokeWidth="34" strokeLinecap="round" opacity=".9" />
        <text x="430" y="40" className="mlabel">River Meghna</text>
        <line x1="372" y1="120" x2="422" y2="120" stroke="var(--ink)" strokeWidth="4" strokeDasharray="6 6" />
        <text x="300" y="104" className="mlabel">Bhairab Bazar</text><circle cx="360" cy="120" r="5" fill="var(--ink)" />
        <text x="440" y="124" className="mlabel">Ashuganj</text><circle cx="432" cy="120" r="5" fill="var(--ink)" />
        <text x="396" y="160" className="msmall" textAnchor="middle">bridge out of use</text>
        <path d="M470 150 C450 210 380 230 300 228" fill="none" stroke="var(--beret)" strokeWidth="2.5" strokeDasharray="7 5" markerEnd="url(#arw)" />
        <text x="472" y="200" className="msmall">airlift by helicopter</text>
        <circle cx="292" cy="230" r="5" fill="var(--ink)" /><text x="232" y="220" className="mlabel">Raipura</text>
        <circle cx="206" cy="282" r="5" fill="var(--ink)" /><text x="130" y="276" className="mlabel">Narsingdi</text>
        <path d="M286 236 L212 278 M200 288 L96 340" fill="none" stroke="var(--beret)" strokeWidth="2.5" markerEnd="url(#arw)" />
        <rect x="78" y="334" width="14" height="14" fill="var(--beret)" /><text x="40" y="370" className="mlabel">Dhaka</text>
        <text x="590" y="366" className="msmall" textAnchor="middle">N</text><path d="M590 334 L584 346 L590 342 L596 346Z" fill="var(--ink)" />
      </svg>
      <figcaption>Explanatory sketch by SSRF, not to scale and not a historical map. Positions are approximate, and the landing areas follow common published accounts that SSRF has yet to check. Original operational maps are wanted.</figcaption>
    </figure>
  );
}
