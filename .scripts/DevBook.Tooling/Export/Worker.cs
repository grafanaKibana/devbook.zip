using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public sealed record ExportOpportunity(JsonObject State, JsonObject? Request, string Mode);

public static partial class Worker
{
    public const string ExportCommitMessage = "notes: export reviewed DevBook improvements";

    public static void ValidateRequest(JsonObject request)
    {
        if (request.Int("version") != 1 || request.Int("prepared_source_version") != 1
            || !Regex.IsMatch(request.Str("op_id"), "^[A-Za-z0-9_-]{8,80}$", RegexOptions.CultureInvariant)
            || request.Int("pr_number") < 1 || request.Int("generation") < 1
            || request.Str("branch") != Runtime.ExpectedManagedBranch(request.Str("topic_id"), request.Int("generation")))
        {
            throw new Conflict("Export request lacks a supported prepared-source contract or managed identity; preserve it and update the topic base before retrying.");
        }
        _ = Bundle.ExactHead(request.Str("expected_head"));
    }

    public static ExportOpportunity SelectOpportunity(JsonObject state, DateTimeOffset now)
    {
        JsonObject copy = state.Copy();
        JsonObject operations = copy.Obj("export_operations");
        foreach (KeyValuePair<string, JsonNode?> pair in operations.OrderBy(item => item.Value.Str("updated_at"), StringComparer.Ordinal).ThenBy(item => item.Key, StringComparer.Ordinal))
        {
            if (pair.Value is not JsonObject operation || copy.Obj("finalized_exports")[pair.Key] is not null)
            {
                continue;
            }
            JsonObject evidence = operation.Obj("evidence");
            if (evidence.Bool("export_paused") || evidence.Bool("export_terminal"))
            {
                continue;
            }
            JsonObject request = evidence.Obj("export_request");
            try
            {
                ValidateRequest(request);
            }
            catch (Conflict error)
            {
                evidence["export_paused"] = true;
                evidence["export_error"] = error.Message;
                operation["evidence"] = evidence;
                continue;
            }
            if (evidence.Str("export_commit_sha").Length != 0)
            {
                return new(copy, request.Copy(), "finalize");
            }
            DateTimeOffset? last = Runtime.ParseTime(evidence.Str("export_last_dispatch_at"));
            if (last is not null && last.Value.AddHours(6) > now)
            {
                continue;
            }
            int attempts = evidence.Int("export_attempts");
            if (attempts >= 3)
            {
                evidence["export_paused"] = true;
                evidence["export_error"] = "Automatic export reached three bounded attempts. Inspect the failed run before explicitly resuming this operation.";
                operation["evidence"] = evidence;
                continue;
            }
            evidence["export_attempts"] = attempts + 1;
            evidence["export_last_dispatch_at"] = Runtime.Iso(now);
            operation["evidence"] = evidence;
            return new(copy, request.Copy(), "render");
        }
        return new(copy, null, "none");
    }

    private static bool Identity(JsonObject pr, JsonObject config, int number, string branch)
    {
        (string Topic, int Generation)? marker = Runtime.ParseMarker(pr.Str("body"));
        JsonObject actor = pr.Obj("user");
        bool allowed = config.Arr("owner_allowlist").OfType<JsonObject>().Any(owner => owner.Int("id", -1) == actor.Int("id", -2)
            && LegacyIdentity.CaseFold(owner.Str("login")) == LegacyIdentity.CaseFold(actor.Str("login")));
        if (!allowed || marker is null || pr.Int("number") != number
            || !Runtime.ValidPrIdentity(pr, config.Str("repo"), config.Str("base_branch", "main"), marker.Value.Topic, marker.Value.Generation)
            || branch != Runtime.ExpectedManagedBranch(marker.Value.Topic, marker.Value.Generation))
        {
            throw new UnsafeInput("Export PR author or machine-readable managed identity changed.");
        }
        return Runtime.Lifecycle(pr) == "open";
    }

    private static async Task<JsonObject?> CurrentPrAsync(IGitHubApi api, JsonObject config, int number, string branch,
        string expected, CancellationToken cancellationToken)
    {
        _ = Bundle.ExactHead(expected);
        if (number < 1)
        {
            throw new UnsafeInput("Invalid export PR number.");
        }
        JsonObject pr = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
        if (!Identity(pr, config, number, branch))
        {
            return null;
        }
        JsonObject reference = await Runtime.ObjectAsync(api, "GET", "/git/ref/heads/" + Uri.EscapeDataString(branch), cancellationToken: cancellationToken);
        return pr.Obj("head").Str("sha") == expected && reference.Obj("object").Str("sha") == expected ? pr : null;
    }

