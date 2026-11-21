using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using System.Text;
using Ssrf.Api.Domain;
using Ssrf.Api.Services;
using Microsoft.Extensions.Caching.Memory;

namespace Ssrf.Api.Controllers;

public record RegisterDto([Required, EmailAddress, MaxLength(256)] string Email, [Required, MinLength(8), MaxLength(128)] string Password);
public record LoginDto([Required] string Email, [Required] string Password);
public record ForgotDto([Required, EmailAddress, MaxLength(256)] string Email);
public record ResetDto([Required, EmailAddress] string Email, [Required] string Token, [Required, MinLength(8), MaxLength(128)] string Password);

[ApiController, Route("api/auth")]
public class AuthController(UserManager<AppUser> users, SignInManager<AppUser> signIn, IConfiguration cfg, IEmailSender mail, ILogger<AuthController> log, Microsoft.Extensions.Caching.Memory.IMemoryCache cache) : ControllerBase
{
    private async Task<object> Describe(AppUser u) => new
    {
        id = u.Id, email = u.Email, roles = await users.GetRolesAsync(u),
        legacyUid = u.LegacyUid
    };

    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    { "password", "password1", "12345678", "123456789", "1234567890", "qwertyui", "qwerty123", "11111111", "iloveyou", "abc12345", "admin123", "welcome1", "letmein1" };
    private static bool TooCommon(string pw, string email) =>
        Common.Contains(pw) || pw.Equals(email, StringComparison.OrdinalIgnoreCase) || pw.Distinct().Count() < 3;

    [HttpPost("register"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (await users.FindByEmailAsync(dto.Email) != null)
            return Conflict(new { error = "An account with this email already exists. Sign in instead.", code = "exists" });
        if (TooCommon(dto.Password, dto.Email))
            return BadRequest(new { error = "That password is too easy to guess. Try a longer one, or a few words together." });
        var u = new AppUser { UserName = dto.Email, Email = dto.Email };
        var r = await users.CreateAsync(u, dto.Password);
        if (!r.Succeeded) return BadRequest(new { errors = r.Errors.Select(e => e.Description) });
        // The first admin is named in configuration (Bootstrap:AdminEmail), never hardcoded.
        var admin = cfg["Bootstrap:AdminEmail"];
        var roles = !string.IsNullOrEmpty(admin) && string.Equals(admin, dto.Email, StringComparison.OrdinalIgnoreCase)
            ? new[] { Roles.Admin, Roles.Member } : new[] { Roles.Member };
        await users.AddToRolesAsync(u, roles);
        await signIn.SignInAsync(u, isPersistent: true);
        return Ok(await Describe(u));
    }

    [HttpPost("login"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var u = await users.FindByEmailAsync(dto.Email);
        if (u == null) return Unauthorized(new { error = "Email or password is not correct." });
        var res = await signIn.PasswordSignInAsync(u, dto.Password, isPersistent: true, lockoutOnFailure: true);
        if (res.IsLockedOut) return StatusCode(423, new { error = "Too many attempts. Try again in 15 minutes." });
        if (!res.Succeeded) return Unauthorized(new { error = "Email or password is not correct." });
        return Ok(await Describe(u));
    }

    /// <summary>Tells the UI whether password reset by email can work on this server.</summary>
    [HttpGet("capabilities")]
    public IActionResult Capabilities() => Ok(new { emailReset = mail.IsConfigured });

    private const string SameAnswer = "If an account exists for that email, we have sent a link to reset the password. It is valid for one day.";

    /// <summary>Always answers the same way, so it cannot be used to find out who has an account.</summary>
    [HttpPost("forgot"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Forgot(ForgotDto dto)
    {
        if (!mail.IsConfigured) return StatusCode(503, new { error = "Password reset by email is not set up on this server yet. Please contact the foundation.", code = "no-email" });
        var u = await users.FindByEmailAsync(dto.Email);
        // At most one reset email per address per minute, so the form cannot be used to flood someone's inbox.
        if (u != null && !cache.TryGetValue("forgot:" + dto.Email.ToLowerInvariant(), out _))
        {
            cache.Set("forgot:" + dto.Email.ToLowerInvariant(), true, TimeSpan.FromMinutes(1));
            try
            {
                var token = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(await users.GeneratePasswordResetTokenAsync(u)));
                var site = (cfg["Site:Url"] ?? cfg["SITE_URL"] ?? "https://sagatsingh.org").TrimEnd('/');
                var link = $"{site}/reset-password?email={Uri.EscapeDataString(dto.Email)}&token={token}";
                await mail.SendAsync(dto.Email, "Reset your password",
                    $"Hello,\n\nSomeone asked to reset the password for this email on the Sagat Singh Research Foundation site. If it was you, open this link within 24 hours:\n\n{link}\n\nIf it was not you, ignore this message. Your password stays the same.\n");
            }
            catch (Exception e) { log.LogError(e, "Could not send the password reset email"); }
        }
        return Ok(new { message = SameAnswer });
    }

    [HttpPost("reset"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Reset(ResetDto dto)
    {
        const string bad = "This reset link is not valid any more. Ask for a new one.";
        var u = await users.FindByEmailAsync(dto.Email);
        if (u == null) return BadRequest(new { error = bad });
        if (TooCommon(dto.Password, dto.Email))
            return BadRequest(new { error = "That password is too easy to guess. Try a longer one, or a few words together." });
        string token;
        try { token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(dto.Token)); } catch { return BadRequest(new { error = bad }); }
        var r = await users.ResetPasswordAsync(u, token, dto.Password);
        if (!r.Succeeded)
            return BadRequest(new { error = r.Errors.Any(e => e.Code == "InvalidToken") ? bad : string.Join(" ", r.Errors.Select(e => e.Description)) });
        await users.SetLockoutEndDateAsync(u, null); await users.ResetAccessFailedCountAsync(u);
        return Ok(new { message = "Your password has been changed. You can sign in now." });
    }

    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout() { await signIn.SignOutAsync(); return NoContent(); }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (User.Identity?.IsAuthenticated != true) return Ok(new { id = (Guid?)null });
        var u = await users.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return u == null ? Ok(new { id = (Guid?)null }) : Ok(await Describe(u));
    }
}
