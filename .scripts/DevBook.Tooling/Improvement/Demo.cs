using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class Demo
{
    public static async Task<JsonObject> RunAsync(string root, JsonObject configuration, CancellationToken cancellationToken = default)
    {
        string temporary = Path.Combine(Path.GetTempPath(), "devbook-native-demo-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(temporary);
        try
        {
            JsonObject config = configuration.Copy();
            config["max_notes_per_run"] = 1;
            config["automatic_export"] = true;
            config["owner_allowlist"] = new JsonArray(new JsonObject { ["id"] = 45916288, ["login"] = "grafanaKibana" });
            foreach (string path in Core.ContentAuthorities)
            {
                if (File.Exists(Path.Combine(root, path)))
                {
                    string target = Path.Combine(temporary, path);
                    Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                    File.Copy(Path.Combine(root, path), target);
                }
            }
            var sources = new Dictionary<string, string>
            {
                ["Vault/Home/Programming/NET/A Tasks.md"] = Note("Task", "task_demo"),
                ["Vault/Home/Programming/NET/B ValueTask.md"] = Note("ValueTask", "value_demo")
            };
            foreach (KeyValuePair<string, string> source in sources)
            {
                string path = Path.Combine(temporary, source.Key);
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, source.Value);
            }
            var api = new DemoApi(config.Str("repo"), sources);
            JsonObject initial = Core.NewState();
            initial["legacy_extension"] = new JsonObject { ["retained"] = "unknown fields survive" };
            var store = new MemoryStateStore(initial);
            var clock = new DemoClock(DateTimeOffset.UtcNow);
            var model = new DemoModel(clock);
            var steps = new JsonArray();
            async Task<JsonObject> Opportunity()
            {
                const string owner = "demo-maintenance";
                var lease = new DurableLease(store, owner, 2400, clock);
                await lease.AcquireAsync(cancellationToken);
                try
                {
                    var runtime = new GitHubRuntime(api, store, requiredChecks: ["pr-title", "major-approval"], leaseOwner: owner, timeProvider: clock,
                        checkAttempts: 1, checkInterval: TimeSpan.Zero, activation: () => { });
                    JsonArray Notes() => new(sources.Select(source => (JsonNode)new JsonObject
                    {
                        ["path"] = source.Key,
                        ["topic"] = Core.TopicFor(source.Key),
                        ["content"] = source.Value,
                        ["hash"] = LegacyIdentity.Digest(source.Value),
                        ["violations"] = new JsonArray()
                    }).ToArray());
                    return await new ImprovementEngine(temporary, config, store, model, api, runtime, Notes,
                        (_, _, _) => Task.FromResult(new JsonArray(new JsonObject { ["check"] = "fixture structural validation adapter", ["result"] = "passed" })),
                        (_, _) => Task.FromResult("Fixture primary documentation: an asynchronous operation does not guarantee a dedicated thread."), clock,
                        () => api.References["main"]).RunAsync(true, true, cancellationToken);
                }
                finally
                {
                    await lease.ReleaseAsync(cancellationToken);
                }
            }
            async Task FinishExport(JsonObject result)
            {
                JsonObject request = result.RequiredObject("export_request");
                JsonObject bundle = ExportBundle(api, request);
                JsonObject exported = await Worker.PublishBundleAsync(api, config, bundle, request, store, cancellationToken: cancellationToken);
                if (exported.Str("status") != "exported")
                {
                    throw new RuntimeFailure("Native demo export finalization failed: " + exported.Str("status"));
                }
                steps.Add(new JsonObject { ["stage"] = "generated-only fixture export", ["status"] = exported.Str("status"), ["commit_sha"] = exported.Str("commit_sha") });
            }
            JsonObject first = await Opportunity();
            steps.Add(new JsonObject { ["stage"] = "first topic batch", ["status"] = first.Str("status") });
            await FinishExport(first);
            api.Pr!["body"] = "Owner-written context stays here.\n\n" + api.Pr.Str("body");
            JsonObject second = await Opportunity();
            steps.Add(new JsonObject { ["stage"] = "append second batch to same PR", ["status"] = second.Str("status") });
            await FinishExport(second);
            api.OwnerFeedback("Clarify the scheduling boundary.", clock.GetUtcNow());
            JsonObject feedback = await Opportunity();
            steps.Add(new JsonObject { ["stage"] = "verified inline feedback", ["status"] = feedback.Str("status") });
            await FinishExport(feedback);
            api.OwnerFeedback("Clarify completion semantics.", clock.GetUtcNow().AddMinutes(1));
            model.ReviewQuota = true;
            JsonObject limited = await Opportunity();
            int callsAtLimit = model.AuthorCalls + model.ReviewCalls;
            JsonObject quiet = await Opportunity();
            if (limited.Str("status") != "cooldown" || !limited.Bool("notice") || quiet.Bool("notice") || model.AuthorCalls + model.ReviewCalls != callsAtLimit)
            {
                throw new RuntimeFailure("Native demo cooldown did not suppress repeated calls and notices.");
            }
            JsonObject pending = (await store.ReadAsync(cancellationToken)).State.Obj("pending_author_proposal").Copy();
            string preparedAt = pending.Str("prepared_at");
            clock.Advance(TimeSpan.FromHours(2));
            int authorsBeforeResume = model.AuthorCalls;
            JsonObject resumed = await Opportunity();
            if (model.AuthorCalls != authorsBeforeResume || resumed.Int("model_calls") != 1)
            {
                throw new RuntimeFailure("Native demo did not resume the source-matched proposal with reviewer only.");
            }
            await FinishExport(resumed);
            JsonObject finalState = (await store.ReadAsync(cancellationToken)).State;
            if (api.CreatedPrs != 1 || !api.Pr.Str("body").StartsWith("Owner-written context stays here.", StringComparison.Ordinal)
                || finalState.Obj("legacy_extension").Str("retained") != "unknown fields survive")
            {
                throw new RuntimeFailure("Native demo lost existing PR identity, owner text or legacy state.");
            }
            JsonObject lastOperation = finalState.Obj("export_operations").Select(item => item.Value).OfType<JsonObject>().Last();
            if (lastOperation.Str("prepared_at") != preparedAt)
            {
                throw new RuntimeFailure("Native demo changed the prepared source timestamp while resuming.");
            }
            steps.Add(new JsonObject { ["stage"] = "edited feedback + weekly limit", ["status"] = limited.Str("status"), ["quiet_repeat"] = quiet.Str("status"), ["resume_model_calls"] = resumed.Int("model_calls") });
            resumed["status"] = "demo_complete";
            resumed["fixture"] = true;
            resumed["limitations"] = "Fake model, API, validation and renderer boundaries; no Claude request, real PR, account credential or genuine desktop export was used.";
            resumed["steps"] = steps;
            resumed["author_calls"] = model.AuthorCalls;
            resumed["review_calls"] = model.ReviewCalls;
            resumed["created_prs"] = api.CreatedPrs;
            resumed["updated_prs"] = api.UpdatedPrs;
            resumed["branch_writes"] = api.BranchWrites;
            resumed["state_preserved"] = true;
            resumed["same_pr"] = 1;
            resumed["feedback_revisions"] = finalState.Obj("feedback").Count;
            resumed["prepared_at_preserved"] = true;
            resumed["summary"] = api.Pr.Str("body");
            resumed["model_calls"] = model.AuthorCalls + model.ReviewCalls;
            resumed.Remove("export_request");
            resumed.Remove("export_mode");
            return resumed;
        }
        finally
        {
            Directory.Delete(temporary, recursive: true);
        }
    }

    private static string Note(string focus, string id) => $$"""
        ---
        topic: [Programming]
        subtopic: [NET]
        level: ["2"]
        priority: Medium
        status: Creation
        publish: false
        created: "2026-01-01T00:00:00.000Z"
        modified: "2026-01-01T00:00:00.000Z"
        qard-deck: "Programming"
        qard-topic: "NET/{{focus}}"
        ---

        {{focus}} needs a concrete explanation.

        # Questions

        <!-- qard-id: {{id}} -->
        > [!qard]- What does {{focus}} represent?
        > {{focus}} is useful.

        """;

    private static JsonObject ExportBundle(DemoApi api, JsonObject request)
    {
        string head = request.Str("expected_head");
        Dictionary<string, GitTreeEntry> entries = new(api.Tree(head));
        var changes = new Dictionary<string, byte[]?>
        {
            ["Web/content/demo.md"] = Encoding.UTF8.GetBytes("Fixture-generated output for " + head),
            ["Web/content/assets/demo.bin"] = [0, 1, 2, 255]
        };
        if (entries.ContainsKey("Web/content/retire-me.md"))
        {
            changes["Web/content/retire-me.md"] = null;
        }
        foreach (KeyValuePair<string, byte[]?> item in changes)
        {
            if (item.Value is null)
            {
                entries.Remove(item.Key);
            }
            else
            {
                entries[item.Key] = new GitTreeEntry(item.Key, "100644", "blob", Bundle.BlobSha(item.Value));
            }
        }
        changes[Receipt.PathName] = Encoding.UTF8.GetBytes(Receipt.Make(entries.Values).ToJsonString(JsonData.Options));
        return new JsonObject
        {
            ["version"] = 1,
            ["pr_number"] = request.Int("pr_number"),
            ["branch"] = request.Str("branch"),
            ["expected_head"] = head,
            ["files"] = new JsonObject(changes.Select(item => new KeyValuePair<string, JsonNode?>(item.Key, item.Value is null ? null : JsonValue.Create(Convert.ToBase64String(item.Value)))))
        };
    }
}

