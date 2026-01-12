
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Todo.Application.Abstractions;
using Todo.Domain.Entities;
using Todo.Infrastructure.Auth;

namespace Todo.WebAPI.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _users;
    private readonly ITokenService _tokens;

    private readonly IUserRepository _domainUsers;
    private readonly IUnitOfWork _uow;

    public AuthController(UserManager<IdentityUser> users, ITokenService tokens,
        IUserRepository domainUsers, IUnitOfWork uow)
    {
        _users = users; _tokens = tokens;
        _domainUsers = domainUsers; _uow = uow;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var identityUser = new IdentityUser { UserName = dto.UserName, Email = dto.Email };
        var result = await _users.CreateAsync(identityUser, dto.Password);
        if (!result.Succeeded) return BadRequest(result.Errors);

        await _users.AddToRoleAsync(identityUser, "User"); // default role

        // --- Added this block to sync with domain user ---
        var user = new User(dto.UserName, dto.Email);
        typeof(User)
            .GetProperty("Id")!
            .SetValue(user, Guid.Parse(identityUser.Id));
        await _domainUsers.AddAsync(user);
        await _uow.SaveChangesAsync();
    
        return Ok();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var identityUser = await _users.FindByNameAsync(dto.UserName);
        if (identityUser is null) return Unauthorized();

        var ok = await _users.CheckPasswordAsync(identityUser, dto.Password);
        if (!ok) return Unauthorized();

        var roles = await _users.GetRolesAsync(identityUser);
        var token = _tokens.CreateToken(Guid.Parse(identityUser.Id), identityUser.UserName!, roles);
        return Ok(new { token });
    }

    public record RegisterDto(string UserName, string Email, string Password);
    public record LoginDto(string UserName, string Password);
}
