
using Microsoft.EntityFrameworkCore;
using Todo.Application.Abstractions;
using Todo.Domain.Entities;
using Todo.Infrastructure.Persistence;

namespace Todo.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    public UserRepository(AppDbContext db) => _db = db;

    public async Task AddAsync(User user, CancellationToken ct = default) =>
        await _db.UsersDomain.AddAsync(user, ct);

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _db.UsersDomain.FindAsync([id], ct);
        if (user is not null) _db.UsersDomain.Remove(user);
    }

    public async Task<IEnumerable<User>> GetAllAsync(CancellationToken ct = default) =>
        await _db.UsersDomain.AsNoTracking().ToListAsync(ct);

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await _db.UsersDomain.FindAsync([id], ct);

    public async Task<User?> GetByUserNameAsync(string userName, CancellationToken ct = default) =>
        await _db.UsersDomain.FirstOrDefaultAsync(u => u.UserName == userName, ct);
}
