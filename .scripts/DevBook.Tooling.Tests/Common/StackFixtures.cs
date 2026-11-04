using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Tests;

internal sealed class StackApi : IGitHubApi
{
    public RuntimeApi Inner { get; } = new();
    public string Repo => Inner.Repo;
    public JsonObject Parent { get; }
    public JsonObject? ExtraRoot { get; set; }
    public bool InterruptRegistration { get; set; }
    public bool ChangeParentAfterCommit { get; set; }
    public string? RestackedHead { get; set; }
    public int StackWrites { get; private set; }
    public string? StackPath { get; private set; }
    public JsonArray? StackMembers { get; private set; }
    public string? CommitParent { get; private set; }
    private readonly JsonObject tree;
    private readonly byte[] receipt;

    public StackApi(bool existingStack = false)
    {
        const string parentTopic = "networks-12345678";
        Parent = new JsonObject
        {
            ["number"] = 10,
            ["state"] = "open",
            ["draft"] = true,
            ["mergeable"] = true,
            ["body"] = Runtime.Marker(parentTopic, 1),
            ["head"] = new JsonObject { ["ref"] = Runtime.ExpectedManagedBranch(parentTopic, 1), ["sha"] = new string('a', 40), ["repo"] = new JsonObject { ["full_name"] = Repo } },
            ["base"] = new JsonObject { ["ref"] = "main", ["sha"] = "base", ["repo"] = new JsonObject { ["full_name"] = Repo } }
        };
        if (existingStack) Parent["stack"] = Membership();
        GitTreeEntry[] entries = [.. Receipt.RequiredPolicyPaths.Select(path => new GitTreeEntry(path, "100644", "blob", new string('e', 40))),
            new("Vault/Home/Networks/Card.md", "100644", "blob", new string('f', 40)),
            new("Web/content/Networks/Card.md", "100644", "blob", new string('8', 40))];
        receipt = Encoding.UTF8.GetBytes(Receipt.Make(entries).ToJsonString());
        tree = new JsonObject
        {
            ["truncated"] = false,
            ["tree"] = new JsonArray(entries.Append(new GitTreeEntry(Receipt.PathName, "100644", "blob", Bundle.BlobSha(receipt)))
                .Select(entry => (JsonNode)new JsonObject { ["path"] = entry.Path, ["mode"] = entry.Mode, ["type"] = entry.Type, ["sha"] = entry.Sha }).ToArray())
        };
    }

    private static JsonObject Membership() => new() { ["number"] = 9, ["base"] = new JsonObject { ["ref"] = "main" } };

    public async Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
    {
        if (RestackedHead is not null && method == "GET" && path == "/pulls/1")
        {
            JsonObject restacked = Inner.Pr.Copy();
            restacked.Obj("head")["sha"] = RestackedHead;
            return restacked;
        }
        if (RestackedHead is not null && method == "GET" && path == "/git/ref/heads/" + Uri.EscapeDataString(RuntimeFixtures.Branch))
            return new JsonObject { ["object"] = new JsonObject { ["sha"] = RestackedHead } };
        if (method == "GET" && path.StartsWith("/pulls?", StringComparison.Ordinal))
        {
            var prs = new JsonArray(Parent.Copy());
            if (ExtraRoot is not null) prs.Add(ExtraRoot.Copy());
            if (Inner.Pr.Count != 0) prs.Add(Inner.Pr.Copy());
            return prs;
        }
        if (method == "GET" && path == "/pulls/10") return Parent.Copy();
        if (method == "GET" && path.StartsWith("/git/ref/heads/", StringComparison.Ordinal)
            && Uri.UnescapeDataString(path["/git/ref/heads/".Length..]) == Parent.Obj("head").Str("ref"))
            return new JsonObject { ["object"] = new JsonObject { ["sha"] = Parent.Obj("head").Str("sha") } };
        if (method == "GET" && path.StartsWith("/git/trees/", StringComparison.Ordinal)) return tree.Copy();
        if (method == "GET" && path.StartsWith("/git/blobs/", StringComparison.Ordinal))
            return new JsonObject { ["encoding"] = "base64", ["content"] = Convert.ToBase64String(receipt) };
        if (method == "GET" && path.EndsWith("/check-runs?per_page=100", StringComparison.Ordinal))
            return new JsonObject
            {
                ["total_count"] = 3,
                ["check_runs"] = new JsonArray(new[] { "pr-title", "major-approval", "validate" }
                .Select(name => (JsonNode)new JsonObject { ["id"] = 1, ["name"] = name, ["conclusion"] = "success", ["head_sha"] = Parent.Obj("head").Str("sha") }).ToArray())
            };
        if (method == "GET" && path.EndsWith("/status", StringComparison.Ordinal)) return new JsonObject { ["statuses"] = new JsonArray() };
        if (method == "POST" && path.StartsWith("/stacks", StringComparison.Ordinal))
        {
            StackWrites++;
            StackPath = path;
            StackMembers = payload!.Arr("pull_requests").Copy();
            if (InterruptRegistration)
            {
                InterruptRegistration = false;
                // GitHub accepted the write, but its response was lost.
                Parent["stack"] = Membership();
                Inner.Pr["stack"] = Membership();
                throw new GitHubApiFailure("HTTP 503", 503);
            }
            Parent["stack"] = Membership();
            Inner.Pr["stack"] = Membership();
            return new JsonObject { ["number"] = 9 };
        }
        if (method == "POST" && path == "/git/commits")
        {
            CommitParent = payload!.Arr("parents")[0]!.GetValue<string>();
            if (ChangeParentAfterCommit) Parent.Obj("head")["sha"] = new string('b', 40);
        }
        return await Inner.RequestAsync(method, path, payload, paginate, cancellationToken);
    }

    public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default) =>
        Inner.GraphqlAsync(query, variables, cancellationToken);
}
