using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

namespace DevBook.Tooling.Improvement;

public sealed partial class ImprovementEngine
{
    private readonly string root;
    private readonly JsonObject config;
    private readonly IStateStore store;
    private readonly IModelProvider? model;
    private readonly IGitHubApi? api;
    private readonly GitHubRuntime? publisher;
    private readonly Func<JsonArray> notesLoader;
    private readonly Func<Dictionary<string, string>, Dictionary<string, string>, CancellationToken, Task<JsonArray>> validator;
    private readonly Func<string, CancellationToken, Task<string>> sourceFetcher;
    private readonly Func<string> snapshotShaLoader;
    private string? validationSnapshotSha;
    private readonly TimeProvider clock;
    private readonly long started;
    private StateSnapshot? expectedSnapshot;
    private int modelCalls;

    public ImprovementEngine(string root, JsonObject config, IStateStore store, IModelProvider? model = null, IGitHubApi? api = null,
        GitHubRuntime? publisher = null, Func<JsonArray>? notesLoader = null,
        Func<Dictionary<string, string>, Dictionary<string, string>, CancellationToken, Task<JsonArray>>? validator = null,
        Func<string, CancellationToken, Task<string>>? sourceFetcher = null, TimeProvider? clock = null, Func<string>? snapshotShaLoader = null)
    {
        this.root = Path.GetFullPath(root);
        this.config = config.Copy();
        this.store = store;
        this.model = model;
        this.api = api;
        this.publisher = publisher;
        this.notesLoader = notesLoader ?? (() => Core.Inventory(this.root));
        this.validator = validator ?? ValidateAsync;
        this.sourceFetcher = sourceFetcher ?? FetchSourceAsync;
        this.clock = clock ?? TimeProvider.System;
        this.snapshotShaLoader = snapshotShaLoader ?? CheckoutSnapshotSha;
        started = this.clock.GetTimestamp();
    }

    private static Dictionary<string, string> Map(JsonObject value) => value.ToDictionary(item => item.Key, item => item.Value!.GetValue<string>(), StringComparer.Ordinal);
    private static JsonObject ObjectMap(IReadOnlyDictionary<string, string> value) => new(value.Select(item => new KeyValuePair<string, JsonNode?>(item.Key, JsonValue.Create(item.Value))));
    private static JsonArray Copies(IEnumerable<JsonNode?> values) => new(values.Select(value => value?.DeepClone()).ToArray());
    private static JsonObject EnsureObject(JsonObject parent, string key)
    {
        if (parent[key] is not JsonObject result)
        {
            result = new JsonObject();
            parent[key] = result;
        }

        return result;
    }

    private async Task<JsonObject> InitialStateAsync(CancellationToken cancellationToken)
    {
        expectedSnapshot = await store.ReadAsync(cancellationToken);
        return Core.CopyState(expectedSnapshot.State);
    }

    private async Task SaveAsync(JsonObject state, string reason, CancellationToken cancellationToken)
    {
        expectedSnapshot ??= await store.ReadAsync(cancellationToken);
        foreach (string key in new[] { "lease", "pending_operation", "completed_operations" })
        {
            if (expectedSnapshot.State.ContainsKey(key))
            {
                state[key] = expectedSnapshot.State[key]?.DeepClone();
            }
        }

        expectedSnapshot = await store.WriteAsync(state, expectedSnapshot, "maintenance: " + reason, cancellationToken);
    }

    private string CheckoutSnapshotSha()
    {
        if (Git.Text(root, "status", "--porcelain", "--", "Vault/Home").Length != 0)
        {
            throw new Conflict("Live maintenance needs a clean Vault/Home snapshot; user edits were preserved.");
        }

        return Git.Text(root, "rev-parse", "HEAD");
    }

