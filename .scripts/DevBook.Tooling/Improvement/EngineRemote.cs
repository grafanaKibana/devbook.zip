using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public sealed partial class ImprovementEngine
{
    private async Task<(JsonObject State, Dictionary<int, JsonObject> Prs, JsonArray Feedback)> RemoteViewAsync(
        JsonObject state, JsonArray notes, string? baseSha, bool postFeedback, CancellationToken cancellationToken)
    {
        if (api is null || publisher is null)
        {
            return (state, [], new JsonArray());
        }
        JsonArray prs = await Runtime.ArrayAsync(api, "/pulls?state=all&per_page=100", cancellationToken);
        Dictionary<string, string> topics = notes.OfType<JsonObject>().GroupBy(note => Core.TopicId(note.Str("topic"))).ToDictionary(group => group.Key, group => group.First().Str("topic"));
        Dictionary<string, JsonObject> byPath = notes.OfType<JsonObject>().ToDictionary(note => note.Str("path"));
        var allFeedback = new JsonArray();
        var rows = new JsonArray();
        var managed = new Dictionary<int, JsonObject>();
        var polled = new HashSet<int>();
        foreach (JsonObject pr in prs.OfType<JsonObject>())
        {
            (string Topic, int Generation)? marker = Runtime.ParseMarker(pr.Str("body"));
            if (marker is null || !Runtime.ValidPrIdentity(pr, config.Str("repo"), config.Str("base_branch", "main"), marker.Value.Topic, marker.Value.Generation))
            {
                continue;
            }
            (string topicKey, int generation) = marker.Value;
            string status = Runtime.Lifecycle(pr);
            JsonObject prior = state.Obj("prs").Obj($"{topicKey}:{generation}");
            if (status == "closed" && prior.Str("status") == "open")
            {
                foreach (JsonObject record in prior.Arr("proposal_records").OfType<JsonObject>())
                {
                    JsonObject rejected = record.RequiredObject("result").Copy();
                    rejected["outcome"] = "closed_without_merge";
                    state = Core.RecordOutcome(state, record.RequiredObject("batch"), record.RequiredObject("proposal"), rejected);
                }
                foreach (string path in prior.Arr("proposal_records").OfType<JsonObject>().SelectMany(record => record.RequiredObject("proposal").Arr("edits").OfType<JsonObject>()).Select(edit => edit.Str("path")).Distinct())
                {
                    if (byPath.TryGetValue(path, out JsonObject? note) && state.Obj("notes")[path] is JsonObject outcome)
                    {
                        outcome["content_hash"] = note.Str("hash");
                        outcome["outcome"] = "keep";
                    }
                }
            }
            if (status == "merged" && prior.Str("export_operation_id").Length > 0)
            {
                state = await FinalizeExportReceiptsAsync(state, prior, pr.Obj("head").Str("sha"), false, cancellationToken);
            }
            if (status != "open")
            {
                foreach (JsonObject item in state.Obj("feedback").Select(pair => pair.Value).OfType<JsonObject>())
                {
                    if (item.Int("pr_number") == pr.Int("number") && item.Str("status") == "pending")
                    {
                        item["status"] = "terminal";
                    }
                }
            }
            JsonObject row = pr.Copy();
            row["topic_id"] = topicKey;
            row["generation"] = generation;
            row["status"] = status;
            row["branch"] = pr.Obj("head").Str("ref");
            row["head_sha"] = pr.Obj("head").Str("sha");
            row["frozen"] = prior.Bool("frozen");
            row["review_started_head_sha"] = prior.Str("review_started_head_sha").Length > 0
                ? prior["review_started_head_sha"]!.DeepClone()
                : status == "open" && !pr.Bool("draft", true) ? pr.Obj("head")["sha"]?.DeepClone() : null;
            if (status == "open")
            {
                JsonObject topicState = state.Obj("topics").Obj(topicKey);
                if (topicState.Int("generation") == generation && topicState.Obj("publication_conflict").Int("generation", -1) == generation)
                {
                    row["base_conflict"] = true;
                    row["pause_reason"] = topicState.Obj("publication_conflict").Str("reason");
                    rows.Add(row);
                    continue;
                }
                if (!topics.TryGetValue(topicKey, out string? topic))
                {
                    row["base_conflict"] = true;
                    row["frozen"] = true;
                    row["pause_reason"] = "Managed PR topic no longer exists; reconcile this PR manually.";
                    rows.Add(row);
                    continue;
                }
                JsonArray files = await Runtime.ArrayAsync(api, $"/pulls/{pr.Int("number")}/files?per_page=100", cancellationToken);
                string[] allPaths = files.OfType<JsonObject>().Select(file => file.Str("filename")).ToArray();
                string[] paths = allPaths.Where(path => !Receipt.IsExportPath(path)).ToArray();
                bool automatic = config.Bool("automatic_export");
                bool otherFreeze = row.Str("review_started_head_sha").Length > 0 || prior["validation_failure"] is not null || prior.Str("reviewDecision").Length > 0
                    || prior.Bool("review_activity") || prior.Bool("has_reviews") || prior.Int("review_count") > 0 || prior["draft"]?.GetValue<bool>() == false
                    || prior.Arr("changed_paths").Count >= config.Int("max_pr_notes", 16) || prior.Int("additions") + prior.Int("deletions") >= config.Int("max_pr_lines", 1200);
                if (automatic && prior.Str("export_operation_id").Length > 0 && !otherFreeze)
                {
                    row["frozen"] = false;
                    row["clear_export_freeze"] = true;
                }
                JsonObject mainHashes = ObjectMap(notes.OfType<JsonObject>().Where(note => note.Str("topic") == topic).ToDictionary(note => note.Str("path"), note => note.Str("hash")));
                if (!JsonNode.DeepEquals(prior["base_note_hashes"], mainHashes))
                {
                    if (baseSha is null)
                    {
                        throw new Conflict("Managed branch reconciliation needs a verified base snapshot.");
                    }
                    JsonObject comparison = await Runtime.ObjectAsync(api, "GET", $"/compare/{baseSha}...{pr.Obj("head").Str("sha")}", cancellationToken: cancellationToken);
                    bool includesBase = comparison.Obj("merge_base_commit").Str("sha") == baseSha;
                    row["base_conflict"] = !includesBase;
                    row["base_note_hashes"] = includesBase ? mainHashes.Copy() : prior["base_note_hashes"]?.DeepClone();
                    if (!includesBase)
                    {
                        row["pause_reason"] = "Authoritative topic notes changed on the base branch; update the PR branch to include it.";
                        rows.Add(row);
                        continue;
                    }
                }
                else
                {
                    row["base_conflict"] = false;
                    row["base_note_hashes"] = mainHashes.Copy();
                }
                row["pause_reason"] = null;
                if (allPaths.Any(Receipt.IsExportPath))
                {
                    RemoteExportReceipt receipt;
                    try
                    {
                        receipt = await Receipt.RemoteAsync(api, pr.Obj("head").Str("sha"), cancellationToken);
                    }
                    catch (Exception error) when (error is IOException or RuntimeFailure)
                    {
                        row["base_conflict"] = true;
                        row["frozen"] = true;
                        row["pause_reason"] = error.Message;
                        rows.Add(row);
                        continue;
                    }
                    row["export_required"] = !receipt.SourcesCurrent;
                    if (!automatic)
                    {
                        row["frozen"] = true;
                    }
                    if (receipt.SourcesCurrent && prior.Str("export_operation_id").Length > 0)
                    {
                        try
                        {
                            JsonObject checks = await Runtime.RequiredChecksForShaAsync(api, pr.Obj("head").Str("sha"), config.Arr("required_check_contexts").Strings().Append("validate").Distinct(), cancellationToken);
                            if (checks.Count > 0 && checks.All(item => item.Value?.GetValue<string>() == "success"))
                            {
                                state = await FinalizeExportReceiptsAsync(state, row, pr.Obj("head").Str("sha"), postFeedback, cancellationToken);
                            }
                        }
                        catch (Conflict)
                        {
                        }
                    }
                }
                else if (prior.Bool("export_required"))
                {
                    row["export_required"] = true;
                }
                foreach (string path in paths)
                {
                    Runtime.ValidateNotePath(root, path);
                    if (!byPath.TryGetValue(path, out JsonObject? note) || Core.TopicFor(path) != topic)
                    {
                        throw new Conflict("Managed branch has changes outside its topic.");
                    }
                    string text = await publisher.ReadNoteAsync(path, pr.Obj("head").Str("ref"), cancellationToken);
                    note["content"] = text;
                    note["hash"] = LegacyIdentity.Digest(text);
                }
                JsonArray feedback = await Feedback.PollAsync(api, pr.Int("number"), config.Arr("owner_allowlist"), cancellationToken);
                polled.Add(pr.Int("number"));
                foreach (JsonObject item in feedback.OfType<JsonObject>())
                {
                    string[] scoped = item.Arr("paths").Strings().Where(path => byPath.ContainsKey(path) && Core.TopicFor(path) == topic).ToArray();
                    JsonObject entry = item.Copy();
                    entry["author"] = item["user"]?.DeepClone();
                    entry["topic"] = topic;
                    entry["pr_number"] = pr.Int("number");
                    entry["paths"] = Copies(scoped.Select(value => JsonValue.Create(value)));
                    allFeedback.Add(entry);
                }
                row["frozen"] = row.Bool("frozen") || feedback.Count > 0 || !pr.Bool("draft", true) || paths.Length >= config.Int("max_pr_notes", 16)
                    || files.OfType<JsonObject>().Sum(file => file.Int("additions") + file.Int("deletions")) >= config.Int("max_pr_lines", 1200);
                row["changed_paths"] = Copies(paths.Select(value => JsonValue.Create(value)));
                row["review_started_head_sha"] = row["review_started_head_sha"]?.DeepClone() ?? (feedback.Count > 0 ? pr.Obj("head")["sha"]?.DeepClone() : null);
                JsonObject raw = pr.Copy();
                raw["changed_paths"] = Copies(paths.Select(value => JsonValue.Create(value)));
                managed[pr.Int("number")] = raw;
            }
            rows.Add(row);
        }
        state = Core.SyncPrs(state, rows, config);
        JsonArray actionable = Copies(allFeedback.OfType<JsonObject>().Where(item => !string.IsNullOrWhiteSpace(item.Str("body"))));
        foreach (JsonObject item in Core.IngestFeedback(state, rows, actionable, config.Arr("owner_allowlist")).OfType<JsonObject>())
        {
            foreach (JsonObject old in state.Obj("feedback").Select(pair => pair.Value).OfType<JsonObject>())
            {
                if (old.Str("kind") == item.Str("kind") && JsonNode.DeepEquals(old["id"], item["id"]) && old.Str("status") == "pending")
                {
                    old["status"] = "superseded";
                }
            }
            state.RequiredObject("feedback")[item.Str("key")] = item.Copy();
        }
        HashSet<string> present = actionable.OfType<JsonObject>().Select(item => LegacyIdentity.CoreFeedback(item).Key).ToHashSet();
        foreach (JsonObject item in state.Obj("feedback").Select(pair => pair.Value).OfType<JsonObject>())
        {
            if (polled.Contains(item.Int("pr_number")) && item.Str("status") == "pending" && !present.Contains(item.Str("key")))
            {
                item["status"] = "withdrawn";
            }
        }
        OperationJournal.CompactFinalizedExports(state);
        return (state, managed, allFeedback);
    }

    private async Task<JsonObject> FinalizeExportReceiptsAsync(JsonObject state, JsonObject pr, string head, bool postFeedback, CancellationToken cancellationToken)
    {
        var operations = state.Obj("export_operations").Where(pair => pair.Value is JsonObject operation && operation.Str("topic") == pr.Str("topic_id") && operation.Int("generation") == pr.Int("generation"))
            .OrderBy(pair => pair.Value!.Obj("receipts").Arr("records").Count).ThenBy(pair => pair.Value!.Str("updated_at"), StringComparer.Ordinal).ThenBy(pair => pair.Key, StringComparer.Ordinal).ToArray();
        foreach (KeyValuePair<string, JsonNode?> pair in operations)
        {
            JsonObject finalized = EnsureObject(state, "finalized_exports");
            bool needsOutcome = !finalized.ContainsKey(pair.Key);
            bool needsFeedback = postFeedback && !EnsureObject(state, "export_feedback_receipts").Bool(pair.Key)
                && !finalized.Obj(pair.Key).Bool("feedback_terminal");
            if (!needsOutcome && !needsFeedback)
            {
                continue;
            }
            JsonObject receipt = pair.Value!.RequiredObject("receipts");
            if (receipt.Count == 0)
            {
                throw new Conflict("Export handoff lacks reviewed proposal receipts.");
            }
            if (needsOutcome)
            {
                state = Core.RecordOutcome(state, receipt.RequiredObject("batch"), receipt.RequiredObject("proposal"), receipt.RequiredObject("result"));
                Proposal.PersistDecisions(state, receipt.Arr("decisions"));
                EnsureObject(state, "finalized_exports")[pair.Key] = new JsonObject { ["head_sha"] = head };
            }
            if (needsFeedback)
            {
                await FeedbackReceiptAsync(receipt.RequiredObject("proposal"), receipt.RequiredObject("batch"), head, true, cancellationToken);
                EnsureObject(state, "export_feedback_receipts")[pair.Key] = true;
            }
        }
        OperationJournal.CompactFinalizedExports(state);
        return state;
    }

    public async Task FinalizeCompletedAsync(CancellationToken cancellationToken = default)
    {
        JsonObject state = await InitialStateAsync(cancellationToken);
        foreach (KeyValuePair<string, JsonNode?> pair in state.Obj("completed_operations").ToArray())
        {
            if (EnsureObject(state, "finalized_operations").Bool(pair.Key))
            {
                continue;
            }
            JsonObject operation = pair.Value!.AsObject();
            JsonObject receipt = operation.RequiredObject("receipts");
            if (receipt.Count == 0)
            {
                throw new Conflict("Completed operation lacks source/review receipts.");
            }
            state = Core.RecordOutcome(state, receipt.RequiredObject("batch"), receipt.RequiredObject("proposal"), receipt.RequiredObject("result"));
            Proposal.PersistDecisions(state, receipt.Arr("decisions"));
            string key = $"{receipt.Str("topic_id")}:{receipt.Int("generation")}";
            JsonObject row = EnsureObject(state.RequiredObject("prs"), key);
            row["proposal_records"] = receipt.Arr("records").Copy();
            row["head_sha"] = operation.Obj("evidence")["head_sha"]?.DeepClone();
            row["base_note_hashes"] = receipt["base_note_hashes"]?.DeepClone();
            await FeedbackReceiptAsync(receipt.RequiredObject("proposal"), receipt.RequiredObject("batch"), operation.Obj("evidence").Str("head_sha"), true, cancellationToken);
            EnsureObject(state, "finalized_operations")[pair.Key] = true;
            state.Remove("pending_author_proposal");
            EnsureObject(state, "held_proposals").Remove(receipt.Str("topic_id"));
        }
        await SaveAsync(state, "finalize verified publication receipts", cancellationToken);
        foreach (string id in state.Obj("completed_operations").Select(pair => pair.Key).ToArray())
        {
            if (state.Obj("finalized_operations").Bool(id))
            {
                await new OperationJournal(store, clock).CompactFinalizedAsync(id, cancellationToken);
            }
        }
    }

    private async Task FeedbackReceiptAsync(JsonObject proposal, JsonObject batch, string? head, bool apply, CancellationToken cancellationToken)
    {
        if (!apply || api is null || batch.Obj("pr").Int("number") < 1 || proposal.Arr("feedback").Count == 0)
        {
            return;
        }
        string key = LegacyIdentity.Fingerprint(proposal.Arr("feedback"), ascii: true, spaced: true)[..20];
        string marker = $"<!-- devbook-feedback-result:{key} -->";
        int number = batch.Obj("pr").Int("number");
        JsonObject pr = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
        if (Runtime.Lifecycle(pr) != "open")
        {
            return;
        }
        JsonArray comments = await Runtime.ArrayAsync(api, $"/issues/{number}/comments?per_page=100", cancellationToken);
        if (comments.OfType<JsonObject>().Any(comment => comment.Str("body").Contains(marker, StringComparison.Ordinal)))
        {
            return;
        }
        var lines = new List<string> { marker, "Maintenance feedback result" + (string.IsNullOrEmpty(head) ? "" : $" in commit `{head}`") + ":" };
        foreach (JsonObject item in proposal.Arr("feedback").OfType<JsonObject>())
        {
            JsonObject source = batch.Arr("feedback").OfType<JsonObject>().FirstOrDefault(source => source.Str("key") == item.Str("key"))
                ?? throw new Conflict("Feedback receipt references an unqueued comment.");
            lines.Add($"- {source.Str("url", item.Str("key"))}: {item.Str("outcome")} — {item.Str("reason")}");
        }
        await api.RequestAsync("POST", $"/issues/{number}/comments", new JsonObject { ["body"] = string.Join('\n', lines) }, cancellationToken: cancellationToken);
    }
}
