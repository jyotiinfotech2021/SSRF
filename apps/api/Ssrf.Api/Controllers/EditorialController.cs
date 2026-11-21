using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ssrf.Api.Data;
using Ssrf.Api.Domain;
using Ssrf.Api.Services;

namespace Ssrf.Api.Controllers;

public record AssessDto(string Assessment, string? Reason);
public record AssignDto(string? Assignee, DateOnly? Due, string? Priority, string? Stage);
public record ClaimEditDto(string Heading, string? Year, string Text, string Assessment, string Status, string? Established, string? Unresolved, List<CiteDto>? Cites, string? Reason);
public record CiteDto(string S, string? Loc);
public record TextEditDto(string Value, string? Reason, List<string>? Cites);
public record StatusDto(string Status, string? VerNote);
public record SourceDto(string Id, string Author, string Title, string? Publisher, string? Date, string? Accessed, string Nature, string? Url, string? Note);
public record QuizDto(string Q, List<string> Options, int Answer, string? Explain, string? Hint, string? Source, string? Topic, string? Level);
public record ChapterDto(List<string> Purpose, string? Coordinator, bool Active);
public record ReportDto(string? Summary, string? Proceedings, string? Attendance, string? Recording, string? Outcomes, string? Press);
public record PortraitDto(string? FileId, string Caption, string Credit, string Rights, string? Donor, string? ApproxDate, bool Archive);
public record RolesDto(List<string> Roles);
public record LinkLegacyDto(string LegacyUid);

[ApiController, Route("api/editorial"), Authorize(Policy = Policies.Editorial)]
public class EditorialController(SsrfDbContext db, EditorialService ed, UserManager<AppUser> users, IObjectStorage storage) : ControllerBase
{
    private string Uid => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private static bool HttpsOk(string? u) => string.IsNullOrEmpty(u) || u.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || u.StartsWith("http://", StringComparison.OrdinalIgnoreCase);

    // ---------- Review queue ----------
    [HttpGet("queue")]
    public async Task<IActionResult> Queue([FromQuery] string scope = "open", [FromQuery] string? kind = null)
    {
        var q = db.Submissions.AsNoTracking().AsQueryable();
        q = scope switch
        {
            "mine" => q.Where(s => s.Assignee == Uid && EditorialService.OpenStages.Contains(s.Status)),
            "all" => q,
            "closed" => q.Where(s => !EditorialService.OpenStages.Contains(s.Status)),
            _ => q.Where(s => EditorialService.OpenStages.Contains(s.Status))
        };
        if (!string.IsNullOrEmpty(kind)) q = q.Where(s => s.Kind == kind);
        var items = await q.OrderBy(s => s.CreatedAt).Take(500).ToListAsync();
        var owners = items.Select(i => i.OwnerId).Distinct().ToList();
        var names = await db.MemberPrivates.AsNoTracking().Where(m => owners.Contains(m.Id)).ToDictionaryAsync(m => m.Id, m => new { m.Name, m.Category });
        var mine = await db.MemberPrivates.AsNoTracking().FirstOrDefaultAsync(m => m.Id == Uid);
        var rows = new List<object>();
        foreach (var s in items) rows.Add(new { submission = s, ownerName = names.GetValueOrDefault(s.OwnerId)?.Name, ownerCategory = names.GetValueOrDefault(s.OwnerId)?.Category, blocked = await ed.CoiBlockAsync(s, Uid) });
        var editors = new List<object>();
        foreach (var u in await users.GetUsersInRoleAsync(Roles.Editor).ContinueWith(t => t.Result.Concat(users.GetUsersInRoleAsync(Roles.Admin).Result).DistinctBy(x => x.Id)))
            editors.Add(new { id = u.Id, name = db.MemberPrivates.AsNoTracking().FirstOrDefault(m => m.Id == u.Id.ToString())?.Name ?? u.Email });
        return Ok(new { items = rows, editors });
    }