    private async Task<JsonObject> CallAsync(bool review, JsonObject payload, CancellationToken cancellationToken)
    {
        if (model is null)
        {
            throw new RuntimeFailure("Model provider missing.");
        }

        double remaining = config.Int("max_run_minutes", 35) * 60 - clock.GetElapsedTime(started).TotalSeconds;
        if (remaining < 30)
        {
            throw new RuntimeFailure("Run deadline reached; saved proposal can resume.");
        }

        int budget = Math.Min(config.Int("model_timeout_seconds", 900), (int)remaining - 10);
        if (model is ClaudeProvider claude)
        {
            claude.TimeoutSeconds = budget;
        }

        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(TimeSpan.FromSeconds(budget));
        modelCalls++;
        return review ? await model.ReviewAsync(payload, deadline.Token) : await model.AuthorAsync(payload, deadline.Token);
    }

    private async Task<string> FetchSourceAsync(string url, CancellationToken cancellationToken)
    {
        byte[] data = await Runtime.FetchPrimarySourceAsync(url, config.Arr("allowed_source_hosts").Strings(), 180_000, cancellationToken);
        if (data.AsSpan().StartsWith("%PDF"u8))
        {
            throw new UnsafeInput("PDF evidence needs a readable primary HTML/text source.");
        }

        return Encoding.UTF8.GetString(data);
    }

    private async Task<JsonArray> ValidateAsync(Dictionary<string, string> expected, Dictionary<string, string> candidate, CancellationToken cancellationToken)
    {
        using var isolated = new IsolatedRepository(root, validationSnapshotSha ?? snapshotShaLoader());
        Dictionary<string, string> baseline = expected.Keys.ToDictionary(path => path, path => File.ReadAllText(Runtime.ValidateNotePath(isolated.Path, path)));
        Runtime.ApplyGuardedSources(isolated.Path, baseline, expected);
        Runtime.ApplyGuardedSources(isolated.Path, expected, candidate);
        JsonArray commands = config.Arr("validator_commands");
        if (commands.Count == 0)
        {
            throw new RuntimeFailure("Validation commands missing.");
        }

        return await Runtime.RunValidationsAsync(isolated.Path, commands, cancellationToken);
    }

    private async Task<JsonObject> CooldownAsync(ClaudeQuotaException error, string stage, CancellationToken cancellationToken)
    {
        JsonObject state = await InitialStateAsync(cancellationToken);
        state = Core.SetCooldown(state, error.Kind, error.ResetAt, clock.GetUtcNow(), config.Int("unknown_reset_recheck_hours", 24));
        JsonObject cooldown = state.RequiredObject("cooldown");
        bool notice = cooldown.Bool("notice_pending") && !cooldown.Bool("notice_sent");
        cooldown["notice_pending"] = false;
        cooldown["notice_sent"] = true;
        await SaveAsync(state, "persist subscription cooldown", cancellationToken);
        return new JsonObject { ["status"] = "cooldown", ["stage"] = stage, ["notice"] = notice, ["cooldown"] = cooldown.Copy(), ["model_calls"] = modelCalls };
    }

