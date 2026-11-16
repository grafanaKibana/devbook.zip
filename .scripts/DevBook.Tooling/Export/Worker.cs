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
        if (request.Int("version") != 2 || request.Int("prepared_source_version") != 1
            || !Regex.IsMatch(request.Str("op_id"), "^[A-Za-z0-9_-]{8,80}$", RegexOptions.CultureInvariant)
            || request.Int("pr_number") < 1 || request.Int("generation") < 1
            || request.Str("branch") != Runtime.ExpectedManagedBranch(request.Str("topic_id"), request.Int("generation")))
        {
            throw new Conflict("Export request lacks a supported prepared-source contract or managed identity; preserve it and update the topic base before retrying.");
        }
        _ = Bundle.ExactHead(request.Str("expected_head"));
    }

    public static ExportOpportunity SelectOpportunity(JsonObject state, DateTimeOffset now, int prNumber = 0)
    {
        JsonObject copy = state.Copy();
        JsonObject operations = copy.Obj("export_operations");
        foreach (KeyValuePair<string, JsonNode?> pair in operations.OrderBy(item => item.Value.Str("updated_at"), StringComparer.Ordinal).ThenBy(item => item.Key, StringComparer.Ordinal))
        {
            if (pair.Value is not JsonObject operation
                || copy.Obj("finalized_exports")[pair.Key] is not null && !operation.Obj("evidence").Bool("export_refresh_required"))
            {
                continue;
            }
            if (prNumber > 0 && operation.Int("pr_number", operation.Obj("evidence").Int("pr_number")) != prNumber) continue;
            JsonObject evidence = operation.Obj("evidence");
            if (evidence.Bool("export_paused") || evidence.Bool("export_terminal"))
            {
                continue;
            }
            JsonObject request = evidence.Obj("export_request");
            if (prNumber > 0 && request.Int("pr_number") != prNumber) continue;
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
            if (evidence.Str("export_source_sha").Length != 0 && evidence.Str("export_artifact_hash").Length != 0
                && (!evidence.Bool("export_refresh_required") || evidence.Bool("export_refresh_registered")))
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
            return new(copy, request.Copy(), "collect");
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
        try
        {
            if (!Identity(pr, config, number, branch)) return null;
        }
        catch (UnsafeInput)
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

    private static async Task<JsonObject?> CurrentSourceAsync(IGitHubApi api, JsonObject config, int number, string branch,
        string expected, CancellationToken cancellationToken)
    {
        JsonObject? pr = await CurrentPrAsync(api, config, number, branch, expected, cancellationToken);
        return pr is not null && await CurrentBaseAsync(api, config, pr, expected, cancellationToken) ? pr : null;
    }

    // Locates CI's native export of the managed PR head instead of rendering it a second time.
    // Notes-only PRs on the current base run CI with the base revision's workflow and export policy.
    public static async Task<JsonObject> CollectAsync(IGitHubApi api, JsonObject config, JsonObject request,
        ExportCheckWait? checkWait = null, CancellationToken cancellationToken = default)
    {
        ValidateRequest(request);
        int number = request.Int("pr_number");
        string branch = request.Str("branch");
        string head = request.Str("expected_head");
        if (await CurrentSourceAsync(api, config, number, branch, head, cancellationToken) is null)
        {
            return new JsonObject { ["status"] = "stale", ["reason"] = "Managed source head or current base changed." };
        }
        JsonArray changes = await Runtime.ArrayAsync(api, $"/pulls/{number}/files?per_page=100", cancellationToken);
        foreach (JsonObject entry in changes.OfType<JsonObject>())
        {
            string path = entry.Str("filename");
            if (!(Syncer.SafePath(path) && path.StartsWith("Vault/Home/", StringComparison.Ordinal) && path.EndsWith(".md", StringComparison.Ordinal)))
            {
                throw new UnsafeInput("Managed artifact PR changes files outside its source notes.");
            }
        }
        int seconds = CheckSetting(config, "export_check_wait_seconds", 600, 0, 600);
        int interval = CheckSetting(config, "export_check_poll_seconds", 10, 1, 60);
        TimeProvider clock = checkWait?.Clock ?? TimeProvider.System;
        Func<TimeSpan, CancellationToken, Task> delay = checkWait?.Delay ?? ((duration, token) => Task.Delay(duration, token));
        DateTimeOffset deadline = clock.GetUtcNow() + TimeSpan.FromSeconds(seconds);
        while (true)
        {
            JsonObject? run = await LatestCiRunAsync(api, branch, head, cancellationToken);
            if (run is not null && run.Str("status") == "completed")
            {
                string runId = run["id"]?.ToString() ?? "";
                string attempt = run["run_attempt"]?.ToString() ?? "";
                string name = CiArtifactName(runId, attempt);
                JsonObject listing = await Runtime.ObjectAsync(api, "GET",
                    $"/actions/runs/{Uri.EscapeDataString(runId)}/artifacts?name={Uri.EscapeDataString(name)}&per_page=10", cancellationToken: cancellationToken);
                JsonObject? artifact = listing.Arr("artifacts").OfType<JsonObject>()
                    .FirstOrDefault(item => item.Str("name") == name && item.Obj("workflow_run")["id"]?.ToString() == runId);
                if (artifact is null)
                {
                    return new JsonObject { ["status"] = "export_failed", ["reason"] = $"CI run {runId} produced no native export for {head}." };
                }
                if (artifact.Bool("expired", true))
                {
                    await api.RequestAsync("POST", $"/actions/runs/{Uri.EscapeDataString(runId)}/rerun", new JsonObject(), cancellationToken: cancellationToken);
                    return new JsonObject { ["status"] = "awaiting_ci", ["reason"] = $"CI export expired; re-requested run {runId}." };
                }
                return new JsonObject
                {
                    ["status"] = "located", ["artifact_id"] = artifact["id"]?.ToString(), ["digest"] = artifact.Str("digest"),
                    ["run_id"] = runId, ["run_attempt"] = attempt
                };
            }
            TimeSpan remaining = deadline - clock.GetUtcNow();
            if (remaining <= TimeSpan.Zero)
            {
                return new JsonObject { ["status"] = "awaiting_ci", ["reason"] = "CI has not finished exporting this head yet." };
            }
            await delay(TimeSpan.FromSeconds(Math.Min(interval, remaining.TotalSeconds)), cancellationToken);
        }
    }

    private static async Task<JsonObject?> LatestCiRunAsync(IGitHubApi api, string branch, string head, CancellationToken cancellationToken)
    {
        JsonObject runs = await Runtime.ObjectAsync(api, "GET",
            $"/actions/workflows/{CiWorkflow}/runs?event=pull_request&head_sha={Uri.EscapeDataString(head)}&per_page=100", cancellationToken: cancellationToken);
        return runs.Arr("workflow_runs").OfType<JsonObject>()
            .Where(run => IsCiRun(run, api.Repo, branch, head))
            .OrderBy(run => run.Str("created_at"), StringComparer.Ordinal)
            .ThenBy(run => long.TryParse(run["id"]?.ToString(), out long id) ? id : 0)
            .ThenBy(run => run.Int("run_attempt"))
            .LastOrDefault();
    }

    public static async Task<int> RunAsync(string[] args)
    {
        if (args.Length == 0 || args.Contains("--help"))
        {
            Console.WriteLine("DevBook.Tooling export fixture --app-bundle <path> --output <dir> | collect --request <json> | publish --bundle <json> --request <json> | finalize --request <json> [--repo-root <path>]");
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
            JsonObject result;
            if (args[0] == "fixture")
            {
                result = await Fixture.ExportAsync(root, values["--app-bundle"]);
            }
            else
            {
                JsonObject request = await ReadBoundedAsync(values["--request"], 64 * 1024);
                ValidateRequest(request);
                Runtime.RequireApplyActivation();
                if (Environment.GetEnvironmentVariable("GITHUB_REF") != "refs/heads/" + config.Str("base_branch", "main"))
                {
                    throw new ProductionGate("Export publication is restricted to the configured base-branch workflow.");
                }
                var api = new GhApi(config.Str("repo"));
                if (args[0] == "collect")
                {
                    result = await CollectAsync(api, config, request);
                    await WriteCollectOutputsAsync(result);
                }
                else
                {
                    var store = new StateBranchStore(api, config.Str("state_branch", Runtime.StateBranch));
                    result = args[0] switch
                    {
                        "publish" => await PublishFromFileAsync(api, config, values["--bundle"], request, store),
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
            return result.Str("status") is "checks_failed" or "export_failed" ? 1 : 0;
        }
        catch (Exception error) when (error is RuntimeFailure or IOException or InvalidOperationException or JsonException or FormatException or ArgumentException or IndexOutOfRangeException or KeyNotFoundException)
        {
            Console.Error.WriteLine(new JsonObject { ["status"] = "error", ["message"] = Syncer.SafeText(error.Message, 1000) }.ToJsonString());
            return 1;
        }
    }

    private static async Task<JsonObject> PublishFromFileAsync(IGitHubApi api, JsonObject config, string path,
        JsonObject request, IStateStore store)
    {
        var provenance = new JsonObject();
        foreach ((string key, string variable) in new[]
        {
            ("artifact_id", "DEVBOOK_EXPORT_ARTIFACT_ID"), ("digest", "DEVBOOK_EXPORT_ARTIFACT_DIGEST"),
            ("run_id", "DEVBOOK_EXPORT_RUN_ID"), ("run_attempt", "DEVBOOK_EXPORT_RUN_ATTEMPT"),
            ("bundle_sha256", "DEVBOOK_EXPORT_BUNDLE_SHA256")
        })
        {
            provenance[key] = Environment.GetEnvironmentVariable(variable) ?? "";
        }
        if (new FileInfo(path).Length > Bundle.MaxTotalBytes * 2)
        {
            throw new UnsafeInput("Export artifact file exceeds its size bound.");
        }
        byte[] bytes = await File.ReadAllBytesAsync(path);
        if (Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(bytes)) != provenance.Str("bundle_sha256"))
        {
            throw new UnsafeInput("Downloaded bundle differs from the renderer's independently recorded SHA-256.");
        }
        return await PublishBundleAsync(api, config, JsonData.ParseObject(Encoding.UTF8.GetString(bytes)), request, store,
            provenance: provenance);
    }

    private static async Task WriteCollectOutputsAsync(JsonObject result)
    {
        string? output = Environment.GetEnvironmentVariable("GITHUB_OUTPUT");
        if (string.IsNullOrEmpty(output)) return;
        bool found = result.Str("status") == "located";
        var lines = new List<string> { "found=" + (found ? "true" : "false") };
        if (found)
        {
            foreach ((string key, string name) in new[] { ("artifact_id", "artifact-id"), ("digest", "artifact-digest"), ("run_id", "run-id"), ("run_attempt", "run-attempt") })
            {
                string value = result.Str(key);
                if (!Regex.IsMatch(value, "^[A-Za-z0-9:_-]{1,100}$", RegexOptions.CultureInvariant))
                {
                    throw new UnsafeInput("CI export handoff contains an invalid identity.");
                }
                lines.Add(name + "=" + value);
            }
        }
        await File.AppendAllTextAsync(output, string.Join('\n', lines) + "\n");
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
