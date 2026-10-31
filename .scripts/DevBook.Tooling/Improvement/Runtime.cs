using System.Globalization;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public class RuntimeFailure(string message) : InvalidOperationException(message);
public sealed class Conflict(string message) : RuntimeFailure(message);
public sealed class UnsafeInput(string message) : RuntimeFailure(message);
public sealed class ProductionGate(string message) : RuntimeFailure(message);
public sealed class CandidateValidationFailure(string message) : RuntimeFailure(message);

public sealed record PublicationChecks(string Status, JsonObject Checks, string? VaultValidation);

public static partial class Runtime
{
    public const string StateBranch = "maintenance/devbook-improvement-state";
    public const string StatePath = ".devbook-improvement/state.json";
    public static readonly string[] JournalPhases = ["prepared", "commit_created", "branch_updated", "pr_updated", "checks_verified", "committed"];
    public static readonly string[] DefaultRequiredChecks = ["pr-title", "major-approval"];

    [GeneratedRegex(@"<!-- devbook-improvement:topic=(?<topic>[a-z0-9-]+);generation=(?<generation>\d+) -->", RegexOptions.CultureInvariant)]
    private static partial Regex MarkerPattern();

    [GeneratedRegex(@"^<!-- devbook-improvement:start topic=(?<topic>[a-z0-9-]+) -->\n.*?^<!-- devbook-improvement:end -->[ \t]*$", RegexOptions.Multiline | RegexOptions.Singleline | RegexOptions.CultureInvariant)]
    private static partial Regex SectionPattern();

