using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Ssrf.Api.Data;
using Ssrf.Api.Domain;

namespace Ssrf.Api.Services;

public record DecideRequest(string Action, string? Note, bool NoConflict, string? NewText, string? Assessment, string? Nature, List<string>? Camps);
public record DecideResult(bool Ok, string Message);

/// <summary>
/// Editorial workflow, ported from the prototype's review code: stage progression, conflict-of-interest blocks,
/// publish-to-collection, correction handling, data-protection requests, and the append-only revision log.
/// </summary>
public class EditorialService(SsrfDbContext db)
{
    public static readonly string[] StageOrder = ["submitted", "screening", "research", "factcheck", "approval"];
    public static readonly string[] OpenStages = ["submitted", "screening", "research", "factcheck", "approval", "evidence"];
    public static readonly Dictionary<string, string> ProvNature = new() { ["first"] = "Oral history", ["family"] = "Family testimony", ["research"] = "Secondary research" };
    public static readonly Dictionary<string, string> ArchivePrefix = new()
    { ["Photograph"] = "PH", ["Document"] = "DO", ["Letter"] = "LE", ["Map"] = "MA", ["Audio-video"] = "AV", ["Newspaper"] = "NP", ["Oral history"] = "OH" };
    private static readonly HashSet<string> Natures = ["Primary source", "Oral history", "Family testimony", "Secondary research", "Tertiary source"];
    private static readonly HashSet<string> Assessments = ["documented", "corroborated", "attributed", "unverified", "disputed"];

    public async Task LogAsync(string action, string target, string? title, string? reason, string? byId, string? before = null, string? after = null)
    {
        db.Revisions.Add(new Revision { Action = action, Target = target, Title = title, Reason = reason, ById = byId, Before = before, After = after });
        await db.SaveChangesAsync();
    }

    /// <summary>Returns a reason the reviewer may not act on this item, or null.</summary>
    public async Task<string?> CoiBlockAsync(Submission s, string reviewerId)
    {
        if (s.OwnerId == reviewerId) return "This is your own contribution. Another editor must review it.";
        if (s.Coi.Contains(reviewerId)) return "You declared a conflict of interest on this item.";
        var mine = await db.MemberPrivates.AsNoTracking().FirstOrDefaultAsync(m => m.Id == reviewerId);
        var theirs = await db.MemberPrivates.AsNoTracking().FirstOrDefaultAsync(m => m.Id == s.OwnerId);
        if (mine?.Category == "Family and legacy member" && theirs?.Category == "Family and legacy member")
            return "You and the contributor are both registered as family members. Another editor should review this.";
        return null;
    }

    public static string Str(JsonDocument d, string name) =>
        d.RootElement.ValueKind == JsonValueKind.Object && d.RootElement.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

    public static JsonDocument AppendHistory(JsonDocument history, string by, string status, string? note, JsonNode? prev = null)
    {
        var arr = JsonNode.Parse(history.RootElement.GetRawText())!.AsArray();
        var o = new JsonObject { ["at"] = DateTime.UtcNow.ToString("o"), ["by"] = by, ["status"] = status, ["note"] = note ?? "" };
        if (prev != null) o["prev"] = prev;
        arr.Add(o);
        return JsonDocument.Parse(arr.ToJsonString());
    }

    public string TitleOf(Submission s) =>
        Str(s.Data, "title") is { Length: > 0 } t ? t : Str(s.Data, "name") is { Length: > 0 } n ? n : s.Kind;

