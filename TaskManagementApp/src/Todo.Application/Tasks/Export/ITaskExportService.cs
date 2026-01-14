
using Todo.Domain.Entities;

namespace Todo.Application.Tasks.Export;

public record TaskExportFilter(
    DateTime? FromDate = null,
    DateTime? ToDate   = null,
    TODOTaskStatus? Status = null,
    string? Sort       = "date",    // date/startdate/enddate/title/status
    string? Order      = "desc"     // asc|desc
);

public interface ITaskExportService
{
    /// <summary>Exports tasks for a single user to an Excel file (xlsx).</summary>
    Task<(byte[] Bytes, string FileName)> ExportUserAsync(
        Guid userId,
        TaskExportFilter filter,
        CancellationToken ct = default);

    /// <summary>Exports tasks for all users to an Excel file (xlsx). Admin only.</summary>
    Task<(byte[] Bytes, string FileName)> ExportAllAsync(
        TaskExportFilter filter,
        CancellationToken ct = default);
}
