using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public sealed class GitHubApiFailure(string message, int? status = null) : RuntimeFailure(message)
{
    public int? Status { get; } = status;
}

public sealed class GhApi : IGitHubApi
{
    private readonly string tokenEnv;
    private readonly IProcessRunner runner;
    private readonly bool readOnly;
    private readonly int maxPages;

    public GhApi(string repo, string tokenEnv = "DEVBOOK_GITHUB_TOKEN", IProcessRunner? runner = null, bool readOnly = false, int maxPages = 10)
    {
        if (!Regex.IsMatch(repo, @"\A[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\z", RegexOptions.CultureInvariant))
        {
            throw new UnsafeInput("Invalid GitHub repository.");
        }
        Repo = repo;
        this.tokenEnv = tokenEnv;
        this.runner = runner ?? new SystemProcessRunner();
        this.readOnly = readOnly;
        this.maxPages = Math.Max(1, maxPages);
    }

    public string Repo { get; }

    private Dictionary<string, string> EnvironmentForRequest()
    {
        string? token = Environment.GetEnvironmentVariable(tokenEnv);
        if (readOnly && string.IsNullOrEmpty(token))
        {
            token = Environment.GetEnvironmentVariable("GITHUB_TOKEN");
        }
        if (string.IsNullOrEmpty(token))
        {
            throw new ProductionGate($"{tokenEnv} is required.");
        }
        if (!readOnly && (tokenEnv == "GITHUB_TOKEN" || token == Environment.GetEnvironmentVariable("GITHUB_TOKEN")))
        {
            throw new ProductionGate("Default GITHUB_TOKEN is forbidden for apply mode.");
        }
        Dictionary<string, string> values = Runtime.SafeEnvironment();
        values["GH_TOKEN"] = token;
        values["GH_HOST"] = "github.com";
        values["GH_PROMPT_DISABLED"] = "1";
        values["GIT_TERMINAL_PROMPT"] = "0";
        return values;
    }

    public async Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
    {
        method = method.ToUpperInvariant();
        if (readOnly && method != "GET")
        {
            throw new UnsafeInput("Read-only GitHub transport cannot mutate GitHub.");
        }
        if (!new[] { "GET", "POST", "PATCH", "PUT", "DELETE" }.Contains(method) || !path.StartsWith('/') || path.StartsWith("//", StringComparison.Ordinal) || path.Contains('#'))
        {
            throw new UnsafeInput("Invalid GitHub API path or method.");
        }
        string decoded = path.Split('?', 2)[0];
        for (var count = 0; count < 16; count++)
        {
            string next = Uri.UnescapeDataString(decoded);
            if (next == decoded)
            {
                break;
            }
            decoded = next;
            if (count == 15)
            {
                throw new UnsafeInput("Excessively encoded GitHub path.");
            }
        }
        if (decoded.Contains('\\') || decoded.Any(character => char.IsControl(character)) || decoded.Split('/').Any(part => part is "." or "..") || decoded.Contains("://", StringComparison.Ordinal))
        {
            throw new UnsafeInput("Invalid GitHub API path.");
        }
        if (paginate)
        {
            if (method != "GET")
            {
                throw new UnsafeInput("Only read requests may paginate.");
            }
            var rows = new JsonArray();
            for (var page = 1; page <= maxPages; page++)
            {
                string separator = path.Contains('?') ? "&" : "?";
                JsonArray items = await RequestAsync(method, $"{path}{separator}page={page}", payload, cancellationToken: cancellationToken) as JsonArray ?? throw new RuntimeFailure("Paginated GitHub response is not a list.");
                foreach (JsonNode? item in items)
                {
                    rows.Add(item?.DeepClone());
                }
                if (items.Count < 100)
                {
                    return rows;
                }
            }
            throw new RuntimeFailure("Bounded GitHub pagination limit exceeded.");
        }
        List<string> arguments = ["api", "--method", method, $"repos/{Repo}{path}"];
        if (payload is not null)
        {
            arguments.AddRange(["--input", "-"]);
        }
        return await InvokeAsync(arguments, payload, method == "GET", cancellationToken);
    }

    public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default)
    {
        if (readOnly)
        {
            throw new UnsafeInput("GraphQL is unavailable on the read-only transport.");
        }
        return InvokeAsync(["api", "graphql", "--input", "-"], new JsonObject { ["query"] = query, ["variables"] = variables.DeepClone() }, false, cancellationToken);
    }

    private async Task<JsonNode?> InvokeAsync(IReadOnlyList<string> arguments, JsonNode? payload, bool retryRead, CancellationToken cancellationToken)
    {
        Dictionary<string, string> environment = EnvironmentForRequest();
        for (var attempt = 0; ; attempt++)
        {
            ProcessResult result = await runner.RunAsync(new ProcessRequest("gh", arguments, Directory.GetCurrentDirectory(), environment,
                payload is null ? null : Encoding.UTF8.GetBytes(LegacyIdentity.CanonicalJson(payload)), TimeSpan.FromSeconds(60), ClearEnvironment: true), cancellationToken);
            if (result.ExitCode != 0)
            {
                string evidence = result.Stderr.Replace(environment["GH_TOKEN"], "[REDACTED]", StringComparison.Ordinal);
                Match statusMatch = Regex.Match(evidence, @"HTTP\s+(?<status>\d{3})", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
                int? status = statusMatch.Success ? int.Parse(statusMatch.Groups["status"].Value) : null;
                if (retryRead && attempt < 2 && status is 429 or >= 500)
                {
                    await Task.Delay(TimeSpan.FromSeconds(attempt + 1), cancellationToken);
                    continue;
                }
                throw new GitHubApiFailure($"GitHub request failed ({result.ExitCode}): {evidence.Trim()[..Math.Min(evidence.Trim().Length, 400)]}", status);
            }
            try
            {
                JsonNode? value = string.IsNullOrWhiteSpace(result.Stdout) ? null : JsonNode.Parse(result.Stdout);
                if (value is JsonObject map && map["errors"] is JsonArray { Count: > 0 })
                {
                    throw new RuntimeFailure("GitHub GraphQL mutation failed.");
                }
                return value;
            }
            catch (JsonException)
            {
                throw new RuntimeFailure("GitHub returned malformed JSON.");
            }
        }
    }
}