    public async Task<DecideResult> DecideAsync(Submission s, DecideRequest r, string reviewerId)
    {
        var title = TitleOf(s);
        var note = (r.Note ?? "").Trim();
        var target = $"subs/{s.OwnerId}/{s.Id}";
        var block = await CoiBlockAsync(s, reviewerId);

        if (r.Action == "coi")
        {
            s.Coi = [.. s.Coi, reviewerId];
            if (s.Assignee == reviewerId) s.Assignee = null;
            s.History = AppendHistory(s.History, reviewerId, s.Status, "A reviewer declared a conflict of interest and passed the item on");
            await db.SaveChangesAsync();
            await LogAsync("Conflict of interest declared", target, title, note, reviewerId);
            return new(true, "Recorded. Assign it to another editor.");
        }
        if (block != null) return new(false, block);
        if (new[] { "evidence", "reject", "decline", "resolve", "apply" }.Contains(r.Action) && note.Length == 0)
            return new(false, "Add a note or reason first");
        if (!r.NoConflict) return new(false, "Confirm you have no family, authorship or financial interest");
        if (!OpenStages.Contains(s.Status) && r.Action is "advance" or "publish" or "evidence")
            return new(false, "This contribution is already closed.");

        string Set(string status, string? histNote = null)
        {
            s.Status = status;
            s.History = AppendHistory(s.History, reviewerId, status, histNote ?? note);
            return status;
        }

        switch (r.Action)
        {
            case "advance":
            {
                var i = Array.IndexOf(StageOrder, s.Status);
                var next = StageOrder[Math.Min(i + 1, StageOrder.Length - 1)];
                Set(next);
                await db.SaveChangesAsync();
                await LogAsync("Moved to " + next, target, title, note, reviewerId);
                return new(true, "Moved to " + next);
            }
            case "publish":
            {
                var where = await PublishAsync(s, r, reviewerId);
                s.PublishedRef = where;
                Set("published");
                await db.SaveChangesAsync();
                await LogAsync("Published " + s.Kind, where, title, note, reviewerId);
                return new(true, "Published");
            }
            case "evidence":
                Set("evidence"); await db.SaveChangesAsync();
                await LogAsync("Asked for evidence", target, title, note, reviewerId);
                return new(true, "Sent back for evidence");
            case "reject" or "decline":
                Set("rejected"); await db.SaveChangesAsync();
                await LogAsync(s.Kind == "correction" ? "Correction declined" : "Not accepted", Str(s.Data, "target") is { Length: > 0 } t ? t : target, title, note, reviewerId);
                return new(true, "Recorded");
            case "resolve":
                Set("resolved"); await db.SaveChangesAsync();
                await LogAsync("Correction resolved without change", Str(s.Data, "target"), Str(s.Data, "title"), note, reviewerId);
                return new(true, "Resolved, with the reason recorded");
            case "apply":
            {
                if (string.IsNullOrWhiteSpace(r.NewText)) return new(false, "Provide the corrected text");
                var ok = await ApplyEditAsync(Str(s.Data, "target"), r.NewText, note, target, reviewerId);
                if (!ok) return new(false, "The entry was not found");
                Set("resolved", "Correction applied: " + note); await db.SaveChangesAsync();
                return new(true, "Correction applied to the public text");
            }
            case "anonymise" or "deleteData":
            {
                var owner = s.OwnerId;
                foreach (var st in await db.Stories.Where(x => x.AuthorId == owner).ToListAsync()) st.AuthorName = "A member";
                foreach (var a in await db.Archive.Where(x => x.AuthorId == owner).ToListAsync()) a.AuthorName = "A member";
                if (r.Action == "deleteData")
                {
                    db.Members.RemoveRange(db.Members.Where(m => m.Id == owner));
                    db.MemberPrivates.RemoveRange(db.MemberPrivates.Where(m => m.Id == owner));
                }
                Set("resolved", r.Action == "deleteData" ? "Profile deleted and contributions anonymised" : "Contributions anonymised");
                await db.SaveChangesAsync();
                await LogAsync(r.Action == "deleteData" ? "Personal data deleted" : "Contributor anonymised", "members/" + owner, "", note.Length > 0 ? note : "Member's request", reviewerId);
                return new(true, "Done");
            }
            case "withdrawItem":
            {
                var item = Str(s.Data, "item");
                await DeleteTargetAsync(item);
                Set("resolved", "Item unpublished"); await db.SaveChangesAsync();
                await LogAsync("Contribution withdrawn at member's request", item, "", note, reviewerId);
                return new(true, "Unpublished");
            }
            case "complete":
                Set("resolved"); await db.SaveChangesAsync();
                await LogAsync("Request completed", target, title, note, reviewerId);
                return new(true, "Marked completed");
        }
        return new(false, "Unknown action");
    }

