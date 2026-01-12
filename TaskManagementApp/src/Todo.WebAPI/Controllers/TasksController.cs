
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Todo.Application.Tasks;
using Todo.Application.Tasks.Dtos;
using Todo.Application.Common;
using Todo.Domain.Entities;

namespace Todo.WebAPI.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize(Policy = "ActiveUser")]
public class TasksController : ControllerBase
{
    private readonly TaskService _svc;
    public TasksController(TaskService svc) { _svc = svc; }

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
}
