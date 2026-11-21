namespace Ssrf.Api.Services;

/// <summary>Object storage abstraction. Local disk for development; add an S3-compatible provider for production.</summary>
public interface IObjectStorage
{
    Task PutAsync(string key, Stream data, string contentType, CancellationToken ct = default);
    Task<Stream?> OpenAsync(string key, CancellationToken ct = default);
    Task DeleteAsync(string key, CancellationToken ct = default);
}

public class LocalDiskStorage : IObjectStorage
{
    private readonly string _root;

    public LocalDiskStorage(IConfiguration cfg)
    {
        _root = Path.GetFullPath(cfg["Storage:LocalPath"] ?? "storage");
        Directory.CreateDirectory(_root);
    }

    private string Resolve(string key)
    {
        var p = Path.GetFullPath(Path.Combine(_root, key));
        if (!p.StartsWith(_root, StringComparison.Ordinal)) throw new InvalidOperationException("Invalid storage key");
        return p;
    }

    public async Task PutAsync(string key, Stream data, string contentType, CancellationToken ct = default)
    {
        var p = Resolve(key);
        Directory.CreateDirectory(Path.GetDirectoryName(p)!);
        await using var f = File.Create(p);
        await data.CopyToAsync(f, ct);
    }

    public Task<Stream?> OpenAsync(string key, CancellationToken ct = default)
    {
        var p = Resolve(key);
        return Task.FromResult<Stream?>(File.Exists(p) ? File.OpenRead(p) : null);
    }

    public Task DeleteAsync(string key, CancellationToken ct = default)
    {
        var p = Resolve(key);
        if (File.Exists(p)) File.Delete(p);
        return Task.CompletedTask;
    }
}