    private static JsonObject DataObj(JsonDocument d, params string[] drop)
    {
        var o = JsonNode.Parse(d.RootElement.GetRawText())!.AsObject();
        foreach (var k in drop) o.Remove(k);
        return o;
    }
    private static string? J(JsonObject o, string k) => o[k]?.GetValue<string>();
    private static List<string> CampsOf(Submission s, DecideRequest r) => r.Camps is { Count: > 0 } ? r.Camps : (DataObj(s.Data)["camps"]?.AsArray().Select(x => x!.GetValue<string>()).ToList() ?? []);

    private async Task<string> PublishAsync(Submission s, DecideRequest r, string reviewerId)
    {
        var d = DataObj(s.Data, "consent");
        var camps = CampsOf(s, r);
        var now = DateTime.UtcNow;
        var nature = Natures.Contains(r.Nature ?? "") ? r.Nature : null;
        var id = Guid.NewGuid().ToString("N")[..20];
        var fromSub = $"{s.OwnerId}/{s.Id}";
        void Common(ContentItem c, string? title)
        {
            c.Id = c.Id.Length > 0 ? c.Id : id; c.AuthorId = s.OwnerId; c.CreatedAt = s.CreatedAt; c.ReviewedBy = reviewerId; c.ReviewedAt = now;
            c.FromSub = fromSub; c.Camps = camps; c.Title = title ?? "";
            c.Data = JsonDocument.Parse(d.ToJsonString());
        }
        switch (s.Kind)
        {
            case "story":
            {
                var prov = J(d, "prov") ?? "";
                var attribution = J(d, "attribution") ?? "named";
                var ownerName = (await db.MemberPrivates.AsNoTracking().FirstOrDefaultAsync(m => m.Id == s.OwnerId))?.Name ?? "A member";
                var st = new Story { Kind = J(d, "kind"), Era = J(d, "era"), Body = J(d, "body"), Provenance = prov,
                    Assessment = Assessments.Contains(r.Assessment ?? "") ? r.Assessment : "unverified",
                    Nature = nature ?? ProvNature.GetValueOrDefault(prov, ""), Status = "published",
                    AuthorName = attribution == "anonymous" ? "A member" : attribution == "initials" ? Initials(ownerName) : ownerName };
                Common(st, J(d, "title")); db.Stories.Add(st); return "stories/" + st.Id;
            }
            case "book":
            {
                var b = new Book { Kind = J(d, "kind"), Description = J(d, "description"), Nature = nature ?? J(d, "nature"), Status = "checking" };
                Common(b, J(d, "title")); db.Books.Add(b); return "books/" + b.Id;
            }
            case "place":
            {
                var p = new Place { Kind = J(d, "kind"), Description = J(d, "description"), Status = "checking",
                    Lat = double.TryParse(J(d, "lat"), out var la) ? la : null, Lng = double.TryParse(J(d, "lng"), out var lo) ? lo : null };
                Common(p, J(d, "title") ?? J(d, "name")); db.Places.Add(p); return "places/" + p.Id;
            }
            case "event":
            {
                var e = new EventItem { Type = J(d, "type"), Description = J(d, "description"), Date = DateOnly.TryParse(J(d, "date"), out var dt) ? dt : null, Status = "published" };
                Common(e, J(d, "title")); db.Events.Add(e); return "events/" + e.Id;
            }
            case "archive":
            {
                var cat = J(d, "category") ?? "";
                var aid = await NextArchiveIdAsync(cat);
                var a = new ArchiveItem { Id = aid, Category = cat, Collection = J(d, "collection"), Description = J(d, "description"), Rights = J(d, "rights"),
                    Access = J(d, "access") == "Restricted" ? "Restricted" : "Public", Nature = nature ?? "Primary source", Status = "checking",
                    AuthorName = (await db.MemberPrivates.AsNoTracking().FirstOrDefaultAsync(m => m.Id == s.OwnerId))?.Name ?? "A member" };
                Common(a, J(d, "title")); db.Archive.Add(a);
                var files = d["files"]?.AsArray() ?? [];
                var pos = 0;
                foreach (var f in files)
                    if (Guid.TryParse(f?["fileId"]?.GetValue<string>(), out var fid))
                    {
                        db.ArchiveFiles.Add(new ArchiveFile { ArchiveItemId = aid, FileId = fid, Position = pos++ });
                        if (a.Access == "Restricted") { var sf = await db.Files.FindAsync(fid); if (sf != null) sf.Restricted = true; }
                    }
                a.PageCount = pos;
                return "archive/" + aid;
            }
        }
        throw new InvalidOperationException($"Submission kind '{s.Kind}' cannot be published");
    }