    private static async Task<bool> CurrentBaseAsync(IGitHubApi api, JsonObject config, JsonObject pr, string head, CancellationToken cancellationToken)
    {
        string baseBranch = config.Str("base_branch", "main");
        JsonObject reference = await Runtime.ObjectAsync(api, "GET", "/git/ref/heads/" + Uri.EscapeDataString(baseBranch), cancellationToken: cancellationToken);
        string expectedBase = Bundle.ExactHead(reference.Obj("object").Str("sha"));
        if (pr.Obj("base").Str("sha") != expectedBase)
        {
            return false;
        }
        JsonObject comparison = await Runtime.ObjectAsync(api, "GET", $"/compare/{expectedBase}...{head}", cancellationToken: cancellationToken);
        return comparison.Obj("merge_base_commit").Str("sha") == expectedBase;
    }

    public static async Task<JsonObject> RenderManagedAsync(string trusted, IGitHubApi api, JsonObject config,
        int number, string branch, string expected, string appBundle, int timeoutSeconds = 600, CancellationToken cancellationToken = default)
    {
        JsonObject? pr = await CurrentPrAsync(api, config, number, branch, expected, cancellationToken);
        if (pr is null || !await CurrentBaseAsync(api, config, pr, expected, cancellationToken))
        {
            return new JsonObject { ["status"] = "stale", ["reason"] = "Managed source head or current base changed." };
        }
        JsonArray changes = await Runtime.ArrayAsync(api, $"/pulls/{number}/files?per_page=100", cancellationToken);
        foreach (JsonObject entry in changes.OfType<JsonObject>())
        {
            string path = entry.Str("filename");
            if (!(Syncer.SafePath(path) && path.StartsWith("Vault/Home/", StringComparison.Ordinal) && path.EndsWith(".md", StringComparison.Ordinal))
                && !Receipt.IsExportPath(path))
            {
                throw new UnsafeInput("Managed export PR changes files outside notes and generated output.");
            }
        }
        using var owned = new OwnedExportCheckout("devbook-managed-export-");
        (await new SystemProcessRunner().RunAsync(new ProcessRequest("git",
            ["clone", "--no-hardlinks", "--quiet", Path.GetFullPath(trusted), owned.Root], owned.Directory), cancellationToken)).EnsureSuccess("Clone isolated managed export");
        Git.Run(owned.Root, "checkout", "-B", branch, expected);
        VerifyTrustedPolicy(trusted, owned.Root);
        await Desktop.ExportCheckoutAsync(owned.Root, expected, appBundle, timeoutSeconds, cancellationToken);
        JsonObject bundle = Bundle.FromCheckout(owned.Root, number, branch, expected);
        Receipt.Validate(JsonData.ParseObject(Encoding.UTF8.GetString(Bundle.Decode(bundle)[Receipt.PathName]!)), Receipt.IndexEntries(owned.Root));
        return new JsonObject { ["status"] = "rendered", ["bundle"] = bundle };
    }

    public static void VerifyTrustedPolicy(string trusted, string candidate)
    {
        GitTreeEntry[] trustedEntries = Receipt.TreeEntries(trusted).Where(entry => entry.Type != "tree" && Receipt.IsPolicyPath(entry.Path)).ToArray();
        GitTreeEntry[] candidateEntries = Receipt.TreeEntries(candidate).Where(entry => entry.Type != "tree" && Receipt.IsPolicyPath(entry.Path)).ToArray();
        _ = Receipt.Make(Receipt.TreeEntries(candidate));
        if (!Bundle.SameLeaves(trustedEntries, candidateEntries))
        {
            throw new UnsafeInput("Candidate export policy differs from the trusted workflow checkout; update its base before retrying.");
        }
        foreach (GitTreeEntry entry in trustedEntries)
        {
            Syncer.EnsureRegularPath(trusted, entry.Path);
            Syncer.EnsureRegularPath(candidate, entry.Path);
            byte[] expected = File.ReadAllBytes(Path.Combine(trusted, entry.Path));
            byte[] actual = File.ReadAllBytes(Path.Combine(candidate, entry.Path));
            if (Bundle.BlobSha(expected) != entry.Sha || !actual.AsSpan().SequenceEqual(expected))
            {
                throw new UnsafeInput("Candidate renderer implementation or plugin differs from the trusted workflow revision.");
            }
        }
    }

