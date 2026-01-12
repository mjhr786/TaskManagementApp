namespace Todo.Domain.Entities;

public class User
{

    public Guid Id { get; private set; } = Guid.NewGuid();
    public string UserName { get; private set; }
    public string Email { get; private set; }
    public bool IsActive { get; private set; } = true;

    private readonly List<TaskItem> _tasks = new();
    public IReadOnlyCollection<TaskItem> Tasks => _tasks.AsReadOnly();

    private User() { }  // For EF
    public User(string userName, string email)
    {
        UserName = userName;
        Email = email;
    }

}