    [HttpPost("submissions/{id:guid}/assign")]
    public async Task<IActionResult> Assign(Guid id, AssignDto d)
    {
        var s = await db.Submissions.FindAsync(id); if (s == null) return NotFound();
        s.Assignee = d.Assignee; s.Due = d.Due; s.Priority = d.Priority is "Low" or "Normal" or "High" or "Urgent" ? d.Priority : "Normal";
        if (!string.IsNullOrEmpty(d.Stage) && d.Stage != s.Status && s.Status != "evidence" && EditorialService.StageOrder.Contains(d.Stage))
        { s.Status = d.Stage; s.History = EditorialService.AppendHistory(s.History, Uid, d.Stage, "Stage set"); }
        await db.SaveChangesAsync();
        await ed.LogAsync("Assignment updated", $"subs/{s.OwnerId}/{s.Id}", ed.TitleOf(s), $"{(d.Assignee != null ? "Assigned" : "Unassigned")}{(d.Due != null ? ", due " + d.Due : "")}, {s.Priority} priority", Uid);
        return Ok(s);
    }

    [HttpPost("submissions/{id:guid}/decide")]
    public async Task<IActionResult> Decide(Guid id, DecideRequest r)
    {
        var s = await db.Submissions.FindAsync(id); if (s == null) return NotFound();
        var res = await ed.DecideAsync(s, r, Uid);
        return res.Ok ? Ok(new { message = res.Message, submission = s }) : BadRequest(new { error = res.Message });
    }

    // ---------- Direct editing of published text (always logged) ----------
    [HttpPut("claims/{id}")]
    public async Task<IActionResult> EditClaim(string id, ClaimEditDto d)
    {
        var c = await db.Claims.Include(x => x.Citations).FirstOrDefaultAsync(x => x.Id == id); if (c == null) return NotFound();
        if (new[] { "documented", "corroborated", "attributed", "unverified", "disputed" }.All(a => a != d.Assessment)) return BadRequest(new { error = "Unknown evidence classification." });
        var cites = d.Cites ?? [];
        var known = (await db.Sources.Select(s => s.Id).ToListAsync()).ToHashSet();
        var bad = cites.Where(x => !known.Contains(x.S)).Select(x => x.S).ToList();
        if (bad.Count > 0) return BadRequest(new { error = $"Unknown source id: {string.Join(", ", bad)}" });
        var before = $"{c.Text} [{c.Assessment}]";
        c.Heading = d.Heading; c.Year = d.Year; c.Text = d.Text; c.Assessment = d.Assessment; c.Status = d.Status; c.Established = d.Established; c.Unresolved = d.Unresolved;
        c.ReviewedBy = Uid; c.ReviewedAt = DateTime.UtcNow;
        db.ClaimCitations.RemoveRange(c.Citations);
        c.Citations = cites.Select((x, i) => new ClaimCitation { ClaimId = id, SourceId = x.S, Loc = x.Loc, Position = i }).ToList();
        await db.SaveChangesAsync();
        await ed.LogAsync("Edited", "claims/" + id, c.Heading, d.Reason, Uid, before, $"{c.Text} [{c.Assessment}]");
        return Ok(c);
    }

    [HttpPut("entities/{id}")]
    public async Task<IActionResult> EditEntity(string id, TextEditDto d)
    {
        var e = await db.Entities.FindAsync(id); if (e == null) return NotFound();
        var before = e.Role; e.Role = d.Value; if (d.Cites != null) e.Cites = d.Cites;
        await db.SaveChangesAsync(); await ed.LogAsync("Edited", "entities/" + id, e.Name, d.Reason, Uid, before, d.Value);
        return Ok(e);
    }

    [HttpPut("campaigns/{id}/{field}")]
    public async Task<IActionResult> EditCampaign(string id, string field, TextEditDto d)
        => await ed.ApplyEditAsync($"campaigns/{id}#{field}", d.Value, d.Reason, null, Uid) ? Ok() : NotFound();

    [HttpPut("text/{col}/{id}")]
    public async Task<IActionResult> EditText(string col, string id, TextEditDto d)
        => await ed.ApplyEditAsync($"{col}/{id}", d.Value, d.Reason, null, Uid) ? Ok() : NotFound();

