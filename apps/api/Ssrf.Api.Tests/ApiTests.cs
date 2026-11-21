using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql;
using Xunit;

namespace Ssrf.Api.Tests;

/// <summary>Spins up the real API against a throw-away PostgreSQL database (TEST_PG, default the dev container) and drops it afterwards.</summary>
public class ApiFixture : IAsyncLifetime
{
    public WebApplicationFactory<Program> Factory = null!;
    private string _admin = "";
    private string _db = "";
    public const string AdminEmail = "admin@tests.invalid";
    public const string Pw = "Test-passw0rd-long";

    public async Task InitializeAsync()
    {
        var baseCs = Environment.GetEnvironmentVariable("TEST_PG") ?? "Host=localhost;Port=25432;Username=postgres;Password=devpass-local";
        _admin = baseCs + ";Database=postgres";
        _db = "ssrf_test_" + Guid.NewGuid().ToString("N")[..10];
        await using (var c = new NpgsqlConnection(_admin)) { await c.OpenAsync(); await new NpgsqlCommand($"CREATE DATABASE {_db}", c).ExecuteNonQueryAsync(); }
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", baseCs + ";Database=" + _db);
        Environment.SetEnvironmentVariable("Bootstrap__AdminEmail", AdminEmail);
        Environment.SetEnvironmentVariable("Database__MigrateOnStartup", "true");
        Environment.SetEnvironmentVariable("RateLimit__AuthPerMinute", "10000"); // all tests share one IP; production keeps the default of 20
        Environment.SetEnvironmentVariable("Storage__LocalPath", Path.Combine(Path.GetTempPath(), _db));
        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.UseEnvironment("Development"));
        _ = Factory.Server; // start (runs migrations)
    }

    public async Task DisposeAsync()
    {
        Factory.Dispose();
        NpgsqlConnection.ClearAllPools();
        await using var c = new NpgsqlConnection(_admin); await c.OpenAsync();
        await new NpgsqlCommand($"DROP DATABASE IF EXISTS {_db} WITH (FORCE)", c).ExecuteNonQueryAsync();
    }

    public HttpClient NewClient(bool csrf = true)
    {
        var c = Factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        if (csrf) c.DefaultRequestHeaders.Add("X-Requested-With", "tests");
        return c;
    }

    public async Task<(HttpClient c, string id)> Register(string email, params string[] _)
    {
        var c = NewClient();
        var r = await c.PostAsJsonAsync("/api/auth/register", new { email, password = Pw });
        r.EnsureSuccessStatusCode();
        var id = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;
        return (c, id);
    }

    public async Task<HttpClient> Admin()
    {
        var c = NewClient();
        var r = await c.PostAsJsonAsync("/api/auth/login", new { email = AdminEmail, password = Pw });
        if (r.StatusCode == HttpStatusCode.Unauthorized) (await c.PostAsJsonAsync("/api/auth/register", new { email = AdminEmail, password = Pw })).EnsureSuccessStatusCode();
        return c;
    }

    public async Task GrantRole(HttpClient admin, string userId, params string[] roles)
        => (await admin.PutAsJsonAsync($"/api/editorial/users/{userId}/roles", new { roles })).EnsureSuccessStatusCode();

    public static string SnapshotPath()
    {
        var d = AppContext.BaseDirectory;
        while (d != null && !Directory.Exists(Path.Combine(d, "prototype"))) d = Path.GetDirectoryName(d);
        return Path.Combine(d!, "prototype", "ssrf-portal-source", "src", "snapshot.json");
    }
}

[CollectionDefinition("api")] public class ApiCollection : ICollectionFixture<ApiFixture>;

