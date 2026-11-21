using System.Text.Json;
using Microsoft.AspNetCore.Identity;

namespace Ssrf.Api.Domain;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Editor = "Editor";
    public const string Contributor = "Contributor";
    public const string Member = "Member";
    public static readonly string[] All = [Admin, Editor, Contributor, Member];
}

public static class Policies
{
    public const string Editorial = "Editorial";         // Admin or Editor
    public const string CanContribute = "CanContribute"; // Contributor, Editor, Admin
    public const string AdminOnly = "AdminOnly";
}

/// <summary>Authenticated account. Member profile ids equal the user id (the prototype keyed everything by uid).</summary>
public class AppUser : IdentityUser<Guid>
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Id the account had in the prototype, so imported contributions keep their owner.</summary>
    public string? LegacyUid { get; set; }
}

public class Source
{
    public string Id { get; set; } = "";
    public string Author { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Publisher { get; set; }
    public string? Date { get; set; }
    public string? Accessed { get; set; }
    /// <summary>Primary source | Oral history | Family testimony | Secondary research | Tertiary source</summary>
    public string Nature { get; set; } = "Secondary research";
    public string? Url { get; set; }
    public string? Note { get; set; }
}

public class Campaign
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Order { get; set; }
    /// <summary>Everything else the prototype stored on a campaign (background, chronology, command, lead ...), kept verbatim.</summary>
    public JsonDocument Data { get; set; } = JsonDocument.Parse("{}");
}

public class Claim
{
    public string Id { get; set; } = "";
    /// <summary>Campaign id or "life".</summary>
    public string Scope { get; set; } = "";
    public string Heading { get; set; } = "";
    public string? Year { get; set; }
    public string Text { get; set; } = "";
    /// <summary>documented | corroborated | attributed | unverified | disputed</summary>
    public string Assessment { get; set; } = "unverified";
    /// <summary>settled | resolved | open</summary>
    public string Status { get; set; } = "open";
    public string? Established { get; set; }
    public string? Unresolved { get; set; }
    public int Order { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<ClaimCitation> Citations { get; set; } = [];
}

public class ClaimCitation
{
    public int Id { get; set; }
    public string ClaimId { get; set; } = "";
    public string SourceId { get; set; } = "";
    public string? Loc { get; set; }
    public int Position { get; set; }
}

/// <summary>People and military units.</summary>
public class Entity
{
    public string Id { get; set; } = "";
    public string Type { get; set; } = "person";
    public string Name { get; set; } = "";
    public string? Role { get; set; }
    public string? Period { get; set; }
    public List<string> Camps { get; set; } = [];
    public List<string> Cites { get; set; } = [];
    public JsonDocument Data { get; set; } = JsonDocument.Parse("{}");
}

public class Chapter
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Order { get; set; }
    public List<string> Purpose { get; set; } = [];
    public string? Coordinator { get; set; }
    public bool Active { get; set; }
}