    public static string Iso(DateTimeOffset? instant = null) =>
        (instant ?? DateTimeOffset.UtcNow).ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);

    public static DateTimeOffset? ParseTime(string value) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out DateTimeOffset time) ? time.ToUniversalTime() : null;

    public static string Marker(string topic, int generation)
    {
        if (!Regex.IsMatch(topic, "^[a-z0-9-]+$", RegexOptions.CultureInvariant) || generation < 1)
        {
            throw new UnsafeInput("Invalid topic marker.");
        }
        return $"<!-- devbook-improvement:topic={topic};generation={generation} -->";
    }

    public static (string Topic, int Generation)? ParseMarker(string body)
    {
        Match match = MarkerPattern().Match(body);
        return match.Success && int.TryParse(match.Groups["generation"].Value, out int generation)
            ? (match.Groups["topic"].Value, generation) : null;
    }

    public static string ExpectedManagedBranch(string topic, int generation)
    {
        _ = Marker(topic, generation);
        return $"notes/automated-{topic}-g{generation}";
    }

    public static bool ValidPrIdentity(JsonObject pr, string repo, string baseBranch, string topic, int generation) =>
        pr.Obj("head").Str("ref") == ExpectedManagedBranch(topic, generation)
        && pr.Obj("head").Obj("repo").Str("full_name") == repo
        && pr.Obj("base").Str("ref") == baseBranch
        && pr.Obj("base").Obj("repo").Str("full_name") == repo
        && ParseMarker(pr.Str("body")) == (topic, generation);

    public static string Lifecycle(JsonObject pr) =>
        pr["merged_at"] is not null || pr.Bool("merged") ? "merged" : pr.Str("state") == "open" ? "open" : "closed";

    public static JsonObject? ManagedPr(IEnumerable<JsonObject> prs, string repo, string baseBranch, string topic, int generation, string branch)
    {
        if (branch != ExpectedManagedBranch(topic, generation))
        {
            throw new UnsafeInput("Managed branch does not match its topic generation.");
        }
        JsonObject[] matches = prs.Where(pr => Lifecycle(pr) == "open" && ValidPrIdentity(pr, repo, baseBranch, topic, generation)).ToArray();
        return matches.Length > 1 ? throw new Conflict("Duplicate open managed PRs.") : matches.SingleOrDefault();
    }

    public static void RequireApplyActivation(IReadOnlyDictionary<string, string>? environment = null)
    {
        string Value(string key) => environment is null ? Environment.GetEnvironmentVariable(key) ?? "" : environment.GetValueOrDefault(key) ?? "";
        Dictionary<string, string> required = new()
        {
            ["DEVBOOK_IMPROVEMENT_MODE"] = "apply",
            ["DEVBOOK_IMPROVEMENT_ACTIVATED"] = "true",
            ["DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED"] = "true",
            ["DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED"] = "true"
        };
        string[] missing = required.Where(item => !string.Equals(Value(item.Key), item.Value, StringComparison.OrdinalIgnoreCase)).Select(item => item.Key).ToArray();
        if (missing.Length != 0)
        {
            throw new ProductionGate("Apply mode gate missing: " + string.Join(", ", missing));
        }
        string token = Value("DEVBOOK_GITHUB_TOKEN");
        if (token.Length == 0 || token == Value("GITHUB_TOKEN"))
        {
            throw new ProductionGate("A separate App or fine-grained automation token is required.");
        }
    }

    public static Dictionary<string, string> SafeEnvironment()
    {
        string[] names = ["PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "TMP", "TEMP", "SYSTEMROOT", "SSL_CERT_FILE", "SSL_CERT_DIR", "DOTNET_ROOT", "DOTNET_CLI_HOME", "NUGET_PACKAGES"];
        return names.Where(name => Environment.GetEnvironmentVariable(name) is not null)
            .ToDictionary(name => name, name => Environment.GetEnvironmentVariable(name)!);
    }

    public static string MergeManagedSection(string currentBody, string proposedBody, string topic)
    {
        Match[] Sections(string value)
        {
            Match[] sections = SectionPattern().Matches(value).Cast<Match>().ToArray();
            int starts = Regex.Matches(value, "<!-- devbook-improvement:start", RegexOptions.CultureInvariant).Count;
            int ends = Regex.Matches(value, "<!-- devbook-improvement:end", RegexOptions.CultureInvariant).Count;
            if (sections.Length > 1 || starts != sections.Length || ends != sections.Length || sections.Any(match => match.Groups["topic"].Value != topic))
            {
                throw new Conflict("Managed PR description needs reconciliation.");
            }
            return sections;
        }
        Match[] proposed = Sections(proposedBody);
        Match[] current = Sections(currentBody);
        if (proposed.Length == 0)
        {
            return currentBody;
        }
        string replacement = proposed[0].Value;
        if (current.Length != 0)
        {
            return currentBody[..current[0].Index] + replacement + currentBody[(current[0].Index + current[0].Length)..];
        }
        string separator = currentBody.Length == 0 || currentBody.EndsWith("\n\n", StringComparison.Ordinal) ? "" : currentBody.EndsWith('\n') ? "\n" : "\n\n";
        return currentBody + separator + replacement + "\n";
    }

    public static async Task<JsonObject> RequiredChecksForShaAsync(IGitHubApi api, string sha, IEnumerable<string>? required = null, CancellationToken cancellationToken = default)
    {
        JsonObject result = await ObjectAsync(api, "GET", $"/commits/{sha}/check-runs?per_page=100", cancellationToken: cancellationToken);
        JsonObject combined = await ObjectAsync(api, "GET", $"/commits/{sha}/status", cancellationToken: cancellationToken);
        if (result.Int("total_count") > result.Arr("check_runs").Count)
        {
            throw new RuntimeFailure("Check-run response exceeds the supported 100-run bound.");
        }
        Dictionary<string, string> Latest(IEnumerable<JsonObject> items, string nameKey, string stateKey) => items
            .Where(item => item.Str(nameKey).Length != 0)
            .GroupBy(item => item.Str(nameKey))
            .ToDictionary(group => group.Key, group =>
            {
                JsonObject latest = group.OrderBy(item => long.TryParse(item["id"]?.ToJsonString(), out long id) ? id : 0).ThenBy(item => item.Str("created_at", item.Str("started_at")), StringComparer.Ordinal).Last();
                return latest.Str(stateKey, latest.Str("status", "unknown"));
            });
        Dictionary<string, string> runs = Latest(result.Arr("check_runs").OfType<JsonObject>().Where(run => run.Str("head_sha") == sha), "name", "conclusion");
        Dictionary<string, string> statuses = Latest(combined.Arr("statuses").OfType<JsonObject>().Where(status => (combined["sha"] is null || combined.Str("sha") == sha) && (status["sha"] is null || status.Str("sha") == sha)), "context", "state");
        var checks = new JsonObject();
        foreach (string name in required ?? DefaultRequiredChecks)
        {
            string[] values = new[] { runs.GetValueOrDefault(name), statuses.GetValueOrDefault(name) }.OfType<string>().ToArray();
            if (values.Length == 0)
            {
                throw new Conflict("Required checks missing on exact head: " + name);
            }
            checks[name] = values.Where(value => value != "success").Order(StringComparer.Ordinal).FirstOrDefault() ?? "success";
        }
        return checks;
    }

    public static Task<JsonNode?> DispatchVaultValidationAsync(IGitHubApi api, string branch, CancellationToken cancellationToken = default) =>
        api.RequestAsync("POST", "/actions/workflows/vault-validation.yml/dispatches", new JsonObject { ["ref"] = branch }, cancellationToken: cancellationToken);

    public static async Task<string> VaultValidationForShaAsync(IGitHubApi api, string branch, string sha, CancellationToken cancellationToken = default)
    {
        JsonObject runs = await ObjectAsync(api, "GET", "/actions/workflows/vault-validation.yml/runs?event=workflow_dispatch&per_page=20", cancellationToken: cancellationToken);
        JsonObject? run = runs.Arr("workflow_runs").OfType<JsonObject>().Where(item => item.Str("head_branch") == branch && item.Str("head_sha") == sha)
            .OrderBy(item => item.Str("created_at"), StringComparer.Ordinal).LastOrDefault();
        return run is null ? throw new Conflict("Vault validation run missing on exact head.") : run.Str("conclusion", run.Str("status", "unknown"));
    }

    public static async Task<PublicationChecks> PublicationCheckStateAsync(IGitHubApi api, string branch, string sha, IEnumerable<string>? required = null, CancellationToken cancellationToken = default)
    {
        JsonObject checks;
        try
        {
            checks = await RequiredChecksForShaAsync(api, sha, required, cancellationToken);
        }
        catch (Conflict)
        {
            return new("pending", new JsonObject(), null);
        }
        string vault;
        try
        {
            vault = await VaultValidationForShaAsync(api, branch, sha, cancellationToken);
        }
        catch (Conflict)
        {
            return new("pending", checks, null);
        }
        string[] failures = ["failure", "error", "cancelled", "timed_out", "action_required", "startup_failure", "stale"];
        string[] values = [.. checks.Select(item => item.Value!.GetValue<string>()), vault];
        string status = values.Any(value => failures.Contains(value)) ? "failed" : values.All(value => value == "success") ? "success" : "pending";
        return new(status, checks, vault);
    }

    public static async Task EnsureDraftForMutationAsync(IGitHubApi api, JsonObject pr, CancellationToken cancellationToken = default)
    {
        if (pr["draft"]?.GetValue<bool>() == false)
        {
            string id = pr.Str("node_id");
            if (id.Length == 0)
            {
                throw new RuntimeFailure("Pull request node_id is required to renew draft review.");
            }
            await api.GraphqlAsync("mutation($id:ID!){convertPullRequestToDraft(input:{pullRequestId:$id}){pullRequest{id isDraft}}}", new JsonObject { ["id"] = id }, cancellationToken);
        }
    }

    internal static async Task<JsonObject> ObjectAsync(IGitHubApi api, string method, string path, JsonNode? payload = null, CancellationToken cancellationToken = default) =>
        await api.RequestAsync(method, path, payload, cancellationToken: cancellationToken) as JsonObject ?? throw new RuntimeFailure("GitHub response must be an object.");

    internal static async Task<JsonArray> ArrayAsync(IGitHubApi api, string path, CancellationToken cancellationToken = default) =>
        await api.RequestAsync("GET", path, paginate: true, cancellationToken: cancellationToken) as JsonArray ?? throw new RuntimeFailure("GitHub response must be an array.");
}