    [HttpPut("chapters/{id}")]
    public async Task<IActionResult> EditChapter(string id, ChapterDto d)
    {
        var c = await db.Chapters.FindAsync(id); if (c == null) return NotFound();
        c.Purpose = d.Purpose; c.Coordinator = d.Coordinator; c.Active = d.Active;
        await db.SaveChangesAsync(); await ed.LogAsync("Chapter updated", "chapters/" + id, id, null, Uid);
        return Ok(c);
    }

    // ---------- Verification status (own work cannot be verified by its author) ----------
    [HttpPut("status/{col}/{id}")]
    public async Task<IActionResult> SetStatus(string col, string id, StatusDto d)
    {
        if (new[] { "verified", "checking", "evidence", "rejected", "recheck", "submitted" }.All(s => s != d.Status)) return BadRequest(new { error = "Unknown status." });
        ContentItem? item = col switch { "places" => await db.Places.FindAsync(id), "books" => await db.Books.FindAsync(id), "archive" => await db.Archive.FindAsync(id), _ => null };
        if (item == null) return NotFound();
        if (item.AuthorId == Uid) return BadRequest(new { error = "Another editor must verify your own entry." });
        item.Status = d.Status; item.VerNote = d.VerNote; item.ReviewedBy = Uid; item.ReviewedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(); await ed.LogAsync("Status set to " + d.Status, $"{col}/{id}", item.Title, d.VerNote, Uid);
        return Ok(item);
    }

    /// <summary>Editors change how well a story's claims are supported. The change and its reason go to the revision log.</summary>
    [HttpPut("assess/stories/{id}")]
    public async Task<IActionResult> AssessStory(string id, AssessDto d)
    {
        if (new[] { "documented", "corroborated", "attributed", "unverified", "disputed" }.All(a => a != d.Assessment)) return BadRequest(new { error = "Unknown evidence classification." });
        var s = await db.Stories.FindAsync(id); if (s == null) return NotFound();
        if (s.AuthorId == Uid) return BadRequest(new { error = "Another editor must set the evidence classification on your own story." });
        var before = s.Assessment; s.Assessment = d.Assessment; s.ReviewedBy = Uid; s.ReviewedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(); await ed.LogAsync("Evidence classification changed", "stories/" + id, s.Title, d.Reason, Uid, before, d.Assessment);
        return Ok(s);
    }

    [HttpPut("archive/{id}/transcript")]
    public async Task<IActionResult> Transcript(string id, TextEditDto d)
    {
        var a = await db.Archive.FindAsync(id); if (a == null) return NotFound();
        a.Transcript = d.Value; await db.SaveChangesAsync(); await ed.LogAsync("Transcript edited", "archive/" + id, a.Title, d.Reason, Uid);
        return Ok(a);
    }

    [HttpPut("events/{id}/report")]
    public async Task<IActionResult> Report(string id, ReportDto d)
    {
        var e = await db.Events.FindAsync(id); if (e == null) return NotFound();
        if (!HttpsOk(d.Recording)) return BadRequest(new { error = "Links must start with https://" });
        var o = System.Text.Json.Nodes.JsonNode.Parse(e.Data.RootElement.GetRawText())!.AsObject();
        o["summary"] = d.Summary; o["proceedings"] = d.Proceedings; o["attendance"] = d.Attendance; o["recording"] = d.Recording; o["outcomes"] = d.Outcomes; o["press"] = d.Press;
        e.Data = JsonDocument.Parse(o.ToJsonString());
        await db.SaveChangesAsync(); await ed.LogAsync("Event report saved", "events/" + id, e.Title, null, Uid);
        return Ok(e);
    }

