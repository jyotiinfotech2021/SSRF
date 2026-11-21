using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Ssrf.Api.Domain;

namespace Ssrf.Api.Controllers;

public record RegisterDto([Required, EmailAddress, MaxLength(256)] string Email, [Required, MinLength(8), MaxLength(128)] string Password);
public record LoginDto([Required] string Email, [Required] string Password);

[ApiController, Route("api/auth"), EnableRateLimiting("auth")]
public class AuthController(UserManager<AppUser> users, SignInManager<AppUser> signIn, IConfiguration cfg) : ControllerBase
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

    [HttpPost("register")]
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

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var u = await users.FindByEmailAsync(dto.Email);
        if (u == null) return Unauthorized(new { error = "Email or password is not correct." });
        var res = await signIn.PasswordSignInAsync(u, dto.Password, isPersistent: true, lockoutOnFailure: true);
        if (res.IsLockedOut) return StatusCode(423, new { error = "Too many attempts. Try again in 15 minutes." });
        if (!res.Succeeded) return Unauthorized(new { error = "Email or password is not correct." });
        return Ok(await Describe(u));
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