/// <summary>Base for member-contributed or editorial items that go through verification.</summary>
public abstract class ContentItem
{
    public string Id { get; set; } = "";
    public string? AuthorId { get; set; }
    public string? AuthorName { get; set; }
    public string Title { get; set; } = "";
    /// <summary>submitted | checking | evidence | verified | rejected | recheck (stories use "published").</summary>
    public string Status { get; set; } = "checking";
    public string? VerNote { get; set; }
    public string? Nature { get; set; }
    public string? Assessment { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? FromSub { get; set; }
    public List<string> Camps { get; set; } = [];
    /// <summary>All remaining prototype fields, verbatim (nothing is discarded on import).</summary>
    public JsonDocument Data { get; set; } = JsonDocument.Parse("{}");
}

public class Story : ContentItem { public string? Kind { get; set; } public string? Era { get; set; } public string? Body { get; set; } public string? Provenance { get; set; } }
public class Book : ContentItem { public string? Kind { get; set; } public string? Description { get; set; } }
public class Place : ContentItem { public string? Kind { get; set; } public string? Description { get; set; } public double? Lat { get; set; } public double? Lng { get; set; } }
public class EventItem : ContentItem { public string? Type { get; set; } public DateOnly? Date { get; set; } public string? Description { get; set; } }
public class ArchiveItem : ContentItem
{
    public string? Category { get; set; }
    public string? Collection { get; set; }
    public string? Description { get; set; }
    public string? Rights { get; set; }
    /// <summary>Public | Restricted</summary>
    public string Access { get; set; } = "Public";
    public string? Transcript { get; set; }
    public int PageCount { get; set; }
}

public class QuizQuestion
{
    public string Id { get; set; } = "";
    public int N { get; set; }
    public string Q { get; set; } = "";
    public List<string> Options { get; set; } = [];
    public int Answer { get; set; }
    public string? Explain { get; set; }
    public string? Hint { get; set; }
    public string? Source { get; set; }
    public string? Topic { get; set; }
    public string? Level { get; set; }
}

public class SiteSetting { public string Key { get; set; } = ""; public JsonDocument Data { get; set; } = JsonDocument.Parse("{}"); }

/// <summary>Public directory entry, only for members who opted to be listed.</summary>
public class Member
{
    public string Id { get; set; } = ""; // AppUser id (or legacy uid before claim)
    public string Name { get; set; } = "";
    public string? Title { get; set; }
    public string? Affiliation { get; set; }
    public string? Category { get; set; }
    public string? Chapter { get; set; }
    public bool ShowChapter { get; set; }
    public string? Connection { get; set; }
    public string? Interests { get; set; }
    public List<string> Camps { get; set; } = [];
    public bool ShowContrib { get; set; }
    public string? Photo { get; set; }
    public bool PhotoConsent { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Full private profile. Never exposed to other members; editors see it only in review.</summary>
public class MemberPrivate
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Title { get; set; }
    public string? Affiliation { get; set; }
    public string? Category { get; set; }
    public string? Chapter { get; set; }
    public string? Connection { get; set; }
    public string? Interests { get; set; }
    public List<string> Camps { get; set; } = [];
    public bool Listed { get; set; }
    public bool ShowChapter { get; set; }
    public bool ShowContrib { get; set; }
    public string? Photo { get; set; }
    public bool PhotoConsent { get; set; }
    public bool Adult { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A contribution awaiting editorial review: story, book, place, event, archive, correction, privacy request or access request.</summary>
public class Submission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = "";
    public string Kind { get; set; } = "";
    /// <summary>submitted | screening | research | factcheck | approval | evidence | published | rejected | resolved | withdrawn</summary>
    public string Status { get; set; } = "submitted";
    public string Priority { get; set; } = "Normal";
    public string? Assignee { get; set; }
    public DateOnly? Due { get; set; }
    public List<string> Coi { get; set; } = [];
    public JsonDocument Data { get; set; } = JsonDocument.Parse("{}");
    public JsonDocument History { get; set; } = JsonDocument.Parse("[]");
    public string? PublishedRef { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResubmittedAt { get; set; }
}

/// <summary>Append-only editorial log: edits, corrections, status decisions, deletions.</summary>
public class Revision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Action { get; set; } = "";
    /// <summary>"collection/id" or "collection/id#field"</summary>
    public string Target { get; set; } = "";
    public string? Title { get; set; }
    public string? Reason { get; set; }
    public string? ById { get; set; }
    public string? Before { get; set; }
    public string? After { get; set; }
    public DateTime At { get; set; } = DateTime.UtcNow;
}

/// <summary>Uploaded file metadata. Bytes live in IObjectStorage under StorageKey.</summary>
public class StoredFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string StorageKey { get; set; } = "";
    public string Name { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long Size { get; set; }
    public string Sha256 { get; set; } = "";
    public string? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? LegacyAssetId { get; set; }
    public string? LegacyUrl { get; set; }
    /// <summary>Restricted files are served only to editors.</summary>
    public bool Restricted { get; set; }
}

/// <summary>Photo, video or link attached to an event, with credit.</summary>
public class MediaItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EventId { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string Kind { get; set; } = "image";
    public Guid? FileId { get; set; }
    public string? Url { get; set; }
    public string? Caption { get; set; }
    public string? Credit { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Files attached to an archive item.</summary>
public class ArchiveFile
{
    public int Id { get; set; }
    public string ArchiveItemId { get; set; } = "";
    public Guid FileId { get; set; }
    public int Position { get; set; }
}

public class Salute { public string UserId { get; set; } = ""; public string StoryId { get; set; } = ""; }
public class Attendance { public string UserId { get; set; } = ""; public string EventId { get; set; } = ""; }

/// <summary>Lossless copy of every record in the prototype export, so nothing is discarded even when it did not map to a typed column.</summary>
public class LegacyRecord
{
    public int Id { get; set; }
    public string Collection { get; set; } = "";
    public string DocPath { get; set; } = "";
    public JsonDocument Json { get; set; } = JsonDocument.Parse("{}");
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
}
