using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public sealed partial class ImprovementEngine
{
    private int FeedbackPr => config.Int("feedback_pr");

    private bool FeedbackBatchMatches(JsonObject batch) => batch.Obj("pr").Int("number") == FeedbackPr && batch.Arr("feedback").Count > 0;

    private bool FeedbackOperationMatches(JsonObject operation)
    {
        if (FeedbackPr == 0) return true;
        if (operation.Int("pr_number", operation.Obj("evidence").Int("pr_number")) != FeedbackPr) return false;
        JsonObject export = operation.Obj("evidence").Obj("export_request");
        if (export.Count > 0 && export.Int("pr_number") != FeedbackPr) return false;
        JsonArray records = WorkloadReceipts.Records(operation.Obj("receipts"));
        return records.Count > 0 && records.OfType<JsonObject>().All(record => FeedbackBatchMatches(record.Obj("batch")));
    }

    private static bool CanParkPublishedProposal(JsonObject state, JsonObject pending)
    {
        JsonObject saved = state.Obj("focused_workload");
        string[] paths = pending.Obj("source_hashes").Select(pair => pair.Key).ToArray();
        return saved.Str("status") == "published" && pending.Str("workload_id").Length > 0
            && pending.Str("workload_id") == saved.Str("id") && pending.Arr("feedback_keys").Count == 0
            && paths.Length == 1 && Queue.OpenPrForTopic(state, Core.TopicFor(paths[0])) is not null;
    }

    private JsonObject? FeedbackScopePause(JsonObject state)
    {
        if (FeedbackPr == 0) return null;
        string reason = "";
        JsonObject saved = state.Obj("focused_workload");
        bool resumable = saved.Str("status") == "active" || saved.Str("status") == "sealed" && saved.Arr("accepted_records").Count > 0;
        bool matching = (saved.Int("feedback_pr") == FeedbackPr
                || FeedbackBatchMatches(state.Obj("feedback_workloads").Obj(saved.Str("feedback_scope_id"))))
            && saved.Arr("accepted_records").OfType<JsonObject>().All(record => FeedbackBatchMatches(record.Obj("batch")))
            && (saved.Obj("current_batch").Count == 0 || FeedbackBatchMatches(saved.Obj("current_batch")));
        if (resumable && !matching) reason = "Finish the saved ordinary or other-PR workload before processing this feedback.";
        JsonObject pending = state.Obj("pending_author_proposal");
        if (pending.Count > 0 && !FeedbackBatchMatches(pending.Obj("batch")) && !CanParkPublishedProposal(state, pending))
            reason = "An unrelated author proposal is awaiting recovery; it was preserved.";
        if (state["pending_operation"] is JsonObject operation && !FeedbackOperationMatches(operation)) reason = "An unrelated publication is awaiting recovery; it was preserved.";
        if (state.Obj("export_operations").Any(pair => pair.Value is JsonObject export
            && export.Int("pr_number", export.Obj("evidence").Int("pr_number")) == FeedbackPr
            && state.Obj("finalized_exports")[pair.Key] is null && !FeedbackOperationMatches(export)))
            reason = "Finish the PR's saved ordinary export before processing new feedback.";
        return reason.Length == 0 ? null : new JsonObject
        {
            ["status"] = "feedback_paused",
            ["reason"] = reason,
            ["feedback_pr"] = FeedbackPr,
            ["model_calls"] = 0
        };
    }

    private JsonObject PrepareFeedbackBatch(JsonObject state, JsonObject batch, JsonArray notes, string? baseSha)
    {
        if (batch.Arr("feedback").Count == 0) return batch;
        JsonArray feedback = Copies(state.Obj("feedback").Select(pair => pair.Value).OfType<JsonObject>()
            .Where(item => item.Str("status") == "pending" && item.Str("topic") == batch.Str("topic")
                && item.Int("pr_number") == batch.Obj("pr").Int("number")));
        string[] paths = feedback.OfType<JsonObject>().SelectMany(item => item.Arr("paths").Strings()).Distinct().Order(StringComparer.Ordinal).ToArray();
        string head = batch.Obj("pr").Str("head_sha");
        JsonObject sourceHashes = ObjectMap(notes.OfType<JsonObject>().Where(note => paths.Contains(note.Str("path")))
            .ToDictionary(note => note.Str("path"), note => LegacyIdentity.Digest(note.Str("content"))));
        var identity = new JsonObject
        {
            ["feedback"] = feedback.Copy(),
            ["base_sha"] = baseSha,
            ["head_sha"] = head,
            ["source_hashes"] = sourceHashes.Copy(),
            ["rules_hash"] = batch.Str("rules_hash"),
            ["evaluation_hash"] = batch.Str("evaluation_hash")
        };
        string id = LegacyIdentity.Fingerprint(identity);
        JsonObject scopes = EnsureObject(state, "feedback_workloads");
        foreach ((string oldId, JsonNode? value) in scopes.ToArray())
        {
            if (oldId != id && value is JsonObject old && old.Str("topic") == batch.Str("topic") && old.Str("status") == "pending"
                && (FeedbackPr == 0 || old.Obj("pr").Int("number") == FeedbackPr))
            {
                old["status"] = "invalidated";
                old["invalidated_reason"] = "feedback revision, base, guarded head or evaluation inputs changed";
            }
        }
        JsonObject scope = scopes[id] as JsonObject ?? new JsonObject
        {
            ["id"] = id,
            ["topic"] = batch.Str("topic"),
            ["status"] = "pending",
            ["base_sha"] = baseSha,
            ["head_sha"] = head,
            ["feedback"] = feedback.Copy(),
            ["paths"] = Copies(paths.Select(path => JsonValue.Create(path))),
            ["pr"] = batch.Obj("pr").Copy(),
            ["records"] = new JsonObject(),
            ["source_hashes"] = sourceHashes.Copy()
        };
        if (!scopes.ContainsKey(id)) scopes[id] = scope;
        JsonObject projected = batch.Copy();
        projected["feedback"] = feedback.Copy();
        projected["feedback_scope_id"] = id;
        if (workload is not null) workload["feedback_scope_id"] = id;
        HashSet<string> existing = batch.Obj("pr").Arr("changed_paths").Strings().ToHashSet();
        bool oversized = existing.Union(paths).Count() > config.Int("max_pr_notes", 5) && paths.Any(path => !existing.Contains(path));
        HashSet<string> attempted = workload?.Arr("attempted_paths").Strings().ToHashSet() ?? [];
        JsonObject? next = notes.OfType<JsonObject>().FirstOrDefault(note => paths.Contains(note.Str("path"))
            && !scope.Obj("records").ContainsKey(note.Str("path")) && !attempted.Contains(note.Str("path")));
        projected["notes"] = oversized || next is null ? new JsonArray() : new JsonArray(next.Copy());
        if (oversized)
        {
            projected["feedback_hold_reason"] = "feedback_needs_scope";
            scope["status"] = "feedback_needs_scope";
            foreach (JsonObject item in feedback.OfType<JsonObject>())
            {
                JsonObject queued = state.Obj("feedback").RequiredObject(item.Str("key"));
                queued["status"] = "feedback_needs_scope";
                queued["reason"] = "Requested new paths exceed the ordinary note cap; explicit scope clarification is required.";
            }
        }
        return projected;
    }

    private async Task HoldFeedbackLineLimitAsync(JsonObject state, JsonObject batch, JsonObject pending, int changedLines, CancellationToken cancellationToken)
    {
        JsonObject scope = state.Obj("feedback_workloads").Obj(batch.Str("feedback_scope_id"));
        scope["status"] = "feedback_needs_scope";
        scope["hold_reason"] = $"Cumulative authored PR source has {changedLines} changed lines; limit {config.Int("max_pr_lines", 1200)}.";
        if (pending.Count > 0)
        {
            scope["size_hold_proposal"] = pending.Copy();
            state.Remove("pending_author_proposal");
        }
        foreach (JsonObject item in batch.Arr("feedback").OfType<JsonObject>())
        {
            JsonObject queued = state.Obj("feedback").RequiredObject(item.Str("key"));
            queued["status"] = "feedback_needs_scope";
            queued["reason"] = scope["hold_reason"]?.DeepClone();
        }
        await SaveAsync(state, "hold feedback beyond cumulative PR source line ceiling", cancellationToken);
    }

    private async Task RecordFeedbackProgressAsync(JsonObject state, JsonObject record, CancellationToken cancellationToken)
    {
        string id = record.Obj("batch").Str("feedback_scope_id");
        if (id.Length == 0) return;
        JsonObject scope = state.Obj("feedback_workloads").Obj(id);
        if (scope.Count == 0 || scope.Str("status") != "pending") throw new Conflict("Feedback scope changed before review progress was saved.");
        string path = record.Obj("batch").Arr("notes").OfType<JsonObject>().Single().Str("path");
        if (!scope.Arr("paths").Strings().Contains(path) || record.Obj("review").Str("verdict") != "CLEAN")
            throw new Conflict("Feedback progress lacks a complete scoped independent review.");
        scope.RequiredObject("records")[path] = record.Copy();
        await SaveAsync(state, "preserve independently reviewed feedback path", cancellationToken);
    }

    private async Task<JsonObject?> FinishFeedbackAsync(bool apply, CancellationToken cancellationToken)
    {
        string id = workload?.Str("feedback_scope_id") ?? "";
        if (id.Length == 0) return null;
        JsonObject state = await InitialStateAsync(cancellationToken);
        JsonObject scope = state.Obj("feedback_workloads").Obj(id);
        string[] paths = scope.Arr("paths").Strings().ToArray();
        if (scope.Str("status") == "feedback_needs_scope") return FeedbackResult("feedback_needs_scope");
        if (scope.Str("status") != "pending" || paths.Length == 0 || paths.Any(path => !scope.Obj("records").ContainsKey(path)))
            return FeedbackResult("feedback_pending");
        JsonObject[] records = paths.Select(path => scope.Obj("records").RequiredObject(path)).ToArray();
        if (api is null || publisher is null) return FeedbackResult("feedback_pending");
        int number = scope.Obj("pr").Int("number");
        JsonObject pr = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
        if (Runtime.Lifecycle(pr) != "open" || pr.Obj("head").Str("sha") != scope.Str("head_sha"))
            throw new Conflict("Feedback guarded PR head changed before scoped completion.");
        JsonArray current = await Feedback.PollAsync(api, number, config.Arr("owner_allowlist"), cancellationToken);
        foreach (JsonObject feedback in scope.Arr("feedback").OfType<JsonObject>())
        {
            if (!current.OfType<JsonObject>().Select(LegacyIdentity.CoreFeedback)
                .Any(identity => identity.Key == feedback.Str("key") && identity.Revision == feedback.Str("revision")))
                throw new Conflict("Verified owner feedback revision changed before scoped completion.");
        }
        foreach (string path in paths)
        {
            string text = await publisher.ReadNoteAsync(path, pr.Obj("head").Str("ref"), cancellationToken);
            if (LegacyIdentity.Digest(text) != scope.Obj("source_hashes").Str(path))
                throw new Conflict("Feedback source changed before scoped completion: " + path);
        }
        JsonObject[] changed = records.Where(record => record.Obj("proposal").Arr("edits").Count > 0).ToArray();
        workload!["feedback_records"] = Copies(records);
        JsonObject? savedRequest = records.Select(record => record["publication_request"]).OfType<JsonObject>().LastOrDefault();
        if (savedRequest is not null) workload["last_request"] = savedRequest.Copy();
        workload["accepted_records"] = Copies(changed);
        if (changed.Length != 0) return null;
        if (scope.Obj("pr").Bool("export_required") || scope.Obj("pr").Str("export_operation_id").Length != 0)
        {
            if (!await Worker.ArtifactCurrentAsync(api, config, state, scope.Obj("pr"), scope.Str("head_sha"), cancellationToken))
                return FeedbackResult("feedback_pending_export");
        }
        if (!apply) return FeedbackResult("no_worthwhile_changes");
        foreach (JsonObject record in records)
        {
            state = Core.RecordOutcome(state, record.RequiredObject("batch"), record.RequiredObject("proposal"), record.RequiredObject("result"), record.RequiredObject("review"), processFeedback: false);
            Proposal.PersistDecisions(state, record.Arr("decisions"));
            Core.CompleteReviewHolds(state, record.RequiredObject("batch"), record["review_evidence"] as JsonObject);
        }
        foreach (JsonObject feedback in scope.Arr("feedback").OfType<JsonObject>())
        {
            JsonObject[] decisions = records.SelectMany(record => record.Obj("proposal").Arr("feedback").OfType<JsonObject>())
                .Where(item => item.Str("key") == feedback.Str("key")).ToArray();
            JsonObject terminal = state.Obj("feedback").RequiredObject(feedback.Str("key"));
            terminal["status"] = decisions.LastOrDefault()?.Str("outcome", "implemented") ?? "implemented";
            terminal["reason"] = string.Join("; ", decisions.Select(item => item.Str("reason")).Distinct());
        }
        state.Obj("feedback_workloads").RequiredObject(id)["status"] = "completed";
        state.Obj("feedback_workloads").RequiredObject(id)["ack_pending"] = true;
        JsonObject pending = state.Obj("pending_author_proposal");
        if (pending.Str("workload_id").Length > 0 && pending.Str("workload_id") == workload.Str("id")
            && records.Any(record => JsonNode.DeepEquals(record["proposal"], pending["proposal"])
                && JsonNode.DeepEquals(record["source_hashes"], pending["source_hashes"])))
            state.Remove("pending_author_proposal");
        await SaveAsync(state, "atomically complete independently reviewed no-change feedback", cancellationToken);
        await ReplayFeedbackAcknowledgmentsAsync(cancellationToken);
        return FeedbackResult("no_worthwhile_changes");
    }

    private async Task ReplayFeedbackAcknowledgmentsAsync(CancellationToken cancellationToken)
    {
        JsonObject state = await InitialStateAsync(cancellationToken);
        foreach (JsonObject scope in state.Obj("feedback_workloads").Select(pair => pair.Value).OfType<JsonObject>()
            .Where(scope => scope.Str("status") == "completed" && scope.Bool("ack_pending")
                && (FeedbackPr == 0 || scope.Obj("pr").Int("number") == FeedbackPr)))
        {
            var results = new JsonArray();
            foreach (JsonObject feedback in scope.Arr("feedback").OfType<JsonObject>())
            {
                JsonObject[] decisions = scope.Obj("records").Select(pair => pair.Value).OfType<JsonObject>()
                    .SelectMany(record => record.Obj("proposal").Arr("feedback").OfType<JsonObject>())
                    .Where(item => item.Str("key") == feedback.Str("key")).ToArray();
                results.Add(new JsonObject
                {
                    ["key"] = feedback.Str("key"),
                    ["outcome"] = decisions.LastOrDefault()?.Str("outcome", "implemented") ?? "implemented",
                    ["reason"] = string.Join("; ", decisions.Select(item => item.Str("reason")).Distinct().Order(StringComparer.Ordinal))
                });
            }
            var proposal = new JsonObject { ["feedback"] = results };
            var batch = new JsonObject { ["feedback"] = scope.Arr("feedback").Copy(), ["pr"] = scope.Obj("pr").Copy() };
            await FeedbackReceiptAsync(proposal, batch, scope.Str("head_sha"), true, cancellationToken);
            scope["ack_pending"] = false;
            await SaveAsync(state, "record idempotent no-change feedback acknowledgment", cancellationToken);
        }
    }

    private JsonObject FeedbackResult(string status) => new()
    {
        ["status"] = status,
        ["coverage"] = Coverage(),
        ["model_calls"] = workload?.Int("calls_reserved") ?? modelCalls,
        ["stop_reason"] = workload?.Str("stop_reason")
    };
}
