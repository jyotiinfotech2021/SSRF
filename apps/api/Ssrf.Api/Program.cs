using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Ssrf.Api.Data;
using Ssrf.Api.Domain;
using Ssrf.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var cs = DeployEnv.ConnectionString(builder.Configuration);
// Hosting platforms hand over the port to listen on as PORT.
if (DeployEnv.Port(builder.Configuration) is { } listenPort) builder.WebHost.UseUrls($"http://+:{listenPort}");
// One shared data source (= one connection pool) for the whole process.
var dataSource = new NpgsqlDataSourceBuilder(cs).EnableDynamicJson().Build();
builder.Services.AddSingleton(dataSource);
builder.Services.AddDbContext<SsrfDbContext>(o => o.UseNpgsql(dataSource));

builder.Services.AddIdentity<AppUser, IdentityRole<Guid>>(o =>
{
    // Length is what matters (NIST 800-63B): no forced symbols, digits or capitals, so sign-up is quick.
    o.Password.RequiredLength = 8;
    o.Password.RequireNonAlphanumeric = false;
    o.Password.RequireDigit = false;
    o.Password.RequireLowercase = false;
    o.Password.RequireUppercase = false;
    o.User.RequireUniqueEmail = true;
    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
}).AddEntityFrameworkStores<SsrfDbContext>().AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(o =>
{
    o.Cookie.Name = "ssrf.auth";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsProduction() ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
    o.ExpireTimeSpan = TimeSpan.FromDays(14);
    o.SlidingExpiration = true;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});

builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.AdminOnly, p => p.RequireRole(Roles.Admin))
    .AddPolicy(Policies.Editorial, p => p.RequireRole(Roles.Admin, Roles.Editor))
    .AddPolicy(Policies.CanContribute, p => p.RequireRole(Roles.Admin, Roles.Editor, Roles.Contributor));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "x",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = builder.Configuration.GetValue("RateLimit:AuthPerMinute", 20), Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IObjectStorage, LocalDiskStorage>();
if (!string.IsNullOrWhiteSpace(builder.Configuration["Smtp:Host"])) builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
else builder.Services.AddSingleton<IEmailSender, NoEmailSender>();
builder.Services.AddScoped<EditorialService>();
builder.Services.AddScoped<LegacyImporter>();
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddHealthChecks();
builder.Services.AddOpenApi();

var app = builder.Build();

// Behind the web container / reverse proxy the real visitor address arrives in X-Forwarded-For. Only trust it when told to (Proxy:TrustForwardedHeaders=true).
if (app.Configuration.GetValue("Proxy:TrustForwardedHeaders", false))
{
    var fh = new Microsoft.AspNetCore.Builder.ForwardedHeadersOptions { ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto };
    fh.KnownIPNetworks.Clear(); fh.KnownProxies.Clear();
    app.UseForwardedHeaders(fh);
}

app.UseRateLimiter();
// CSRF defence in depth on top of SameSite=Strict: state-changing calls must carry a header a cross-site form cannot set.
app.Use(async (ctx, next) =>
{
    var m = ctx.Request.Method;
    if (!HttpMethods.IsGet(m) && !HttpMethods.IsHead(m) && !HttpMethods.IsOptions(m)
        && ctx.Request.Path.StartsWithSegments("/api") && !ctx.Request.Headers.ContainsKey("X-Requested-With"))
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsync("Missing X-Requested-With header");
        return;
    }
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["Referrer-Policy"] = "same-origin";
    await next();
});
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

if (app.Configuration.GetValue("Database:MigrateOnStartup", false))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<SsrfDbContext>().Database.MigrateAsync();
    var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    foreach (var r in Roles.All)
        if (!await roles.RoleExistsAsync(r)) await roles.CreateAsync(new IdentityRole<Guid>(r));
}
app.Run();

public partial class Program;
