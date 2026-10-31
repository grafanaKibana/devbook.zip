using System.Text.Json.Nodes;

namespace DevBook.Tooling.Infrastructure;

public interface IGitHubApi
{
    string Repo { get; }

    Task<JsonNode?> RequestAsync(
        string method,
        string path,
        JsonNode? payload = null,
        bool paginate = false,
        CancellationToken cancellationToken = default);

    Task<JsonNode?> GraphqlAsync(
        string query,
        JsonObject variables,
        CancellationToken cancellationToken = default);
}

public sealed record StateSnapshot(JsonObject State, string? RefSha, string? BlobSha = null);

public interface IStateStore
{
    Task<StateSnapshot> ReadAsync(CancellationToken cancellationToken = default);

    Task<StateSnapshot> WriteAsync(
        JsonObject state,
        StateSnapshot expected,
        string message,
        CancellationToken cancellationToken = default);
}

public interface IModelProvider
{
    Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default);

    Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default);
}
