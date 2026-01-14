
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Todo.Application.Tasks;
using Todo.Application.Tasks.Dtos;
using Todo.Application.Common;
using Todo.Domain.Entities;
using Todo.Application.Tasks.Export;
using Todo.Application.Tasks.Import;

namespace Todo.WebAPI.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize(Policy = "ActiveUser")]
public class TasksController : ControllerBase
{
    private readonly TaskService _svc;
    private readonly ITaskExportService _exporter;
    private readonly ITaskImportService _importer;

    public TasksController(TaskService svc, ITaskExportService exporter, ITaskImportService importer)
    {
        _svc = svc;
        _exporter = exporter;
        _importer = importer;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("No user id claim"));

    // NEW: server-side pagination & sorting + optional date range
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime? date,
        [FromQuery] TODOTaskStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 5,
        [FromQuery] string? sort = "date",
        [FromQuery] string? order = "desc",
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken ct = default)
    {
        var res = await _svc.GetTasksPagedAsync(CurrentUserId, date, status, page, pageSize, sort, order, fromDate, toDate, ct);
        return Ok(res);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto, CancellationToken ct)
    {
        var id = await _svc.CreateAsync(CurrentUserId, dto, ct);
        return CreatedAtAction(nameof(Get), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto dto, CancellationToken ct)
    {
        await _svc.UpdateAsync(id, dto, ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        await _svc.MarkCompletedAsync(id, ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto, CancellationToken ct)
    {
        if (!Enum.TryParse<TODOTaskStatus>(dto.Status, true, out var newStatus))
            return BadRequest(new ProblemDetails { Title = "Invalid status value." });

        await _svc.SetStatusAsync(id, newStatus, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return NoContent();
    }

    public record UpdateStatusDto(string Status);

    public record LogHoursDto(decimal Hours);

    [HttpPost("{id:guid}/logs")]
    public async Task<IActionResult> LogHours(Guid id, [FromBody] LogHoursDto dto, CancellationToken ct)
    {
        await _svc.LogHoursAsync(id, dto.Hours, ct);
        return Ok(dto);
    }

    
[HttpGet("export")]
    public async Task<IActionResult> ExportMyTasks(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] TODOTaskStatus? status,
        [FromQuery] string? sort = "date",
        [FromQuery] string? order = "desc",
        CancellationToken ct = default)
    {
        var filter = new TaskExportFilter(fromDate, toDate, status, sort, order);
        var (bytes, fileName) = await _exporter.ExportUserAsync(CurrentUserId, filter, ct);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }

    [HttpGet("export/all")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ExportAllTasks(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] TODOTaskStatus? status,
        [FromQuery] string? sort = "date",
        [FromQuery] string? order = "desc",
        CancellationToken ct = default)
    {
        var filter = new TaskExportFilter(fromDate, toDate, status, sort, order);
        var (bytes, fileName) = await _exporter.ExportAllAsync(filter, ct);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }

    
    [HttpPost("import")]
    [RequestSizeLimit(25_000_000)] // example: 25MB
    public async Task<IActionResult> ImportTasks([FromForm] IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new ProblemDetails { Title = "No file uploaded." });

        using var stream = file.OpenReadStream();

        var options = new ImportOptions(
            IsAdmin: User.IsInRole("Admin"),
            CurrentUserId: CurrentUserId,
            CreateMissingUsers: false // change to true if you later enable auto-create
        );

        var result = await _importer.ImportAsync(stream, options, ct);
        return Ok(result);
    }


}