[Collection("api")]
public class SecurityTests(ApiFixture fx)
{
    [Fact]
    public async Task Anonymous_cannot_reach_editorial_endpoints()
    {
        var c = fx.NewClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/editorial/queue")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/editorial/backup/json")).StatusCode);
    }

    [Fact]
    public async Task State_changing_calls_need_the_csrf_header()
    {
        var c = fx.NewClient(csrf: false);
        var r = await c.PostAsJsonAsync("/api/auth/login", new { email = "x@y.z", password = "whatever-long-1" });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    [Fact]
    public async Task Weak_passwords_are_rejected()
    {
        var c = fx.NewClient();
        var r = await c.PostAsJsonAsync("/api/auth/register", new { email = "weak@tests.invalid", password = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    [Fact]
    public async Task Sign_up_needs_only_email_and_a_plain_8_character_password_and_signs_the_person_in()
    {
        var c = fx.NewClient();
        var r = await c.PostAsJsonAsync("/api/auth/register", new { email = "easy@tests.invalid", password = "sunrise over bikaner" }); // no digit, capital or symbol
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var me = await c.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal("easy@tests.invalid", me.GetProperty("email").GetString()); // already signed in, no second step
    }

    [Fact]
    public async Task Duplicate_email_and_very_common_passwords_get_clear_errors()
    {
        await fx.Register("dupe@tests.invalid");
        var again = await fx.NewClient().PostAsJsonAsync("/api/auth/register", new { email = "dupe@tests.invalid", password = ApiFixture.Pw });
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Contains("Sign in instead", await again.Content.ReadAsStringAsync());
        var common = await fx.NewClient().PostAsJsonAsync("/api/auth/register", new { email = "common@tests.invalid", password = "password1" });
        Assert.Equal(HttpStatusCode.BadRequest, common.StatusCode);
        Assert.Contains("too easy to guess", await common.Content.ReadAsStringAsync());
        var seven = await fx.NewClient().PostAsJsonAsync("/api/auth/register", new { email = "seven@tests.invalid", password = "abcdefg" });
        Assert.Equal(HttpStatusCode.BadRequest, seven.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_gives_one_generic_message()
    {
        await fx.Register("generic@tests.invalid");
        var wrongPw = await fx.NewClient().PostAsJsonAsync("/api/auth/login", new { email = "generic@tests.invalid", password = "not-the-password" });
        var noUser = await fx.NewClient().PostAsJsonAsync("/api/auth/login", new { email = "nobody@tests.invalid", password = "not-the-password" });
        Assert.Equal(HttpStatusCode.Unauthorized, wrongPw.StatusCode);
        Assert.Equal(await wrongPw.Content.ReadAsStringAsync(), await noUser.Content.ReadAsStringAsync()); // does not reveal which accounts exist
    }

    [Fact]
    public async Task Member_cannot_use_editorial_or_contribute_without_the_role()
    {
        var (m, _) = await fx.Register("plain-member@tests.invalid");
        Assert.Equal(HttpStatusCode.Forbidden, (await m.GetAsync("/api/editorial/queue")).StatusCode);
        var r = await m.PostAsJsonAsync("/api/submissions", new { kind = "story", data = new { title = "t", body = "b", consent = true } });
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        // but any member may suggest a correction
        var ok = await m.PostAsJsonAsync("/api/submissions", new { kind = "correction", data = new { target = "claims/goa-1", text = "x", source = "book p.1", title = "t" } });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
    }

    [Fact]
    public async Task Admin_cannot_remove_their_own_admin_role()
    {
        var admin = await fx.Admin();
        var me = await admin.GetFromJsonAsync<JsonElement>("/api/auth/me");
        var r = await admin.PutAsJsonAsync($"/api/editorial/users/{me.GetProperty("id").GetString()}/roles", new { roles = new[] { "Member" } });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }
}

[Collection("api")]
public class MigrationTests(ApiFixture fx)
{
    private static int Count(JsonElement rep, string bucket, string k) => rep.GetProperty(bucket).TryGetProperty(k, out var v) ? v.GetInt32() : 0;

    [Fact]
    public async Task Snapshot_import_keeps_every_record_and_is_idempotent()
    {
        var admin = await fx.Admin();
        var json = await File.ReadAllTextAsync(ApiFixture.SnapshotPath());
        var snap = JsonDocument.Parse(json).RootElement;
        var expected = new Dictionary<string, int> { ["claims"] = snap.GetProperty("claims").GetArrayLength(), ["campaigns"] = snap.GetProperty("campaigns").GetArrayLength(), ["entities"] = snap.GetProperty("entities").GetArrayLength(), ["chapters"] = snap.GetProperty("chapters").GetArrayLength(), ["sources"] = snap.GetProperty("sources").EnumerateObject().Count() };

        var r1 = await admin.PostAsync("/api/editorial/import", new StringContent(json, Encoding.UTF8, "application/json"));
        r1.EnsureSuccessStatusCode();
        var rep = await r1.Content.ReadFromJsonAsync<JsonElement>();
        foreach (var (k, n) in expected) Assert.Equal(n, Count(rep, "imported", k) + Count(rep, "alreadyPresent", k)); // tests share one database, so another test may have imported first
        Assert.Equal(0, rep.GetProperty("errors").GetArrayLength());

        // second run: nothing new, nothing overwritten
        var rep2 = await (await admin.PostAsync("/api/editorial/import", new StringContent(json, Encoding.UTF8, "application/json"))).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Empty(rep2.GetProperty("imported").EnumerateObject());
        foreach (var (k, n) in expected) Assert.Equal(n, Count(rep2, "alreadyPresent", k));

        // content is served
        var claims = await fx.NewClient().GetFromJsonAsync<JsonElement>("/api/claims?scope=goa");
        Assert.True(claims.GetArrayLength() > 0);
        Assert.True(claims[0].GetProperty("citations").GetArrayLength() > 0);
    }

    [Fact]
    public async Task Full_backup_import_maps_content_private_data_and_flags_orphan_citations()
    {
        var admin = await fx.Admin();
        var backup = """
        { "format":"SSRF database backup","version":3,"collections":{
          "sources":[{"id":"s1","author":"A","title":"T","nature":"Primary source"}],
          "claims":[{"id":"c-orphan","scope":"life","heading":"H","text":"X","assessment":"documented","status":"settled","cites":[{"s":"s1","loc":"p1"},{"s":"gone","loc":"p2"}]}],
          "stories":[{"id":"st1","title":"S","body":"B","authorId":"u-legacy","authorName":"A member","status":"published","kind":"Memoir","era":"Goa 1961","extraField":"kept","camps":["goa"],"createdAt":"2026-01-02T03:04:05Z"}],
          "books":[{"id":"b1","title":"Bk","kind":"Book","status":"checking","description":"D"}],
          "places":[{"id":"p1","title":"Pl","kind":"Statue","lat":"26.9","lng":"75.8","status":"verified"}],
          "events":[{"id":"e1","title":"Ev","type":"Research","date":"2026-12-01","description":"D"}],
          "archive":[{"id":"SSRF-PH-00001","title":"Photo","category":"Photograph","access":"Restricted","status":"checking","rights":"Public domain"}],
          "archiveFiles":[{"id":"SSRF-PH-00001","files":[{"assetId":"asset1","url":"/_blob/asset1","name":"a.jpg","type":"image/jpeg","size":10,"sha256":"abc"}]}],
          "members":[{"id":"u-legacy","name":"Listed Person","category":"Research member"}],
          "memberPrivate":[{"id":"u-legacy","name":"Listed Person","listed":true,"adult":true},{"id":"u-hidden","name":"Hidden Person","listed":false,"adult":true}],
          "revisions":[{"id":"r1","action":"Edited","target":"claims/c-orphan","by":"u-legacy","at":"2026-01-01T00:00:00Z","before":"old","after":"new"}],
          "salutes":[{"id":"u-legacy","sids":["st1"]}],
          "subs":[{"id":"u-legacy","items":[{"id":"sub1","kind":"story","status":"approval","createdAt":"2026-01-02T00:00:00Z","data":{"title":"Pending"},"history":[{"at":"2026-01-02T00:00:00Z","by":"u-legacy","status":"submitted"}],"note":"keep me"}]}]
        }}
        """;
        var rep = await (await admin.PostAsync("/api/editorial/import", new StringContent(backup, Encoding.UTF8, "application/json"))).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, rep.GetProperty("errors").GetArrayLength());
        var imported = rep.GetProperty("imported");
        foreach (var k in new[] { "sources", "claims", "stories", "books", "places", "events", "archive", "members", "memberPrivate", "revisions", "subs", "salutes", "files" })
            Assert.True(imported.TryGetProperty(k, out var n) && n.GetInt32() >= 1, $"collection {k} was not imported");
        // orphan citation is flagged, not dropped
        Assert.Contains(rep.GetProperty("warnings").EnumerateArray(), w => w.GetString()!.Contains("gone"));
        var cl = (await fx.NewClient().GetFromJsonAsync<JsonElement>("/api/claims?scope=life")).EnumerateArray().First(c => c.GetProperty("id").GetString() == "c-orphan");
        Assert.Equal(2, cl.GetProperty("citations").GetArrayLength());

        var c = fx.NewClient();
        // story keeps unmapped fields
        var story = await c.GetFromJsonAsync<JsonElement>("/api/stories/st1");
        Assert.Equal("kept", story.GetProperty("data").GetProperty("extraField").GetString());
        // only the listed member is public; private profile never appears
        var members = await c.GetStringAsync("/api/members");
        Assert.Contains("Listed Person", members); Assert.DoesNotContain("Hidden Person", members);
        // pending submission keeps its review note and is not public
        Assert.DoesNotContain("Pending", await c.GetStringAsync("/api/stories"));
        var q = await admin.GetFromJsonAsync<JsonElement>("/api/editorial/queue?scope=open");
        var sub = q.GetProperty("items").EnumerateArray().First().GetProperty("submission");
        Assert.Equal("keep me", sub.GetProperty("data").GetProperty("_legacyReview").GetProperty("note").GetString());
        // restricted archive: catalogue public, files hidden from anonymous, visible to editors
        var anon = await c.GetFromJsonAsync<JsonElement>("/api/archive/SSRF-PH-00001");
        Assert.Equal(0, anon.GetProperty("files").GetArrayLength()); Assert.Equal(1, anon.GetProperty("fileCount").GetInt32());
        var ed = await admin.GetFromJsonAsync<JsonElement>("/api/archive/SSRF-PH-00001");
        Assert.Equal(1, ed.GetProperty("files").GetArrayLength());
        // re-run does not duplicate history-like collections
        var rep2 = await (await admin.PostAsync("/api/editorial/import", new StringContent(backup, Encoding.UTF8, "application/json"))).Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(rep2.GetProperty("imported").TryGetProperty("revisions", out _));
        Assert.False(rep2.GetProperty("imported").TryGetProperty("subs", out _));
    }
}

[Collection("api")]
public class EditorialWorkflowTests(ApiFixture fx)
{
    private static JsonContent Story(string title) => JsonContent.Create(new { kind = "story", data = new { title, body = "An account.", kind = "Memoir", prov = "first", attribution = "named", consent = true } });

    [Fact]
    public async Task Contribution_is_hidden_until_another_editor_publishes_it_with_conflict_confirmation()
    {
        var admin = await fx.Admin();
        var (contrib, cid) = await fx.Register("contrib@tests.invalid");
        await fx.GrantRole(admin, cid, "Contributor", "Member");
        var login = await contrib.PostAsJsonAsync("/api/auth/login", new { email = "contrib@tests.invalid", password = ApiFixture.Pw }); login.EnsureSuccessStatusCode();

        var sub = await (await contrib.PostAsync("/api/submissions", Story("Hidden until approved"))).Content.ReadFromJsonAsync<JsonElement>();
        var id = sub.GetProperty("id").GetString();
        Assert.DoesNotContain("Hidden until approved", await fx.NewClient().GetStringAsync("/api/stories"));

        // the author cannot review their own item (and has no editorial role anyway)
        Assert.Equal(HttpStatusCode.Forbidden, (await contrib.PostAsJsonAsync($"/api/editorial/submissions/{id}/decide", new { action = "publish", noConflict = true })).StatusCode);

        // an editor must confirm no conflict of interest
        var noConfirm = await admin.PostAsJsonAsync($"/api/editorial/submissions/{id}/decide", new { action = "publish", note = "ok", noConflict = false });
        Assert.Equal(HttpStatusCode.BadRequest, noConfirm.StatusCode);
        // sending back for evidence needs a note
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/editorial/submissions/{id}/decide", new { action = "evidence", note = "", noConflict = true })).StatusCode);

        var pub = await admin.PostAsJsonAsync($"/api/editorial/submissions/{id}/decide", new { action = "publish", note = "checked", noConflict = true, assessment = "attributed" });
        pub.EnsureSuccessStatusCode();
        var story = (await fx.NewClient().GetFromJsonAsync<JsonElement>("/api/stories")).EnumerateArray().First(s => s.GetProperty("title").GetString() == "Hidden until approved");
        Assert.Equal("attributed", story.GetProperty("assessment").GetString());
        Assert.Equal("Oral history", story.GetProperty("nature").GetString()); // first-hand recollection stays labelled as such, not as documented fact
        // decision is in the revision log
        var log = await admin.GetFromJsonAsync<JsonElement>("/api/revisions");
        Assert.Contains(log.EnumerateArray(), r => r.GetProperty("action").GetString()!.StartsWith("Published"));
    }

    [Fact]
    public async Task Editor_cannot_verify_their_own_entry_and_cannot_review_their_own_contribution()
    {
        var admin = await fx.Admin();
        var me = (await admin.GetFromJsonAsync<JsonElement>("/api/auth/me")).GetProperty("id").GetString();
        // the admin contributes a place and tries to review it themselves
        var sub = await (await admin.PostAsJsonAsync("/api/submissions", new { kind = "place", data = new { title = "Own memorial", kind = "Statue", description = "d" } })).Content.ReadFromJsonAsync<JsonElement>();
        var r = await admin.PostAsJsonAsync($"/api/editorial/submissions/{sub.GetProperty("id").GetString()}/decide", new { action = "publish", note = "x", noConflict = true });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Contains("own contribution", await r.Content.ReadAsStringAsync());
        Assert.NotNull(me);
    }

    [Fact]
    public async Task Correction_can_be_applied_and_leaves_a_before_after_revision()
    {
        var admin = await fx.Admin();
        await admin.PostAsync("/api/editorial/import", new StringContent(await File.ReadAllTextAsync(ApiFixture.SnapshotPath()), Encoding.UTF8, "application/json"));
        var originalText = (await fx.NewClient().GetFromJsonAsync<JsonElement>("/api/claims?scope=goa")).EnumerateArray().First(c => c.GetProperty("id").GetString() == "goa-1").GetProperty("text").GetString();
        var (member, _) = await fx.Register("corrector@tests.invalid");
        var sub = await (await member.PostAsJsonAsync("/api/submissions", new { kind = "correction", data = new { target = "claims/goa-1", title = "t", text = "Better text", source = "Book p.65" } })).Content.ReadFromJsonAsync<JsonElement>();
        var id = sub.GetProperty("id").GetString();
        var r = await admin.PostAsJsonAsync($"/api/editorial/submissions/{id}/decide", new { action = "apply", note = "Verified against the book", noConflict = true, newText = "Better text" });
        r.EnsureSuccessStatusCode();
        var claim = (await fx.NewClient().GetFromJsonAsync<JsonElement>("/api/claims?scope=goa")).EnumerateArray().First(c => c.GetProperty("id").GetString() == "goa-1");
        Assert.Equal("Better text", claim.GetProperty("text").GetString());
        var hist = await fx.NewClient().GetFromJsonAsync<JsonElement>("/api/revisions?target=claims/goa-1");
        var rev = hist.EnumerateArray().First();
        Assert.Equal(originalText, rev.GetProperty("before").GetString());
        Assert.Equal("Better text", rev.GetProperty("after").GetString());
    }

    [Fact]
    public async Task Claim_edit_rejects_unknown_sources_and_unknown_evidence_classes()
    {
        var admin = await fx.Admin();
        await admin.PostAsync("/api/editorial/import", new StringContent(await File.ReadAllTextAsync(ApiFixture.SnapshotPath()), Encoding.UTF8, "application/json"));
        var body = (string cls, string src) => new { heading = "h", text = "t", assessment = cls, status = "settled", cites = new[] { new { s = src, loc = "p1" } }, reason = "r" };
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync("/api/editorial/claims/goa-1", body("documented", "no-such-source"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PutAsJsonAsync("/api/editorial/claims/goa-1", body("definitely-true", "book"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PutAsJsonAsync("/api/editorial/claims/goa-1", body("corroborated", "book"))).StatusCode);
    }

    [Fact]
    public async Task Private_profile_is_not_exposed_and_unlisting_removes_the_public_entry()
    {
        var (m, id) = await fx.Register("private-person@tests.invalid");
        var profile = new { name = "Private Person", category = "Research member", listed = true, showChapter = false, showContrib = false, adult = true, photoConsent = false, camps = Array.Empty<string>() };
        (await m.PutAsJsonAsync("/api/me/profile", profile)).EnsureSuccessStatusCode();
        Assert.Contains("Private Person", await fx.NewClient().GetStringAsync("/api/members"));
        (await m.PutAsJsonAsync("/api/me/profile", profile with { listed = false })).EnsureSuccessStatusCode();
        Assert.DoesNotContain("Private Person", await fx.NewClient().GetStringAsync("/api/members"));
        Assert.Equal(HttpStatusCode.Unauthorized, (await fx.NewClient().GetAsync($"/api/editorial/members/{id}/private")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await m.GetAsync($"/api/editorial/members/{id}/private")).StatusCode);
        // under-18 or unconfirmed adult is refused
        Assert.Equal(HttpStatusCode.BadRequest, (await m.PutAsJsonAsync("/api/me/profile", profile with { adult = false })).StatusCode);
    }
}
