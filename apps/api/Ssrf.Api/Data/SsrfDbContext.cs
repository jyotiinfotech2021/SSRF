using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Ssrf.Api.Domain;

namespace Ssrf.Api.Data;

public class SsrfDbContext(DbContextOptions<SsrfDbContext> options) : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Source> Sources => Set<Source>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<Claim> Claims => Set<Claim>();
    public DbSet<ClaimCitation> ClaimCitations => Set<ClaimCitation>();
    public DbSet<Entity> Entities => Set<Entity>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Story> Stories => Set<Story>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Place> Places => Set<Place>();
    public DbSet<EventItem> Events => Set<EventItem>();
    public DbSet<ArchiveItem> Archive => Set<ArchiveItem>();
    public DbSet<QuizQuestion> Quiz => Set<QuizQuestion>();
    public DbSet<SiteSetting> Site => Set<SiteSetting>();
    public DbSet<Member> Members => Set<Member>();
    public DbSet<MemberPrivate> MemberPrivates => Set<MemberPrivate>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<Revision> Revisions => Set<Revision>();
    public DbSet<StoredFile> Files => Set<StoredFile>();
    public DbSet<MediaItem> Media => Set<MediaItem>();
    public DbSet<ArchiveFile> ArchiveFiles => Set<ArchiveFile>();
    public DbSet<Salute> Salutes => Set<Salute>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<LegacyRecord> LegacyRecords => Set<LegacyRecord>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.Entity<Source>().HasKey(x => x.Id);
        b.Entity<Campaign>().Property(x => x.Data).HasColumnType("jsonb");
        b.Entity<Claim>().HasMany(c => c.Citations).WithOne().HasForeignKey(c => c.ClaimId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Claim>().HasIndex(c => c.Scope);
        // No FK on SourceId on purpose: historical records may cite ids that no longer exist. Orphans are reported by the validator, never dropped.
        b.Entity<ClaimCitation>().HasIndex(c => c.SourceId);
        b.Entity<Entity>().Property(x => x.Data).HasColumnType("jsonb");
        b.Entity<Story>().ToTable("Stories");
        b.Entity<Book>().ToTable("Books");
        b.Entity<Place>().ToTable("Places");
        b.Entity<EventItem>().ToTable("Events");
        b.Entity<ArchiveItem>().ToTable("ArchiveItems");
        foreach (var t in new[] { typeof(Story), typeof(Book), typeof(Place), typeof(EventItem), typeof(ArchiveItem) })
        {
            var e = b.Entity(t);
            e.HasKey("Id");
            e.Property("Data").HasColumnType("jsonb");
            e.HasIndex("Status");
            e.HasIndex("AuthorId");
        }
        b.Entity<EventItem>().HasIndex(x => x.Date);
        b.Entity<QuizQuestion>().HasKey(x => x.Id);
        b.Entity<SiteSetting>().HasKey(x => x.Key);
        b.Entity<SiteSetting>().Property(x => x.Data).HasColumnType("jsonb");
        b.Entity<Member>().HasKey(x => x.Id);
        b.Entity<MemberPrivate>().HasKey(x => x.Id);
        b.Entity<Submission>().Property(x => x.Data).HasColumnType("jsonb");
        b.Entity<Submission>().Property(x => x.History).HasColumnType("jsonb");
        b.Entity<Submission>().HasIndex(x => new { x.Status, x.Kind });
        b.Entity<Submission>().HasIndex(x => x.OwnerId);
        b.Entity<Revision>().HasIndex(x => x.Target);
        b.Entity<StoredFile>().HasIndex(x => x.Sha256);
        b.Entity<MediaItem>().HasIndex(x => x.EventId);
        b.Entity<ArchiveFile>().HasIndex(x => x.ArchiveItemId);
        b.Entity<Salute>().HasKey(x => new { x.UserId, x.StoryId });
        b.Entity<Attendance>().HasKey(x => new { x.UserId, x.EventId });
        b.Entity<LegacyRecord>().Property(x => x.Json).HasColumnType("jsonb");
        b.Entity<LegacyRecord>().HasIndex(x => new { x.Collection, x.DocPath });
    }
}
