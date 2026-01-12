
namespace Todo.Domain.Entities;

public enum TODOTaskStatus { New, InProgress, Completed, Archived }

public class TaskItem
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public string Title { get; private set; }
    public string? Description { get; private set; }

    // Replace single Date with range
    public DateTime CreatedDate { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime EndDate   { get; private set; }

    public TODOTaskStatus Status { get; private set; } = TODOTaskStatus.New;

    private readonly List<TimeLog> _timeLogs = new();
    public IReadOnlyCollection<TimeLog> TimeLogs => _timeLogs.AsReadOnly();

    private TaskItem() { }
    public TaskItem(Guid userId, string title, DateTime startDate, DateTime endDate, string? description = null)
    {
        UserId = userId;
        Title = title;
        Description = description;
        CreatedDate = DateTime.UtcNow;
        StartDate = startDate.Date;
        EndDate   = endDate.Date;

    }

    public void Update(string title, string? description, DateTime startDate, DateTime endDate) {
        Title = title;
        Description = description;
        StartDate = startDate.Date;
        EndDate = endDate.Date;
    }

    public void MarkCompleted() => Status = TODOTaskStatus.Completed;
    public void MarkInProgress() => Status = TODOTaskStatus.InProgress;

    public void MarkNew() => Status = TODOTaskStatus.New;
    public void MarkArchived() => Status = TODOTaskStatus.Archived;

    public void AddTimeLog(TimeLog log) => _timeLogs.Add(log);
}
