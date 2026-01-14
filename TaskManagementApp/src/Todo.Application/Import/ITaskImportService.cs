
using System.IO;

namespace Todo.Application.Tasks.Import;

public record ImportOptions(
    bool IsAdmin,
    Guid CurrentUserId,
    bool CreateMissingUsers = false  // optional: auto-create domain users if not found
);

public record ImportRowError(int RowNumber, string Message);

public record ImportResult(int TotalRows, int Imported, int Skipped, IReadOnlyList<ImportRowError> Errors);

public interface ITaskImportService
{
    /// <summary>
    /// Imports tasks from an Excel stream. When IsAdmin=true, allows routing rows to specific users via UserName/Email columns.
    /// </summary>
    Task<ImportResult> ImportAsync(Stream excelStream, ImportOptions options, CancellationToken ct = default);
}
