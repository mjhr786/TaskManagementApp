
using AutoMapper;
using Todo.Application.Abstractions;
using Todo.Application.Common;
using Todo.Application.Tasks.Dtos;
using Todo.Domain.Entities;

namespace Todo.Application.Tasks;

public class TaskService
{
    private readonly ITaskRepository _tasks;
    private readonly ITimeLogRepository _timeLogs;
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public TaskService(ITaskRepository tasks, ITimeLogRepository timeLogs, IUnitOfWork uow, IMapper mapper)
    {
        _tasks = tasks; _timeLogs = timeLogs; _uow = uow; _mapper = mapper;
    }

    public async Task<Guid> CreateAsync(Guid userId, CreateTaskDto dto, CancellationToken ct = default)
    {
        // Map DTO -> Entity using contextual userId
        var task = _mapper.Map<TaskItem>(dto, opts => opts.Items["UserId"] = userId);
        await _tasks.AddAsync(task, ct);
        await _uow.SaveChangesAsync(ct);
        return task.Id;
    }

    public async Task UpdateAsync(Guid taskId, UpdateTaskDto dto, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct) ?? throw new KeyNotFoundException("Task not found");
        // Apply changes via domain method to preserve invariants
        task.Update(dto.Title, dto.Description, dto.StartDate, dto.EndDate);
        await _tasks.UpdateAsync(task, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task MarkCompletedAsync(Guid taskId, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct) ?? throw new KeyNotFoundException("Task not found");
        task.MarkCompleted();
        await _tasks.UpdateAsync(task, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid taskId, CancellationToken ct = default)
    {
        await _tasks.DeleteAsync(taskId, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task LogHoursAsync(Guid taskId, decimal hours, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct) ?? throw new KeyNotFoundException("Task not found");
        var log = new TimeLog(taskId, hours);
        task.AddTimeLog(log);
        await _timeLogs.AddAsync(log, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IEnumerable<TaskVm>> GetTasksAsync(Guid userId, DateTime? date, TODOTaskStatus? status, CancellationToken ct = default)
    {
        var tasks = await _tasks.GetByUserAsync(userId, date, status, ct);
        return _mapper.Map<IEnumerable<TaskVm>>(tasks);
    }

    public async Task<PagedResult<TaskVm>> GetTasksPagedAsync(
        Guid userId, DateTime? date, TODOTaskStatus? status,
        int page, int pageSize, string? sort, string? order,
        DateTime? fromDate, DateTime? toDate, CancellationToken ct = default)
    {
        var paged = await _tasks.GetByUserPagedAsync(userId, date, status, page, pageSize, sort, order, fromDate, toDate, ct);
        var vms = _mapper.Map<List<TaskVm>>(paged.Items);
        return new PagedResult<TaskVm>(vms, paged.TotalCount, paged.Page, paged.PageSize);
    }

    public async Task<TaskItem?> GetTaskByIdAsync(Guid id, CancellationToken ct = default)
        => await _tasks.GetByIdAsync(id, ct);

    public async Task SetStatusAsync(Guid taskId, TODOTaskStatus status, CancellationToken ct = default)
    {
        var task = await _tasks.GetByIdAsync(taskId, ct) ?? throw new KeyNotFoundException("Task not found");
        // Use task methods for business rules if any
        switch (status)
        {
            case TODOTaskStatus.New: task.MarkNew(); break;
            case TODOTaskStatus.InProgress: task.MarkInProgress(); break;
            case TODOTaskStatus.Completed: task.MarkCompleted(); break;
            case TODOTaskStatus.Archived: task.MarkArchived(); break;
        }
        await _tasks.UpdateAsync(task, ct);
        await _uow.SaveChangesAsync(ct);
    }
    public async Task<decimal> GetTodayTotalHoursAsync(Guid userId, CancellationToken ct = default)
    {
        return await _timeLogs.GetTotalHoursTodayAsync(userId, ct);
    }
}
