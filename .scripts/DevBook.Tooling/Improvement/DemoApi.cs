using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

internal sealed class DemoApi : IGitHubApi
{
    private readonly Dictionary<string, byte[]> blobs = new();
    private readonly Dictionary<string, Dictionary<string, GitTreeEntry>> trees = new();
    private readonly Dictionary<string, JsonObject> commits = new();
    private readonly JsonArray ordinary = new();
    private readonly JsonArray inline = new();
    private readonly JsonArray validations = new();
    private int sequence;
    public string Repo { get; }
    public Dictionary<string, string> References { get; } = new();
    public JsonObject? Pr { get; private set; }
    public int CreatedPrs { get; private set; }
    public int UpdatedPrs { get; private set; }
    public int BranchWrites { get; private set; }

    public DemoApi(string repo, IReadOnlyDictionary<string, string> notes)
    {
        Repo = repo;
        var files = new Dictionary<string, GitTreeEntry>();
        foreach (KeyValuePair<string, string> note in notes)
        {
            files[note.Key] = Entry(note.Key, Encoding.UTF8.GetBytes(note.Value));
        }
        foreach (string path in Receipt.RequiredPolicyPaths)
        {
            files[path] = Entry(path, "fixture policy, never executed"u8.ToArray());
        }
        files["Web/content/demo.md"] = Entry("Web/content/demo.md", "Initial fixture output"u8.ToArray());
        files["Web/content/retire-me.md"] = Entry("Web/content/retire-me.md", "Fixture deletion"u8.ToArray());
        string tree = NewId();
        trees[tree] = files;
        string head = NewCommit(tree, [], "fixture base");
        References["main"] = head;
    }

    private string NewId() => LegacyIdentity.Digest("demo-object-" + ++sequence)[..40];
    private GitTreeEntry Entry(string path, byte[] bytes)
    {
        string sha = Bundle.BlobSha(bytes);
        blobs[sha] = bytes;
        return new GitTreeEntry(path, "100644", "blob", sha);
    }
    private string NewCommit(string tree, string[] parents, string message)
    {
        string sha = NewId();
        commits[sha] = new JsonObject
        {
            ["sha"] = sha,
            ["tree"] = new JsonObject { ["sha"] = tree },
            ["parents"] = new JsonArray(parents.Select(parent => (JsonNode)new JsonObject { ["sha"] = parent }).ToArray()),
            ["message"] = message
        };
        return sha;
    }
    public Dictionary<string, GitTreeEntry> Tree(string reference)
    {
        string sha = References.GetValueOrDefault(reference, reference);
        return trees[commits.TryGetValue(sha, out JsonObject? commit) ? commit.Obj("tree").Str("sha") : sha];
    }
    public string Read(string path, string reference) => Encoding.UTF8.GetString(blobs[Tree(reference)[path].Sha]);
    private JsonObject ViewPr()
    {
        JsonObject pr = Pr?.Copy() ?? throw new GitHubApiFailure("No fixture PR", 404);
        pr.RequiredObject("head")["sha"] = References[pr.Obj("head").Str("ref")];
        return pr;
    }
    public void OwnerFeedback(string body, DateTimeOffset time)
    {
        JsonObject comment = inline.OfType<JsonObject>().FirstOrDefault() ?? new JsonObject
        {
            ["id"] = 101,
            ["user"] = new JsonObject { ["id"] = 45916288, ["login"] = "grafanaKibana" },
            ["html_url"] = $"https://github.com/{Repo}/pull/1#discussion_r101",
            ["path"] = "Vault/Home/Programming/NET/A Tasks.md",
            ["line"] = 18
        };
        comment["body"] = body;
        comment["updated_at"] = Runtime.Iso(time);
        comment["commit_id"] = ViewPr().Obj("head").Str("sha");
        if (inline.Count == 0)
        {
            inline.Add(comment);
        }
    }