    public async Task<string> NextArchiveIdAsync(string category)
    {
        var p = ArchivePrefix.GetValueOrDefault(category, "IT");
        var rx = new Regex($"^SSRF-{p}-(\\d+)$");
        var ids = await db.Archive.AsNoTracking().Where(a => a.Id.StartsWith("SSRF-" + p + "-")).Select(a => a.Id).ToListAsync();
        var max = ids.Select(i => rx.Match(i)).Where(m => m.Success).Select(m => int.Parse(m.Groups[1].Value)).DefaultIfEmpty(0).Max();
        return $"SSRF-{p}-{max + 1:D5}";
    }

    public static string Initials(string n) => string.Concat(n.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(2).Select(w => char.ToUpperInvariant(w[0])));

    private async Task DeleteTargetAsync(string path)
    {
        var parts = path.Split('/');
        if (parts.Length != 2) return;
        var (col, id) = (parts[0], parts[1]);
        switch (col)
        {
            case "stories": db.Stories.RemoveRange(db.Stories.Where(x => x.Id == id)); break;
            case "books": db.Books.RemoveRange(db.Books.Where(x => x.Id == id)); break;
            case "places": db.Places.RemoveRange(db.Places.Where(x => x.Id == id)); break;
            case "events": db.Events.RemoveRange(db.Events.Where(x => x.Id == id)); break;
            case "archive": db.Archive.RemoveRange(db.Archive.Where(x => x.Id == id)); break;
        }
        await db.SaveChangesAsync();
    }

    public Task DeleteAsync(string col, string id) => DeleteTargetAsync(col + "/" + id);

    /// <summary>Edit one text field of a published record, writing before/after to the revision log. Target is "collection/id" or "collection/id#field".</summary>
    public async Task<bool> ApplyEditAsync(string target, string newText, string? reason, string? via, string byId)
    {
        var hash = target.Split('#');
        var parts = hash[0].Split('/');
        if (parts.Length != 2) return false;
        var (col, id) = (parts[0], parts[1]);
        string? before = null, title = null;
        switch (col)
        {
            case "claims": { var c = await db.Claims.FindAsync(id); if (c == null) return false; before = c.Text; title = c.Heading; c.Text = newText; c.ReviewedBy = byId; c.ReviewedAt = DateTime.UtcNow; break; }
            case "entities": { var e = await db.Entities.FindAsync(id); if (e == null) return false; before = e.Role; title = e.Name; e.Role = newText; break; }
            case "stories": { var x = await db.Stories.FindAsync(id); if (x == null) return false; before = x.Body; title = x.Title; x.Body = newText; break; }
            case "books": { var x = await db.Books.FindAsync(id); if (x == null) return false; before = x.Description; title = x.Title; x.Description = newText; break; }
            case "places": { var x = await db.Places.FindAsync(id); if (x == null) return false; before = x.Description; title = x.Title; x.Description = newText; break; }
            case "events": { var x = await db.Events.FindAsync(id); if (x == null) return false; before = x.Description; title = x.Title; x.Description = newText; break; }
            case "archive": { var x = await db.Archive.FindAsync(id); if (x == null) return false; before = x.Description; title = x.Title; x.Description = newText; break; }
            case "campaigns":
            {
                var c = await db.Campaigns.FindAsync(id); if (c == null) return false;
                var field = hash.Length > 1 && hash[1].Length > 0 ? hash[1] : "lead";
                var o = JsonNode.Parse(c.Data.RootElement.GetRawText())!.AsObject();
                before = o[field]?.ToJsonString(); title = c.Name;
                o[field] = JsonValue.Create(newText);
                c.Data = JsonDocument.Parse(o.ToJsonString());
                break;
            }
            default: return false;
        }
        await db.SaveChangesAsync();
        await LogAsync("Edited", hash[0], title, string.Join(" ", new[] { reason, via != null ? "(via " + via + ")" : null }.Where(x => !string.IsNullOrEmpty(x))), byId, before, newText);
        return true;
    }
}
