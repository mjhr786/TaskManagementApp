
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Text;
using Todo.Application.Abstractions;
using Todo.Application.Tasks;
using Todo.Infrastructure.Auth;
using Todo.Infrastructure.Persistence;
using Todo.Infrastructure.Repositories;
using FluentValidation;
using FluentValidation.AspNetCore;
using AutoMapper;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Todo.Application.Tasks.Export;
using Todo.Infrastructure.Export;
using Todo.Application.Tasks.Import;
using Todo.Infrastructure.Import;


var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateLogger();
builder.Host.UseSerilog();

// Db

// Build the absolute path under the content root (publish output folder)
var appDataDir = Path.Combine(builder.Environment.ContentRootPath, "AppData");
Directory.CreateDirectory(appDataDir); // ensure folder exists

var dbFile = Path.Combine(appDataDir, "todo.db");
var connStr = builder.Configuration.GetConnectionString("Default");
// Use the absolute path for SQLite
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite(connStr));   // no ambiguity; guaranteed folder exists

// var connStr = builder.Configuration.GetConnectionString("Default");
// builder.Services.AddDbContext<AppDbContext>(opt =>
//     opt.UseSqlite(connStr)); // or UseNpgsql

// Identity (basic)
builder.Services.AddIdentityCore<IdentityUser>(opt => { })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>();

// JWT
var jwtOpts = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
builder.Services.AddSingleton(jwtOpts);
builder.Services.AddSingleton<ITokenService, TokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new()
        {
            ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOpts.Issuer, ValidAudience = jwtOpts.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOpts.Key))
        };
    });

builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
    opt.AddPolicy("ActiveUser", p => p.RequireAuthenticatedUser());
});

builder.Services.AddAutoMapper(typeof(Todo.Application.AssemblyMarker).Assembly);

// DI: Repositories & UoW
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ITimeLogRepository, TimeLogRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Application services
builder.Services.AddScoped<TaskService>();
builder.Services.AddScoped<ITaskExportService, TaskExcelExportService>();
builder.Services.AddScoped<ITaskImportService, TaskExcelImportService>();

builder.Services.AddControllers();

// Add automatic model validation via FluentValidation
builder.Services.AddFluentValidationAutoValidation();  // enables automatic validation on [ApiController] actions


builder.Services.AddValidatorsFromAssembly(typeof(Todo.Application.AssemblyMarker).Assembly);

// Ensure API behaviors return RFC7807 for model state errors
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(opts =>
{
    // Default behavior already produces ValidationProblemDetails for 400s
    // Add if you want to customize keys or disable auto 400:
    // opts.SuppressModelStateInvalidFilter = false;
});


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


// ProblemDetails service (RFC7807)
builder.Services.AddProblemDetails(options =>
{
    // // Show exception details only in Development
    // options..IncludeExceptionDetails = (ctx, ex) => builder.Environment.IsDevelopment();

    // // Map known exceptions to status codes
    // options.MapToStatusCode<ValidationException>(StatusCodes.Status400BadRequest);
    // options.MapToStatusCode<KeyNotFoundException>(StatusCodes.Status404NotFound);
    // options.MapToStatusCode<UnauthorizedAccessException>(StatusCodes.Status401Unauthorized);

    // // Optional catch-all mapping
    // options.MapToStatusCode<NotImplementedException>(StatusCodes.Status501NotImplemented);

    // // Add trace id to responses
    // options.OnBeforeWriteDetails = (ctx, pd) =>
    // {
    //     pd.Extensions["traceId"] = ctx.TraceIdentifier;
    // };
    options.CustomizeProblemDetails = ctx =>
    {
        // Always include useful metadata
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;
        ctx.ProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;
        ctx.ProblemDetails.Instance = $"{ctx.HttpContext.Request.Method} {ctx.HttpContext.Request.Path}";
    };
});


builder.Services.AddCors(opt => {
    opt.AddPolicy("AllowVite", p => p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod());
});


var app = builder.Build();

// Migrations at startup (optional)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}


// in Program.cs after building app:
using (var scope = app.Services.CreateScope())
{
    var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Admin", "User" })
        if (!await roleMgr.RoleExistsAsync(role))
            await roleMgr.CreateAsync(new IdentityRole(role));
}


// Global exception handler that writes ProblemDetails automatically
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exceptionHandlerFeature = context.Features.Get<IExceptionHandlerFeature>();
        var problemDetailsService = context.RequestServices.GetRequiredService<IProblemDetailsService>();

        // Use the ProblemDetailsService to format RFC7807 consistently
        await problemDetailsService.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            Exception = exceptionHandlerFeature?.Error,
            ProblemDetails = new ProblemDetails
            {
                Title = "An error occurred while processing your request.",
                Detail = exceptionHandlerFeature?.Error.Message,
                Instance = $"{context.Request.Method} {context.Request.Path}"
                // status and type are filled by service based on the mappings above
            }
        });
    });
});


app.UseSerilogRequestLogging();
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

app.MapFallbackToFile("index.html");

app.UseCors("AllowVite");

app.Run();
