using Npgsql;

namespace Ssrf.Api.Services;

/// <summary>
/// Reads deployment settings from the environment the way hosting platforms provide them, so the same image runs on Docker Compose,
/// Railway, Render, Fly and similar without code changes.
/// </summary>
public static class DeployEnv
{
    /// <summary>
    /// The PostgreSQL connection string, in order of preference: ConnectionStrings__Default, DATABASE_URL (or POSTGRES_URL) in
    /// postgres://user:password@host:port/database form, then the separate PGHOST, PGPORT, PGDATABASE, PGUSER and PGPASSWORD variables.
    /// </summary>
    public static string ConnectionString(IConfiguration cfg)
    {
        var explicitCs = cfg.GetConnectionString("Default");
        if (!string.IsNullOrWhiteSpace(explicitCs)) return explicitCs;

        var url = cfg["DATABASE_URL"] ?? cfg["POSTGRES_URL"];
        if (!string.IsNullOrWhiteSpace(url)) return FromUrl(url);

        var host = cfg["PGHOST"];
        if (!string.IsNullOrWhiteSpace(host))
            return new NpgsqlConnectionStringBuilder
            {
                Host = host, Port = int.TryParse(cfg["PGPORT"], out var p) ? p : 5432, Database = cfg["PGDATABASE"] ?? "postgres",
                Username = cfg["PGUSER"] ?? "postgres", Password = cfg["PGPASSWORD"],
            }.ConnectionString;

        throw new InvalidOperationException("No database is configured. Set DATABASE_URL (postgres://user:password@host:port/database), or ConnectionStrings__Default, or PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD.");
    }

    public static string FromUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var u) || (u.Scheme != "postgres" && u.Scheme != "postgresql"))
            throw new InvalidOperationException("DATABASE_URL must look like postgres://user:password@host:port/database.");
        var userInfo = u.UserInfo.Split(':', 2);
        return new NpgsqlConnectionStringBuilder
        {
            Host = u.Host, Port = u.Port > 0 ? u.Port : 5432, Database = u.AbsolutePath.Trim('/'),
            Username = Uri.UnescapeDataString(userInfo[0]), Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
        }.ConnectionString;
    }

    /// <summary>The port to listen on when the platform provides one (PORT); null keeps the image default (8080).</summary>
    public static string? Port(IConfiguration cfg) => int.TryParse(cfg["PORT"], out var p) && p is > 0 and < 65536 ? p.ToString() : null;
}