    // ---------- Direct catalogue entry by editors ----------
    [HttpPost("archive")]
    public async Task<IActionResult> Catalogue(JsonElement body)
    {
        var o = System.Text.Json.Nodes.JsonNode.Parse(body.GetRawText())!.AsObject();
        var title = o["title"]?.ToString(); if (string.IsNullOrWhiteSpace(title)) return BadRequest(new { error = "A title is required." });
        var cat = o["category"]?.ToString() ?? "";
        var id = await ed.NextArchiveIdAsync(cat);
        var restricted = o["access"]?.ToString() == "Restricted";
        var fileIds = (o["fileIds"] as System.Text.Json.Nodes.JsonArray)?.Select(x => Guid.Parse(x!.ToString())).ToList() ?? [];
        o.Remove("fileIds");
        var a = new ArchiveItem { Id = id, Title = title, Category = cat, Collection = o["collection"]?.ToString(), Description = o["description"]?.ToString(), Rights = o["rights"]?.ToString(),
            Access = restricted ? "Restricted" : "Public", Nature = "Primary source", Status = "checking", AuthorId = Uid, PageCount = fileIds.Count,
            VerNote = "Catalogued; awaiting verification by a second editor", Data = JsonDocument.Parse(o.ToJsonString()) };
        db.Archive.Add(a);
        for (var i = 0; i < fileIds.Count; i++)
        {
            db.ArchiveFiles.Add(new ArchiveFile { ArchiveItemId = id, FileId = fileIds[i], Position = i });
            if (restricted && await db.Files.FindAsync(fileIds[i]) is { } f) f.Restricted = true;
        }
        await db.SaveChangesAsync(); await ed.LogAsync("Catalogued archive item", "archive/" + id, title, null, Uid);
        return Ok(a);
    }

    [HttpPost("events")]
    public async Task<IActionResult> AddEvent(JsonElement body)
    {
        var o = System.Text.Json.Nodes.JsonNode.Parse(body.GetRawText())!.AsObject();
        var title = o["title"]?.ToString(); if (string.IsNullOrWhiteSpace(title)) return BadRequest(new { error = "A title is required." });
        if (!DateOnly.TryParse(o["date"]?.ToString(), out var date)) return BadRequest(new { error = "A valid date is required." });
        var e = new EventItem { Id = Guid.NewGuid().ToString("N")[..20], Title = title, Type = o["type"]?.ToString(), Description = o["description"]?.ToString(), Date = date, Status = "published", AuthorId = Uid, Data = JsonDocument.Parse(o.ToJsonString()) };
        db.Events.Add(e); await db.SaveChangesAsync(); await ed.LogAsync("Added event", "events/" + e.Id, title, null, Uid);
        return Ok(e);
    }

    [HttpDelete("{col}/{id}")]
    public async Task<IActionResult> Delete(string col, string id)
    {
        if (col is not ("books" or "places" or "events" or "stories" or "archive")) return BadRequest(new { error = "Not deletable." });
        string? title = col switch { "books" => (await db.Books.FindAsync(id))?.Title, "places" => (await db.Places.FindAsync(id))?.Title, "events" => (await db.Events.FindAsync(id))?.Title, "stories" => (await db.Stories.FindAsync(id))?.Title, _ => (await db.Archive.FindAsync(id))?.Title };
        if (title == null) return NotFound();
        await ed.DeleteAsync(col, id);
        await ed.LogAsync(col == "stories" ? "Unpublished story" : "Deleted from " + col, $"{col}/{id}", title, null, Uid);
        return NoContent();
    }

    // ---------- Sources, quiz, site ----------
    [HttpPost("sources")]
    public async Task<IActionResult> AddSource(SourceDto d)
    {
        if (string.IsNullOrWhiteSpace(d.Id) || d.Id.Length > 60) return BadRequest(new { error = "Source id is required." });
        if (await db.Sources.AnyAsync(s => s.Id == d.Id)) return BadRequest(new { error = "That id is taken." });
        if (!HttpsOk(d.Url)) return BadRequest(new { error = "Links must start with https://" });
        db.Sources.Add(new Source { Id = d.Id, Author = d.Author, Title = d.Title, Publisher = d.Publisher, Date = d.Date, Accessed = d.Accessed, Nature = d.Nature, Url = d.Url, Note = d.Note });
        await db.SaveChangesAsync(); await ed.LogAsync("Source added", "sources/" + d.Id, d.Title, null, Uid);
        return Ok();
    }