    public async Task<JsonObject> RunAsync(bool apply = false, bool withModel = false, CancellationToken cancellationToken = default)
    {
        JsonObject state = await InitialStateAsync(cancellationToken);
        if (apply && publisher is not null)
        {
            await FinalizeCompletedAsync(cancellationToken);
            state = await InitialStateAsync(cancellationToken);
        }
        if (publisher is not null && state["pending_operation"] is JsonObject)
        {
            if (!apply)
            {
                return new JsonObject { ["status"] = "pending_publication", ["model_calls"] = 0 };
            }

            JsonObject? recovery = await publisher.RecoverPendingAsync(cancellationToken);
            if (recovery is not null && recovery.Str("status") != "recovered")
            {
                return recovery;
            }

            await FinalizeCompletedAsync(cancellationToken);
            state = await InitialStateAsync(cancellationToken);
        }
        if (apply && publisher is not null && config.Bool("automatic_export"))
        {
            ExportOpportunity opportunity = Worker.SelectOpportunity(state, clock.GetUtcNow());
            state = opportunity.State;
            await SaveAsync(state, "reconcile same-workflow export recovery", cancellationToken);
            if (opportunity.Request is not null)
            {
                return new JsonObject { ["status"] = opportunity.Mode == "finalize" ? "awaiting_export_validation" : "awaiting_export", ["export_request"] = opportunity.Request.Copy(), ["export_mode"] = opportunity.Mode, ["model_calls"] = 0 };
            }
        }
        if (Core.CooldownActive(state, clock.GetUtcNow()))
        {
            return new JsonObject { ["status"] = "cooldown", ["notice"] = false, ["model_calls"] = 0, ["cooldown"] = state["cooldown"]?.DeepClone() };
        }

        string? snapshot = publisher is null ? null : snapshotShaLoader();
        JsonArray notes = notesLoader();
        string? baseSha = publisher is null ? null : await publisher.RefShaAsync(config.Str("base_branch", "main"), cancellationToken);
        if (publisher is not null && (snapshot != baseSha || snapshotShaLoader() != snapshot))
        {
            throw new Conflict("Checkout snapshot and remote base differ; retry from current base before model work.");
        }

        validationSnapshotSha = snapshot;

        Dictionary<string, string> baseline = notes.OfType<JsonObject>().ToDictionary(note => note.Str("path"), note => note.Str("content"));
        (state, Dictionary<int, JsonObject> prs, JsonArray feedback) = await RemoteViewAsync(state, notes, baseSha, apply, cancellationToken);
        string rules = Core.RulesVersion(root);
        HashSet<string> paused = state.Obj("prs").Select(item => item.Value).OfType<JsonObject>().Where(pr => pr.Str("status") == "open" && pr.Bool("base_conflict")).Select(pr => pr.Str("topic_id")).ToHashSet();
        HashSet<string> heldPaths = notes.OfType<JsonObject>().Where(note => Held(state, note, rules)).Select(note => note.Str("path")).ToHashSet();
        JsonArray allNotes = notes.Copy();
        notes = Copies(notes.OfType<JsonObject>().Where(note => !paused.Contains(Core.TopicId(note.Str("topic"))) && !heldPaths.Contains(note.Str("path"))));
        JsonObject selectionState = state.Copy();
        if (config.Bool("automatic_export"))
        {
            foreach (JsonObject pr in state.Obj("prs").Select(item => item.Value).OfType<JsonObject>().Where(pr => pr.Str("status") == "open"))
            {
                foreach (JsonObject record in pr.Arr("proposal_records").OfType<JsonObject>())
                {
                    selectionState = Core.RecordOutcome(selectionState, record.RequiredObject("batch"), record.RequiredObject("proposal"), record.RequiredObject("result"));
                }
            }
        }

        foreach (JsonObject item in selectionState.Obj("feedback").Select(item => item.Value).OfType<JsonObject>())
        {
            if (item.Str("status") == "pending" && (paused.Contains(Core.TopicId(item.Str("topic"))) || item.Arr("paths").Strings().Any(heldPaths.Contains)))
            {
                item["status"] = "paused";
            }
        }

        JsonObject? batch = Queue.SelectBatch(selectionState, notes, rules, config);
        await SaveAsync(state, "reconcile maintenance queue", cancellationToken);
        if (batch is null)
        {
            return new JsonObject { ["status"] = paused.Count == 0 ? "no_changes" : "topics_paused", ["paused_topics"] = Copies(paused.Order().Select(value => JsonValue.Create(value))), ["model_calls"] = 0 };
        }

        if (batch.Arr("notes").Count == 0 && batch.Arr("feedback").Count != 0)
        {
            return new JsonObject { ["status"] = "feedback_needs_scope", ["batch"] = batch, ["model_calls"] = 0 };
        }

        if (!withModel)
        {
            return new JsonObject { ["status"] = "selected", ["batch"] = batch, ["model_calls"] = 0, ["mutated"] = false };
        }

        Dictionary<string, string> selected = batch.Arr("notes").OfType<JsonObject>().ToDictionary(note => note.Str("path"), note => note.Str("content"));
        JsonObject prState = batch.Obj("pr");
        JsonArray history = prState.Arr("proposal_records").Copy();
        prState.Remove("proposal_records");
        JsonObject rawPr = prs.GetValueOrDefault(prState.Int("number")) ?? new JsonObject();
        JsonObject hashes = ObjectMap(selected.ToDictionary(item => item.Key, item => LegacyIdentity.Digest(item.Value)));
        string[] feedbackKeys = batch.Arr("feedback").OfType<JsonObject>().Select(item => item.Str("key")).Order(StringComparer.Ordinal).ToArray();
        JsonArray keys = Copies(feedbackKeys.Select(value => JsonValue.Create(value)));
        JsonObject pending = state.Obj("pending_author_proposal");
        bool compatible = JsonNode.DeepEquals(pending["source_hashes"], hashes) && JsonNode.DeepEquals(pending["feedback_keys"], keys) && pending.Str("rules_hash") == rules;
        JsonObject proposal;
        if (compatible)
        {
            if (pending.Int("prepared_source_version") != 1 || Runtime.ParseTime(pending.Str("prepared_at")) is null)
            {
                return new JsonObject { ["status"] = "preparation_requires_review", ["reason"] = "Saved legacy proposal lacks prepared-source version; preserve and explicitly reconcile it before resuming.", ["model_calls"] = 0 };
            }

            proposal = pending.RequiredObject("proposal").Copy();
        }
        else
        {
            var rulesText = new JsonObject();
            foreach (string path in Core.ContentAuthorities)
            {
                if (File.Exists(Path.Combine(root, path)))
                {
                    rulesText[path] = File.ReadAllText(Path.Combine(root, path));
                }
            }

            JsonArray open = Copies(history.OfType<JsonObject>().SelectMany(record => record.Obj("proposal").Arr("edits").OfType<JsonObject>()).Select(edit =>
            {
                JsonObject entry = edit.Copy();
                entry["fingerprint"] = LegacyIdentity.Proposal(edit);
                return entry;
            }));
            var nearby = new JsonArray();
            foreach (JsonObject note in notes.OfType<JsonObject>().Where(note => note.Str("topic") == batch.Str("topic") && !selected.ContainsKey(note.Str("path"))))
            {
                nearby.Add(new JsonObject { ["path"] = note.Str("path"), ["cards"] = Copies(Proposal.QardSpans(note.Str("content")).Select(span => JsonValue.Create(span.Text))) });
            }

            try
            {
                proposal = await CallAsync(false, new JsonObject
                {
                    ["topic"] = batch.Str("topic"),
                    ["notes"] = ObjectMap(selected),
                    ["feedback"] = batch.Arr("feedback").Copy(),
                    ["rules"] = rulesText,
                    ["rejected_proposals"] = state.Arr("rejections").Copy(),
                    ["open_proposals"] = open,
                    ["previous_review"] = state.Obj("held_proposals").Obj(batch.Str("topic_id"))["blocked_review"]?.DeepClone(),
                    ["nearby_questions"] = nearby
                }, cancellationToken);
            }
            catch (ClaudeQuotaException error)
            {
                return await CooldownAsync(error, "author", cancellationToken);
            }
            pending = new JsonObject
            {
                ["topic_id"] = batch.Str("topic_id"),
                ["batch"] = batch.Copy(),
                ["proposal"] = proposal.Copy(),
                ["source_hashes"] = hashes.Copy(),
                ["feedback_keys"] = keys.Copy(),
                ["rules_hash"] = rules,
                ["prepared_source_version"] = 1,
                ["prepared_at"] = Core.FormatTime(clock.GetUtcNow())
            };
            state["pending_author_proposal"] = pending;
            await SaveAsync(state, "save source-matched author proposal", cancellationToken);
        }
        JsonArray decisions;
        JsonObject result;
        try
        {
            Proposal.Validate(proposal);
            (JsonArray effectiveRejections, JsonArray boundDecisions) = Proposal.BindDecisions(proposal, history, state.Arr("rejections"), batch.Arr("feedback"));
            decisions = boundDecisions;
            result = Proposal.Apply(selected, proposal, effectiveRejections, feedbackKeys, prState.Bool("frozen") ? feedbackKeys : []);
            Proposal.RestoreRejected(proposal, result, decisions, selected);
        }
        catch (ProposalException error)
        {
            JsonObject failed = CreateHold(state, pending);
            failed["blocked_review"] = new JsonObject { ["stage"] = "deterministic_application", ["reason"] = error.Message };
            failed["failed_at"] = Core.FormatTime(clock.GetUtcNow());
            EnsureObject(state, "invalid_proposals")[LegacyIdentity.Digest(pending.ToJsonString())] = failed.Copy();
            EnsureObject(state, "held_proposals")[batch.Str("topic_id")] = failed;
            state.Remove("pending_author_proposal");
            await SaveAsync(state, "quarantine invalid author proposal", cancellationToken);
            return new JsonObject { ["status"] = "proposal_blocked", ["reason"] = error.Message, ["model_calls"] = modelCalls };
        }
        if (proposal.Arr("edits").Count == 0 && decisions.Count == 0)
        {
            state = Core.RecordOutcome(state, batch, proposal, result);
            state.Remove("pending_author_proposal");
            state["cooldown"] = null;
            await SaveAsync(state, "record successful keep or feedback clarification", cancellationToken);
            await FeedbackReceiptAsync(proposal, batch, null, apply, cancellationToken);
            return new JsonObject { ["status"] = "no_worthwhile_changes", ["proposal"] = proposal, ["model_calls"] = modelCalls };
        }
        await PrepareDatesAsync(result, selected, prState.Str("head_sha", baseSha ?? "HEAD"), Runtime.ParseTime(pending.Str("prepared_at"))!.Value, cancellationToken);
        Dictionary<string, string> candidate = Map(result.RequiredObject("sources"));
        Dictionary<string, string> current = allNotes.OfType<JsonObject>().ToDictionary(note => note.Str("path"), note => note.Str("content"));
        foreach (KeyValuePair<string, string> item in candidate)
        {
            current[item.Key] = item.Value;
        }

        HashSet<string> paths = rawPr.Arr("changed_paths").Strings().Concat(proposal.Arr("edits").OfType<JsonObject>().Select(edit => edit.Str("path"))).ToHashSet();
        Dictionary<string, string> cumulativeBase = paths.ToDictionary(path => path, path => baseline[path]);
        Dictionary<string, string> cumulativeCurrent = paths.ToDictionary(path => path, path => current[path]);
        string diff = await Review.DiffAsync(cumulativeBase, cumulativeCurrent, cancellationToken);
        if (batch.Arr("feedback").Count == 0 && (paths.Count > config.Int("max_pr_notes", 16) || Review.ChangedLines(diff) > config.Int("max_pr_lines", 1200)))
        {
            pending["blocked_review"] = new JsonObject { ["reason"] = "PR size limit reached" };
            if (prState.Int("number") > 0)
            {
                state.RequiredObject("prs").RequiredObject($"{batch.Str("topic_id")}:{prState.Int("generation")}")["frozen"] = true;
            }

            await SaveAsync(state, "freeze at review size limit", cancellationToken);
            return new JsonObject { ["status"] = "size_limit", ["model_calls"] = modelCalls };
        }
        var fetched = new JsonObject();
        foreach (JsonObject source in proposal.Arr("edits").OfType<JsonObject>().SelectMany(edit => edit.Arr("sources").OfType<JsonObject>()))
        {
            if (fetched.ContainsKey(source.Str("url")))
            {
                continue;
            }

            if (fetched.Count >= config.Int("max_sources_per_run", 12) || clock.GetElapsedTime(started).TotalMinutes >= config.Int("max_run_minutes", 35) - 1)
            {
                throw new RuntimeFailure("Source workload exceeds this run; proposal preserved.");
            }

            fetched[source.Str("url")] = await sourceFetcher(source.Str("url"), cancellationToken);
        }
        JsonObject review;
        try
        {
            review = await CallAsync(true, new JsonObject
            {
                ["rules"] = File.ReadAllText(Path.Combine(root, ".codex/agents/note-reviewer.toml")),
                ["before"] = ObjectMap(selected),
                ["current"] = ObjectMap(candidate),
                ["proposal"] = proposal.Copy(),
                ["primary_sources"] = fetched,
                ["rejected_proposals"] = state.Arr("rejections").Copy(),
                ["feedback"] = batch.Arr("feedback").Copy(),
                ["recorded_decisions"] = decisions.Copy()
            }, cancellationToken);
        }
        catch (ClaudeQuotaException error)
        {
            return await CooldownAsync(error, "review", cancellationToken);
        }
        if (state["cooldown"] is not null)
        {
            state["cooldown"] = null;
            await SaveAsync(state, "record successful resumption after subscription cooldown", cancellationToken);
        }
        if (!Review.Clean(review, candidate, proposal, state.Arr("rejections"), batch.Arr("feedback")))
        {
            pending["blocked_review"] = review.Copy();
            EnsureObject(state, "held_proposals")[batch.Str("topic_id")] = CreateHold(state, pending);
            state.Remove("pending_author_proposal");
            await SaveAsync(state, "preserve blocked semantic review", cancellationToken);
            return new JsonObject { ["status"] = "review_blocked", ["proposal"] = proposal, ["review"] = review, ["model_calls"] = modelCalls };
        }
        if (proposal.Arr("edits").Count == 0)
        {
            if (apply)
            {
                state = Core.RecordOutcome(state, batch, proposal, result);
                Proposal.PersistDecisions(state, decisions);
                state.Remove("pending_author_proposal");
                state["cooldown"] = null;
                await SaveAsync(state, "record independently verified feedback decision", cancellationToken);
                await FeedbackReceiptAsync(proposal, batch, null, true, cancellationToken);
            }
            return new JsonObject { ["status"] = apply ? "no_worthwhile_changes" : "proposed", ["proposal"] = proposal, ["review"] = review, ["model_calls"] = modelCalls };
        }
        Dictionary<string, string> validationExpected = new(cumulativeBase);
        foreach (KeyValuePair<string, string> item in selected)
        {
            validationExpected[item.Key] = item.Value;
        }

        Dictionary<string, string> validationCandidate = new(cumulativeCurrent);
        foreach (KeyValuePair<string, string> item in candidate)
        {
            validationCandidate[item.Key] = item.Value;
        }

        JsonArray validation = await validator(validationExpected, validationCandidate, cancellationToken);
        history.Add(new JsonObject { ["batch"] = batch.Copy(), ["proposal"] = proposal.Copy(), ["result"] = result.Copy(), ["review"] = review.Copy() });
        JsonArray changes = Copies(history.OfType<JsonObject>().SelectMany(record => record.RequiredObject("proposal").Arr("edits")));
        JsonArray cumulativeFeedback = Copies(history.OfType<JsonObject>().SelectMany(record => record.RequiredObject("proposal").Arr("feedback").OfType<JsonObject>()).Select(item =>
        {
            JsonObject copy = item.Copy();
            copy["url"] = state.Obj("feedback").Obj(item.Str("key")).Str("url", item.Str("key"));
            return copy;
        }));
        int generation = prState.Int("generation", state.Obj("topics").Obj(batch.Str("topic_id")).Int("generation", 1));
        string branch = prState.Str("branch", Core.BranchFor(batch.Str("topic"), generation));
        Dictionary<string, string> links = paths.ToDictionary(path => path, path => $"https://github.com/{config.Str("repo")}/blob/{string.Join('/', branch.Split('/').Select(Uri.EscapeDataString))}/{string.Join('/', path.Split('/').Select(Uri.EscapeDataString))}");
        Dictionary<string, string> sources = changes.OfType<JsonObject>().SelectMany(edit => edit.Arr("sources").OfType<JsonObject>()).GroupBy(source => source.Str("claim")).ToDictionary(group => group.Key, group => group.Last().Str("url"));
        string summary = Summary.Render(batch.Str("topic"), cumulativeBase, cumulativeCurrent, changes, cumulativeFeedback, validation, sources, links)
            + (model is ClaudeProvider ? "\nIndependent Claude complete-note review: CLEAN; final dated candidates and fetched source evidence inspected.\n" : "\nInjected review adapter: CLEAN fixture result. No Claude request was made; live semantic quality remains unverified.\n");
        bool exportRequired = Receipt.NeedsExport(selected, candidate);
        if (exportRequired)
        {
            summary += "\n<!-- devbook-export-validation -->Quartz export: awaiting the source-bound native export and checks.\n\nOwner review or size limits freeze unrelated additions; requested fixes and export can continue.\n";
        }

        if (prState.Str("review_started_head_sha").Length > 0)
        {
            summary += "\nChanges after review require renewed review of this head. PR remains draft.\n";
        }

        var response = new JsonObject
        {
            ["status"] = "proposed",
            ["topic"] = batch.Str("topic"),
            ["proposal"] = proposal.Copy(),
            ["review"] = review.Copy(),
            ["candidate"] = ObjectMap(candidate),
            ["summary"] = summary,
            ["validation"] = validation.Copy(),
            ["question_changes"] = Copies(Summary.CoalesceChanges(cumulativeBase, cumulativeCurrent, changes).OfType<JsonObject>().Where(edit => edit.Str("kind") != "note")),
            ["diff"] = diff,
            ["model_calls"] = modelCalls
        };
        if (!apply)
        {
            return response;
        }

        if (publisher is null)
        {
            throw new RuntimeFailure("Apply requires a publication runtime.");
        }

        JsonObject records = new()
        {
            ["batch"] = batch.Copy(),
            ["proposal"] = proposal.Copy(),
            ["result"] = result.Copy(),
            ["review"] = review.Copy(),
            ["records"] = history.Copy(),
            ["topic_id"] = batch.Str("topic_id"),
            ["generation"] = generation,
            ["decisions"] = decisions.Copy(),
            ["base_note_hashes"] = ObjectMap(allNotes.OfType<JsonObject>().Where(note => note.Str("topic") == batch.Str("topic")).ToDictionary(note => note.Str("path"), note => LegacyIdentity.Digest(baseline[note.Str("path")])))
        };
        JsonObject publication = await publisher.PublishAsync(new JsonObject
        {
            ["topic"] = batch.Str("topic_id"),
            ["generation"] = generation,
            ["branch"] = branch,
            ["expected_sources"] = ObjectMap(selected),
            ["candidate"] = ObjectMap(candidate.Where(item => selected[item.Key] != item.Value).ToDictionary(item => item.Key, item => item.Value)),
            ["title"] = "notes: improve " + batch.Str("topic"),
            ["body"] = Summary.UpdateManagedBody(rawPr.Str("body"), summary, batch.Str("topic")),
            ["feedback_revision"] = new JsonObject
            {
                ["allowlist"] = Copies(config.Arr("owner_allowlist").OfType<JsonObject>().Select(owner => JsonValue.Create($"{owner["id"]}:{owner.Str("login")}"))),
                ["processed"] = new JsonObject(feedback.OfType<JsonObject>().Where(item => item.Int("pr_number") == prState.Int("number")).Select(item => new KeyValuePair<string, JsonNode?>($"{item.Str("kind")}:{item["id"]}", item["revision"]?.DeepClone())))
            },
            ["expected_base_sha"] = baseSha,
            ["expected_branch_sha"] = prState["head_sha"]?.DeepClone(),
            ["expected_pr_number"] = prState["number"]?.DeepClone(),
            ["freeze"] = prState.Bool("frozen"),
            ["pending_feedback"] = batch.Arr("feedback").Copy(),
            ["edits"] = proposal.Arr("edits").Copy(),
            ["operation_receipts"] = records,
            ["export_required"] = exportRequired,
            ["automatic_export"] = config.Bool("automatic_export"),
            ["prepared_source_version"] = 1,
            ["prepared_at"] = pending.Str("prepared_at")
        }, cancellationToken);
        response["publication"] = publication.Copy();
        response["status"] = publication.Str("status", "published");
        if (publication["export_request"] is JsonObject request)
        {
            response["export_request"] = request.Copy();
            response["export_mode"] = "render";
        }

        if (response.Str("status") is not ("awaiting_checks" or "awaiting_export"))
        {
            await FinalizeCompletedAsync(cancellationToken);
        }

        return response;
    }

