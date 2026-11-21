import Link from "next/link";
import { ASSESS, ASSESS_HELP, NATURE_HELP, VSTAT, isNeg, srcRank } from "@/lib/ref";
import { get, type Claim, type Cite, type Revision, type Source } from "@/lib/api";
import CorrectionBox from "./CorrectionBox";

export const AssessTag = ({ k }: { k?: string | null }) => (k && ASSESS[k] ? <span className={`tag as-${k}`} title={ASSESS_HELP[k]}>{ASSESS[k]}</span> : null);
export const NatureTag = ({ n }: { n?: string | null }) => (n ? <span className="tag nat" title={NATURE_HELP[n] ?? ""}>{n}</span> : null);
export const StatusTag = ({ s }: { s?: string | null }) => <span className={`tag st-${s || "submitted"}`}>{VSTAT[s || "submitted"] ?? s}</span>;
export const EditorialTag = () => <span className="tag ed">SSRF editorial</span>;
export const MemberTag = () => <span className="tag mc">Member contribution</span>;

export function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(+d) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
export function fmtDay(d?: string | null) {
  if (!d) return "";
  const x = new Date(d + "T00:00:00Z");
  return isNaN(+x) ? d : x.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function PageHead({ title, lead }: { title: string; lead?: React.ReactNode }) {
  return (<header className="pagehead"><h1>{title}</h1>{lead && <p className="lead">{lead}</p>}</header>);
}
export const Empty = ({ children }: { children: React.ReactNode }) => <p className="empty">{children}</p>;
export const Unavailable = () => <div className="notice">The foundation&apos;s records can&apos;t be reached right now. They will appear when the connection returns.</div>;

export function rankCites(cs: Cite[], sources: Map<string, Source>, showHidden = false) {
  return cs.filter((c) => showHidden || !isNeg(c.loc))
    .map((c, i) => [c, i] as const)
    .sort((a, b) => Number(isNeg(a[0].loc)) - Number(isNeg(b[0].loc)) || srcRank(a[0].sourceId, sources.get(a[0].sourceId)) - srcRank(b[0].sourceId, sources.get(b[0].sourceId)) || a[1] - b[1])
    .map((x) => x[0]);
}

export function Cites({ cites, sources }: { cites: Cite[]; sources: Map<string, Source> }) {
  const cs = rankCites(cites, sources);
  if (!cs.length) return <p className="meta nosrc">No source attached yet.</p>;
  return (
    <ol className="cites">
      {cs.map((c) => {
        const s = sources.get(c.sourceId);
        return (
          <li key={c.id}>
            {s ? (<>{s.author}, <i>{s.title}</i>{s.publisher && s.publisher !== s.author ? `, ${s.publisher}` : ""}{s.date && s.date !== "Not stated" ? `, ${s.date}` : ""}.{c.loc ? ` At: ${c.loc}.` : ""} {s.nature}. {s.url && !s.url.startsWith("/_blob/") ? <><a href={s.url} target="_blank" rel="noopener noreferrer">Open</a>, accessed {s.accessed}.</> : null}</>) : <>{c.sourceId}</>}
          </li>
        );
      })}
    </ol>
  );
}

export function ShortCite({ keys, sources }: { keys: string[]; sources: Map<string, Source> }) {
  const ks = [...keys].map((k, i) => [k, i] as const).sort((a, b) => srcRank(a[0], sources.get(a[0])) - srcRank(b[0], sources.get(b[0])) || a[1] - b[1]).map((x) => x[0]);
  if (!ks.length) return <span className="nosrc">No source attached yet</span>;
  return <>{ks.map((k, i) => { const s = sources.get(k); return (<span key={k}>{i > 0 && " · "}{s ? (s.url && !s.url.startsWith("/_blob/") ? <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}>{s.author}</a> : <span title={s.title}>{s.author}</span>) : k}</span>); })}</>;
}

export async function sourceMap() {
  const list = (await get<Source[]>("/api/sources")) ?? [];
  return new Map(list.map((s) => [s.id, s]));
}

export async function HistoryPanel({ target }: { target: string }) {
  const h = (await get<Revision[]>(`/api/revisions?target=${encodeURIComponent(target)}`)) ?? [];
  if (!h.length) return null;
  return (
    <details className="hist">
      <summary>Revised {h.length} {h.length === 1 ? "time" : "times"}, last on {fmtDate(h[0].at)}</summary>
      <ol>{h.map((r) => (
        <li key={r.id}><b>{fmtDate(r.at)}</b>: {r.action}{r.reason ? `. Reason: ${r.reason}` : ""}
          {r.before != null && <div className="diff"><div><span>Before</span>{r.before}</div><div><span>After</span>{r.after}</div></div>}
        </li>))}
      </ol>
    </details>
  );
}

export function CitePanel({ title, path }: { title: string; path: string }) {
  const url = `${process.env.SITE_URL ?? "https://sagatsingh.org"}${path}`;
  const text = `Sagat Singh Research Foundation. "${title}". SSRF research platform. ${url}`;
  return <details className="citebox"><summary>Cite this page</summary><p className="cite-text">{text}</p></details>;
}

export function ClaimCard({ c, sources, signedIn, id }: { c: Claim; sources: Map<string, Source>; signedIn: boolean; id?: string }) {
  const weak = ["attributed", "unverified", "disputed"].includes(c.assessment);
  return (
    <article className={`claim${weak ? " weak" : ""}`} id={id ?? c.id}>
      <h3>{c.heading}{c.year ? <small> {c.year}</small> : null}</h3>
      <p>{c.text}</p>
      <p className="tags"><AssessTag k={c.assessment} /> {c.status === "settled" || c.status === "resolved" ? null : <span className="tag">Open question</span>}</p>
      {c.established && c.established !== "As stated." && <p className="meta"><b>Established:</b> {c.established}</p>}
      {c.unresolved && <p className="meta"><b>Unresolved:</b> {c.unresolved}</p>}
      <Cites cites={c.citations} sources={sources} />
      <HistoryPanel target={`claims/${c.id}`} />
      {signedIn ? <CorrectionBox target={`claims/${c.id}`} title={c.heading} /> : <p className="meta"><Link href="/account">Sign in</Link> to suggest a correction.</p>}
    </article>
  );
}
