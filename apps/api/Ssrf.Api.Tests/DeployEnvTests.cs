using Microsoft.Extensions.Configuration;
using Npgsql;
using Ssrf.Api.Services;
using Xunit;

namespace Ssrf.Api.Tests;

public class DeployEnvTests
{
    private static IConfiguration Cfg(params (string, string)[] kv) =>
        new ConfigurationBuilder().AddInMemoryCollection(kv.Select(x => new KeyValuePair<string, string?>(x.Item1, x.Item2))).Build();

    [Fact]
    public void DatabaseUrlIsConverted()
    {
        var b = new NpgsqlConnectionStringBuilder(DeployEnv.ConnectionString(Cfg(("DATABASE_URL", "postgresql://app:p%40ss%3Aw0rd@db.internal:5433/ssrf"))));
        Assert.Equal("db.internal", b.Host); Assert.Equal(5433, b.Port); Assert.Equal("ssrf", b.Database);
        Assert.Equal("app", b.Username); Assert.Equal("p@ss:w0rd", b.Password);
    }

    [Fact]
    public void ExplicitConnectionStringWins()
    {
        var cs = DeployEnv.ConnectionString(Cfg(("ConnectionStrings:Default", "Host=x;Database=y"), ("DATABASE_URL", "postgres://u:p@h/d")));
        Assert.Equal("Host=x;Database=y", cs);
    }

    [Fact]
    public void SeparatePgVariablesAreUsed()
    {
        var b = new NpgsqlConnectionStringBuilder(DeployEnv.ConnectionString(Cfg(("PGHOST", "h"), ("PGPORT", "6543"), ("PGDATABASE", "d"), ("PGUSER", "u"), ("PGPASSWORD", "pw"))));
        Assert.Equal("h", b.Host); Assert.Equal(6543, b.Port); Assert.Equal("d", b.Database); Assert.Equal("u", b.Username); Assert.Equal("pw", b.Password);
    }

    [Fact]
    public void MissingDatabaseGivesAClearError() =>
        Assert.Contains("DATABASE_URL", Assert.Throws<InvalidOperationException>(() => DeployEnv.ConnectionString(Cfg())).Message);

    [Fact]
    public void BadUrlIsRejected() => Assert.Throws<InvalidOperationException>(() => DeployEnv.FromUrl("mysql://u:p@h/d"));

    [Theory]
    [InlineData("8081", "8081")]
    [InlineData("abc", null)]
    [InlineData("0", null)]
    public void PortIsReadOnlyWhenValid(string port, string? expected) => Assert.Equal(expected, DeployEnv.Port(Cfg(("PORT", port))));
}
