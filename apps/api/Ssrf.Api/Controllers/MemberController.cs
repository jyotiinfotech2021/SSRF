using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ssrf.Api.Data;
using Ssrf.Api.Domain;
using Ssrf.Api.Services;

namespace Ssrf.Api.Controllers;

public record ProfileDto(string Name, string? Title, string? Affiliation, string? Category, string? Chapter, string? Connection, string? Interests,
    List<string>? Camps, bool Listed, bool ShowChapter, bool ShowContrib, bool Adult, string? PhotoFileId, bool PhotoConsent);
public record SubmitDto(string Kind, JsonElement Data);
public record MediaLinkDto(string? Url, string? FileId, string? Caption, string? Credit);

[ApiController, Route("api"), Authorize]
public class MemberController(SsrfDbContext db, IObjectStorage storage) : ControllerBase
{
    private string Uid => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private static readonly string[] OpenKinds = ["correction", "privacy", "access"]; // any signed-in member
    private static readonly string[] ContribKinds = ["story", "book", "place", "event", "archive"];
    private static readonly string[] Categories = ["Founding member", "Veteran member", "Family and legacy member", "Research member", "Academic member", "Student member", "Institutional member", "Volunteer member", "Patron or supporter"];

    private static bool HttpsOk(string? u) => string.IsNullOrEmpty(u) || u.StartsWith("https://", StringComparison.OrdinalIgnoreCase);

    [HttpGet("me/profile")]
    public async Task<IActionResult> Profile() => Ok(await db.MemberPrivates.AsNoTracking().FirstOrDefaultAsync(m => m.Id == Uid));

    [HttpPut("me/profile")]
    public async Task<IActionResult> SaveProfile(ProfileDto d)
    {
        if (string.IsNullOrWhiteSpace(d.Name) || d.Name.Length > 120) return BadRequest(new { error = "Name is required (up to 120 characters)." });
        if (!d.Adult) return BadRequest(new { error = "Membership is for adults. Please confirm you are 18 or over." });
        if (!string.IsNullOrEmpty(d.Category) && !Categories.Contains(d.Category)) return BadRequest(new { error = "Choose a membership category from the list." });
        string? photo = null;
        if (d.PhotoFileId != null)
        {
            if (!d.PhotoConsent) return BadRequest(new { error = "Tick the consent box to add a photograph." });
            if (!Guid.TryParse(d.PhotoFileId, out var fid) || await db.Files.FirstOrDefaultAsync(f => f.Id == fid && f.UploadedBy == Uid) == null) return BadRequest(new { error = "That photograph was not found." });
            photo = "/api/files/" + fid;
        }
        var p = await db.MemberPrivates.FindAsync(Uid) ?? db.MemberPrivates.Add(new MemberPrivate { Id = Uid }).Entity;
        p.Name = d.Name.Trim(); p.Title = d.Title; p.Affiliation = d.Affiliation; p.Category = string.IsNullOrEmpty(d.Category) ? null : d.Category; p.Chapter = d.Chapter; p.Connection = d.Connection;
        p.Interests = d.Interests; p.Camps = d.Camps ?? []; p.Listed = d.Listed; p.ShowChapter = d.ShowChapter; p.ShowContrib = d.ShowContrib; p.Adult = true;
        p.Photo = photo ?? p.Photo; p.PhotoConsent = d.PhotoConsent && p.Photo != null;
        var m = await db.Members.FindAsync(Uid);
        if (d.Listed)
        {
            m ??= db.Members.Add(new Member { Id = Uid, JoinedAt = p.JoinedAt }).Entity;
            m.Name = p.Name; m.Title = p.Title; m.Affiliation = p.Affiliation; m.Category = p.Category; m.Chapter = p.ShowChapter ? p.Chapter : "";
            m.ShowChapter = p.ShowChapter; m.Connection = p.Connection; m.Interests = p.Interests; m.Camps = p.Camps; m.ShowContrib = p.ShowContrib;
            m.Photo = p.PhotoConsent ? p.Photo : ""; m.PhotoConsent = p.PhotoConsent;
        }
        else if (m != null) db.Members.Remove(m);
        await db.SaveChangesAsync();
        return Ok(p);
    }

    /// <summary>Leave: remove profile, salutes and registrations. Past contributions stay until anonymisation is requested.</summary>
    [HttpDelete("me/profile")]
    public async Task<IActionResult> Leave()
    {
        db.MemberPrivates.RemoveRange(db.MemberPrivates.Where(x => x.Id == Uid));
        db.Members.RemoveRange(db.Members.Where(x => x.Id == Uid));
        db.Salutes.RemoveRange(db.Salutes.Where(x => x.UserId == Uid));
        db.Attendances.RemoveRange(db.Attendances.Where(x => x.UserId == Uid));
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("me/submissions")]
    public async Task<IActionResult> Mine() => Ok(await db.Submissions.AsNoTracking().Where(s => s.OwnerId == Uid).OrderByDescending(s => s.CreatedAt).ToListAsync());

