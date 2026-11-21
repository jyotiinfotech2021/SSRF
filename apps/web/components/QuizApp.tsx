"use client";
import { useMemo, useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { QTOPICS, QLEVELS } from "@/lib/ref";

type Q = { id: string; n: number; q: string; options: string[]; answer: number; explain?: string; hint?: string; source?: string; topic?: string; level?: string };

export default function QuizApp({ all, editor, initialTopic }: { all: Q[]; editor: boolean; initialTopic?: string }) {
  const [topic, setTopic] = useState(initialTopic && all.some((q) => q.topic === initialTopic) ? initialTopic : ""); const [level, setLevel] = useState("");
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0); const [picks, setPicks] = useState<number[]>([]); const [hint, setHint] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const pool = useMemo(() => all.filter((q) => (!topic || q.topic === topic) && (!level || q.level === level)), [all, topic, level]);

  if (!all.length && !editor) return <p className="empty">The question bank is being compiled.</p>;
  const start = () => { setQs([...pool].sort(() => Math.random() - 0.5).slice(0, 10)); setI(0); setPicks([]); setHint(false); };
  const cur = qs?.[i]; const picked = picks[i];
  const score = qs ? picks.filter((p, k) => p === qs[k]?.answer).length : 0;

  return (
    <section id="quiz">
      {!qs && (<div className="panel quiz-setup">
        <label>Topic<select value={topic} onChange={(e) => setTopic(e.target.value)}><option value="">Any</option>{Object.entries(QTOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>Level<select value={level} onChange={(e) => setLevel(e.target.value)}><option value="">Any</option>{Object.entries(QLEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <p className="meta">{pool.length} question{pool.length === 1 ? "" : "s"} available</p>
        <button className="btn" disabled={!pool.length} onClick={start}>Start quiz</button>
      </div>)}
      {qs && cur && (<div className="quiz panel" aria-live="polite">
        <p className="meta">Question {i + 1} of {qs.length}</p>
        <h3>{cur.q}</h3>
        <ul className="plain">{cur.options.map((o, k) => (
          <li key={k}><button className={`btn ghost${picked != null && k === cur.answer ? " right" : picked === k ? " wrong" : ""}`} disabled={picked != null} onClick={() => setPicks((p) => { const n = [...p]; n[i] = k; return n; })}>{o}</button></li>))}
        </ul>
        {picked == null && cur.hint && !hint && <button className="link" onClick={() => setHint(true)}>Show a hint</button>}
        {hint && picked == null && <p className="meta">{cur.hint}</p>}
        {picked != null && (<>
          <p><b>{picked === cur.answer ? "Correct." : "Not quite."}</b> {cur.explain}</p>
          {cur.source && <p className="meta">Source: {cur.source}</p>}
          {i + 1 < qs.length ? <button className="btn" onClick={() => { setI(i + 1); setHint(false); }}>Next</button> : <button className="btn" onClick={() => setI(qs.length)}>See result</button>}
        </>)}
      </div>)}
      {qs && i >= qs.length && (<div className="panel"><h3>You scored {score} of {qs.length}</h3><p className="meta">Review the explanations above, or try another topic.</p><button className="btn" onClick={() => setQs(null)}>Try again</button></div>)}
      {editor && <QuizAdmin all={all} editing={editing} setEditing={setEditing} />}
    </section>
  );
}

function QuizAdmin({ all, editing, setEditing }: { all: Q[]; editing: string | null; setEditing: (s: string | null) => void }) {
  const q = editing && editing !== "new" ? all.find((x) => x.id === editing) : undefined;
  return (
    <div>
      <h3 className="sect">Question bank (editors)</h3>
      <p className="meta">{all.length} questions.</p>
      <ul className="plain">{all.map((x) => <li key={x.id}>{x.q} <button className="link quiet" onClick={() => setEditing(x.id)}>Edit</button></li>)}</ul>
      {editing === null && <button className="btn small" onClick={() => setEditing("new")}>Add a question</button>}
      {editing !== null && (
        <form className="panel" key={editing} onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? "").trim();
          const body = { q: g("q"), options: [0, 1, 2, 3].map((n) => g("o" + n)).filter(Boolean), answer: Number(g("answer")), explain: g("explain"), hint: g("hint"), source: g("source"), topic: g("topic"), level: g("level") };
          const r = editing === "new" ? await call("POST", "/api/editorial/quiz", body) : await call("PUT", `/api/editorial/quiz/${editing}`, body);
          if (r.ok) { toast("Question saved"); window.location.reload(); } else toast(r.error);
        }}>
          <label>Question<textarea name="q" defaultValue={q?.q} required /></label>
          {[0, 1, 2, 3].map((n) => <label key={n}>Option {n + 1}<input name={"o" + n} defaultValue={q?.options[n] ?? ""} required={n < 2} /></label>)}
          <label>Correct option (1 to 4)<select name="answer" defaultValue={q?.answer ?? 0}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n + 1}</option>)}</select></label>
          <label>Explanation<textarea name="explain" defaultValue={q?.explain} /></label><label>Hint<input name="hint" defaultValue={q?.hint} /></label><label>Source<input name="source" defaultValue={q?.source} /></label>
          <label>Topic<select name="topic" defaultValue={q?.topic ?? "early"}>{Object.entries(QTOPICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Level<select name="level" defaultValue={q?.level ?? "beginner"}>{Object.entries(QLEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <div className="actions"><button className="btn small" type="submit">Save question</button>
            {q && <button className="link" type="button" onClick={async () => { if (!confirm("Delete this question?")) return; const r = await call("DELETE", `/api/editorial/quiz/${q.id}`); if (r.ok) window.location.reload(); else toast(r.error); }}>Delete</button>}
            <button className="link" type="button" onClick={() => setEditing(null)}>Cancel</button></div>
        </form>)}
    </div>
  );
}
