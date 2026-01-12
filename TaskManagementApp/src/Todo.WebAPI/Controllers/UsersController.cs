
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Todo.Application.Abstractions;
using Todo.Domain.Entities;

namespace Todo.WebAPI.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = "AdminOnly")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _uow;
    private readonly UserManager<IdentityUser> _identity;

    public UsersController(IUserRepository users, IUnitOfWork uow, UserManager<IdentityUser> identity)
    { _users = users; _uow = uow; _identity = identity; }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) => Ok(await _users.GetAllAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto, CancellationToken ct)
    {
        // Create domain user
        var user = new User(dto.UserName, dto.Email);
        await _users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        // Optionally create matching Identity user here (if desired)
        // var identityUser = new IdentityUser { UserName = dto.UserName, Email = dto.Email };
        // await _identity.CreateAsync(identityUser);

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var user = await _users.GetByIdAsync(id, ct);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        // Find domain user
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();

        // Delete Identity user by matching username or email
        var identityUser = await _identity.FindByNameAsync(user.UserName)
                           ?? await _identity.FindByEmailAsync(user.Email);

        if (identityUser is not null)
        {
            var result = await _identity.DeleteAsync(identityUser);
            if (!result.Succeeded)
                return Problem(title: "Failed to delete Identity user", statusCode: StatusCodes.Status500InternalServerError);
        }

        await _users.DeleteAsync(id, ct);
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    public record CreateUserDto(string UserName, string Email);
}
