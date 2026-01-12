
using Microsoft.EntityFrameworkCore;
using Todo.Application.Abstractions;
using Todo.Domain.Entities;
using Todo.Infrastructure.Persistence;

namespace Todo.Infrastructure.Repositories;

public class TimeLogRepository : ITimeLogRepository
{
    private readonly AppDbContext _db;
    public TimeLogRepository(AppDbContext db) => _db = db;

    public async Task AddAsync(TimeLog log, CancellationToken ct = default) =>
        await _db.TimeLogs.AddAsync(log, ct);

    public async Task<IEnumerable<TimeLog>> GetByTaskAsync(Guid taskId, CancellationToken ct = default) =>
        await _db.TimeLogs.Where(l => l.TaskItemId == taskId).ToListAsync(ct);
}
