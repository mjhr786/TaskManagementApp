
using ClosedXML.Excel;
using Todo.Application.Abstractions;
using Todo.Application.Tasks.Import;
using Todo.Domain.Entities;

namespace Todo.Infrastructure.Import;

public class TaskExcelImportService : ITaskImportService
{
    private readonly IUserRepository _users;
    private readonly ITaskRepository _tasks;
    private readonly IUnitOfWork _uow;

    public TaskExcelImportService(IUserRepository users, ITaskRepository tasks, IUnitOfWork uow)
    {
        _users = users; _tasks = tasks; _uow = uow;
    }

    public async Task<ImportResult> ImportAsync(Stream excelStream, ImportOptions options, CancellationToken ct = default)
    {
        using var wb = new XLWorkbook(excelStream);
        var ws = wb.Worksheets.FirstOrDefault() ?? throw new InvalidOperationException("No worksheet in Excel file.");

        // Header row
        var headerRow = 1;
        var headers = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var cell in ws.Row(headerRow).CellsUsed())
        {
            headers[cell.GetString().Trim()] = cell.Address.ColumnNumber;
        }

        int col(string name) => headers.TryGetValue(name, out var c) ? c : -1;

        // Required
        var cTitle = col("Title");
        var cStart = col("Start");
        var cEnd   = col("End");

        if (cTitle < 0 || cStart < 0 || cEnd < 0)
            throw new InvalidOperationException("Missing required columns: Title, Start, End.");

        // Optional
        var cDesc    = col("Description");
        var cCreated = col("Created");
        var cStatus  = col("Status");
        var cUser    = col("UserName");
        var cEmail   = col("Email");

        var total = 0;
        var imported = 0;
        var skipped = 0;
        var errors = new List<ImportRowError>();

        // Data rows start at 2
        foreach (var row in ws.RowsUsed().Skip(1))
        {
            total++;
            var r = row.RowNumber();
            try
            {
                var title = row.Cell(cTitle).GetString().Trim();
                if (string.IsNullOrWhiteSpace(title))
                    throw new InvalidOperationException("Title is required.");

                // Parse dates
                var startStr = row.Cell(cStart).GetString().Trim();
                var endStr   = row.Cell(cEnd).GetString().Trim();

                if (!TryParseDate(startStr, out var startDate))
                    throw new InvalidOperationException("Invalid Start date.");

                if (!TryParseDate(endStr, out var endDate))
                    throw new InvalidOperationException("Invalid End date.");

                if (endDate.Date < startDate.Date)
                    throw new InvalidOperationException("End date must be on or after Start date.");

                var desc = cDesc > 0 ? row.Cell(cDesc).GetString() : null;

                // Created is optional
                DateTime? created = null;
                if (cCreated > 0)
                {
                    var createdStr = row.Cell(cCreated).GetString().Trim();
                    if (!string.IsNullOrWhiteSpace(createdStr))
                    {
                        if (!TryParseDate(createdStr, out var createdParsed))
                            throw new InvalidOperationException("Invalid Created date.");
                        created = createdParsed;
                    }
                }

                // Status optional; default=New
                var status = TODOTaskStatus.New;
                if (cStatus > 0)
                {
                    var s = row.Cell(cStatus).GetString().Trim();
                    if (!string.IsNullOrEmpty(s) && !Enum.TryParse<TODOTaskStatus>(NormalizeStatus(s), true, out status))
                        throw new InvalidOperationException($"Invalid Status: '{s}'.");
                }

                // Determine Owner (admin can route tasks)
                var ownerId = options.CurrentUserId;
                if (options.IsAdmin && (cUser > 0 || cEmail > 0))
                {
                    var uname = cUser > 0 ? row.Cell(cUser).GetString().Trim() : null;
                    var email = cEmail > 0 ? row.Cell(cEmail).GetString().Trim() : null;

                    Guid? targetOwner = null;
                    if (!string.IsNullOrWhiteSpace(uname))
                    {
                        var u = await _users.GetByUserNameAsync(uname, ct);
                        if (u is not null) targetOwner = u.Id;
                    }
                    if (targetOwner is null && !string.IsNullOrWhiteSpace(email))
                    {
                        // If you maintain domain users by email, add a method in repo to query by email; otherwise skip email lookup or build your own
                        var all = await _users.GetAllAsync(ct);
                        var ue = all.FirstOrDefault(x => string.Equals(x.Email, email, StringComparison.OrdinalIgnoreCase));
                        if (ue is not null) targetOwner = ue.Id;
                    }

                    if (targetOwner is null)
                    {
                        if (!options.CreateMissingUsers)
                            throw new InvalidOperationException("Target user not found.");
                        else
                        {
                            // (Optional) Create missing domain user here; requires a CreateUser flow
                            // For safety, we skip auto-create in default implementation
                            throw new InvalidOperationException("Auto-create missing users is disabled.");
                        }
                    }
                    ownerId = targetOwner.Value;
                }

                // Create TaskItem; domain sets CreatedDate automatically; but allow override
                var task = new TaskItem(ownerId, title, startDate, endDate, desc);
                if (created.HasValue)
                {
                    // reflectively set CreatedDate if you want to override; or add a method to TaskItem to set CreatedDate
                    // For strict domain, keep CreatedDate from constructor only:
                    // task.SetCreatedDate(created.Value); <-- implement if needed; else ignore provided Created
                }

                // Apply status if not New
                switch (status)
                {
                    case TODOTaskStatus.New: task.MarkNew(); break;
                    case TODOTaskStatus.InProgress: task.MarkInProgress(); break;
                    case TODOTaskStatus.Completed:  task.MarkCompleted();  break;
                    case TODOTaskStatus.Archived:   task.MarkArchived(); break;
                    default: break;
                }

                await _tasks.AddAsync(task, ct);
                imported++;
            }
            catch (Exception ex)
            {
                skipped++;
                errors.Add(new ImportRowError(r, ex.Message));
            }
        }

        await _uow.SaveChangesAsync(ct);
        return new ImportResult(total, imported, skipped, errors);
    }

    private static bool TryParseDate(string input, out DateTime date)
    {
        // Accept ISO, short date, or excel numeric (ClosedXML often returns string; numeric cells can be parsed via GetDateTime())
        if (DateTime.TryParse(input, out var d))
        {
            date = d.Date;
            return true;
        }
        date = default;
        return false;
    }

    private static string NormalizeStatus(string s)
    {
        // Remove spaces, ensure common spellings (e.g., "In Progress" -> "InProgress")
        var compact = s.Replace(" ", "");
        return compact;
    }
}