    private static JsonObject CreateHold(JsonObject state, JsonObject pending)
    {
        JsonObject hold = pending.Copy();
        hold["feedback_snapshot"] = Copies(state.Obj("feedback").Select(item => item.Value).OfType<JsonObject>()
            .Where(item => item.Str("status") == "pending" && item.Str("topic") == pending.Obj("batch").Str("topic"))
            .Select(item => new JsonObject { ["key"] = item.Str("key"), ["paths"] = item.Arr("paths").Copy() }));
        return hold;
    }

    private static bool Held(JsonObject state, JsonObject note, string rules)
    {
        string path = note.Str("path");
        string[] keys = state.Obj("feedback").Select(item => item.Value).OfType<JsonObject>()
            .Where(item => item.Str("status") == "pending" && item.Str("topic") == note.Str("topic") && item.Arr("paths").Strings().Contains(path))
            .Select(item => item.Str("key")).Order(StringComparer.Ordinal).ToArray();
        return state.Obj("held_proposals").Concat(state.Obj("invalid_proposals")).Select(item => item.Value).OfType<JsonObject>()
            .Any(hold => hold.Obj("source_hashes").Str(path) == note.Str("hash") && hold.Str("rules_hash") == rules
                && (hold["feedback_snapshot"] as JsonArray ?? hold.Obj("batch").Arr("feedback")).OfType<JsonObject>()
                    .Where(item => item.Arr("paths").Strings().Contains(path)).Select(item => item.Str("key"))
                    .Order(StringComparer.Ordinal).SequenceEqual(keys));
    }