    public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        JsonObject input = payload as JsonObject ?? new JsonObject();
        string route = path.Split('?')[0];
        JsonNode? result;
        if (route.StartsWith("/git/ref/heads/", StringComparison.Ordinal))
        {
            string branch = Uri.UnescapeDataString(route[15..]);
            if (!References.TryGetValue(branch, out string? head))
            {
                throw new GitHubApiFailure("Missing fixture ref", 404);
            }

            result = new JsonObject { ["object"] = new JsonObject { ["sha"] = head } };
        }
        else if (route == "/git/refs" && method == "POST")
        {
            string branch = input.Str("ref")[11..];
            if (!References.TryAdd(branch, input.Str("sha")))
            {
                throw new GitHubApiFailure("Fixture ref exists", 422);
            }

            result = new JsonObject();
        }
        else if (route.StartsWith("/git/refs/heads/", StringComparison.Ordinal) && method == "PATCH")
        {
            string branch = Uri.UnescapeDataString(route[16..]);
            string next = input.Str("sha");
            if (input.Bool("force") || commits[next].Arr("parents").FirstOrDefault().Str("sha") != References[branch])
            {
                throw new GitHubApiFailure("Fixture ref conflict", 409);
            }

            References[branch] = next;
            BranchWrites++;
            result = new JsonObject();
        }
        else if (route == "/git/blobs" && method == "POST")
        {
            byte[] bytes = input.Str("encoding") == "base64" ? Convert.FromBase64String(input.Str("content")) : Encoding.UTF8.GetBytes(input.Str("content"));
            result = new JsonObject { ["sha"] = Entry("", bytes).Sha };
        }
        else if (route.StartsWith("/git/blobs/", StringComparison.Ordinal))
        {
            byte[] bytes = blobs[route[11..]];
            result = new JsonObject { ["encoding"] = "base64", ["content"] = Convert.ToBase64String(bytes) };
        }
        else if (route == "/git/trees" && method == "POST")
        {
            Dictionary<string, GitTreeEntry> entries = input.Str("base_tree").Length == 0 ? new() : new(trees[input.Str("base_tree")]);
            foreach (JsonObject item in input.Arr("tree").OfType<JsonObject>())
            {
                string name = item.Str("path");
                if (item["sha"] is null)
                {
                    entries.Remove(name);
                }
                else
                {
                    entries[name] = new GitTreeEntry(name, item.Str("mode"), item.Str("type"), item.Str("sha"));
                }
            }
            string sha = NewId();
            trees[sha] = entries;
            result = new JsonObject { ["sha"] = sha };
        }
        else if (route.StartsWith("/git/trees/", StringComparison.Ordinal))
        {
            result = new JsonObject
            {
                ["truncated"] = false,
                ["tree"] = new JsonArray(Tree(route[11..]).Values.Select(entry => (JsonNode)new JsonObject
                { ["path"] = entry.Path, ["mode"] = entry.Mode, ["type"] = entry.Type, ["sha"] = entry.Sha }).ToArray())
            };
        }
        else if (route == "/git/commits" && method == "POST")
        {
            result = new JsonObject { ["sha"] = NewCommit(input.Str("tree"), input.Arr("parents").Strings().ToArray(), input.Str("message")) };
        }
        else if (route.StartsWith("/git/commits/", StringComparison.Ordinal))
        {
            result = commits[route[13..]].Copy();
        }
        else if (route.StartsWith("/contents/", StringComparison.Ordinal))
        {
            string name = Uri.UnescapeDataString(route[10..]);
            string branch = Uri.UnescapeDataString(path[(path.IndexOf("ref=", StringComparison.Ordinal) + 4)..]);
            result = new JsonObject { ["type"] = "file", ["encoding"] = "base64", ["content"] = Convert.ToBase64String(blobs[Tree(branch)[name].Sha]) };
        }
        else if (route == "/pulls" && method == "POST")
        {
            CreatedPrs++;
            Pr = new JsonObject
            {
                ["number"] = 1,
                ["node_id"] = "fixture-pr-1",
                ["state"] = "open",
                ["draft"] = true,
                ["title"] = input.Str("title"),
                ["body"] = input.Str("body"),
                ["html_url"] = $"https://github.com/{Repo}/pull/1",
                ["head"] = new JsonObject { ["ref"] = input.Str("head"), ["repo"] = new JsonObject { ["full_name"] = Repo } },
                ["base"] = new JsonObject { ["ref"] = "main", ["sha"] = References["main"], ["repo"] = new JsonObject { ["full_name"] = Repo } },
                ["user"] = new JsonObject { ["id"] = 45916288, ["login"] = "grafanaKibana" }
            };
            result = ViewPr();
        }
        else if (route == "/pulls")
        {
            result = Pr is null ? new JsonArray() : new JsonArray(ViewPr());
        }
        else if (route == "/pulls/1" && method == "PATCH")
        {
            UpdatedPrs++;
            foreach (KeyValuePair<string, JsonNode?> item in input)
            {
                Pr![item.Key] = item.Value?.DeepClone();
            }

            result = ViewPr();
        }
        else if (route == "/pulls/1")
        {
            result = ViewPr();
        }
        else if (route == "/pulls/1/files")
        {
            Dictionary<string, GitTreeEntry> current = Tree(ViewPr().Obj("head").Str("ref"));
            Dictionary<string, GitTreeEntry> baseline = Tree("main");
            result = new JsonArray(baseline.Keys.Union(current.Keys).Where(name => baseline.GetValueOrDefault(name)?.Sha != current.GetValueOrDefault(name)?.Sha)
                .Select(name => (JsonNode)new JsonObject { ["filename"] = name, ["additions"] = 1, ["deletions"] = 1 }).ToArray());
        }
        else if (route == "/pulls/1/comments")
        {
            result = inline.Copy();
        }
        else if (route == "/pulls/1/reviews")
        {
            result = new JsonArray();
        }
        else if (route == "/issues/1/comments" && method == "POST")
        {
            ordinary.Add(new JsonObject { ["id"] = ++sequence, ["body"] = input.Str("body"), ["user"] = new JsonObject { ["id"] = 45916288, ["login"] = "grafanaKibana" } });
            result = ordinary.Last()!.DeepClone();
        }
        else if (route == "/issues/1/comments")
        {
            result = ordinary.Copy();
        }
        else if (route.StartsWith("/compare/", StringComparison.Ordinal))
        {
            result = new JsonObject { ["merge_base_commit"] = new JsonObject { ["sha"] = References["main"] } };
        }
        else if (route.EndsWith("/check-runs", StringComparison.Ordinal))
        {
            string sha = route.Split('/')[2];
            result = new JsonObject
            {
                ["total_count"] = 3,
                ["check_runs"] = new JsonArray(new[] { "pr-title", "major-approval", "validate" }.Select((name, index) => (JsonNode)new JsonObject
                { ["id"] = index + 1, ["name"] = name, ["conclusion"] = "success", ["head_sha"] = sha }).ToArray())
            };
        }
        else if (route.EndsWith("/status", StringComparison.Ordinal))
        {
            result = new JsonObject { ["sha"] = route.Split('/')[2], ["statuses"] = new JsonArray() };
        }
        else if (route == "/actions/workflows/vault-validation.yml/dispatches")
        {
            validations.Add(new JsonObject { ["head_branch"] = input.Str("ref"), ["head_sha"] = References[input.Str("ref")], ["conclusion"] = "success", ["created_at"] = Runtime.Iso() });
            result = null;
        }
        else if (route == "/actions/workflows/vault-validation.yml/runs")
        {
            result = new JsonObject { ["workflow_runs"] = validations.Copy() };
        }
        else
        {
            throw new InvalidOperationException("Unsupported fixture API operation: " + method + " " + path);
        }

        return Task.FromResult(result?.DeepClone());
    }

    public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default)
    {
        Pr!["draft"] = true;
        return Task.FromResult<JsonNode?>(new JsonObject());
    }
}
