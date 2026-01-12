
using Todo.Domain.Entities;
using Todo.Application.Common;

namespace Todo.Application.Abstractions;

public interface ITaskRepository
{
    Task<TaskItem?> GetByIdAsync(Guid id, CancellationToken ct = default);

    // NEW: paged, sorted, filtered
    Task<PagedResult<TaskItem>> GetByUserPagedAsync(
        Guid userId,
        DateTime? date,
        TODOTaskStatus? status,
        int page,
        int pageSize,
        string? sort,   // "date" supported, extensible
        string? order,  // "asc" or "desc"
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken ct = default);

    Task AddAsync(TaskItem task, CancellationToken ct = default);
    Task UpdateAsync(TaskItem task, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    // (Optional) keep the old non-paged method if you still use it elsewhere
    Task<IEnumerable<TaskItem>> GetByUserAsync(Guid userId, DateTime? date, TODOTaskStatus? status, CancellationToken ct = default);
}