internal sealed class DemoClock(DateTimeOffset now) : TimeProvider
{
    private DateTimeOffset instant = now;
    public override DateTimeOffset GetUtcNow() => instant;
    public void Advance(TimeSpan amount) => instant += amount;
}

internal sealed class DemoModel(TimeProvider clock) : IModelProvider
{
    public int AuthorCalls { get; private set; }
    public int ReviewCalls { get; private set; }
    public bool ReviewQuota { get; set; }
    public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
    {
        AuthorCalls++;
        KeyValuePair<string, JsonNode?> selected = payload.RequiredObject("notes").First();
        string path = selected.Key;
        string text = selected.Value!.GetValue<string>();
        string focus = path.Contains("ValueTask", StringComparison.Ordinal) ? "ValueTask" : "Task";
        string prose = text.Split('\n').First(line => line.StartsWith(focus + " ", StringComparison.Ordinal));
        string feedback = string.Join(' ', payload.Arr("feedback").OfType<JsonObject>().Select(item => item.Str("body")));
        string explanation = feedback.Contains("completion", StringComparison.OrdinalIgnoreCase)
            ? $"{focus} represents an asynchronous operation; completion may occur without a dedicated thread, while scheduling determines executable work."
            : feedback.Length > 0 ? $"{focus} represents an asynchronous operation; scheduling and completion determine whether work occupies a thread."
            : $"{focus} represents an asynchronous operation rather than a dedicated thread; scheduling and completion are separate concerns.";
        string card = Proposal.QardSpans(text)[0].Text;
        string metadata = string.Join('\n', card.Split('\n').Where(line => line.StartsWith("<!-- qard-", StringComparison.Ordinal)));
        string url = "https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks." + focus.ToLowerInvariant();
        string after = metadata + $"\n> [!qard]- What does {focus} represent?\n> {explanation} [Microsoft documentation]({url})\n";
        JsonArray feedbackKeys = new(payload.Arr("feedback").OfType<JsonObject>().Select(item => (JsonNode?)JsonValue.Create(item.Str("key"))).ToArray());
        JsonObject Edit(string before, string next, string kind) => new()
        {
            ["path"] = path,
            ["expected_hash"] = LegacyIdentity.Digest(text),
            ["before"] = before,
            ["after"] = next,
            ["kind"] = kind,
            ["learning_target"] = "same",
            ["reason"] = "Make the operation and thread boundary recoverable.",
            ["essential_meanings"] = kind == "note" ? new JsonArray() : new JsonArray("Represents asynchronous work", "Does not guarantee a dedicated thread"),
            ["sources"] = kind == "note" ? new JsonArray() : new JsonArray(new JsonObject { ["url"] = url, ["claim"] = "An asynchronous operation does not guarantee a dedicated thread.", ["version"] = "not version-specific" }),
            ["feedback_keys"] = feedbackKeys.Copy()
        };
        return Task.FromResult(new JsonObject
        {
            ["version"] = 1,
            ["edits"] = new JsonArray(Edit("\n\n" + prose + "\n\n", "\n\n" + explanation + "\n\n", "note"), Edit(card, after, "rewrite")),
            ["dispositions"] = new JsonArray(new JsonObject { ["path"] = path, ["outcome"] = "changed", ["reason"] = "Coordinate explanation and overview card." }),
            ["feedback"] = new JsonArray(payload.Arr("feedback").OfType<JsonObject>().Select(item => (JsonNode)new JsonObject
            { ["key"] = item.Str("key"), ["outcome"] = "implemented", ["reason"] = "Clarified the requested mechanism and boundary." }).ToArray())
        });
    }

