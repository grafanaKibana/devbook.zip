using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class RuntimeTests
{
    [Fact]
    public async Task Publication_reuses_marked_pr_and_renews_review_only_for_owner_requested_fixes()
    {
        var api = new RuntimeApi();
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        JsonObject request = RuntimeFixtures.Request("Original", "First reviewed candidate");
        JsonObject first = await runtime.PublishAsync(request);
        first.Str("status").Should().Be("awaiting_export");
        first.Obj("export_request").Str("expected_head").Should().Be(api.Head);
        api.PrCreates.Should().Be(1);
        api.Pr["body"] = "Owner text.\n\n" + api.Pr.Str("body") + "\nOwner footer.\n";
        api.Pr["draft"] = false;
        JsonObject second = RuntimeFixtures.Request("First reviewed candidate", "Second reviewed candidate");
        second["expected_pr_number"] = 1;
        second["expected_branch_sha"] = api.Head;
        Func<Task> frozen = async () => await runtime.PublishAsync(second);
        await frozen.Should().ThrowAsync<UnsafeInput>();
        api.Commits.Should().Be(1);

        api.Comments.Add(RuntimeFixtures.OwnerComment());
        JsonArray pending = await Feedback.PollAsync(api, 1, RuntimeFixtures.Allowlist());
        second["pending_feedback"] = pending.Copy();
        second["edits"] = new JsonArray(new JsonObject { ["path"] = RuntimeFixtures.NotePath, ["feedback_keys"] = new JsonArray(pending[0]!.Str("key")) });
        second["feedback_revision"] = new JsonObject
        {
            ["allowlist"] = new JsonArray("42:owner"),
            ["processed"] = new JsonObject { ["comment:7"] = pending[0]!["revision"]!.DeepClone() }
        };
        await runtime.PublishAsync(second);
        api.PrCreates.Should().Be(1);
        api.Commits.Should().Be(2);
        api.DraftConversions.Should().Be(1);
        api.Pr.Str("body").Should().StartWith("Owner text.").And.EndWith("Owner footer.\n");
        api.Pr.Str("body").Should().Contain("Second reviewed candidate");
        api.ForceWrites.Should().Be(0);
        (await store.ReadAsync()).State.Obj("export_operations").Count.Should().Be(2);
    }

    [Fact]
    public async Task Interrupted_publication_reuses_commit_and_terminal_or_legacy_operations_do_not_replay()
    {
        var api = new RuntimeApi { FailPrCreateOnce = true };
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        Func<Task> interrupted = async () => await runtime.PublishAsync(RuntimeFixtures.Request("Original", "Reviewed"));
        await interrupted.Should().ThrowAsync<RuntimeFailure>();
        (await store.ReadAsync()).State.Obj("pending_operation").Str("phase").Should().Be("branch_updated");
        JsonObject? recovered = await runtime.RecoverPendingAsync();
        recovered!.Str("status").Should().Be("awaiting_export");
        api.Commits.Should().Be(1);
        api.PrCreates.Should().Be(1);
        (await runtime.RecoverPendingAsync()).Should().BeNull();

        JsonObject legacy = RuntimeFixtures.Request("Reviewed", "Unprepared legacy candidate");
        legacy["op_id"] = "old-operation";
        legacy["topic"] = RuntimeFixtures.Topic;
        legacy["generation"] = 1;
        legacy["branch"] = RuntimeFixtures.Branch;
        legacy["pr_number"] = 1;
        legacy["phase"] = "prepared";
        legacy.Remove("prepared_source_version");
        StateSnapshot snapshot = await store.ReadAsync();
        snapshot.State["pending_operation"] = legacy;
        await store.WriteAsync(snapshot.State, snapshot, "fixture legacy pending");
        (await runtime.RecoverPendingAsync())!.Str("status").Should().Be("prepared_source_contract_required");
        api.Commits.Should().Be(1);
        api.Pr["state"] = "closed";
        (await runtime.RecoverPendingAsync())!.Str("status").Should().Be("pr_terminal");
        (await store.ReadAsync()).State.Obj("terminal_operations").ContainsKey("old-operation").Should().BeTrue();
        api.Commits.Should().Be(1);
    }

    [Fact]
    public async Task Source_guards_and_read_only_transport_reject_unsafe_writes_before_side_effects()
    {
        string directory = Path.Combine(Path.GetTempPath(), "devbook-runtime-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(directory, "Vault/Home/NET"));
        string path = Path.Combine(directory, "Vault/Home/NET/Card.md");
        File.WriteAllText(path, "Owner's concurrent change");
        try
        {
            Action stale = () => Runtime.ApplyGuardedSources(directory, new Dictionary<string, string> { [RuntimeFixtures.NotePath] = "Old source" }, new Dictionary<string, string> { [RuntimeFixtures.NotePath] = "Candidate" });
            stale.Should().Throw<Conflict>();
            File.ReadAllText(path).Should().Be("Owner's concurrent change");
            var readOnly = new GhApi("owner/repo", readOnly: true);
            Func<Task> write = async () => await readOnly.RequestAsync("POST", "/pulls", new JsonObject());
            await write.Should().ThrowAsync<UnsafeInput>();
            Func<Task> traversal = async () => await readOnly.RequestAsync("GET", "/contents/%252e%252e/config");
            await traversal.Should().ThrowAsync<UnsafeInput>();
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}

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
            if (branch != "main" && !branchExists)
            {
                throw new GitHubApiFailure("HTTP 404", 404);
            }
            result = new JsonObject { ["object"] = new JsonObject { ["sha"] = branch == "main" ? "base" : Head } };
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
                ["head"] = new JsonObject { ["ref"] = RuntimeFixtures.Branch, ["sha"] = Head, ["repo"] = new JsonObject { ["full_name"] = Repo } },
                ["base"] = new JsonObject { ["ref"] = "main", ["sha"] = "base", ["repo"] = new JsonObject { ["full_name"] = Repo } }
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
