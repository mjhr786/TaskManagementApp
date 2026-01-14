
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Todo.Application.Tasks.Export;
using Todo.Domain.Entities;
using Todo.Infrastructure.Persistence;

namespace Todo.Infrastructure.Export;

public class TaskExcelExportService : ITaskExportService
{
    private readonly AppDbContext _db;

    public TaskExcelExportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<(byte[] Bytes, string FileName)> ExportUserAsync(Guid userId, TaskExportFilter filter, CancellationToken ct = default)
    {
        var items = await BuildUserQuery(userId, filter).ToListAsync(ct);
        var (bytes, fileName) = BuildWorkbook(items, "Tasks", userSuffix: "MyTasks");
        return (bytes, fileName);
    }

    public async Task<(byte[] Bytes, string FileName)> ExportAllAsync(TaskExportFilter filter, CancellationToken ct = default)
    {
        var items = await BuildAllQuery(filter).ToListAsync(ct);
        var (bytes, fileName) = BuildWorkbook(items, "All Tasks", userSuffix: "AllTasks");
        return (bytes, fileName);
    }

    // -------- Queries --------

    private IQueryable<ExportRow> BuildUserQuery(Guid userId, TaskExportFilter f)
    {
        var q = _db.Tasks
            .Include(t => t.TimeLogs)
            .Where(t => t.UserId == userId);

        q = ApplyRangeAndStatus(q, f);

        q = ApplySort(q, f);

        return q.Select(t => new ExportRow
        {
            Id          = t.Id,
            Title       = t.Title,
            Description = t.Description,
            CreatedDate = t.CreatedDate,
            StartDate   = t.StartDate,
            EndDate     = t.EndDate,
            Status      = t.Status,
            TotalHours  = t.TimeLogs.Sum(l => l.Hours),
            UserName    = null,
            Email       = null
        });
    }

    private IQueryable<ExportRow> BuildAllQuery(TaskExportFilter f)
    {
        var q = _db.Tasks
            .Include(t => t.TimeLogs)
            .Join(_db.UsersDomain, t => t.UserId, u => u.Id,
                (t, u) => new { t, u });

        // range/status filters
        q = ApplyRangeAndStatus(q.Select(x => x.t), f)
             .Join(_db.UsersDomain, t => t.UserId, u => u.Id, (t, u) => new { t, u });

        // sort
        var sorted = ApplySort(q.Select(x => x.t), f)
             .Join(_db.UsersDomain, t => t.UserId, u => u.Id, (t, u) => new { t, u });

        return sorted.Select(x => new ExportRow
        {
            Id          = x.t.Id,
            Title       = x.t.Title,
            Description = x.t.Description,
            CreatedDate = x.t.CreatedDate,
            StartDate   = x.t.StartDate,
            EndDate     = x.t.EndDate,
            Status      = x.t.Status,
            TotalHours  = x.t.TimeLogs.Sum(l => l.Hours),
            UserName    = x.u.UserName,
            Email       = x.u.Email
        });
    }

    private static IQueryable<TaskItem> ApplyRangeAndStatus(IQueryable<TaskItem> q, TaskExportFilter f)
    {
        if (f.FromDate is not null) q = q.Where(t => t.EndDate   >= f.FromDate.Value.Date);
        if (f.ToDate   is not null) q = q.Where(t => t.StartDate <= f.ToDate.Value.Date);
        if (f.Status   is not null) q = q.Where(t => t.Status == f.Status.Value);
        return q;
    }

    private static IQueryable<TaskItem> ApplySort(IQueryable<TaskItem> q, TaskExportFilter f)
    {
        var key = (f.Sort ?? "date").ToLowerInvariant();
        var asc = string.Equals(f.Order, "asc", StringComparison.OrdinalIgnoreCase);

        return key switch
        {
            "date"      => asc ? q.OrderBy(t => t.StartDate).ThenBy(t => t.EndDate)
                               : q.OrderByDescending(t => t.StartDate).ThenByDescending(t => t.EndDate),
            "startdate" => asc ? q.OrderBy(t => t.StartDate)
                               : q.OrderByDescending(t => t.StartDate),
            "enddate"   => asc ? q.OrderBy(t => t.EndDate)
                               : q.OrderByDescending(t => t.EndDate),
            "title"     => asc ? q.OrderBy(t => t.Title)
                               : q.OrderByDescending(t => t.Title),
            "status"    => asc ? q.OrderBy(t => t.Status)
                               : q.OrderByDescending(t => t.Status),
            _           => asc ? q.OrderBy(t => t.StartDate)
                               : q.OrderByDescending(t => t.StartDate)
        };
    }

    // -------- Workbook builder --------

    private static (byte[] Bytes, string FileName) BuildWorkbook(IEnumerable<ExportRow> items, string sheetName, string userSuffix)
    {
        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet(sheetName);

        // Header
        var cols = new[]
        {
            "Task ID","Title","Description","Created","Start","End","Status","Total Hours","User Name","Email"
        };
        for (int i=0;i<cols.Length;i++)
        {
            ws.Cell(1,i+1).Value = cols[i];
        }
        ws.Range(1,1,1,cols.Length).Style.Font.Bold = true;
        ws.Range(1,1,1,cols.Length).Style.Fill.BackgroundColor = XLColor.LightGray;

        // Rows
        var r = 2;
        foreach (var x in items)
        {
            ws.Cell(r,1).Value = x.Id.ToString();
            ws.Cell(r,2).Value = x.Title;
            ws.Cell(r,3).Value = x.Description;

            ws.Cell(r,4).SetValue(x.CreatedDate).Style.DateFormat.Format = "yyyy-MM-dd";
            ws.Cell(r,5).SetValue(x.StartDate).Style.DateFormat.Format   = "yyyy-MM-dd";
            ws.Cell(r,6).SetValue(x.EndDate).Style.DateFormat.Format     = "yyyy-MM-dd";

            ws.Cell(r,7).Value = x.Status.ToString();
            ws.Cell(r,8).Value = x.TotalHours;

            ws.Cell(r,9).Value = x.UserName;
            ws.Cell(r,10).Value = x.Email;
            r++;
        }

        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(1);
        ws.RangeUsed().SetAutoFilter();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        var bytes = ms.ToArray();
        var fileName = $"{userSuffix}_{DateTime.UtcNow:yyyyMMddHHmm}.xlsx";
        return (bytes, fileName);
    }

    private class ExportRow
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = default!;
        public string? Description { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public TODOTaskStatus Status { get; set; }
        public decimal TotalHours { get; set; }
        public string? UserName { get; set; }
        public string? Email { get; set; }
    }
}