    private async Task PrepareDatesAsync(JsonObject result, Dictionary<string, string> selected, string parentRef, DateTimeOffset instant, CancellationToken cancellationToken)
    {
        foreach (string path in result.RequiredObject("sources").Select(item => item.Key).ToArray())
        {
            string text = result.RequiredObject("sources").Str(path);
            if (text == selected[path])
            {
                continue;
            }

            IReadOnlyList<string>? history = null;
            if (NoteDates.Read(Encoding.UTF8.GetBytes(selected[path]))["created"] is null)
            {
                if (api is not null)
                {
                    JsonArray commits = await Runtime.ArrayAsync(api, $"/commits?sha={Uri.EscapeDataString(parentRef)}&path={Uri.EscapeDataString(path)}&per_page=100", cancellationToken);
                    history = commits.OfType<JsonObject>().Select(commit => commit.Obj("commit").Obj("author").Str("date", commit.Obj("commit").Obj("committer").Str("date"))).Where(value => value.Length > 0).ToArray();
                }
                else
                {
                    history = Git.Text(root, "log", "--follow", "--format=%aI", parentRef, "--", path).Split('\n', StringSplitOptions.RemoveEmptyEntries);
                }
            }
            result.RequiredObject("sources")[path] = Encoding.UTF8.GetString(NoteDates.Prepare(Encoding.UTF8.GetBytes(text), Encoding.UTF8.GetBytes(selected[path]), instant, history));
        }
    }
}
