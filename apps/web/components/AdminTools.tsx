"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { RIGHTS } from "@/lib/ref";

type U = { id: string; email: string; legacyUid?: string; roles: string[] };
const ROLES = ["Admin", "Editor", "Contributor", "Member"];

export default function AdminTools({ users, selfId }: { users: U[]; selfId: string }) {
  const [report, setReport] = useState<string>("");
  return (
    <div>
      <h2 className="sect">Accounts and roles</h2>
      <table className="plain"><thead><tr><th>Email</th><th>Roles</th><th>Prototype id</th></tr></thead><tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>{u.email}</td>
            <td>{ROLES.map((r) => (
              <label key={r} className="check"><input type="checkbox" defaultChecked={u.roles.includes(r)} disabled={u.id === selfId && r === "Admin"} onChange={async (e) => {
                const next = e.target.checked ? [...new Set([...u.roles, r])] : u.roles.filter((x) => x !== r);
                const res = await call("PUT", `/api/editorial/users/${u.id}/roles`, { roles: next });
                if (res.ok) { u.roles = next; toast("Roles updated"); } else { toast(res.error); e.target.checked = !e.target.checked; }
              }} /> {r}</label>))}</td>
            <td>{u.legacyUid ?? <form onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const res = await call("POST", `/api/editorial/users/${u.id}/link-legacy`, { legacyUid: String(f.get("legacy")) }); if (res.ok) { toast("Linked"); window.location.reload(); } else toast(res.error); }}><input name="legacy" placeholder="prototype uid" aria-label="Prototype uid" /> <button className="link">Link</button></form>}</td>
          </tr>))}
      </tbody></table>

      <h2 className="sect">Import prototype data</h2>
      <p className="meta">Upload the JSON backup downloaded from the prototype (Database backup). Existing records are never overwritten; every source document is also kept verbatim in the legacy archive table.</p>
      <form onSubmit={async (e) => {
        e.preventDefault(); const f = new FormData(e.currentTarget).get("file");
        if (!(f instanceof File) || !f.size) return;
        toast("Importing…");
        const r = await call("POST", "/api/editorial/import", await f.text().then((t) => new Blob([t], { type: "application/json" })).then(async (b) => JSON.parse(await b.text())));
        setReport(r.ok ? JSON.stringify(r.data, null, 1) : r.error);
      }}>
        <input name="file" type="file" accept="application/json,.json" required /> <button className="btn small" type="submit">Import</button>
      </form>
      {report && <pre className="transcript">{report}</pre>}

      <h2 className="sect">Backups</h2>
      <p className="meta">The JSON backup includes private member profiles: store it encrypted. Database-level backups and restore tests are described in docs/deployment.</p>
      <a className="btn small" href="/api/editorial/backup/json">Download JSON backup</a>

      <h2 className="sect">Home-page portrait</h2>
      <PortraitForm />
    </div>
  );
}

function PortraitForm() {
  return (
    <form className="panel" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? "").trim();
      let fileId: string | undefined; const file = f.get("file");
      if (file instanceof File && file.size > 0) {
        if (!file.type.startsWith("image/")) return toast("Choose an image file");
        const up = new FormData(); up.append("file", file); toast("Uploading the photograph…");
        const u = await call<{ id: string }>("POST", "/api/files", up); if (!u.ok) return toast(u.error); fileId = u.data.id;
      }
      const r = await call("PUT", "/api/editorial/site/portrait", { fileId, caption: g("caption"), credit: g("credit"), rights: g("rights"), donor: g("donor"), approxDate: g("approxDate"), archive: f.get("archive") === "on" });
      if (r.ok) { toast("Portrait saved"); window.location.reload(); } else toast(r.error);
    }}>
      <label>Photograph<input name="file" type="file" accept="image/*" /></label>
      <label>Caption<input name="caption" required maxLength={300} /></label>
      <label>Credit (photographer or source)<input name="credit" required maxLength={200} /></label>
      <label>Rights<select name="rights" required>{RIGHTS.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label>Donor<input name="donor" maxLength={200} /></label><label>Approximate date<input name="approxDate" maxLength={60} /></label>
      <label className="check"><input type="checkbox" name="archive" defaultChecked /> Also catalogue this photograph in the digital archive.</label>
      <div className="actions"><button className="btn small" type="submit">Save portrait</button>
        <button className="link" type="button" onClick={async () => { if (!confirm("Remove the portrait from the home page? The archive copy, if any, stays.")) return; const r = await call("DELETE", "/api/editorial/site/portrait"); if (r.ok) window.location.reload(); else toast(r.error); }}>Remove portrait</button></div>
    </form>
  );
}
