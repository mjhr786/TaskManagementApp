
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Todo.Domain.Entities;

namespace Todo.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext // Identity tables for auth
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> UsersDomain => Set<User>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<TimeLog> TimeLogs => Set<TimeLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<User>(b =>
        {
            b.HasKey(u => u.Id);
            b.Property(u => u.UserName).HasMaxLength(100).IsRequired();
            b.Property(u => u.Email).HasMaxLength(200).IsRequired();
            b.HasMany<TaskItem>().WithOne().HasForeignKey(t => t.UserId);
        });

        
        builder.Entity<TaskItem>(b =>
        {
            b.HasKey(t => t.Id);
            b.Property(t => t.Title).HasMaxLength(200).IsRequired();
            b.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            b.Property(t => t.CreatedDate).IsRequired();
            b.Property(t => t.StartDate).IsRequired();
            b.Property(t => t.EndDate).IsRequired();

            b.HasOne<User>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(t => t.TimeLogs).WithOne().HasForeignKey(l => l.TaskItemId);
        });


        builder.Entity<TimeLog>(b =>
        {
            b.HasKey(l => l.Id);
            b.Property(l => l.Hours).HasPrecision(5,2);
        });
    }
}