    public static async Task<int> RunAsync(string[] args)
    {
        if (args.Length == 0 || args.Contains("--help"))
        {
            Console.WriteLine("DevBook.Tooling export fixture --app-bundle <path> --output <dir> | render --request <json> --app-bundle <path> --output <dir> | publish --bundle <json> --request <json> | finalize --request <json> [--repo-root <path>]");
            return args.Length == 0 ? 2 : 0;
        }
        try
        {
            var values = new Dictionary<string, string>(StringComparer.Ordinal);
            for (var index = 1; index < args.Length; index += 2)
            {
                values.Add(args[index], args[index + 1]);
            }
            string root = Repository.FindRoot(values.GetValueOrDefault("--repo-root"));
            JsonObject config = JsonData.ParseObject(await File.ReadAllTextAsync(Path.Combine(root, ".github/devbook-improvement.json")));
            config = Pilot.Configure(config, () => Git.Text(root, "rev-parse", "HEAD"));
            JsonObject result;
            if (args[0] == "fixture")
            {
                result = await Fixture.ExportAsync(root, values["--app-bundle"]);
            }
            else
            {
                JsonObject request = await ReadBoundedAsync(values["--request"], 64 * 1024);
                ValidateRequest(request);
                if (args[0] == "render")
                {
                    var api = new GhApi(config.Str("repo"), "DEVBOOK_EXPORT_READ_TOKEN", readOnly: true);
                    result = await RenderManagedAsync(root, api, config, request.Int("pr_number"), request.Str("branch"), request.Str("expected_head"), values["--app-bundle"]);
                }
                else
                {
                    Runtime.RequireApplyActivation();
                    if (Environment.GetEnvironmentVariable("GITHUB_REF") != "refs/heads/" + config.Str("base_branch", "main"))
                    {
                        throw new ProductionGate("Export publication is restricted to the configured base-branch workflow.");
                    }
                    var api = new GhApi(config.Str("repo"));
                    var store = new StateBranchStore(api, config.Str("state_branch", Runtime.StateBranch));
                    result = args[0] switch
                    {
                        "publish" => await PublishBundleAsync(api, config, await ReadBoundedAsync(values["--bundle"], Bundle.MaxTotalBytes * 2), request, store),
                        "finalize" => await FinalizeAsync(api, config, store, request),
                        _ => throw new UnsafeInput("Unknown export-worker mode.")
                    };
                }
            }
            if (values.TryGetValue("--output", out string? directory))
            {
                Directory.CreateDirectory(directory);
                JsonNode? bundle = result["bundle"]?.DeepClone();
                result.Remove("bundle");
                if (bundle is not null)
                {
                    await File.WriteAllTextAsync(Path.Combine(directory, "bundle.json"), bundle.ToJsonString(JsonData.Options) + "\n");
                }
                await File.WriteAllTextAsync(Path.Combine(directory, "result.json"), result.ToJsonString(JsonData.Options) + "\n");
                string? output = Environment.GetEnvironmentVariable("GITHUB_OUTPUT");
                if (!string.IsNullOrEmpty(output))
                {
                    await File.AppendAllTextAsync(output, "ready=" + (bundle is null ? "false" : "true") + "\n");
                }
            }
            Console.WriteLine(result.ToJsonString());
            return result.Str("status") == "checks_failed" ? 1 : 0;
        }
        catch (Exception error) when (error is RuntimeFailure or IOException or InvalidOperationException or JsonException or FormatException or ArgumentException or IndexOutOfRangeException or KeyNotFoundException)
        {
            Console.Error.WriteLine(new JsonObject { ["status"] = "error", ["message"] = Syncer.SafeText(error.Message, 1000) }.ToJsonString());
            return 1;
        }
    }

    private static async Task<JsonObject> ReadBoundedAsync(string path, int maxBytes)
    {
        if (new FileInfo(path).Length > maxBytes)
        {
            throw new UnsafeInput("Export artifact file exceeds its size bound.");
        }
        return JsonData.ParseObject(await File.ReadAllTextAsync(path));
    }
}

internal sealed class OwnedExportCheckout : IDisposable
{
    public OwnedExportCheckout(string prefix)
    {
        Directory = Path.Combine(Path.GetTempPath(), prefix + Guid.NewGuid().ToString("N"));
        System.IO.Directory.CreateDirectory(Directory);
        Root = Path.Combine(Directory, "repo");
    }

    public string Directory { get; }
    public string Root { get; }

    public void Dispose()
    {
        string[] backups = System.IO.Directory.Exists(Root)
            ? System.IO.Directory.EnumerateDirectories(Root, ".desktop-export-*", SearchOption.TopDirectoryOnly)
                .Select(path => Path.Combine(path, "settings")).Where(System.IO.Directory.Exists).ToArray() : [];
        if (backups.Length != 0)
        {
            throw new RuntimeFailure($"Desktop export checkout retained for recovery at {Directory}; original settings: {backups[0]}");
        }
        System.IO.Directory.Delete(Directory, true);
    }
}
