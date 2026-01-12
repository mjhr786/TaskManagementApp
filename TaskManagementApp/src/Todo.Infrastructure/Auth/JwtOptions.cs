
namespace Todo.Infrastructure.Auth;

public class JwtOptions
{
    public string Issuer { get; init; } = default!;
    public string Audience { get; init; } = default!;
    public string Key { get; init; } = default!; // Symmetric key
    public int ExpMinutes { get; init; } = 60;
}