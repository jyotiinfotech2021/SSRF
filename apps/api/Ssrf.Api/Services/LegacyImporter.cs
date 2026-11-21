using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Ssrf.Api.Data;
using Ssrf.Api.Domain;

namespace Ssrf.Api.Services;

public class ImportReport
{
    public Dictionary<string, int> Read { get; } = [];
    public Dictionary<string, int> Imported { get; } = [];
    public Dictionary<string, int> AlreadyPresent { get; } = [];
    public List<string> Warnings { get; } = [];
    public List<string> Errors { get; } = [];
    public void Count(Dictionary<string, int> d, string k) => d[k] = d.GetValueOrDefault(k) + 1;
}

/// <summary>
/// Imports a prototype database backup (format "SSRF database backup", version 3) or the public snapshot.
/// Rules: never overwrite an existing record; keep every source document verbatim in LegacyRecords;
/// put fields without a typed column into the Data json column; report anything that does not line up.
/// </summary>
public class LegacyImporter(SsrfDbContext db)
{
    public async Task<ImportReport> ImportBackupAsync(string json, CancellationToken ct = default)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var rep = new ImportReport();
        if (root.TryGetProperty("collections", out var cols)) await ImportCollectionsAsync(cols, rep, ct);
        else await ImportSnapshotAsync(root, rep, ct); // snapshot.json shape
        return rep;
    }

    private static JsonObject Obj(JsonElement e) => JsonNode.Parse(e.GetRawText())!.AsObject();
    private static string? S(JsonObject o, string k, bool remove = true)
    {
        var v = o[k]; if (remove) o.Remove(k);
        return v switch { null => null, JsonValue jv when jv.TryGetValue<string>(out var s) => s, _ => v.ToJsonString() };
    }
    private static DateTime? Dt(string? s) => DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal, out var d) ? d : null;
    private static List<string> Strs(JsonObject o, string k)
    {
        var v = o[k]; o.Remove(k);
        return v is JsonArray a ? a.Select(x => x is JsonValue jv && jv.TryGetValue<string>(out var s) ? s : x?.ToJsonString() ?? "").ToList() : [];
    }
    private static JsonDocument Doc(JsonNode n) => JsonDocument.Parse(n.ToJsonString());
    private static int Int(JsonObject o, string k) { var v = o[k]; o.Remove(k); return v is JsonValue jv && jv.TryGetValue<int>(out var i) ? i : 0; }
    private static bool Bool(JsonObject o, string k) { var v = o[k]; o.Remove(k); return v is JsonValue jv && jv.TryGetValue<bool>(out var b) && b; }

    private HashSet<string> _seen = [];
    private HashSet<string> _seenCols = [];
    private void Legacy(string col, string path, JsonElement e) { if (_seen.Add(col + "|" + path)) db.LegacyRecords.Add(new LegacyRecord { Collection = col, DocPath = path, Json = JsonDocument.Parse(e.GetRawText()) }); }

    private async Task ImportSnapshotAsync(JsonElement snap, ImportReport rep, CancellationToken ct)
    {
        var cols = new JsonObject();
        foreach (var k in new[] { "claims", "campaigns", "entities", "chapters" })
            if (snap.TryGetProperty(k, out var v)) cols[k] = JsonNode.Parse(v.GetRawText());
        if (snap.TryGetProperty("sources", out var s) && s.ValueKind == JsonValueKind.Object)
        {
            var arr = new JsonArray();
            foreach (var p in s.EnumerateObject()) { var o = Obj(p.Value); o["id"] = p.Name; arr.Add(o); }
            cols["sources"] = arr;
        }
        using var d = JsonDocument.Parse(cols.ToJsonString());
        await ImportCollectionsAsync(d.RootElement, rep, ct);
    }

    private async Task ImportCollectionsAsync(JsonElement cols, ImportReport rep, CancellationToken ct)
    {
        _seen = (await db.LegacyRecords.Select(l => l.Collection + "|" + l.DocPath).ToListAsync(ct)).ToHashSet();
        _seenCols = (await db.LegacyRecords.Select(l => l.Collection).Distinct().ToListAsync(ct)).ToHashSet();
        IEnumerable<JsonElement> Items(string name) => cols.TryGetProperty(name, out var a) && a.ValueKind == JsonValueKind.Array ? a.EnumerateArray() : [];

        // Sources first: claims cite them.
        var haveSources = (await db.Sources.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("sources"))
        {
            rep.Count(rep.Read, "sources"); Legacy("sources", "sources/" + e.GetProperty("id").GetString(), e);
            var o = Obj(e); var id = S(o, "id")!;
            if (!haveSources.Add(id)) { rep.Count(rep.AlreadyPresent, "sources"); continue; }
            db.Sources.Add(new Source { Id = id, Author = S(o, "author") ?? "", Title = S(o, "title") ?? "", Publisher = S(o, "publisher"), Date = S(o, "date"), Accessed = S(o, "accessed"),
                Nature = S(o, "nature") ?? "Secondary research", Url = S(o, "url"), Note = S(o, "note") });
            rep.Count(rep.Imported, "sources");
        }
        await db.SaveChangesAsync(ct);

        var have = (await db.Campaigns.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("campaigns"))
        {
            rep.Count(rep.Read, "campaigns"); var o = Obj(e); var id = S(o, "id")!; Legacy("campaigns", "campaigns/" + id, e);
            if (!have.Add(id)) { rep.Count(rep.AlreadyPresent, "campaigns"); continue; }
            db.Campaigns.Add(new Campaign { Id = id, Name = S(o, "name") ?? id, Order = Int(o, "order"), Data = Doc(o) });
            rep.Count(rep.Imported, "campaigns");
        }

        var haveClaims = (await db.Claims.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("claims"))
        {
            rep.Count(rep.Read, "claims"); var o = Obj(e); var id = S(o, "id")!; Legacy("claims", "claims/" + id, e);
            if (!haveClaims.Add(id)) { rep.Count(rep.AlreadyPresent, "claims"); continue; }
            var c = new Claim { Id = id, Scope = S(o, "scope") ?? "", Heading = S(o, "heading") ?? "", Year = S(o, "year"), Text = S(o, "text") ?? "",
                Assessment = S(o, "assessment") ?? "unverified", Status = S(o, "status") ?? "open", Established = S(o, "established"), Unresolved = S(o, "unresolved"),
                Order = Int(o, "order"), ReviewedBy = S(o, "reviewedBy"), ReviewedAt = Dt(S(o, "reviewedAt")), CreatedAt = Dt(S(o, "createdAt")) ?? DateTime.UtcNow };
            var pos = 0;
            if (o["cites"] is JsonArray cites)
                foreach (var ci in cites.OfType<JsonObject>())
                {
                    var sid = ci["s"]?.GetValue<string>() ?? "";
                    if (!haveSources.Contains(sid)) rep.Warnings.Add($"claims/{id} cites unknown source '{sid}' (kept as written)");
                    c.Citations.Add(new ClaimCitation { SourceId = sid, Loc = ci["loc"]?.GetValue<string>(), Position = pos++ });
                }
            db.Claims.Add(c); rep.Count(rep.Imported, "claims");
        }

        var haveEnt = (await db.Entities.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("entities"))
        {
            rep.Count(rep.Read, "entities"); var o = Obj(e); var id = S(o, "id")!; Legacy("entities", "entities/" + id, e);
            if (!haveEnt.Add(id)) { rep.Count(rep.AlreadyPresent, "entities"); continue; }
            db.Entities.Add(new Entity { Id = id, Type = S(o, "type") ?? "person", Name = S(o, "name") ?? "", Role = S(o, "role"), Period = S(o, "period"), Camps = Strs(o, "camps"), Cites = Strs(o, "cites"), Data = Doc(o) });
            rep.Count(rep.Imported, "entities");
        }

        var haveCh = (await db.Chapters.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("chapters"))
        {
            rep.Count(rep.Read, "chapters"); var o = Obj(e); var id = S(o, "id")!; Legacy("chapters", "chapters/" + id, e);
            if (!haveCh.Add(id)) { rep.Count(rep.AlreadyPresent, "chapters"); continue; }
            db.Chapters.Add(new Chapter { Id = id, Name = S(o, "name") ?? id, Order = Int(o, "order"), Purpose = Strs(o, "purpose"), Coordinator = S(o, "coordinator"), Active = Bool(o, "active") });
            rep.Count(rep.Imported, "chapters");
        }

        var haveQ = (await db.Quiz.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("quiz"))
        {
            rep.Count(rep.Read, "quiz"); var o = Obj(e); var id = S(o, "id")!; Legacy("quiz", "quiz/" + id, e);
            if (!haveQ.Add(id)) { rep.Count(rep.AlreadyPresent, "quiz"); continue; }
            db.Quiz.Add(new QuizQuestion { Id = id, N = Int(o, "n"), Q = S(o, "q") ?? "", Options = Strs(o, "options"), Answer = Int(o, "answer"), Explain = S(o, "explain"), Hint = S(o, "hint"), Source = S(o, "source"), Topic = S(o, "topic"), Level = S(o, "level") });
            rep.Count(rep.Imported, "quiz");
        }

        var haveSite = (await db.Site.Select(x => x.Key).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("site"))
        {
            rep.Count(rep.Read, "site"); var o = Obj(e); var id = S(o, "id")!; Legacy("site", "site/" + id, e);
            if (!haveSite.Add(id)) { rep.Count(rep.AlreadyPresent, "site"); continue; }
            db.Site.Add(new SiteSetting { Key = id, Data = Doc(o) }); rep.Count(rep.Imported, "site");
        }
        await db.SaveChangesAsync(ct);

        // Content collections
        await ImportContent<Story>("stories", Items("stories"), db.Stories, rep, ct, (o, x) => { x.Kind = S(o, "kind"); x.Era = S(o, "era"); x.Body = S(o, "body"); x.Provenance = S(o, "prov"); });
        await ImportContent<Book>("books", Items("books"), db.Books, rep, ct, (o, x) => { x.Kind = S(o, "kind"); x.Description = S(o, "description"); });
        await ImportContent<Place>("places", Items("places"), db.Places, rep, ct, (o, x) =>
        { x.Kind = S(o, "kind"); x.Description = S(o, "description"); x.Lat = double.TryParse(S(o, "lat"), out var la) ? la : null; x.Lng = double.TryParse(S(o, "lng"), out var lo) ? lo : null; });
        await ImportContent<EventItem>("events", Items("events"), db.Events, rep, ct, (o, x) => { x.Type = S(o, "type"); x.Description = S(o, "description"); x.Date = DateOnly.TryParse(S(o, "date", false), out var d) ? d : null; });
        await ImportContent<ArchiveItem>("archive", Items("archive"), db.Archive, rep, ct, (o, x) =>
        {
            x.Category = S(o, "category"); x.Collection = S(o, "collection"); x.Description = S(o, "description"); x.Rights = S(o, "rights");
            x.Access = S(o, "access") == "Restricted" ? "Restricted" : "Public"; x.Transcript = S(o, "transcript"); x.PageCount = Int(o, "pageCount");
        });

        // Files attached to archive items (public: on the item; restricted: archiveFiles/{id})
        foreach (var e in Items("archive").Where(a => a.TryGetProperty("files", out var f) && f.ValueKind == JsonValueKind.Array))
            await AttachFilesAsync(e.GetProperty("id").GetString()!, e.GetProperty("files"), rep, ct);
        foreach (var e in Items("archiveFiles"))
        {
            rep.Count(rep.Read, "archiveFiles"); var id = e.GetProperty("id").GetString()!; Legacy("archiveFiles", "archiveFiles/" + id, e);
            if (e.TryGetProperty("files", out var f)) await AttachFilesAsync(id, f, rep, ct, restricted: true);
        }

        var haveMem = (await db.Members.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("members"))
        {
            rep.Count(rep.Read, "members"); var o = Obj(e); var id = S(o, "id")!; Legacy("members", "members/" + id, e);
            if (!haveMem.Add(id)) { rep.Count(rep.AlreadyPresent, "members"); continue; }
            db.Members.Add(new Member { Id = id, Name = S(o, "name") ?? "", Title = S(o, "title"), Affiliation = S(o, "affiliation"), Category = S(o, "category"), Chapter = S(o, "chapter"),
                ShowChapter = Bool(o, "showChapter"), Connection = S(o, "connection"), Interests = S(o, "interests"), Camps = Strs(o, "camps"), ShowContrib = Bool(o, "showContrib"),
                Photo = S(o, "photo"), PhotoConsent = Bool(o, "photoConsent"), JoinedAt = Dt(S(o, "joinedAt")) ?? DateTime.UtcNow });
            rep.Count(rep.Imported, "members");
        }
        var havePriv = (await db.MemberPrivates.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in Items("memberPrivate"))
        {
            rep.Count(rep.Read, "memberPrivate"); var o = Obj(e); var id = S(o, "id")!;
            // Private data is kept in LegacyRecords too, but that table is admin-only and excluded from public APIs.
            Legacy("memberPrivate", "memberPrivate/" + id, e);
            if (!havePriv.Add(id)) { rep.Count(rep.AlreadyPresent, "memberPrivate"); continue; }
            db.MemberPrivates.Add(new MemberPrivate { Id = id, Name = S(o, "name") ?? "", Title = S(o, "title"), Affiliation = S(o, "affiliation"), Category = S(o, "category"), Chapter = S(o, "chapter"),
                Connection = S(o, "connection"), Interests = S(o, "interests"), Camps = Strs(o, "camps"), Listed = Bool(o, "listed"), ShowChapter = Bool(o, "showChapter"), ShowContrib = Bool(o, "showContrib"),
                Photo = S(o, "photo"), PhotoConsent = Bool(o, "photoConsent"), Adult = Bool(o, "adult"), JoinedAt = Dt(S(o, "joinedAt")) ?? DateTime.UtcNow });
            rep.Count(rep.Imported, "memberPrivate");
        }

        foreach (var e in _seenCols.Contains("revisions") ? [] : Items("revisions"))
        {
            rep.Count(rep.Read, "revisions"); var o = Obj(e); var id = S(o, "id"); Legacy("revisions", "revisions/" + id, e);
            db.Revisions.Add(new Revision { Action = S(o, "action") ?? "", Target = S(o, "target") ?? "", Title = S(o, "title"), Reason = S(o, "reason"), ById = S(o, "by"), Before = S(o, "before"), After = S(o, "after"), At = Dt(S(o, "at")) ?? DateTime.UtcNow });
            rep.Count(rep.Imported, "revisions");
        }

        foreach (var e in Items("salutes"))
        {
            rep.Count(rep.Read, "salutes"); var uid = e.GetProperty("id").GetString()!; Legacy("salutes", "salutes/" + uid, e);
            if (e.TryGetProperty("sids", out var sids))
                foreach (var sid in sids.EnumerateArray().Select(x => x.GetString()!))
                    if (!await db.Salutes.AnyAsync(x => x.UserId == uid && x.StoryId == sid, ct) && !db.Salutes.Local.Any(x => x.UserId == uid && x.StoryId == sid)) { db.Salutes.Add(new Salute { UserId = uid, StoryId = sid }); rep.Count(rep.Imported, "salutes"); }
        }
        foreach (var e in Items("attend"))
        {
            rep.Count(rep.Read, "attend"); var uid = e.GetProperty("id").GetString()!; Legacy("attend", "attend/" + uid, e);
            if (e.TryGetProperty("eids", out var eids))
                foreach (var eid in eids.EnumerateArray().Select(x => x.GetString()!))
                    if (!await db.Attendances.AnyAsync(x => x.UserId == uid && x.EventId == eid, ct) && !db.Attendances.Local.Any(x => x.UserId == uid && x.EventId == eid)) { db.Attendances.Add(new Attendance { UserId = uid, EventId = eid }); rep.Count(rep.Imported, "attend"); }
        }

        foreach (var parent in _seenCols.Contains("subs") ? [] : Items("subs"))
        {
            var uid = parent.GetProperty("id").GetString()!;
            foreach (var e in parent.GetProperty("items").EnumerateArray())
            {
                rep.Count(rep.Read, "subs"); var o = Obj(e); var sid = S(o, "id")!; Legacy("subs", $"subs/{uid}/{sid}", e);
                var path = $"subs/{uid}/{sid}";
                var history = o["history"] ?? new JsonArray(); o.Remove("history");
                var data = o["data"] ?? new JsonObject(); o.Remove("data");
                // Keep prototype-only review fields (note, publishedAs, reviewedBy ...) so nothing is lost.
                var extras = new JsonObject(); foreach (var kv in o.ToList()) if (kv.Key is not ("kind" or "status" or "priority" or "assignee" or "due" or "coi" or "createdAt" or "resubmittedAt")) extras[kv.Key] = kv.Value?.DeepClone();
                if (extras.Count > 0 && data is JsonObject dobj) dobj["_legacyReview"] = extras;
                db.Submissions.Add(new Submission { OwnerId = uid, Kind = S(o, "kind") ?? "", Status = S(o, "status") ?? "submitted", Priority = S(o, "priority") ?? "Normal", Assignee = S(o, "assignee"),
                    Due = DateOnly.TryParse(S(o, "due"), out var du) ? du : null, Coi = Strs(o, "coi"), Data = Doc(data), History = Doc(history), PublishedRef = (extras["publishedAs"] as JsonValue)?.GetValue<string>(),
                    CreatedAt = Dt(S(o, "createdAt")) ?? DateTime.UtcNow, ResubmittedAt = Dt(S(o, "resubmittedAt")) });
                rep.Count(rep.Imported, "subs");
            }
        }
        foreach (var parent in _seenCols.Contains("media") ? [] : Items("media"))
        {
            var uid = parent.GetProperty("id").GetString()!;
            foreach (var e in parent.GetProperty("items").EnumerateArray())
            {
                rep.Count(rep.Read, "media"); var o = Obj(e); Legacy("media", $"media/{uid}/{S(o, "id", false)}", e);
                var kind = S(o, "kind") ?? "image"; Guid? fid = null;
                if (S(o, "assetId", false) is { } aid)
                {
                    var f = new StoredFile { Name = S(o, "name") ?? "", ContentType = S(o, "type") ?? "", Size = o["size"]?.GetValue<long>() ?? 0, Sha256 = S(o, "sha256") ?? "", LegacyAssetId = aid, LegacyUrl = S(o, "url", false), UploadedBy = uid, StorageKey = "" };
                    db.Files.Add(f); fid = f.Id;
                }
                db.Media.Add(new MediaItem { EventId = S(o, "eid") ?? "", OwnerId = uid, Kind = kind, FileId = fid, Url = kind == "link" ? S(o, "url") : null, Caption = S(o, "caption"), Credit = S(o, "credit"), CreatedAt = Dt(S(o, "createdAt")) ?? DateTime.UtcNow });
                rep.Count(rep.Imported, "media");
            }
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task ImportContent<T>(string name, IEnumerable<JsonElement> items, DbSet<T> set, ImportReport rep, CancellationToken ct, Action<JsonObject, T> map) where T : ContentItem, new()
    {
        var have = (await set.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var e in items)
        {
            rep.Count(rep.Read, name); var o = Obj(e); var id = S(o, "id")!; Legacy(name, $"{name}/{id}", e);
            if (!have.Add(id)) { rep.Count(rep.AlreadyPresent, name); continue; }
            var x = new T { Id = id };
            x.AuthorId = S(o, "authorId"); x.AuthorName = S(o, "authorName"); x.Title = S(o, "title") ?? S(o, "name") ?? "";
            x.Status = S(o, "status") ?? "checking"; x.VerNote = S(o, "verNote"); x.Nature = S(o, "nature"); x.Assessment = S(o, "assessment");
            x.ReviewedBy = S(o, "reviewedBy"); x.ReviewedAt = Dt(S(o, "reviewedAt")); x.CreatedAt = Dt(S(o, "createdAt")) ?? DateTime.UtcNow; x.FromSub = S(o, "fromSub"); x.Camps = Strs(o, "camps");
            var files = o["files"]; // handled separately so file metadata is queryable
            map(o, x);
            x.Data = Doc(o);
            set.Add(x); rep.Count(rep.Imported, name);
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task AttachFilesAsync(string archiveId, JsonElement files, ImportReport rep, CancellationToken ct, bool restricted = false)
    {
        if (!await db.Archive.AnyAsync(a => a.Id == archiveId, ct)) { rep.Warnings.Add($"files for archive/{archiveId} but no such archive record"); return; }
        var pos = await db.ArchiveFiles.CountAsync(a => a.ArchiveItemId == archiveId, ct);
        foreach (var f in files.EnumerateArray())
        {
            var aid = f.TryGetProperty("assetId", out var a) ? a.GetString() : null;
            if (aid != null && await db.Files.AnyAsync(x => x.LegacyAssetId == aid, ct)) { rep.Count(rep.AlreadyPresent, "files"); continue; }
            var sf = new StoredFile { Name = f.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "", ContentType = f.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "",
                Size = f.TryGetProperty("size", out var s) && s.TryGetInt64(out var sz) ? sz : 0, Sha256 = f.TryGetProperty("sha256", out var h) ? h.GetString() ?? "" : "",
                LegacyAssetId = aid, LegacyUrl = f.TryGetProperty("url", out var u) ? u.GetString() : null, Restricted = restricted, StorageKey = "" };
            db.Files.Add(sf); db.ArchiveFiles.Add(new ArchiveFile { ArchiveItemId = archiveId, FileId = sf.Id, Position = pos++ });
            rep.Count(rep.Imported, "files");
        }
        await db.SaveChangesAsync(ct);
    }
}
