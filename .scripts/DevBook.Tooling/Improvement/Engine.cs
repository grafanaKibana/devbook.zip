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
    private readonly JsonObject contentAuthorities;
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
    private readonly Dictionary<string, string> sourceEvidenceCache = new();

    public ImprovementEngine(string root, JsonObject config, IStateStore store, IModelProvider? model = null, IGitHubApi? api = null,
        GitHubRuntime? publisher = null, Func<JsonArray>? notesLoader = null,
        Func<Dictionary<string, string>, Dictionary<string, string>, CancellationToken, Task<JsonArray>>? validator = null,
        Func<string, CancellationToken, Task<string>>? sourceFetcher = null, TimeProvider? clock = null, Func<string>? snapshotShaLoader = null, JsonObject? contentAuthorities = null)
    {
        this.root = Path.GetFullPath(root);
        this.config = config.Copy();
        if (config.ContainsKey("target_note") || config.ContainsKey("review_focus"))
        {
            throw new ArgumentException("Manual note targeting is not supported; every run uses the improvement queue.");
        }
        if (config.ContainsKey("feedback_pr") && config.Int("feedback_pr") < 1)
        {
            throw new ArgumentException("feedback_pr must identify a positive pull request number.");
        }
        if (config.Int("max_review_repairs_per_batch", 1) is < 0 or > 1)
        {
            throw new ArgumentException("max_review_repairs_per_batch must be 0 or 1.");
        }
        this.contentAuthorities = contentAuthorities?.Copy() ?? Core.LoadContentAuthorities(this.root);
        _ = Core.RulesVersion(this.contentAuthorities);
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
        if (workload is not null)
        {
            CheckpointElapsed();
            state["focused_workload"] = workload.Copy();
        }
        expectedSnapshot ??= await store.ReadAsync(cancellationToken);
        foreach (string key in new[] { "lease", "pending_operation", "completed_operations" })
        {
            if (expectedSnapshot.State.ContainsKey(key))
            {
                state[key] = expectedSnapshot.State[key]?.DeepClone();
            }
        }

        try
        {
            expectedSnapshot = await store.WriteAsync(state, expectedSnapshot, "maintenance: " + reason, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            double remaining = 40 * 60 - clock.GetElapsedTime(started).TotalSeconds;
            if (remaining <= 0) throw;
            using var checkpoint = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Min(30, remaining)), clock);
            StateSnapshot observed = await store.ReadAsync(checkpoint.Token);
            if (JsonNode.DeepEquals(observed.State, state)
                || store is StateBranchStore branchStore && branchStore.MatchesCanceledWrite(state, observed))
            {
                expectedSnapshot = observed;
            }
            else if (JsonNode.DeepEquals(observed.State, expectedSnapshot.State))
            {
                expectedSnapshot = await store.WriteAsync(state, observed, "maintenance: preserve canceled checkpoint " + reason, checkpoint.Token);
            }
            else
            {
                throw new Conflict("State changed while preserving a canceled content checkpoint; concurrent state was retained.");
            }
            throw;
        }
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

        await ReserveCallAsync(review, cancellationToken);
        EnsureContentBudget();
        int budget = Math.Max(1, (int)Math.Min(Math.Min(900, config.Int("model_timeout_seconds", 900)), RemainingContentSeconds()));
        if (model is ClaudeProvider claude)
        {
            claude.TimeoutSeconds = budget;
        }
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(budget), clock);
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token);
        modelCalls++;
        JsonObject response = review ? await model.ReviewAsync(payload, deadline.Token) : await model.AuthorAsync(payload, deadline.Token);
        if (workload is not null)
        {
            workload["responses_received"] = workload.Int("responses_received") + 1;
        }
        return response;
    }

    private async Task<string> FetchSourceAsync(string url, CancellationToken cancellationToken)
    {
        int maximumBytes = config.Int("max_source_bytes", 250_000);
        if (maximumBytes is < 1 or > 2_000_000)
        {
            throw new RuntimeFailure("max_source_bytes must be between 1 and 2000000.");
        }
        byte[] data = await Runtime.FetchPrimarySourceAsync(url, maximumBytes, cancellationToken);
        if (data.AsSpan().StartsWith("%PDF"u8))
        {
            throw new UnsafeInput("PDF evidence needs a readable primary HTML/text source.");
        }

        return Runtime.SourceEvidenceText(data);
    }

    private async Task<JsonArray> ValidateAsync(Dictionary<string, string> expected, Dictionary<string, string> candidate, CancellationToken cancellationToken)
    {
        using var isolated = new IsolatedRepository(root, validationSnapshotSha ?? snapshotShaLoader());
        Dictionary<string, string> baseline = expected.Keys.ToDictionary(path => path, path => File.ReadAllText(Runtime.ValidateNotePath(isolated.Path, path)));
        Runtime.ApplyGuardedSources(isolated.Path, baseline, expected);
        HashSet<string> existingIssues = Validation.Validate(isolated.Path, "all", includeRepositoryChecks: false).Issues
            .Select(issue => issue.BaselineId).ToHashSet(StringComparer.Ordinal);
        Runtime.ApplyGuardedSources(isolated.Path, expected, candidate);
        Issue[] introduced = Validation.Validate(isolated.Path, "all", includeRepositoryChecks: false).Issues
            .Where(issue => !existingIssues.Contains(issue.BaselineId)).ToArray();
        if (introduced.Length != 0)
        {
            throw new CandidateValidationFailure("Candidate introduces vault violations:\n" + string.Join('\n', introduced.Select(issue => issue.Render())));
        }
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

    private async Task<JsonObject> RunOneAsync(bool apply, bool withModel, CancellationToken cancellationToken)
    {
        JsonObject state = await InitialStateAsync(cancellationToken);
        if (FeedbackScopePause(state) is JsonObject pause) return pause;
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
            ExportOpportunity opportunity = Worker.SelectOpportunity(state, clock.GetUtcNow(), FeedbackPr);
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
        string rules = Core.RulesVersion(contentAuthorities);
        string evaluation = ClaudeProvider.EvaluationHash(config);
        config["evaluation_hash"] = evaluation;
        JsonObject blockedPending = state.Obj("pending_author_proposal");
        string[] blockedPaths = blockedPending.Obj("source_hashes").Select(item => item.Key).ToArray();
        if (FeedbackPr == 0 && blockedPaths.Length == 1 && blockedPending.Arr("feedback_keys").Count == 0
            && Queue.OpenPrForTopic(state, Core.TopicFor(blockedPaths[0])) is not null)
        {
            EnsureObject(state, "parked_author_proposals")[LegacyIdentity.Fingerprint(blockedPending)] = blockedPending.Copy();
            state.Remove("pending_author_proposal");
        }
        if (FeedbackPr == 0 && state.Obj("pending_author_proposal").Count == 0)
        {
            foreach ((string parkedId, JsonNode? value) in state.Obj("parked_author_proposals").ToArray())
            {
                if (value is not JsonObject parked) continue;
                string[] parkedPaths = parked.Obj("source_hashes").Select(item => item.Key).ToArray();
                if (parkedPaths.Length != 1 || Queue.OpenPrForTopic(state, Core.TopicFor(parkedPaths[0])) is not null
                    || workload?.Str("topic").Length > 0 && workload.Str("topic") != Core.TopicFor(parkedPaths[0])) continue;
                state["pending_author_proposal"] = parked.Copy();
                state.RequiredObject("parked_author_proposals").Remove(parkedId);
                break;
            }
        }
        if (FeedbackPr == 0 && state.Obj("pending_author_proposal").Count == 0)
        {
            foreach (JsonObject deferred in state.Obj("deferred_proposals").Select(item => item.Value).OfType<JsonObject>())
            {
                string[] deferredPaths = deferred.Obj("source_hashes").Select(item => item.Key).ToArray();
                if (deferredPaths.Length != 1 || deferred.Str("resumed_by").Length > 0 || deferred.Str("workload_id") == workload?.Str("id")
                    || workload?.Str("topic").Length > 0 && workload.Str("topic") != Core.TopicFor(deferredPaths[0])
                    || deferred.Str("evaluation_hash") != evaluation || deferred.Str("rules_hash") != rules
                    || Queue.OpenPrForTopic(state, Core.TopicFor(deferredPaths[0])) is not null
                    || !notes.OfType<JsonObject>().Any(note => note.Str("path") == deferredPaths[0] && note.Str("hash") == deferred.Obj("source_hashes").Str(deferredPaths[0]))) continue;
                deferred["resumed_by"] = workload?.Str("id");
                JsonObject resumed = deferred.Copy();
                resumed["workload_id"] = workload?.Str("id");
                state["pending_author_proposal"] = resumed;
                break;
            }
        }
        JsonObject saved = state.Obj("pending_author_proposal");
        if (saved.Count != 0)
        {
            HashSet<string> savedPaths = saved.Obj("source_hashes").Select(item => item.Key).ToHashSet();
            JsonObject currentHashes = ObjectMap(notes.OfType<JsonObject>().Where(note => savedPaths.Contains(note.Str("path")))
                .ToDictionary(note => note.Str("path"), note => LegacyIdentity.Digest(note.Str("content"))));
            JsonObject currentRepair = RepairInputsFor(notes.OfType<JsonObject>().Where(note => savedPaths.Contains(note.Str("path"))));
            if (savedPaths.Count != 1 || saved.Str("target_note").Length != 0 || saved.Str("review_focus").Length != 0
                || savedPaths.Any(path => saved.Str("topic_id") != Core.TopicId(Core.TopicFor(path)))
                || saved.Str("evaluation_hash") != evaluation || saved.Str("rules_hash") != rules
                || !JsonNode.DeepEquals(saved["repair_inputs"], currentRepair) || !JsonNode.DeepEquals(saved["source_hashes"], currentHashes))
            {
                HoldIncompatiblePending(state, saved, saved.Str("evaluation_hash") != evaluation ? "evaluation_changed" : "inputs_changed");
            }
        }
        HashSet<string> paused = state.Obj("prs").Select(item => item.Value).OfType<JsonObject>().Where(pr => pr.Str("status") == "open" && pr.Bool("base_conflict")).Select(pr => pr.Str("topic_id")).ToHashSet();
        paused.UnionWith(state.Obj("prs").Select(item => item.Value).OfType<JsonObject>().Where(pr => pr.Str("status") == "open")
            .SelectMany(pr => pr.Arr("blocked_topic_ids").Strings()));
        paused.UnionWith(state.Obj("topics").Where(item => item.Value.Obj("publication_conflict").Int("generation", -1) == item.Value.Int("generation", 0)).Select(item => item.Key));
        ParkBlockedRepair(state, notes, paused);
        if (FeedbackPr == 0) PromoteHeldRepair(state, notes, paused, rules, evaluation);
        JsonObject repairPending = state.Obj("pending_author_proposal");
        HashSet<string> repairPaths = repairPending.Str("review_repair_key").Length > 0
            ? repairPending.Obj("source_hashes").Select(item => item.Key).ToHashSet() : [];
        HashSet<string> heldPaths = notes.OfType<JsonObject>().Where(note => !repairPaths.Contains(note.Str("path")) && Held(state, note, rules)).Select(note => note.Str("path")).ToHashSet();
        JsonArray allNotes = notes.Copy();
        notes = Copies(notes.OfType<JsonObject>().Where(note => !paused.Contains(Core.TopicId(note.Str("topic"))) && !heldPaths.Contains(note.Str("path"))));
        JsonObject selectionState = state.Copy();
        if (config.Bool("automatic_export"))
        {
            var reviewed = new Dictionary<string, JsonObject>();
            foreach (JsonObject note in allNotes.OfType<JsonObject>())
            {
                string path = note.Str("path");
                JsonObject outcome = state.Obj("notes").Obj(path);
                if (outcome.Str("outcome") is "keep" or "changed"
                    && outcome.Str("content_hash") == LegacyIdentity.Digest(note.Str("content"))
                    && outcome.Str("rules_hash") == rules && outcome.Str("evaluation_hash") == evaluation
                    && outcome.Str("repair_input_hash") == note.Str("repair_input_hash")
                    && (outcome.Str("outcome") != "keep" || outcome.Obj("keep_review").Str("evaluation_hash") == evaluation
                        && Review.VerifiedKeep(outcome.Obj("keep_review"), path, note.Str("content"), rules)))
                {
                    reviewed[path] = outcome.Copy();
                }
            }
            foreach (JsonObject pr in state.Obj("prs").Select(item => item.Value).OfType<JsonObject>()
                .Where(pr => pr.Str("status") == "open" && (FeedbackPr == 0 || pr.Int("number") == FeedbackPr)))
            {
                foreach (JsonObject record in pr.Arr("proposal_records").OfType<JsonObject>())
                {
                    selectionState = Core.RecordOutcome(selectionState, record.RequiredObject("batch"), record.RequiredObject("proposal"), record.RequiredObject("result"), record["review"] as JsonObject);
                }
            }
            foreach (KeyValuePair<string, JsonObject> outcome in reviewed)
            {
                selectionState.RequiredObject("notes")[outcome.Key] = outcome.Value;
            }
        }

        foreach (JsonObject item in selectionState.Obj("feedback").Select(item => item.Value).OfType<JsonObject>())
        {
            if (item.Str("status") == "pending" && (paused.Contains(Core.TopicId(item.Str("topic"))) || item.Arr("paths").Strings().Any(heldPaths.Contains)))
            {
                item["status"] = "paused";
            }
        }

        if (repairPaths.Count > 0 && !state.Obj("feedback").Any(item => item.Value.Str("status") == "pending"))
        {
            notes = Copies(notes.OfType<JsonObject>().Where(note => repairPaths.Contains(note.Str("path"))));
        }
        if (workload is not null && workload.Str("topic").Length > 0)
        {
            HashSet<string> attempted = workload.Arr("attempted_paths").Strings().Concat(workload.Arr("accepted_records").OfType<JsonObject>()
                .SelectMany(record => record.Obj("batch").Arr("notes").OfType<JsonObject>()).Select(note => note.Str("path"))).ToHashSet();
            notes = Copies(notes.OfType<JsonObject>().Where(note => note.Str("topic") == workload.Str("topic") && !attempted.Contains(note.Str("path"))));
        }
        JsonObject unfinished = state.Obj("pending_author_proposal");
        if (unfinished.Obj("source_hashes").Count == 1 && !state.Obj("feedback").Any(item => item.Value.Str("status") == "pending"))
        {
            string path = unfinished.Obj("source_hashes").First().Key;
            JsonArray resumable = Copies(notes.OfType<JsonObject>().Where(note => note.Str("path") == path));
            if (resumable.Count != 0) notes = resumable;
        }
        JsonObject? batch = Queue.SelectBatch(selectionState, notes, rules, config);
        if (batch is not null && batch.Arr("feedback").Count > 0) batch = PrepareFeedbackBatch(state, batch, allNotes, baseSha);
        await SaveAsync(state, "reconcile maintenance queue", cancellationToken);
        if (batch is null)
        {
            return new JsonObject { ["status"] = paused.Count == 0 ? "no_changes" : "topics_paused", ["paused_topics"] = Copies(paused.Order().Select(value => JsonValue.Create(value))), ["model_calls"] = 0 };
        }
        if (batch.Arr("notes").Count == 0 && batch.Arr("feedback").Count != 0)
        {
            return new JsonObject { ["status"] = batch.Str("feedback_hold_reason").Length > 0 ? "feedback_needs_scope" : "feedback_scope_complete", ["batch"] = batch, ["model_calls"] = 0 };
        }

        if (!withModel)
        {
            return new JsonObject { ["status"] = "selected", ["batch"] = batch, ["model_calls"] = 0, ["mutated"] = false };
        }

        workload!["topic"] = batch.Str("topic");
        workload["topic_id"] = batch.Str("topic_id");
        workload["current_batch"] = batch.Copy();
        workload["base_sha"] = baseSha;
        workload["phase"] = "evaluating";
        await SaveAsync(state, "checkpoint focused note selection", cancellationToken);
        Dictionary<string, string> selected = batch.Arr("notes").OfType<JsonObject>().ToDictionary(note => note.Str("path"), note => note.Str("content"));
        var knownViolations = new JsonObject(batch.Arr("notes").OfType<JsonObject>().Select(note =>
            new KeyValuePair<string, JsonNode?>(note.Str("path"), note.Arr("violations").Copy())));
        JsonObject prState = batch.Obj("pr");
        JsonArray history = prState.Arr("proposal_records").Copy();
        prState.Remove("proposal_records");
        JsonObject rawPr = prs.GetValueOrDefault(prState.Int("number")) ?? new JsonObject();
        JsonObject hashes = ObjectMap(selected.ToDictionary(item => item.Key, item => LegacyIdentity.Digest(item.Value)));
        string[] feedbackKeys = batch.Arr("feedback").OfType<JsonObject>().Select(item => item.Str("key")).Order(StringComparer.Ordinal).ToArray();
        JsonArray keys = Copies(feedbackKeys.Select(value => JsonValue.Create(value)));
        JsonObject repairInputs = RepairInputsFor(batch.Arr("notes").OfType<JsonObject>());
        JsonObject needsFixing = new(batch.Arr("notes").OfType<JsonObject>().Select(note =>
            new KeyValuePair<string, JsonNode?>(note.Str("path"), note.Arr("needs_fixing_ids").Copy())));
        JsonObject pending = state.Obj("pending_author_proposal");
        bool compatible = JsonNode.DeepEquals(pending["source_hashes"], hashes) && JsonNode.DeepEquals(pending["feedback_keys"], keys) && pending.Str("rules_hash") == rules
            && pending.Str("topic_id") == batch.Str("topic_id") && pending.Str("target_note").Length == 0 && pending.Str("review_focus").Length == 0
            && pending.Str("evaluation_hash") == evaluation && JsonNode.DeepEquals(pending["repair_inputs"], repairInputs);
        bool repairAuthor = compatible && pending.Bool("author_repair_pending");
        JsonObject repairContext = repairAuthor ? pending.Copy() : new JsonObject();
        JsonObject proposal;
        if (compatible && !repairAuthor)
        {
            if (pending.Int("prepared_source_version") != 1 || Runtime.ParseTime(pending.Str("prepared_at")) is null)
            {
                return new JsonObject { ["status"] = "preparation_requires_review", ["reason"] = "Saved legacy proposal lacks prepared-source version; preserve and explicitly reconcile it before resuming.", ["model_calls"] = 0 };
            }

            proposal = pending.RequiredObject("proposal").Copy();
        }
        else
        {
            if (pending.Count != 0 && !repairAuthor)
            {
                HoldIncompatiblePending(state, pending, "inputs_changed");
                await SaveAsync(state, "preserve incompatible author proposal", cancellationToken);
                return new JsonObject { ["status"] = "pending_held", ["reason"] = "Saved proposal inputs changed; original evidence was preserved.", ["model_calls"] = modelCalls };
            }
            JsonObject rulesText = contentAuthorities.Copy();

            JsonArray open = Copies(history.OfType<JsonObject>().SelectMany(record => record.Obj("proposal").Arr("edits").OfType<JsonObject>()).Select(edit =>
            {
                JsonObject entry = edit.Copy();
                entry["fingerprint"] = LegacyIdentity.Proposal(edit);
                return entry;
            }));
            var nearby = new JsonArray();
            HashSet<string?> selectedFolders = selected.Keys.Select(Path.GetDirectoryName).ToHashSet();
            foreach (JsonObject note in notes.OfType<JsonObject>()
                .Where(note => !selected.ContainsKey(note.Str("path")) && selectedFolders.Contains(Path.GetDirectoryName(note.Str("path"))))
                .OrderBy(note => note.Str("path"), StringComparer.Ordinal).Take(config.Int("max_nearby_question_notes", 4)))
            {
                nearby.Add(new JsonObject { ["path"] = note.Str("path"), ["cards"] = Copies(Proposal.QardSpans(note.Str("content")).Select(span => JsonValue.Create(span.Text))) });
            }

            if (repairAuthor && !pending.Bool("repair_reserved"))
            {
                EnsureObject(state, "parked_review_repairs").Remove(pending.Str("review_repair_key"));
                EnsureObject(state, "review_repair_attempts")[pending.Str("review_repair_key")] = 1;
                pending["repair_reserved"] = true;
                repairContext = pending.Copy();
                await SaveAsync(state, "reserve bounded review repair", cancellationToken);
            }
            try
            {
                proposal = await CallAsync(false, new JsonObject
                {
                    ["topic"] = batch.Str("topic"),
                    ["notes"] = ObjectMap(selected),
                    ["note_hashes"] = hashes.Copy(),
                    ["known_violations"] = knownViolations.Copy(),
                    ["needs_fixing_ids"] = needsFixing.Copy(),
                    ["feedback"] = batch.Arr("feedback").Copy(),
                    ["rules"] = rulesText,
                    ["rejected_proposals"] = state.Arr("rejections").Copy(),
                    ["open_proposals"] = open,
                    ["previous_review"] = repairContext["repair_review"]?.DeepClone(),
                    ["previous_proposal"] = repairContext["repair_previous_proposal"]?.DeepClone(),
                    ["nearby_questions"] = nearby
                }, cancellationToken);
            }
            catch (ClaudeQuotaException error)
            {
                return await CooldownAsync(error, "author", cancellationToken);
            }
            pending = new JsonObject
            {
                ["workload_id"] = workload.Str("id"),
                ["topic_id"] = batch.Str("topic_id"),
                ["batch"] = batch.Copy(),
                ["proposal"] = proposal.Copy(),
                ["source_hashes"] = hashes.Copy(),
                ["feedback_keys"] = keys.Copy(),
                ["rules_hash"] = rules,
                ["evaluation_hash"] = evaluation,
                ["repair_inputs"] = repairInputs.Copy(),
                ["prepared_source_version"] = 1,
                ["prepared_at"] = Core.FormatTime(clock.GetUtcNow())
            };
            foreach (string key in new[] { "review_repair_key", "repair_reserved", "repair_review", "repair_previous_proposal", "previous_evaluation_hash" })
            {
                if (repairContext.ContainsKey(key)) pending[key] = repairContext[key]?.DeepClone();
            }
            state["pending_author_proposal"] = pending;
            workload["phase"] = "author_completed";
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
            return await QuarantineAsync(state, pending, "deterministic_application", error.Message, cancellationToken);
        }
        JsonObject[] sourceEntries = proposal.Arr("edits").OfType<JsonObject>().SelectMany(edit => edit.Arr("sources").OfType<JsonObject>())
            .GroupBy(source => source.Str("url"), StringComparer.Ordinal).Select(group => group.First()).ToArray();
        int sourceLimit = config.Int("max_sources_per_run", 12);
        if (sourceEntries.Length > sourceLimit)
        {
            return await QuarantineAsync(state, pending, "source_budget",
                $"Proposal has {sourceEntries.Length} distinct source URLs, exceeding the per-run limit of {sourceLimit}.", cancellationToken);
        }
        if (sourceEvidenceCache.Keys.Union(sourceEntries.Select(source => source.Str("url"))).Count() > sourceLimit)
        {
            const string reason = "Note fits alone but exceeds this workload's remaining source capacity.";
            if (batch.Arr("feedback").Count > 0)
            {
                return new JsonObject { ["status"] = "source_budget", ["reason"] = reason };
            }
            EnsureObject(state, "deferred_proposals")[LegacyIdentity.Fingerprint(pending)] = pending.Copy();
            state.Remove("pending_author_proposal");
            await SaveAsync(state, "defer note beyond remaining source capacity", cancellationToken);
            return new JsonObject { ["status"] = "size_deferred", ["reason"] = reason };
        }
        bool hasEdits = proposal.Arr("edits").Count != 0;
        if (hasEdits)
        {
            try
            {
                await PrepareDatesAsync(result, selected, prState.Str("head_sha", baseSha ?? "HEAD"), Runtime.ParseTime(pending.Str("prepared_at"))!.Value, cancellationToken);
            }
            catch (NoteDateException error)
            {
                return await QuarantineAsync(state, pending, "publication_metadata", error.Message, cancellationToken);
            }
        }
        Dictionary<string, string> candidate = Map(result.RequiredObject("sources"));
        Dictionary<string, string> current = allNotes.OfType<JsonObject>().ToDictionary(note => note.Str("path"), note => note.Str("content"));
        JsonObject[] stagedFeedback = state.Obj("feedback_workloads").Obj(batch.Str("feedback_scope_id")).Obj("records")
            .Select(item => item.Value).OfType<JsonObject>().ToArray();
        foreach (JsonObject prior in stagedFeedback)
        {
            foreach (KeyValuePair<string, JsonNode?> source in prior.Obj("result").Obj("sources")) current[source.Key] = source.Value!.GetValue<string>();
        }
        foreach (KeyValuePair<string, string> item in candidate) current[item.Key] = item.Value;
        HashSet<string> paths = rawPr.Arr("changed_paths").Strings().Concat(prState.Arr("changed_paths").Strings())
            .Concat(stagedFeedback.SelectMany(record => record.Obj("proposal").Arr("edits").OfType<JsonObject>()).Select(edit => edit.Str("path")))
            .Concat(proposal.Arr("edits").OfType<JsonObject>().Select(edit => edit.Str("path"))).ToHashSet();
        Dictionary<string, string> cumulativeBase = paths.ToDictionary(path => path, path => baseline[path]);
        Dictionary<string, string> cumulativeCurrent = paths.ToDictionary(path => path, path => current[path]);
        string diff = hasEdits ? await Review.DiffAsync(cumulativeBase, cumulativeCurrent, cancellationToken) : "";
        int noteLimit = config.Int("max_pr_notes", 5);
        int lineLimit = config.Int("max_pr_lines", 1200);
        int changedLines = Review.ChangedLines(diff);
        if (batch.Arr("feedback").Count > 0 && changedLines > lineLimit)
        {
            await HoldFeedbackLineLimitAsync(state, batch, pending, changedLines, cancellationToken);
            return new JsonObject { ["status"] = "feedback_needs_scope", ["reason"] = "Cumulative authored PR source exceeds the line ceiling.", ["model_calls"] = modelCalls };
        }
        if (batch.Arr("feedback").Count == 0 && (paths.Count > noteLimit || changedLines > lineLimit))
        {
            if (prState.Int("number") > 0)
            {
                pending["blocked_review"] = new JsonObject { ["reason"] = "PR size limit reached" };
                state.RequiredObject("prs").RequiredObject($"{batch.Str("topic_id")}:{prState.Int("generation")}")["frozen"] = true;
                await SaveAsync(state, "freeze at review size limit", cancellationToken);
                return new JsonObject { ["status"] = "size_limit", ["model_calls"] = modelCalls };
            }

            return await QuarantineAsync(state, pending, "pr_size",
                $"Cumulative PR has {paths.Count} notes (limit {noteLimit}) and {changedLines} changed lines (limit {lineLimit}).", cancellationToken);
        }
        if (batch.Arr("feedback").Count == 0 && hasEdits)
        {
            Dictionary<string, string> aggregateBefore = new(selected);
            Dictionary<string, string> aggregateAfter = new(candidate);
            foreach (JsonObject prior in workload.Arr("accepted_records").OfType<JsonObject>())
            {
                foreach (JsonObject note in prior.Obj("batch").Arr("notes").OfType<JsonObject>()) aggregateBefore[note.Str("path")] = note.Str("content");
                foreach (KeyValuePair<string, JsonNode?> source in prior.Obj("result").Obj("sources")) aggregateAfter[source.Key] = source.Value!.GetValue<string>();
            }
            if (Review.ChangedLines(await Review.DiffAsync(aggregateBefore, aggregateAfter, cancellationToken)) > lineLimit)
            {
                EnsureObject(state, "deferred_proposals")[LegacyIdentity.Fingerprint(pending)] = pending.Copy();
                state.Remove("pending_author_proposal");
                await SaveAsync(state, "defer note beyond remaining workload capacity", cancellationToken);
                return new JsonObject { ["status"] = "size_deferred", ["reason"] = "Note fits alone but exceeds this workload's remaining authored line capacity." };
            }
        }
        JsonObject fetched = pending.Obj("primary_sources").Copy();
        foreach (JsonObject source in sourceEntries)
        {
            EnsureContentBudget();
            try
            {
                string url = source.Str("url");
                if (!fetched.ContainsKey(url))
                {
                    if (!sourceEvidenceCache.TryGetValue(url, out string? text))
                    {
                        await ReserveContentPhaseAsync(state, "source", cancellationToken);
                        text = await sourceFetcher(url, cancellationToken);
                        sourceEvidenceCache[url] = text;
                    }
                    fetched[url] = text;
                    pending["primary_sources"] = fetched.Copy();
                    workload["phase"] = "source_completed";
                    await SaveAsync(state, "preserve completed primary source retrieval", cancellationToken);
                }
            }
            catch (UnsafeInput error)
            {
                return await QuarantineAsync(state, pending, "source_policy", error.Message, cancellationToken);
            }
        }
        JsonObject review;
        try
        {
            review = pending["completed_review"] is JsonObject completed ? completed.Copy() : await CallAsync(true, new JsonObject
            {
                ["rules"] = contentAuthorities.Copy(),
                ["before"] = ObjectMap(selected),
                ["current"] = ObjectMap(candidate),
                ["proposal"] = proposal.Copy(),
                ["edit_indices"] = new JsonArray(Enumerable.Range(0, proposal.Arr("edits").Count).Select(index => (JsonNode?)JsonValue.Create(index)).ToArray()),
                ["needs_fixing_ids"] = needsFixing.Copy(),
                ["known_violations"] = knownViolations.Copy(),
                ["primary_sources"] = fetched,
                ["rejected_proposals"] = state.Arr("rejections").Copy(),
                ["feedback"] = batch.Arr("feedback").Copy(),
                ["recorded_decisions"] = decisions.Copy(),
                ["previous_review"] = pending["repair_review"]?.DeepClone()
            }, cancellationToken);
        }
        catch (ClaudeQuotaException error)
        {
            return await CooldownAsync(error, "review", cancellationToken);
        }
        if (pending["review_evidence"] is JsonObject previousEvidence)
        {
            EnsureObject(state, "review_evidence")[LegacyIdentity.Fingerprint(previousEvidence)] = previousEvidence.Copy();
            pending.Remove("review_evidence");
        }
        JsonObject rawReview = review.Copy();
        JsonArray evidenceBindings;
        (review, evidenceBindings) = Review.BindEvidence(review, candidate);
        if (evidenceBindings.Count > 0)
        {
            pending["review_evidence"] = new JsonObject
            {
                ["raw_review"] = rawReview,
                ["bindings"] = evidenceBindings,
                ["source_hashes"] = ObjectMap(candidate.ToDictionary(item => item.Key, item => LegacyIdentity.Digest(item.Value))),
                ["rules_hash"] = rules,
                ["evaluation_hash"] = evaluation
            };
        }
        workload["phase"] = "review_completed";
        pending["completed_review"] = review.Copy();
        await SaveAsync(state, "preserve bound independent review", cancellationToken);
        if (state["cooldown"] is not null)
        {
            state["cooldown"] = null;
            await SaveAsync(state, "record successful resumption after subscription cooldown", cancellationToken);
        }
        if (!Review.Clean(review, candidate, proposal, state.Arr("rejections"), batch.Arr("feedback")))
        {
            pending["blocked_review"] = review.Copy();
            StoreHold(state, CreateHold(pending));
            if (CanPrepareRepair(state, pending) && HasRepairFinding(review, selected.Keys))
            {
                PrepareRepair(state, pending, review, evaluation);
                await SaveAsync(state, "queue bounded repair from semantic review", cancellationToken);
                if (CanStartAuthor())
                {
                    return await RunOneAsync(apply, withModel, cancellationToken);
                }
                return new JsonObject { ["status"] = "repair_pending", ["model_calls"] = modelCalls };
            }
            state.Remove("pending_author_proposal");
            await SaveAsync(state, "preserve blocked semantic review", cancellationToken);
            return new JsonObject { ["status"] = "review_blocked", ["proposal"] = proposal, ["review"] = review, ["model_calls"] = modelCalls };
        }
        string[] violationPaths = proposal.Arr("dispositions").OfType<JsonObject>()
            .Where(disposition => disposition.Str("outcome") == "keep" && knownViolations[disposition.Str("path")] is JsonArray { Count: > 0 })
            .Select(disposition => disposition.Str("path")).ToArray();
        if (violationPaths.Length != 0)
        {
            pending["completed_review"] = review.Copy();
            return await QuarantineAsync(state, pending, "keep_structural_validation",
                "Keep disposition leaves known native inventory violations in: " + string.Join(", ", violationPaths), cancellationToken);
        }
        JsonObject ReviewedRecord() => new()
        {
            ["record_id"] = LegacyIdentity.Fingerprint(new JsonObject { ["workload_id"] = workload.Str("id"), ["hashes"] = hashes.Copy(), ["proposal"] = proposal.Copy() }),
            ["workload_id"] = workload.Str("id"),
            ["batch"] = batch.Copy(),
            ["proposal"] = proposal.Copy(),
            ["result"] = result.Copy(),
            ["review"] = review.Copy(),
            ["decisions"] = decisions.Copy(),
            ["review_evidence"] = pending["review_evidence"]?.DeepClone(),
            ["source_hashes"] = hashes.Copy(),
            ["prepared_source_version"] = 1,
            ["prepared_at"] = pending.Str("prepared_at"),
            ["rules_hash"] = rules,
            ["evaluation_hash"] = evaluation
        };
        if (proposal.Arr("edits").Count == 0)
        {
            bool keep = decisions.Count == 0;
            if (batch.Arr("feedback").Count > 0)
            {
                JsonObject feedbackRecord = ReviewedRecord();
                state.Remove("pending_author_proposal");
                await RecordFeedbackProgressAsync(state, feedbackRecord, cancellationToken);
                return new JsonObject { ["status"] = "no_worthwhile_changes", ["proposal"] = proposal, ["review"] = review, ["model_calls"] = modelCalls };
            }
            if (apply || keep)
            {
                state = Core.RecordOutcome(state, batch, proposal, result, review);
                if (apply)
                {
                    Proposal.PersistDecisions(state, decisions);
                }
                Core.CompleteReviewHolds(state, batch, pending["review_evidence"] as JsonObject);
                state.Remove("pending_author_proposal");
                state["cooldown"] = null;
                await SaveAsync(state, "record independently verified keep or feedback decision", cancellationToken);
                await FeedbackReceiptAsync(proposal, batch, null, apply, cancellationToken);
            }
            return new JsonObject { ["status"] = apply || keep ? "no_worthwhile_changes" : "proposed", ["proposal"] = proposal, ["review"] = review, ["model_calls"] = modelCalls };
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

        IEnumerable<JsonObject> validationRecords = workload.Arr("accepted_records").OfType<JsonObject>();
        string feedbackScope = batch.Str("feedback_scope_id");
        if (feedbackScope.Length > 0)
        {
            validationRecords = validationRecords.Concat(state.Obj("feedback_workloads").Obj(feedbackScope).Obj("records").Select(item => item.Value).OfType<JsonObject>());
        }
        foreach (JsonObject prior in validationRecords)
        {
            foreach (JsonObject note in prior.Obj("batch").Arr("notes").OfType<JsonObject>()) validationExpected[note.Str("path")] = note.Str("content");
            foreach (KeyValuePair<string, JsonNode?> source in prior.Obj("result").Obj("sources")) validationCandidate[source.Key] = source.Value!.GetValue<string>();
        }
        EnsureContentBudget();
        JsonArray validation;
        try
        {
            await ReserveContentPhaseAsync(state, "validation", cancellationToken);
            validation = await validator(validationExpected, validationCandidate, cancellationToken);
            workload["phase"] = "validation_completed";
            await SaveAsync(state, "preserve completed repository validation", cancellationToken);
            EnsureContentBudget();
        }
        catch (CandidateValidationFailure error)
        {
            pending["completed_review"] = review.Copy();
            return await QuarantineAsync(state, pending, "repository_validation", error.Message, cancellationToken);
        }
        JsonObject accepted = ReviewedRecord();
        accepted["calls_reserved"] = workload.Int("calls_reserved");
        accepted["elapsed_seconds"] = ElapsedSeconds(workload);
        accepted["accepted_at"] = Core.FormatTime(clock.GetUtcNow());
        accepted["phase"] = "accepted";
        history.Add(accepted.Copy());
        JsonArray changes = Copies(history.OfType<JsonObject>().SelectMany(record => record.RequiredObject("proposal").Arr("edits")));
        JsonArray cumulativeFeedback = Copies(history.OfType<JsonObject>().SelectMany(record => record.RequiredObject("proposal").Arr("feedback").OfType<JsonObject>()).Select(item =>
        {
            JsonObject copy = item.Copy();
            copy["url"] = state.Obj("feedback").Obj(item.Str("key")).Str("url", item.Str("key"));
            return copy;
        }));
        int generation = prState.Int("generation", state.Obj("topics").Obj(batch.Str("topic_id")).Int("generation", config.Int("initial_generation", 1)));
        string branch = prState.Str("branch", Core.BranchFor(batch.Str("topic"), generation));
        Dictionary<string, string> links = paths.ToDictionary(path => path, path => $"https://github.com/{config.Str("repo")}/blob/{string.Join('/', branch.Split('/').Select(Uri.EscapeDataString))}/{string.Join('/', path.Split('/').Select(Uri.EscapeDataString))}");
        string summary = Summary.Render(cumulativeBase, cumulativeCurrent, changes, cumulativeFeedback, links);
        bool exportRequired = Receipt.NeedsExport(selected, candidate);
        if (exportRequired)
        {
            summary += "\n<!-- devbook-export-validation -->Quartz export: awaiting the source-bound native export and checks.\n\nOwner review or size limits freeze unrelated additions; requested fixes and export can continue.\n";
        }

        if (prState.Str("review_started_head_sha").Length > 0)
        {
            summary += "\nChanges after review require renewed review of this head. Ready status follows verified export and checks.\n";
        }

        var response = new JsonObject
        {
            ["status"] = "proposed",
            ["topic"] = batch.Str("topic"),
            ["proposal"] = proposal.Copy(),
            ["review"] = review.Copy(),
            ["review_evidence"] = pending["review_evidence"]?.DeepClone(),
            ["candidate"] = ObjectMap(candidate),
            ["summary"] = summary,
            ["validation"] = validation.Copy(),
            ["question_changes"] = Copies(Summary.CoalesceChanges(cumulativeBase, cumulativeCurrent, changes).OfType<JsonObject>().Where(edit => edit.Str("kind") != "note")),
            ["diff"] = diff,
            ["model_calls"] = modelCalls
        };
        JsonObject records = new()
        {
            ["version"] = 2,
            ["workload_id"] = workload.Str("id"),
            ["records"] = new JsonArray(accepted.Copy()),
            ["proposal_history"] = history.Copy(),
            ["topic_id"] = batch.Str("topic_id"),
            ["generation"] = generation,
            ["base_note_hashes"] = ObjectMap(allNotes.OfType<JsonObject>().Where(note => note.Str("topic") == batch.Str("topic")).ToDictionary(note => note.Str("path"), note => LegacyIdentity.Digest(baseline[note.Str("path")])))
        };
        JsonObject request = new JsonObject
        {
            ["topic"] = batch.Str("topic_id"),
            ["generation"] = generation,
            ["branch"] = branch,
            ["base_sources"] = ObjectMap(cumulativeBase),
            ["pr_sources"] = ObjectMap(cumulativeCurrent),
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
        };
        response["accepted_record"] = accepted.Copy();
        response["publication_request"] = request;
        state.Remove("pending_author_proposal");
        workload.Arr("accepted_records").Add(accepted.Copy());
        workload["last_request"] = response["publication_request"]!.DeepClone();
        workload["validation"] = validation.Copy();
        if (batch.Arr("feedback").Count > 0)
        {
            accepted["publication_request"] = request.Copy();
            await RecordFeedbackProgressAsync(state, accepted, cancellationToken);
        }
        await SaveAsync(state, "save independently accepted focused note", cancellationToken);
        return response;
    }

    private async Task<JsonObject> QuarantineAsync(JsonObject state, JsonObject pending, string stage, string reason, CancellationToken cancellationToken)
    {
        JsonObject failed = CreateHold(pending);
        failed["blocked_review"] = new JsonObject { ["stage"] = stage, ["reason"] = reason };
        failed["failed_at"] = Core.FormatTime(clock.GetUtcNow());
        EnsureObject(state, "invalid_proposals")[LegacyIdentity.Digest(pending.ToJsonString())] = failed.Copy();
        StoreHold(state, failed);
        state.Remove("pending_author_proposal");
        await SaveAsync(state, "quarantine invalid author proposal", cancellationToken);
        return new JsonObject { ["status"] = "proposal_blocked", ["stage"] = stage, ["reason"] = reason, ["model_calls"] = modelCalls };
    }

    private static JsonObject RepairInputsFor(IEnumerable<JsonObject> notes) => new(notes.Select(note =>
        new KeyValuePair<string, JsonNode?>(note.Str("path"), JsonValue.Create(note.Str("repair_input_hash")))));

    private static JsonObject CreateHold(JsonObject pending)
    {
        JsonObject hold = pending.Copy();
        if (hold["feedback_snapshot"] is not JsonArray)
        {
            hold["feedback_snapshot"] = Copies(pending.Obj("batch").Arr("feedback").OfType<JsonObject>()
                .Select(item => new JsonObject { ["key"] = item.Str("key"), ["paths"] = item.Arr("paths").Copy() }));
        }
        return hold;
    }

    private static void HoldIncompatiblePending(JsonObject state, JsonObject pending, string stage)
    {
        JsonObject hold = CreateHold(pending);
        hold["incompatibility"] = new JsonObject { ["stage"] = stage, ["reason"] = "Saved author proposal no longer matches the current evaluation or inputs." };
        if (!hold.ContainsKey("blocked_review"))
        {
            hold["blocked_review"] = hold["incompatibility"]!.DeepClone();
        }
        JsonObject archive = EnsureObject(state, "invalid_proposals");
        archive[LegacyIdentity.Fingerprint(pending)] = hold.Copy();
        StoreHold(state, hold);
        state.Remove("pending_author_proposal");
    }

    private static bool Held(JsonObject state, JsonObject note, string rules)
    {
        string path = note.Str("path");
        string[] keys = state.Obj("feedback").Select(item => item.Value).OfType<JsonObject>()
            .Where(item => item.Str("status") == "pending" && item.Str("topic") == note.Str("topic") && item.Arr("paths").Strings().Contains(path))
            .Select(item => item.Str("key")).Order(StringComparer.Ordinal).ToArray();
        return state.Obj("held_proposals").Concat(state.Obj("invalid_proposals")).Select(item => item.Value).OfType<JsonObject>()
            .Any(hold => hold.Obj("source_hashes").Str(path) == note.Str("hash") && hold.Str("rules_hash") == rules
                && hold.Obj("repair_inputs").Str(path) == note.Str("repair_input_hash")
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
            byte[] candidate = Encoding.UTF8.GetBytes(text);
            string[] publicationKeys = NoteDates.PublicationKeys(root);
            string? publication = null;
            if (NoteDates.IsPublished(candidate) && NoteDates.Published(candidate, publicationKeys) is null)
            {
                publication = NoteDates.RecoverPublished(root, path, publicationKeys)?.Timestamp
                    ?? throw new NoteDateException($"No verified publication date is available for {path}; run its first successful local export before scheduled improvement.");
            }
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
            result.RequiredObject("sources")[path] = Encoding.UTF8.GetString(NoteDates.Prepare(candidate, Encoding.UTF8.GetBytes(selected[path]), instant, history, publication, publicationKeys));
        }
    }
}
