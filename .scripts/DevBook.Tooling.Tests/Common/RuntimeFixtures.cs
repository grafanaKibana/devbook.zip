using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

internal static class RuntimeFixtures
{
    public const string NotePath = "Vault/Home/NET/Card.md";
    public const string Topic = "net-12345678";
    public const string Branch = "notes/automated-net-12345678-g1";

    public static JsonArray Allowlist() => new(new JsonObject { ["id"] = 42, ["login"] = "owner" });

    public static JsonObject OwnerComment() => new()
    {
        ["id"] = 7,
        ["body"] = "Please make the requested correction.",
        ["updated_at"] = "2026-10-30T12:00:00Z",
        ["user"] = new JsonObject { ["id"] = 42, ["login"] = "owner" }
    };

    public static JsonObject Request(string before, string after) => new()
    {
        ["topic"] = Topic,
        ["generation"] = 1,
        ["branch"] = Branch,
        ["expected_sources"] = new JsonObject { [NotePath] = before },
        ["candidate"] = new JsonObject { [NotePath] = after },
        ["expected_base_sha"] = "base",
        ["title"] = "notes: improve NET",
        ["body"] = $"<!-- devbook-improvement:start topic={Topic} -->\n{after}\n<!-- devbook-improvement:end -->\n",
        ["feedback_revision"] = new JsonObject { ["allowlist"] = new JsonArray(), ["processed"] = new JsonObject() },
        ["edits"] = new JsonArray(),
        ["pending_feedback"] = new JsonArray(),
        ["export_required"] = true,
        ["automatic_export"] = true,
        ["prepared_source_version"] = 1,
        ["prepared_at"] = "2026-10-30T12:00:00Z"
    };
}

internal sealed class RuntimeApi : IGitHubApi
{
    public string Repo => "owner/repo";
    public string BaseBranch { get; init; } = "main";
    public string Head { get; private set; } = "base";
    public string Source { get; private set; } = "Original";
    public JsonObject Pr { get; private set; } = new();
    public JsonArray Comments { get; } = new();
    public int Commits { get; private set; }
    public int PrCreates { get; private set; }
    public int DraftConversions { get; private set; }
    public int ForceWrites { get; private set; }
    public bool FailPrCreateOnce { get; set; }
    private bool branchExists;
    private readonly Dictionary<string, string> blobs = new();
    private string pendingContent = "";

    public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
    {
        JsonObject data = payload as JsonObject ?? new JsonObject();
        JsonNode? result;
        if (method == "GET" && path.StartsWith("/git/ref/heads/", StringComparison.Ordinal))
        {
            string branch = Uri.UnescapeDataString(path["/git/ref/heads/".Length..]);
            if (branch != BaseBranch && !branchExists)
            {
                throw new GitHubApiFailure("HTTP 404", 404);
            }
            result = new JsonObject { ["object"] = new JsonObject { ["sha"] = branch == BaseBranch ? "base" : Head } };
        }
        else if (method == "POST" && path == "/git/refs")
        {
            branchExists = true;
            Head = data.Str("sha");
            result = new JsonObject();
        }
        else if (method == "GET" && path.StartsWith("/contents/", StringComparison.Ordinal))
        {
            result = new JsonObject { ["encoding"] = "base64", ["type"] = "file", ["content"] = Convert.ToBase64String(Encoding.UTF8.GetBytes(Source)) };
        }
        else if (method == "GET" && path.StartsWith("/git/commits/", StringComparison.Ordinal))
        {
            result = new JsonObject { ["tree"] = new JsonObject { ["sha"] = "tree-parent" } };
        }
        else if (method == "POST" && path == "/git/blobs")
        {
            string sha = "blob-" + blobs.Count;
            blobs[sha] = Encoding.UTF8.GetString(Convert.FromBase64String(data.Str("content")));
            result = new JsonObject { ["sha"] = sha };
        }
        else if (method == "POST" && path == "/git/trees")
        {
            pendingContent = blobs[data.Arr("tree")[0]!.Str("sha")];
            result = new JsonObject { ["sha"] = "tree" };
        }
        else if (method == "POST" && path == "/git/commits")
        {
            Commits++;
            result = new JsonObject { ["sha"] = "commit-" + Commits };
        }
        else if (method == "PATCH" && path.StartsWith("/git/refs/heads/", StringComparison.Ordinal))
        {
            ForceWrites += data.Bool("force") ? 1 : 0;
            Head = data.Str("sha");
            Source = pendingContent;
            if (Pr.Count != 0)
            {
                Pr.Obj("head")["sha"] = Head;
            }
            result = new JsonObject();
        }
        else if (method == "GET" && path.StartsWith("/pulls?", StringComparison.Ordinal))
        {
            result = Pr.Count == 0 || (path.Contains("state=open", StringComparison.Ordinal) && Pr.Str("state") != "open") ? new JsonArray() : new JsonArray(Pr.Copy());
        }
        else if (method == "POST" && path == "/pulls")
        {
            if (FailPrCreateOnce)
            {
                FailPrCreateOnce = false;
                throw new RuntimeFailure("Ambiguous fixture failure before PR creation.");
            }
            PrCreates++;
            Pr = new JsonObject
            {
                ["number"] = 1,
                ["node_id"] = "PR_fixture",
                ["state"] = "open",
                ["draft"] = true,
                ["body"] = data["body"]?.DeepClone(),
                ["head"] = new JsonObject { ["ref"] = data.Str("head"), ["sha"] = Head, ["repo"] = new JsonObject { ["full_name"] = Repo } },
                ["base"] = new JsonObject { ["ref"] = data.Str("base"), ["sha"] = "base", ["repo"] = new JsonObject { ["full_name"] = Repo } }
            };
            result = Pr.Copy();
        }
        else if (method == "GET" && path == "/pulls/1")
        {
            result = Pr.Copy();
        }
        else if (method == "PATCH" && path == "/pulls/1")
        {
            Pr["body"] = data["body"]?.DeepClone();
            result = Pr.Copy();
        }
        else if (method == "GET" && path.StartsWith("/issues/1/comments?", StringComparison.Ordinal))
        {
            result = Comments.Copy();
        }
        else if (method == "GET" && path.StartsWith("/pulls/1/files?", StringComparison.Ordinal))
        {
            result = new JsonArray(new JsonObject { ["filename"] = RuntimeFixtures.NotePath });
        }
        else if (method == "GET" && (path.StartsWith("/pulls/1/comments?", StringComparison.Ordinal) || path.StartsWith("/pulls/1/reviews?", StringComparison.Ordinal)))
        {
            result = new JsonArray();
        }
        else
        {
            throw new InvalidOperationException($"Unexpected fixture request: {method} {path}");
        }
        return Task.FromResult<JsonNode?>(result);
    }

    public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default)
    {
        DraftConversions++;
        Pr["draft"] = true;
        return Task.FromResult<JsonNode?>(new JsonObject());
    }
}
