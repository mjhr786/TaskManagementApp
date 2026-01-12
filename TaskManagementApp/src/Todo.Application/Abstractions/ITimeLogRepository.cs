
using Todo.Domain.Entities;

namespace Todo.Application.Abstractions;

public interface ITimeLogRepository
{
    Task<IEnumerable<TimeLog>> GetByTaskAsync(Guid taskId, CancellationToken ct = default);
    Task AddAsync(TimeLog log, CancellationToken ct = default);
}
