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
            Console.WriteLine("DevBook.Tooling improvement [--demo | --dry-run | --apply | --check-feedback-trigger] [--with-model] [--feedback-pr <number>] [--config <root-relative-json>] [--model <id>] [--output-dir <root-relative-dir>] [--repo-root <path>]");
            return 0;
        }
        try
        {
            var options = new Dictionary<string, string>(StringComparer.Ordinal);
            var flags = new HashSet<string>();
            var valued = new HashSet<string> { "--config", "--model", "--output-dir", "--repo-root", "--feedback-pr" };
            var switches = new HashSet<string> { "--demo", "--dry-run", "--apply", "--with-model", "--check-feedback-trigger" };
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
            if (new[] { "--demo", "--dry-run", "--apply", "--check-feedback-trigger" }.Count(flags.Contains) > 1)
            {
                throw new ArgumentException("Choose one execution mode.");
            }
            string root = options.TryGetValue("--repo-root", out string? supplied) ? Path.GetFullPath(supplied) : Repository.FindRoot(scriptRoot);
            string configPath = Path.GetFullPath(Path.Combine(root, options.GetValueOrDefault("--config", ".github/devbook-improvement.json")));
            string output = Path.GetFullPath(Path.Combine(root, options.GetValueOrDefault("--output-dir", "artifacts/devbook-improvement")));
            JsonObject config = JsonData.ParseObject(await File.ReadAllTextAsync(configPath));
            if (config.ContainsKey("feedback_pr"))
            {
                throw new ArgumentException("feedback_pr is an authenticated per-run option, not persistent configuration.");
            }
            int feedbackPr = 0;
            if (options.TryGetValue("--feedback-pr", out string? target))
            {
                if (!int.TryParse(target, out feedbackPr) || feedbackPr < 1 || flags.Contains("--demo")
                    || flags.Contains("--check-feedback-trigger") || !flags.Contains("--apply") && !flags.Contains("--with-model"))
                {
                    throw new ArgumentException("--feedback-pr requires a positive PR number and protected live execution.");
                }
            }
            if (flags.Contains("--check-feedback-trigger"))
            {
                using var admissionDeadline = new CancellationTokenSource(TimeSpan.FromMinutes(2));
                JsonObject admission = await ResolveFeedbackTriggerAsync(config,
                    new GhApi(config.Str("repo"), "GITHUB_TOKEN", readOnly: true), admissionDeadline.Token);
                WriteArtifacts(output, admission);
                WriteWorkflowOutputs(output, admission);
                Console.WriteLine(admission.ToJsonString());
                return 0;
            }
            if (options.TryGetValue("--model", out string? selectedModel))
            {
                config["model"] = selectedModel;
            }
            JsonObject contentAuthorities = Core.LoadContentAuthorities(root);
            JsonObject result;
            using var deadline = new CancellationTokenSource(TimeSpan.FromMinutes(39));
            if (flags.Contains("--demo"))
            {
                result = await Demo.RunAsync(root, config, deadline.Token);
            }
            else if (!flags.Contains("--apply") && !flags.Contains("--with-model"))
            {
                result = await new ImprovementEngine(root, config, new MemoryStateStore(Core.NewState()), contentAuthorities: contentAuthorities).RunAsync(cancellationToken: deadline.Token);
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
                if ((Environment.GetEnvironmentVariable("GITHUB_EVENT_NAME") is "issue_comment" or "workflow_run") && feedbackPr == 0)
                {
                    throw new ProductionGate("Feedback events require an admitted target PR.");
                }
                if (feedbackPr > 0)
                {
                    JsonObject admission = await ResolveFeedbackTriggerAsync(config,
                        new GhApi(config.Str("repo"), readOnly: true), deadline.Token);
                    if (admission.Int("feedback_pr") != feedbackPr)
                    {
                        WriteArtifacts(output, admission);
                        WriteWorkflowOutputs(output, admission);
                        Console.WriteLine(admission.ToJsonString());
                        return 0;
                    }
                    config["feedback_pr"] = feedbackPr;
                }
                var store = new StateBranchStore(api, config.Str("state_branch", Runtime.StateBranch));
                if ((await store.ReadAsync(deadline.Token)).RefSha is null)
                {
                    JsonObject reference = await Runtime.ObjectAsync(api, "GET", "/git/ref/heads/" + Uri.EscapeDataString(config.Str("base_branch", "main")), cancellationToken: deadline.Token);
                    await store.ProvisionAsync(Core.NewState(), reference.Obj("object").Str("sha"), deadline.Token);
                }
                string owner = (Environment.GetEnvironmentVariable("GITHUB_RUN_ID") ?? "local") + ":" + (Environment.GetEnvironmentVariable("GITHUB_RUN_ATTEMPT") ?? "1");
                using FileStream localLock = Runtime.LocalLock(Path.Combine(Path.GetTempPath(), "devbook-improvement.lock"));
                var lease = new DurableLease(store, owner, 40 * 60);
                await lease.AcquireAsync(deadline.Token);
                try
                {
                    var publisher = new GitHubRuntime(api, store, config.Str("base_branch", "main"), config.Arr("required_check_contexts").Strings(), owner);
                    var provider = new ClaudeProvider(config, contentAuthorities: contentAuthorities);
                    result = await new ImprovementEngine(root, config, store, provider, api, publisher, contentAuthorities: contentAuthorities).RunAsync(apply, true, deadline.Token);
                    result["model_diagnostics"] = provider.Diagnostics.Copy();
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
            return result.Str("status") is "provider_error" or "finalization_failed" or "caller_cancelled" ? 1 : 0;
        }
        catch (Exception error) when (error is ArgumentException or IOException or RuntimeFailure or JsonException or TimeoutException or OperationCanceledException)
        {
            Console.Error.WriteLine("devbook-improvement: " + error.Message);
            return 1;
        }
    }

    private static async Task<JsonObject> ResolveFeedbackTriggerAsync(JsonObject config, IGitHubApi api, CancellationToken cancellationToken)
    {
        if (Environment.GetEnvironmentVariable("GITHUB_REF") != "refs/heads/" + config.Str("base_branch", "main"))
        {
            throw new ProductionGate("Feedback admission requires the configured base-branch workflow.");
        }
        string eventPath = Environment.GetEnvironmentVariable("GITHUB_EVENT_PATH") ?? "";
        if (eventPath.Length == 0 || new FileInfo(eventPath).Length > 1_000_000)
        {
            throw new ProductionGate("A bounded GitHub event payload is required for feedback admission.");
        }
        JsonObject payload = JsonData.ParseObject(await File.ReadAllTextAsync(eventPath, cancellationToken));
        return await FeedbackTrigger.ResolveAsync(config, Environment.GetEnvironmentVariable("GITHUB_EVENT_NAME") ?? "",
            payload, api, cancellationToken);
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
        var lines = new List<string> { "export_ready=" + (request is null ? "false" : "true"), "feedback_pr=" + result.Int("feedback_pr") };
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
