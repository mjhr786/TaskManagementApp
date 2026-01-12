
using Todo.Domain.Entities;

namespace Todo.Application.Tasks.Dtos;

public record CreateTaskDto(string Title, string? Description, DateTime StartDate, DateTime EndDate);
public record UpdateTaskDto(string Title, string? Description, DateTime StartDate, DateTime EndDate);
public record TaskVm(Guid Id, string Title, string? Description, DateTime CreatedDate, DateTime StartDate, DateTime EndDate, TaskStatus Status, decimal TotalHours);