    [HttpPost("submissions")]
    public async Task<IActionResult> Submit(SubmitDto d)
    {
        var canContribute = User.IsInRole(Roles.Contributor) || User.IsInRole(Roles.Editor) || User.IsInRole(Roles.Admin);
        if (!OpenKinds.Contains(d.Kind) && !ContribKinds.Contains(d.Kind)) return BadRequest(new { error = "Unknown contribution type." });
        if (ContribKinds.Contains(d.Kind) && !canContribute) return StatusCode(403, new { error = "Your access level doesn't allow that. Ask the foundation to invite you as a contributor." });
        if (d.Data.ValueKind != JsonValueKind.Object) return BadRequest(new { error = "Contribution data must be an object." });
        var o = JsonNode.Parse(d.Data.GetRawText())!.AsObject();
        // Link fields only exist on the contribution forms. A correction's "source" is a free-text citation (book and page), not a link.
        if (ContribKinds.Contains(d.Kind))
            foreach (var k in new[] { "video", "link", "source" })
                if (o[k] is JsonValue v && v.TryGetValue<string>(out var s) && !HttpsOk(s)) return BadRequest(new { error = "Links must start with https://" });
        if (d.Kind == "story" && o["consent"]?.GetValue<bool>() != true && o["consent"]?.ToString() != "on") return BadRequest(new { error = "Confirm you have the right to share this story." });
        if (d.Kind == "place")
            foreach (var k in new[] { "lat", "lng" })
                if (o[k] is JsonValue v && v.TryGetValue<string>(out var s) && s != "" && !double.TryParse(s, out _)) return BadRequest(new { error = "Latitude and longitude must be numbers." });
        if (d.Kind != "privacy" && d.Kind != "access" && d.Kind != "correction" && string.IsNullOrWhiteSpace(o["title"]?.ToString())) return BadRequest(new { error = "A title is required." });
        if (d.Kind == "correction" && (string.IsNullOrWhiteSpace(o["text"]?.ToString()) || string.IsNullOrWhiteSpace(o["source"]?.ToString()) || string.IsNullOrWhiteSpace(o["target"]?.ToString())))
            return BadRequest(new { error = "A correction needs the target, what should change, and your source." });
        var sub = new Submission { OwnerId = Uid, Kind = d.Kind, Data = JsonDocument.Parse(o.ToJsonString()), History = EditorialService.AppendHistory(JsonDocument.Parse("[]"), Uid, "submitted", null) };
        db.Submissions.Add(sub);
        await db.SaveChangesAsync();
        return Ok(sub);
    }

    [HttpPost("submissions/{id:guid}/resubmit"), Authorize(Policy = Policies.CanContribute)]
    public async Task<IActionResult> Resubmit(Guid id, JsonElement data)
    {
        var s = await db.Submissions.FirstOrDefaultAsync(x => x.Id == id && x.OwnerId == Uid);
        if (s == null) return NotFound();
        if (s.Status != "evidence" && s.Status != "rejected") return BadRequest(new { error = "Only items sent back for evidence can be revised." });
        s.History = EditorialService.AppendHistory(s.History, Uid, "submitted", "Revised and resubmitted", JsonNode.Parse(s.Data.RootElement.GetRawText()));
        s.Data = JsonDocument.Parse(data.GetRawText());
        s.Status = "submitted"; s.ResubmittedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(s);
    }

    [HttpPost("submissions/{id:guid}/withdraw")]
    public async Task<IActionResult> Withdraw(Guid id)
    {
        var s = await db.Submissions.FirstOrDefaultAsync(x => x.Id == id && x.OwnerId == Uid);
        if (s == null) return NotFound();
        if (!EditorialService.OpenStages.Contains(s.Status)) return BadRequest(new { error = "This contribution is already closed." });
        s.Status = "withdrawn"; s.History = EditorialService.AppendHistory(s.History, Uid, "withdrawn", null);
        await db.SaveChangesAsync();
        return Ok(s);
    }

    [HttpPost("stories/{id}/salute")]
    public async Task<IActionResult> Salute(string id)
    {
        if (!await db.Stories.AnyAsync(s => s.Id == id && s.Status == "published")) return NotFound();
        var cur = await db.Salutes.FindAsync(Uid, id);
        if (cur != null) db.Salutes.Remove(cur); else db.Salutes.Add(new Salute { UserId = Uid, StoryId = id });
        await db.SaveChangesAsync();
        return Ok(new { saluted = cur == null });
    }

