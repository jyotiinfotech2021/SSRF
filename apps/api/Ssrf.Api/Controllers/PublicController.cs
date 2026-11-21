using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ssrf.Api.Data;

namespace Ssrf.Api.Controllers;

/// <summary>Read-only public content. Unpublished contributions, private profiles and restricted files are never returned here.</summary>
[ApiController, Route("api")]
public class PublicController(SsrfDbContext db) : ControllerBase
{
    private bool IsEditor => User.IsInRole("Admin") || User.IsInRole("Editor");

    [HttpGet("campaigns")] public async Task<IActionResult> Campaigns() => Ok(await db.Campaigns.AsNoTracking().OrderBy(c => c.Order).ToListAsync());
    [HttpGet("campaigns/{id}")] public async Task<IActionResult> Campaign(string id) => await db.Campaigns.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id) is { } c ? Ok(c) : NotFound();

    [HttpGet("claims")]
    public async Task<IActionResult> Claims([FromQuery] string? scope)
    {
        var q = db.Claims.AsNoTracking().Include(c => c.Citations.OrderBy(x => x.Position)).AsQueryable();
        if (!string.IsNullOrEmpty(scope)) q = q.Where(c => c.Scope == scope);
        return Ok(await q.OrderBy(c => c.Scope).ThenBy(c => c.Order).ToListAsync());
    }

    [HttpGet("sources")] public async Task<IActionResult> Sources() => Ok(await db.Sources.AsNoTracking().OrderBy(s => s.Id).ToListAsync());
    [HttpGet("entities")] public async Task<IActionResult> Entities([FromQuery] string? type) => Ok(await db.Entities.AsNoTracking().Where(e => type == null || e.Type == type).OrderBy(e => e.Name).ToListAsync());
    [HttpGet("chapters")] public async Task<IActionResult> Chapters() => Ok(await db.Chapters.AsNoTracking().OrderBy(c => c.Order).ToListAsync());
    [HttpGet("quiz")] public async Task<IActionResult> Quiz() => Ok(await db.Quiz.AsNoTracking().OrderBy(q => q.N).ToListAsync());
    [HttpGet("site")] public async Task<IActionResult> Site() => Ok(await db.Site.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Data));

    [HttpGet("books")] public async Task<IActionResult> Books() => Ok(await db.Books.AsNoTracking().OrderByDescending(b => b.CreatedAt).ToListAsync());
    [HttpGet("places")] public async Task<IActionResult> Places() => Ok(await db.Places.AsNoTracking().OrderByDescending(b => b.CreatedAt).ToListAsync());
    [HttpGet("events")] public async Task<IActionResult> Events() => Ok(await db.Events.AsNoTracking().Where(e => e.Date != null).OrderBy(e => e.Date).ToListAsync());

    [HttpGet("stories")] public async Task<IActionResult> Stories() => Ok(await db.Stories.AsNoTracking().Where(s => s.Status == "published").OrderByDescending(s => s.CreatedAt).Take(1000).ToListAsync());
    [HttpGet("stories/{id}")] public async Task<IActionResult> Story(string id) => await db.Stories.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id && s.Status == "published") is { } s ? Ok(s) : NotFound();

    /// <summary>The catalogue list. Each item carries a thumbnail URL when it has a public image (restricted items never do).</summary>
    [HttpGet("archive")]
    public async Task<IActionResult> Archive()
    {
        var items = await db.Archive.AsNoTracking().OrderBy(a => a.Id).ToListAsync();
        var firstImage = await (from af in db.ArchiveFiles.AsNoTracking() join f in db.Files.AsNoTracking() on af.FileId equals f.Id
                                where !f.Restricted && f.ContentType.StartsWith("image/") && f.StorageKey != ""
                                orderby af.ArchiveItemId, af.Position select new { af.ArchiveItemId, f.Id }).ToListAsync();
        var byItem = firstImage.GroupBy(x => x.ArchiveItemId).ToDictionary(g => g.Key, g => "/api/files/" + g.First().Id);
        var web = new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web);
        return Ok(items.Select(a =>
        {
            var n = System.Text.Json.JsonSerializer.SerializeToNode(a, web)!.AsObject();
            string? thumb = null;
            if (a.Access != "Restricted")
                thumb = byItem.GetValueOrDefault(a.Id) ?? (a.Data.RootElement.TryGetProperty("thumb", out var t) && t.ValueKind == System.Text.Json.JsonValueKind.String ? t.GetString() : null);
            n["thumb"] = thumb;
            return n;
        }));
    }

    [HttpGet("archive/{id}")]
    public async Task<IActionResult> ArchiveOne(string id)
    {
        var a = await db.Archive.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        var files = await (from af in db.ArchiveFiles.AsNoTracking() join f in db.Files.AsNoTracking() on af.FileId equals f.Id
                           where af.ArchiveItemId == id orderby af.Position
                           select new { f.Id, f.Name, f.ContentType, f.Size, f.Sha256, f.Restricted }).ToListAsync();
        // Catalogue record is public; the files of a restricted item are listed only to editors.
        return Ok(new { item = a, files = a.Access == "Restricted" && !IsEditor ? files.Take(0) : files, fileCount = files.Count });
    }

    [HttpGet("salutes/counts")]
    public async Task<IActionResult> SaluteCounts() => Ok(await db.Salutes.AsNoTracking().GroupBy(s => s.StoryId).Select(g => new { id = g.Key, count = g.Count() }).ToDictionaryAsync(x => x.id, x => x.count));

    [HttpGet("members")]
    public async Task<IActionResult> Members() => Ok(await db.Members.AsNoTracking().OrderBy(m => m.Name).Take(2000).ToListAsync());

    [HttpGet("revisions")]
    public async Task<IActionResult> Revisions([FromQuery] string? target)
    {
        var q = db.Revisions.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(target)) q = q.Where(r => r.Target == target);
        else if (!IsEditor) return Forbid();
        return Ok(await q.OrderByDescending(r => r.At).Take(1000).ToListAsync());
    }

    [HttpGet("events/{id}/media")]
    public async Task<IActionResult> EventMedia(string id) => Ok(await db.Media.AsNoTracking().Where(m => m.EventId == id).OrderBy(m => m.CreatedAt).ToListAsync());

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        q = (q ?? "").Trim();
        if (q.Length < 2) return Ok(new { query = q, results = Array.Empty<object>() });
        var like = $"%{q.Replace("%", "\\%").Replace("_", "\\_")}%";
        var res = new List<object>();
        res.AddRange(await db.Claims.AsNoTracking().Where(c => EF.Functions.ILike(c.Text, like) || EF.Functions.ILike(c.Heading, like)).Take(20).Select(c => new { type = "claim", id = c.Id, title = c.Heading, snippet = c.Text, scope = c.Scope }).ToListAsync());
        res.AddRange(await db.Entities.AsNoTracking().Where(e => EF.Functions.ILike(e.Name, like) || EF.Functions.ILike(e.Role!, like)).Take(20).Select(e => new { type = "entity", id = e.Id, title = e.Name, snippet = e.Role, scope = (string?)null }).ToListAsync());
        res.AddRange(await db.Stories.AsNoTracking().Where(s => s.Status == "published" && (EF.Functions.ILike(s.Title, like) || EF.Functions.ILike(s.Body!, like))).Take(20).Select(s => new { type = "story", id = s.Id, title = s.Title, snippet = s.Body, scope = (string?)null }).ToListAsync());
        res.AddRange(await db.Books.AsNoTracking().Where(s => EF.Functions.ILike(s.Title, like) || EF.Functions.ILike(s.Description!, like)).Take(20).Select(s => new { type = "book", id = s.Id, title = s.Title, snippet = s.Description, scope = (string?)null }).ToListAsync());
        res.AddRange(await db.Places.AsNoTracking().Where(s => EF.Functions.ILike(s.Title, like) || EF.Functions.ILike(s.Description!, like)).Take(20).Select(s => new { type = "place", id = s.Id, title = s.Title, snippet = s.Description, scope = (string?)null }).ToListAsync());
        res.AddRange(await db.Events.AsNoTracking().Where(s => EF.Functions.ILike(s.Title, like) || EF.Functions.ILike(s.Description!, like)).Take(20).Select(s => new { type = "event", id = s.Id, title = s.Title, snippet = s.Description, scope = (string?)null }).ToListAsync());
        res.AddRange(await db.Archive.AsNoTracking().Where(s => EF.Functions.ILike(s.Title, like) || EF.Functions.ILike(s.Description!, like) || s.Id == q).Take(20).Select(s => new { type = "archive", id = s.Id, title = s.Title, snippet = s.Description, scope = (string?)null }).ToListAsync());
        res.AddRange(await db.Members.AsNoTracking().Where(s => EF.Functions.ILike(s.Name, like)).Take(20).Select(s => new { type = "member", id = s.Id, title = s.Name, snippet = s.Affiliation, scope = (string?)null }).ToListAsync());
        return Ok(new { query = q, results = res });
    }

    [HttpGet("files/{id:guid}")]
    public async Task<IActionResult> File(Guid id, [FromServices] Services.IObjectStorage storage)
    {
        var f = await db.Files.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (f == null || f.StorageKey == "") return NotFound();
        if (f.Restricted && !IsEditor) return Forbid();
        var s = await storage.OpenAsync(f.StorageKey);
        if (s == null) return NotFound();
        Response.Headers.ContentDisposition = "inline; filename=\"" + Uri.EscapeDataString(f.Name) + "\"";
        return File(s, f.ContentType);
    }
}
