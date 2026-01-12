
using Microsoft.EntityFrameworkCore;
using Todo.Application.Abstractions;
using Todo.Application.Common;
using Todo.Domain.Entities;
using Todo.Infrastructure.Persistence;

namespace Todo.Infrastructure.Repositories;

public class TaskRepository : ITaskRepository
{
    private readonly AppDbContext _db;
    public TaskRepository(AppDbContext db) => _db = db;

    public async Task AddAsync(TaskItem task, CancellationToken ct = default) =>
        await _db.Tasks.AddAsync(task, ct);

    public Task UpdateAsync(TaskItem task, CancellationToken ct = default)
    {
        _db.Tasks.Update(task);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        // var stub = _db.Tasks.Local.FirstOrDefault(t => t.Id == id) ?? new TaskItem();
        // EF can't attach private-set Id on new(); fetch then remove for correctness:
        var entity = _db.Tasks.FirstOrDefault(x => x.Id == id);
        if (entity is not null) _db.Tasks.Remove(entity);
        return Task.CompletedTask;
    }

    public async Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await _db.Tasks.Include(t => t.TimeLogs).FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<IEnumerable<TaskItem>> GetByUserAsync(Guid userId, DateTime? date, TODOTaskStatus? status, CancellationToken ct = default)
    {
        var q = _db.Tasks.Include(t => t.TimeLogs).Where(t => t.UserId == userId);
        if (date is not null) q = q.Where(t => t.StartDate <= date.Value.Date && t.EndDate >= date.Value.Date);
        if (status is not null) q = q.Where(t => t.Status == status);
        return await q.OrderByDescending(t => t.StartDate).ToListAsync(ct);
    }

    public async Task<PagedResult<TaskItem>> GetByUserPagedAsync(
        Guid userId,
        DateTime? date,
        TODOTaskStatus? status,
        int page,
        int pageSize,
        string? sort,
        string? order,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken ct = default)
    {
        var q = _db.Tasks.Include(t => t.TimeLogs).Where(t => t.UserId == userId);

        if (date is not null) q = q.Where(t => t.StartDate <= date.Value.Date && t.EndDate >= date.Value.Date);
        if (fromDate is not null) q = q.Where(t => t.EndDate >= fromDate.Value.Date);
        if (toDate is not null) q = q.Where(t => t.StartDate <= toDate.Value.Date);
        if (status is not null) q = q.Where(t => t.Status == status);

        // sorting
        var sortKey = (sort ?? "date").ToLowerInvariant();
        var asc = string.Equals(order, "asc", StringComparison.OrdinalIgnoreCase);

        q = (sortKey) switch
        {
            
            "date"      => asc ? q.OrderBy(t => t.StartDate).ThenBy(t => t.EndDate) : q.OrderByDescending(t => t.StartDate).ThenByDescending(t => t.EndDate),
            "startdate" => asc ? q.OrderBy(t => t.StartDate) : q.OrderByDescending(t => t.StartDate),
            "enddate"   => asc ? q.OrderBy(t => t.EndDate)   : q.OrderByDescending(t => t.EndDate),

            // add more keys (title, status) as needed:
            "title" => asc ? q.OrderBy(t => t.Title) : q.OrderByDescending(t => t.Title),
            "status" => asc ? q.OrderBy(t => t.Status) : q.OrderByDescending(t => t.Status),
            _ => asc ? q.OrderBy(t => t.StartDate) : q.OrderByDescending(t => t.StartDate)
        };

        var total = await q.CountAsync(ct);

        // pagination
        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? 10 : pageSize;
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<TaskItem>(items, total, page, pageSize);
    }
}