    [HttpGet("me/salutes")] public async Task<IActionResult> MySalutes() => Ok(await db.Salutes.Where(s => s.UserId == Uid).Select(s => s.StoryId).ToListAsync());
    [HttpGet("me/attendance")] public async Task<IActionResult> MyAttendance() => Ok(await db.Attendances.Where(s => s.UserId == Uid).Select(s => s.EventId).ToListAsync());
    [AllowAnonymous, HttpGet("stories/{id}/salutes")] public async Task<IActionResult> SaluteCount(string id) => Ok(new { count = await db.Salutes.CountAsync(s => s.StoryId == id) });
    [AllowAnonymous, HttpGet("events/{id}/attendees")] public async Task<IActionResult> AttendeeCount(string id) => Ok(new { count = await db.Attendances.CountAsync(s => s.EventId == id) });

    [HttpPost("events/{id}/attend")]
    public async Task<IActionResult> Attend(string id)
    {
        if (!await db.Events.AnyAsync(e => e.Id == id)) return NotFound();
        var cur = await db.Attendances.FindAsync(Uid, id);
        if (cur != null) db.Attendances.Remove(cur); else db.Attendances.Add(new Attendance { UserId = Uid, EventId = id });
        await db.SaveChangesAsync();
        return Ok(new { registered = cur == null });
    }

    private static readonly Dictionary<string, string[]> Allowed = new()
    {
        ["image/jpeg"] = [".jpg", ".jpeg"], ["image/png"] = [".png"], ["image/webp"] = [".webp"], ["image/gif"] = [".gif"],
        ["application/pdf"] = [".pdf"], ["video/mp4"] = [".mp4"], ["audio/mpeg"] = [".mp3"], ["text/plain"] = [".txt"]
    };

    /// <summary>Upload. Stores bytes in object storage and metadata + SHA-256 in the database (the prototype's assets capability).</summary>
    [HttpPost("files"), RequestSizeLimit(21 * 1024 * 1024), Authorize(Policy = Policies.CanContribute)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file.Length == 0) return BadRequest(new { error = "Empty file." });
        if (file.Length > 20 * 1024 * 1024) return BadRequest(new { error = $"{file.FileName} is over 20 MB. Upload video to YouTube and add the link instead." });
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!Allowed.TryGetValue(file.ContentType, out var exts) || !exts.Contains(ext)) return BadRequest(new { error = "This file type is not accepted (photos, PDF, MP4, MP3, text)." });
        var id = Guid.NewGuid();
        await using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var sum = Convert.ToHexString(SHA256.HashData(ms.ToArray())).ToLowerInvariant();
        ms.Position = 0;
        var key = $"{DateTime.UtcNow:yyyy/MM}/{id:N}{ext}";
        await storage.PutAsync(key, ms, file.ContentType);
        var f = new StoredFile { Id = id, StorageKey = key, Name = Path.GetFileName(file.FileName), ContentType = file.ContentType, Size = file.Length, Sha256 = sum, UploadedBy = Uid };
        db.Files.Add(f);
        await db.SaveChangesAsync();
        return Ok(new { f.Id, f.Name, f.ContentType, f.Size, f.Sha256, url = "/api/files/" + f.Id });
    }

    [HttpPost("events/{id}/media"), Authorize(Policy = Policies.CanContribute)]
    public async Task<IActionResult> AddMedia(string id, MediaLinkDto d)
    {
        if (!await db.Events.AnyAsync(e => e.Id == id)) return NotFound();
        if (string.IsNullOrWhiteSpace(d.Credit)) return BadRequest(new { error = "Add the photographer or source first, so the credit stays with the file." });
        if (d.Url == null && d.FileId == null) return BadRequest(new { error = "Paste a video link, or upload a file." });
        if (!HttpsOk(d.Url)) return BadRequest(new { error = "Links must start with https://" });
        var m = new MediaItem { EventId = id, OwnerId = Uid, Credit = d.Credit.Trim(), Caption = d.Caption?.Trim() };
        if (d.FileId != null)
        {
            if (!Guid.TryParse(d.FileId, out var fid)) return BadRequest(new { error = "Bad file id." });
            var f = await db.Files.FirstOrDefaultAsync(x => x.Id == fid && x.UploadedBy == Uid);
            if (f == null) return BadRequest(new { error = "File not found." });
            m.FileId = fid; m.Kind = f.ContentType.StartsWith("video/") ? "video" : "image";
        }
        else { m.Kind = "link"; m.Url = d.Url; m.Caption = string.IsNullOrEmpty(m.Caption) ? (d.Url!.Contains("youtu") ? "Watch on YouTube" : "Watch the video") : m.Caption; }
        db.Media.Add(m);
        await db.SaveChangesAsync();
        return Ok(m);
    }

    [HttpDelete("media/{id:guid}")]
    public async Task<IActionResult> DeleteMedia(Guid id)
    {
        var m = await db.Media.FindAsync(id);
        if (m == null) return NotFound();
        var editor = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Editor);
        if (m.OwnerId != Uid && !editor) return Forbid();
        if (m.FileId is { } fid && await db.Files.FindAsync(fid) is { } f) { if (f.StorageKey != "") await storage.DeleteAsync(f.StorageKey); db.Files.Remove(f); }
        db.Media.Remove(m);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