    public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
    {
        ReviewCalls++;
        if (ReviewQuota)
        {
            ReviewQuota = false;
            throw new ClaudeQuotaException("weekly", clock.GetUtcNow().AddHours(1), clock.GetUtcNow().AddHours(1), "Fixture weekly limit");
        }
        var reports = new JsonArray();
        foreach (KeyValuePair<string, JsonNode?> item in payload.RequiredObject("current"))
        {
            string[] lines = item.Value!.GetValue<string>().Split('\n');
            int index = Array.FindIndex(lines, line => line.Contains("represents an asynchronous operation", StringComparison.Ordinal) && !line.StartsWith('>'));
            reports.Add(new JsonObject
            {
                ["path"] = item.Key,
                ["verdict"] = "CLEAN",
                ["summary"] = "The complete note explains the operation and thread boundary.",
                ["page_type"] = "concept",
                ["current_text_evidence"] = new JsonArray(new JsonObject { ["quote"] = lines[index], ["line_start"] = index + 1, ["reason"] = "The owning explanation states both the mechanism and its boundary." }),
                ["target_resolution"] = "RESOLVED",
                ["split_suggestion"] = "Keep together: the operation and thread boundary form one learning target.",
                ["findings"] = new JsonArray(),
                ["source_checks"] = new JsonArray(payload.RequiredObject("proposal").Arr("edits").OfType<JsonObject>().Where(edit => edit.Str("path") == item.Key).SelectMany(edit => edit.Arr("sources").OfType<JsonObject>())
                    .Select(source => (JsonNode)new JsonObject { ["url"] = source.Str("url"), ["claim"] = source.Str("claim"), ["result"] = "SUPPORTED", ["reason"] = "Fixture primary-source evidence states this boundary." }).ToArray()),
                ["rejection_equivalence"] = new JsonArray(),
                ["quality"] = new JsonObject { ["accuracy"] = "PASS", ["clarity"] = "PASS", ["rules_compliance"] = "PASS", ["question_quality"] = "PASS", ["identity_safety"] = "PASS" }
            });
        }
        return Task.FromResult(new JsonObject { ["verdict"] = "CLEAN", ["notes"] = reports, ["overall_reason"] = "Fixture review adapter checked complete final candidates.", ["decision_checks"] = new JsonArray() });
    }
}
