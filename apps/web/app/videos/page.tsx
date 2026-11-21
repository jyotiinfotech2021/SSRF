import type { Metadata } from "next";
import { get, type Book } from "@/lib/api";
import { PageHead, StatusTag, NatureTag, Unavailable, Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Videos", description: "Documentaries, lectures and recordings about Lt Gen Sagat Singh." };

function embed(url?: string) {
  if (!url) return null;
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/.exec(url);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export default async function Videos() {
  const books = await get<Book[]>("/api/books");
  const rows = (books ?? []).filter((b) => b.kind === "Documentary or video" || b.kind === "Lecture or talk");
  return (
    <>
      <PageHead title="Videos" lead="Embedded videos load only when you press play." />
      {!books && <Unavailable />}
      {rows.length ? rows.map((b) => {
        const d = b.data as Record<string, string>; const src = embed(d.link);
        return (
          <article key={b.id} className="vcard">
            <h3>{b.title}</h3>
            <p className="meta">{b.kind}{d.author ? ` · ${d.author}` : ""}{d.year ? ` · ${d.year}` : ""}</p>
            {src ? <details><summary className="btn small">Play</summary><iframe src={src} title={b.title} loading="lazy" allowFullScreen style={{ width: "100%", aspectRatio: "16/9", border: 0 }} /></details>
              : d.link ? <p><a href={d.link} target="_blank" rel="noopener noreferrer">Watch</a></p> : null}
            <p>{b.description}</p>
            <p className="tags"><StatusTag s={b.status} /> <NatureTag n={b.nature} /></p>
          </article>);
      }) : <Empty>No videos have been catalogued yet. Contributors can add one under Library with the kind &quot;Documentary or video&quot;.</Empty>}
    </>
  );
}