    [HttpPost("quiz"), HttpPut("quiz/{id?}")]
    public async Task<IActionResult> SaveQuiz(string? id, QuizDto d)
    {
        var opts = d.Options.Where(o => !string.IsNullOrWhiteSpace(o)).ToList();
        if (opts.Count < 2 || d.Answer < 0 || d.Answer >= opts.Count) return BadRequest(new { error = "Provide at least two options; the correct option must be one that is filled in." });
        QuizQuestion q;
        if (id == null)
        {
            var n = (await db.Quiz.MaxAsync(x => (int?)x.N) ?? 0) + 1;
            q = new QuizQuestion { Id = "q" + n.ToString("D2"), N = n }; db.Quiz.Add(q);
        }
        else q = await db.Quiz.FindAsync(id) ?? throw new KeyNotFoundException();
        q.Q = d.Q; q.Options = opts; q.Answer = d.Answer; q.Explain = d.Explain; q.Hint = d.Hint; q.Source = d.Source; q.Topic = d.Topic; q.Level = d.Level;
        await db.SaveChangesAsync(); await ed.LogAsync(id == null ? "Quiz question added" : "Quiz question edited", "quiz/" + q.Id, d.Q.Length > 80 ? d.Q[..80] : d.Q, null, Uid);
        return Ok(q);
    }

    [HttpDelete("quiz/{id}")]
    public async Task<IActionResult> DeleteQuiz(string id)
    {
        var q = await db.Quiz.FindAsync(id); if (q == null) return NotFound();
        db.Quiz.Remove(q); await db.SaveChangesAsync(); await ed.LogAsync("Quiz question deleted", "quiz/" + id, "", null, Uid);
        return NoContent();
    }

    [HttpPut("site/settings")]
    public async Task<IActionResult> Settings(JsonElement body)
    {
        var cur = await db.Site.FindAsync("settings");
        var merged = cur != null ? System.Text.Json.Nodes.JsonNode.Parse(cur.Data.RootElement.GetRawText())!.AsObject() : new();
        foreach (var p in System.Text.Json.Nodes.JsonNode.Parse(body.GetRawText())!.AsObject()) merged[p.Key] = p.Value?.DeepClone();
        if (cur == null) db.Site.Add(new SiteSetting { Key = "settings", Data = JsonDocument.Parse(merged.ToJsonString()) }); else cur.Data = JsonDocument.Parse(merged.ToJsonString());
        await db.SaveChangesAsync(); await ed.LogAsync("Governance and contact updated", "site/settings", "", null, Uid);
        return Ok();
    }

    [HttpPut("site/portrait")]
    public async Task<IActionResult> Portrait(PortraitDto d)
    {
        if (string.IsNullOrWhiteSpace(d.Caption) || string.IsNullOrWhiteSpace(d.Credit) || string.IsNullOrWhiteSpace(d.Rights)) return BadRequest(new { error = "Caption, credit and rights are required so copyright information stays with the image." });
        var o = new System.Text.Json.Nodes.JsonObject { ["caption"] = d.Caption, ["credit"] = d.Credit, ["rights"] = d.Rights, ["donor"] = d.Donor, ["approxDate"] = d.ApproxDate, ["by"] = Uid, ["at"] = DateTime.UtcNow.ToString("o") };
        var cur = await db.Site.FindAsync("portrait");
        if (cur != null) foreach (var p in System.Text.Json.Nodes.JsonNode.Parse(cur.Data.RootElement.GetRawText())!.AsObject()) if (o[p.Key] == null) o[p.Key] = p.Value?.DeepClone();
        if (d.FileId != null)
        {
            if (!Guid.TryParse(d.FileId, out var fid) || await db.Files.FindAsync(fid) is not { } f) return BadRequest(new { error = "Image not found." });
            if (!f.ContentType.StartsWith("image/")) return BadRequest(new { error = "Choose an image file." });
            o["fileId"] = fid.ToString(); o["url"] = "/api/files/" + fid; o["sha256"] = f.Sha256;
            if (d.Archive)
            {
                var id = await ed.NextArchiveIdAsync("Photograph");
                db.Archive.Add(new ArchiveItem { Id = id, Title = d.Caption, Category = "Photograph", Collection = "Sagat Singh Personal Archive", Description = "Portrait used on the foundation's home page.", Rights = d.Rights,
                    Access = "Public", Nature = "Primary source", Status = "checking", AuthorId = Uid, PageCount = 1, VerNote = "Catalogued; awaiting verification by a second editor",
                    Data = JsonDocument.Parse(new System.Text.Json.Nodes.JsonObject { ["creator"] = d.Credit, ["donor"] = d.Donor, ["approxDate"] = d.ApproxDate, ["people"] = "Lt Gen Sagat Singh" }.ToJsonString()) });
                db.ArchiveFiles.Add(new ArchiveFile { ArchiveItemId = id, FileId = fid, Position = 0 });
                o["archiveId"] = id;
                await ed.LogAsync("Catalogued archive item", "archive/" + id, d.Caption, "Home page portrait", Uid);
            }
        }
        if (cur == null) db.Site.Add(new SiteSetting { Key = "portrait", Data = JsonDocument.Parse(o.ToJsonString()) }); else cur.Data = JsonDocument.Parse(o.ToJsonString());
        await db.SaveChangesAsync(); await ed.LogAsync("Home page portrait updated", "site/portrait", d.Caption, $"Credit: {d.Credit}. Rights: {d.Rights}", Uid);
        return Ok();
    }

