using System.Net;
using System.Net.Mail;

namespace Ssrf.Api.Services;

/// <summary>Sends transactional email (password reset). Swap the implementation without touching callers.</summary>
public interface IEmailSender
{
    /// <summary>True when mail can really be delivered. The UI uses this to be honest with people.</summary>
    bool IsConfigured { get; }
    Task SendAsync(string to, string subject, string textBody, CancellationToken ct = default);
}

/// <summary>SMTP delivery. Configure with Smtp:Host, Smtp:Port, Smtp:User, Smtp:Password, Smtp:From, Smtp:EnableSsl (environment variables Smtp__Host etc.).</summary>
public class SmtpEmailSender(IConfiguration cfg) : IEmailSender
{
    public bool IsConfigured => true;
    public async Task SendAsync(string to, string subject, string textBody, CancellationToken ct = default)
    {
        var host = cfg["Smtp:Host"]!;
        var port = cfg.GetValue("Smtp:Port", 587);
        var from = cfg["Smtp:From"] ?? cfg["Smtp:User"] ?? "no-reply@localhost";
        using var client = new SmtpClient(host, port) { EnableSsl = cfg.GetValue("Smtp:EnableSsl", port != 25 && port != 2525) };
        if (!string.IsNullOrEmpty(cfg["Smtp:User"])) client.Credentials = new NetworkCredential(cfg["Smtp:User"], cfg["Smtp:Password"]);
        using var msg = new MailMessage(new MailAddress(from, "Sagat Singh Research Foundation"), new MailAddress(to)) { Subject = subject, Body = textBody, IsBodyHtml = false };
        await client.SendMailAsync(msg, ct);
    }
}

/// <summary>Used when no SMTP server is configured: nothing is delivered, and the log says so.</summary>
public class NoEmailSender(ILogger<NoEmailSender> log) : IEmailSender
{
    public bool IsConfigured => false;
    public Task SendAsync(string to, string subject, string textBody, CancellationToken ct = default)
    {
        log.LogWarning("Email NOT sent (Smtp:Host is not configured). Subject: {Subject}", subject);
        return Task.CompletedTask;
    }
}
