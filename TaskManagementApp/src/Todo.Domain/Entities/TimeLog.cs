
namespace Todo.Domain.Entities;

public class TimeLog
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TaskItemId { get; private set; }
    public DateTime LoggedAt { get; private set; } = DateTime.UtcNow;
    public decimal Hours { get; private set; } // e.g., 0.25, 0.5, 1.0

    private TimeLog() { }
    public TimeLog(Guid taskItemId, decimal hours)
    {
        TaskItemId = taskItemId;
        if (hours <= 0 || hours > 24) throw new ArgumentOutOfRangeException(nameof(hours));
        Hours = hours;
    }
}