    [HttpDelete("site/portrait")]
    public async Task<IActionResult> RemovePortrait()
    {
        var cur = await db.Site.FindAsync("portrait"); if (cur == null) return NotFound();
        db.Site.Remove(cur); await db.SaveChangesAsync(); await ed.LogAsync("Home page portrait removed", "site/portrait", "", null, Uid);
        return NoContent();
    }

    // ---------- Restricted-archive access: editors see files; file bytes via /api/files/{id} ----------
    [HttpGet("members/{id}/private")]
    public async Task<IActionResult> PrivateProfile(string id) => await db.MemberPrivates.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id) is { } p ? Ok(p) : NotFound();

    // ---------- Admin ----------
    [HttpGet("users"), Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Users()
    {
        var list = await users.Users.AsNoTracking().OrderBy(u => u.Email).Take(500).ToListAsync();
        var rows = new List<object>();
        foreach (var u in list) rows.Add(new { u.Id, u.Email, u.LegacyUid, u.CreatedAt, roles = await users.GetRolesAsync(u) });
        return Ok(rows);
    }

    [HttpPut("users/{id:guid}/roles"), Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> SetRoles(Guid id, RolesDto d)
    {
        var u = await users.FindByIdAsync(id.ToString()); if (u == null) return NotFound();
        if (d.Roles.Any(r => !Roles.All.Contains(r))) return BadRequest(new { error = "Unknown role." });
        if (id.ToString() == Uid && !d.Roles.Contains(Roles.Admin)) return BadRequest(new { error = "You cannot remove your own Admin role." });
        var cur = await users.GetRolesAsync(u);
        await users.RemoveFromRolesAsync(u, cur.Except(d.Roles));
        await users.AddToRolesAsync(u, d.Roles.Except(cur));
        await ed.LogAsync("Roles changed", "users/" + id, u.Email, string.Join(", ", d.Roles), Uid);
        return Ok();
    }

    /// <summary>Attach an imported prototype identity to a real account, moving ownership of imported contributions, profile and salutes.</summary>
    [HttpPost("users/{id:guid}/link-legacy"), Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> LinkLegacy(Guid id, LinkLegacyDto d)
    {
        var u = await users.FindByIdAsync(id.ToString()); if (u == null) return NotFound();
        if (await users.Users.AnyAsync(x => x.LegacyUid == d.LegacyUid)) return BadRequest(new { error = "That legacy id is already linked." });
        var nid = id.ToString(); var old = d.LegacyUid;
        u.LegacyUid = old; await users.UpdateAsync(u);
        await db.Submissions.Where(s => s.OwnerId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.OwnerId, nid));
        await db.Stories.Where(s => s.AuthorId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.AuthorId, nid));
        await db.Archive.Where(s => s.AuthorId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.AuthorId, nid));
        await db.Books.Where(s => s.AuthorId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.AuthorId, nid));
        await db.Places.Where(s => s.AuthorId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.AuthorId, nid));
        await db.Events.Where(s => s.AuthorId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.AuthorId, nid));
        await db.Members.Where(s => s.Id == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.Id, nid));
        await db.MemberPrivates.Where(s => s.Id == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.Id, nid));
        await db.Salutes.Where(s => s.UserId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.UserId, nid));
        await db.Attendances.Where(s => s.UserId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.UserId, nid));
        await db.Media.Where(s => s.OwnerId == old).ExecuteUpdateAsync(s => s.SetProperty(x => x.OwnerId, nid));
        await ed.LogAsync("Legacy identity linked", "users/" + id, u.Email, old, Uid);
        return Ok();
    }

    [HttpPost("import"), Authorize(Policy = Policies.AdminOnly), RequestSizeLimit(200 * 1024 * 1024)]
    public async Task<IActionResult> Import([FromServices] LegacyImporter importer)
    {
        using var sr = new StreamReader(Request.Body, Encoding.UTF8);
        var rep = await importer.ImportBackupAsync(await sr.ReadToEndAsync());
        await ed.LogAsync("Prototype data imported", "import", "", $"{rep.Imported.Values.Sum()} records imported, {rep.Warnings.Count} warnings", Uid);
        return Ok(rep);
    }

    private static readonly string[] BackupCollections = ["claims", "campaigns", "sources", "entities", "chapters", "stories", "books", "places", "events", "archive", "quiz", "revisions", "site", "members", "submissions", "media", "files"];

    /// <summary>Admin JSON backup of editorial data (private profiles included, so Admin only). Database-level backups are in docs/deployment.</summary>
    [HttpGet("backup/json"), Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> BackupJson()
    {
        var data = new Dictionary<string, object>
        {
            ["claims"] = await db.Claims.AsNoTracking().Include(c => c.Citations).ToListAsync(),
            ["campaigns"] = await db.Campaigns.AsNoTracking().ToListAsync(), ["sources"] = await db.Sources.AsNoTracking().ToListAsync(),
            ["entities"] = await db.Entities.AsNoTracking().ToListAsync(), ["chapters"] = await db.Chapters.AsNoTracking().ToListAsync(),
            ["stories"] = await db.Stories.AsNoTracking().ToListAsync(), ["books"] = await db.Books.AsNoTracking().ToListAsync(), ["places"] = await db.Places.AsNoTracking().ToListAsync(),
            ["events"] = await db.Events.AsNoTracking().ToListAsync(), ["archive"] = await db.Archive.AsNoTracking().ToListAsync(), ["quiz"] = await db.Quiz.AsNoTracking().ToListAsync(),
            ["revisions"] = await db.Revisions.AsNoTracking().ToListAsync(), ["site"] = await db.Site.AsNoTracking().ToListAsync(), ["members"] = await db.Members.AsNoTracking().ToListAsync(),
            ["memberPrivate"] = await db.MemberPrivates.AsNoTracking().ToListAsync(), ["submissions"] = await db.Submissions.AsNoTracking().ToListAsync(),
            ["media"] = await db.Media.AsNoTracking().ToListAsync(), ["files"] = await db.Files.AsNoTracking().ToListAsync(), ["archiveFiles"] = await db.ArchiveFiles.AsNoTracking().ToListAsync()
        };
        var body = new { format = "SSRF production backup", version = 1, exportedAt = DateTime.UtcNow, collections = data };
        await ed.LogAsync("Database backup downloaded", "backup", $"{data.Values.Sum(v => ((System.Collections.ICollection)v).Count)} records", null, Uid);
        return File(JsonSerializer.SerializeToUtf8Bytes(body, new JsonSerializerOptions { WriteIndented = true }), "application/json", $"ssrf-backup-{DateTime.UtcNow:yyyy-MM-dd}.json");
    }
}
