using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class EngineCommand
{
    public static async Task<int> RunAsync(string[] args, string? scriptRoot = null)
    {
        if (args.Contains("--help"))
        {
            Console.WriteLine("devbook-improvement.cs [--demo | --dry-run | --apply] [--with-model] [--config <root-relative-json>] [--model <id>] [--output-dir <root-relative-dir>] [--repo-root <path>]");
            return 0;
        }
        try
        {
            var options = new Dictionary<string, string>(StringComparer.Ordinal);
            var flags = new HashSet<string>();
            var valued = new HashSet<string> { "--config", "--model", "--output-dir", "--repo-root" };
            var switches = new HashSet<string> { "--demo", "--dry-run", "--apply", "--with-model" };
            for (var index = 0; index < args.Length; index++)
            {
                if (valued.Contains(args[index]) && index + 1 < args.Length)
                {
                    options.Add(args[index], args[++index]);
                }
                else if (switches.Contains(args[index]))
                {
                    flags.Add(args[index]);
                }
                else
                {
                    throw new ArgumentException("Unknown or incomplete option: " + args[index]);
                }
            }
            if (new[] { "--demo", "--dry-run", "--apply" }.Count(flags.Contains) > 1)
            {
                throw new ArgumentException("Choose one execution mode.");
            }
            string root = options.TryGetValue("--repo-root", out string? supplied) ? Path.GetFullPath(supplied) : Repository.FindRoot(scriptRoot);
            string configPath = Path.GetFullPath(Path.Combine(root, options.GetValueOrDefault("--config", ".github/devbook-improvement.json")));
            string output = Path.GetFullPath(Path.Combine(root, options.GetValueOrDefault("--output-dir", "artifacts/devbook-improvement")));
            JsonObject config = JsonData.ParseObject(await File.ReadAllTextAsync(configPath));
            if (options.TryGetValue("--model", out string? selectedModel))
            {
                config["model"] = selectedModel;
            }
            JsonObject result;
            using var deadline = new CancellationTokenSource(TimeSpan.FromMinutes(config.Int("max_run_minutes", 35)));
            if (flags.Contains("--demo"))
            {
                result = await Demo.RunAsync(root, config, deadline.Token);
            }
            else if (!flags.Contains("--apply") && !flags.Contains("--with-model"))
            {
                result = await new ImprovementEngine(root, config, new MemoryStateStore(Core.NewState())).RunAsync(cancellationToken: deadline.Token);
            }
            else
            {
                bool apply = flags.Contains("--apply");
                if (apply)
                {
                    Runtime.RequireApplyActivation();
                }
                else if (new[] { "DEVBOOK_IMPROVEMENT_ACTIVATED", "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED", "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED" }
                    .Any(key => Environment.GetEnvironmentVariable(key) != "true"))
                {
                    throw new ProductionGate("Live dry-run requires confirmed state writes, subscription-only access and disabled usage credits.");
                }
                if (Environment.GetEnvironmentVariable("GITHUB_REF") != "refs/heads/" + config.Str("base_branch", "main"))
                {
                    throw new ProductionGate("Live operation is restricted to the configured base-branch workflow.");
                }
                var api = new GhApi(config.Str("repo"));
                var store = new StateBranchStore(api, config.Str("state_branch", Runtime.StateBranch));
                if ((await store.ReadAsync(deadline.Token)).RefSha is null)
                {
                    JsonObject reference = await Runtime.ObjectAsync(api, "GET", "/git/ref/heads/" + Uri.EscapeDataString(config.Str("base_branch", "main")), cancellationToken: deadline.Token);
                    await store.ProvisionAsync(Core.NewState(), reference.Obj("object").Str("sha"), deadline.Token);
                }
                string owner = (Environment.GetEnvironmentVariable("GITHUB_RUN_ID") ?? "local") + ":" + (Environment.GetEnvironmentVariable("GITHUB_RUN_ATTEMPT") ?? "1");
                using FileStream localLock = Runtime.LocalLock(Path.Combine(Path.GetTempPath(), "devbook-improvement.lock"));
                var lease = new DurableLease(store, owner, config.Int("max_run_minutes", 35) * 60 + 120);
                await lease.AcquireAsync(deadline.Token);
                try
                {
                    var publisher = new GitHubRuntime(api, store, config.Str("base_branch", "main"), config.Arr("required_check_contexts").Strings(), owner);
                    result = await new ImprovementEngine(root, config, store, new ClaudeProvider(config), api, publisher).RunAsync(apply, true, deadline.Token);
                }
                finally
                {
                    using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                    await lease.ReleaseAsync(cleanup.Token);
                }
            }
            WriteArtifacts(output, result);
            WriteWorkflowOutputs(output, result);
            if (result.Str("status") != "cooldown" || result.Bool("notice"))
            {
                Console.WriteLine(new JsonObject(result.Where(item => new[] { "status", "topic", "model_calls", "notice" }.Contains(item.Key))
                    .Select(item => new KeyValuePair<string, JsonNode?>(item.Key, item.Value?.DeepClone()))).ToJsonString());
            }
            return 0;
        }
        catch (Exception error) when (error is ArgumentException or IOException or RuntimeFailure or JsonException or TimeoutException or OperationCanceledException)
        {
            Console.Error.WriteLine("devbook-improvement: " + error.Message);
            return 1;
        }
    }

    public static void WriteArtifacts(string directory, JsonObject result)
    {
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, "result.json"), result.ToJsonString(JsonData.Options) + "\n", new UTF8Encoding(false));
        foreach ((string key, string filename) in new[] { ("summary", "pr-summary.md"), ("diff", "proposed.patch") })
        {
            if (result[key] is not null)
            {
                File.WriteAllText(Path.Combine(directory, filename), result.Str(key), new UTF8Encoding(false));
            }
        }
        if (result["question_changes"] is JsonArray questions)
        {
            File.WriteAllText(Path.Combine(directory, "question-changes.json"), questions.ToJsonString(JsonData.Options) + "\n", new UTF8Encoding(false));
        }
        if (result["export_request"] is JsonObject request)
        {
            Worker.ValidateRequest(request);
            File.WriteAllText(Path.Combine(directory, "export-request.json"), request.ToJsonString(JsonData.Options) + "\n", new UTF8Encoding(false));
        }
    }

    private static void WriteWorkflowOutputs(string directory, JsonObject result)
    {
        string? path = Environment.GetEnvironmentVariable("GITHUB_OUTPUT");
        if (string.IsNullOrEmpty(path))
        {
            return;
        }
        JsonObject? request = result["export_request"] as JsonObject;
        var lines = new List<string> { "export_ready=" + (request is null ? "false" : "true") };
        if (request is not null)
        {
            Worker.ValidateRequest(request);
            lines.Add("export_mode=" + result.Str("export_mode", "render"));
            lines.Add("pr_number=" + request.Int("pr_number"));
            lines.Add("branch=" + request.Str("branch"));
            lines.Add("expected_head=" + request.Str("expected_head"));
            lines.Add("export_request=" + Path.Combine(directory, "export-request.json"));
        }
        File.AppendAllText(path, string.Join('\n', lines) + "\n");
    }
}
