using System.Text.Json;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

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
        var legacyTopics = new Dictionary<string, string>();
        foreach (JsonObject note in notes.OfType<JsonObject>())
        {
            string[] folders = note.Str("path").Split('/').Skip(2).SkipLast(1).ToArray();
            for (var count = 2; count <= folders.Length; count++)
            {
                legacyTopics[Core.TopicId(string.Join('/', folders.Take(count)))] = Core.TopicId(note.Str("topic"));
            }
        }
        Dictionary<string, JsonObject> byPath = notes.OfType<JsonObject>().ToDictionary(note => note.Str("path"));
        var allFeedback = new JsonArray();
        var rows = new JsonArray();
        var managed = new Dictionary<int, JsonObject>();
        var polled = new HashSet<int>();
        bool loadedBranchNotes = false;
        foreach (JsonObject pr in prs.OfType<JsonObject>())
        {
            if (FeedbackPr > 0 && pr.Int("number") != FeedbackPr) continue;
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
                    state = Core.RecordOutcome(state, record.RequiredObject("batch"), record.RequiredObject("proposal"), rejected, record["review"] as JsonObject);
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
            row["blocked_topic_ids"] = !topics.ContainsKey(topicKey) && legacyTopics.TryGetValue(topicKey, out string? broadTopic)
                ? new JsonArray(broadTopic) : new JsonArray();
            row["review_started_head_sha"] = prior.Str("review_started_head_sha").Length > 0
                ? prior["review_started_head_sha"]!.DeepClone()
                : status == "open" && !pr.Bool("draft", true) ? pr.Obj("head")["sha"]?.DeepClone() : null;
            if (status == "open")
            {
                if (!topics.TryGetValue(topicKey, out string? topic))
                {
                    row["base_conflict"] = true;
                    row["frozen"] = true;
                    row["pause_reason"] = "Managed PR topic no longer exists; reconcile this PR manually.";
                    JsonArray legacyFiles = await Runtime.ArrayAsync(api, $"/pulls/{pr.Int("number")}/files?per_page=100", cancellationToken);
                    string[] legacyPaths = legacyFiles.OfType<JsonObject>().Select(file => file.Str("filename"))
                        .Concat(prior.Arr("changed_paths").Strings()).Concat(prior.Obj("base_note_hashes").Select(pair => pair.Key))
                        .Where(path => !Receipt.IsExportPath(path)).Distinct().ToArray();
                    var blockedTopics = row.Arr("blocked_topic_ids").Strings().ToHashSet();
                    foreach (string path in legacyPaths)
                    {
                        Runtime.ValidateRelativeNotePath(path);
                        blockedTopics.Add(Core.TopicId(Core.TopicFor(path)));
                    }
                    row["blocked_topic_ids"] = Copies(blockedTopics.Order(StringComparer.Ordinal).Select(value => JsonValue.Create(value)));
                    if (row.Arr("blocked_topic_ids").Count != 0)
                    {
                        row["pause_reason"] = "Legacy nested-topic PR remains open; its top-level topic is paused until this PR closes or merges.";
                    }
                    rows.Add(row);
                    continue;
                }
                JsonObject topicState = state.Obj("topics").Obj(topicKey);
                if (topicState.Int("generation") == generation && topicState.Obj("publication_conflict").Int("generation", -1) == generation)
                {
                    row["base_conflict"] = true;
                    row["pause_reason"] = topicState.Obj("publication_conflict").Str("reason");
                    rows.Add(row);
                    continue;
                }
                JsonArray files = await Runtime.ArrayAsync(api, $"/pulls/{pr.Int("number")}/files?per_page=100", cancellationToken);
                string[] allPaths = files.OfType<JsonObject>().Select(file => file.Str("filename")).ToArray();
                string[] paths = allPaths.Where(path => !Receipt.IsExportPath(path)).ToArray();
                bool automatic = config.Bool("automatic_export");
                bool otherFreeze = row.Str("review_started_head_sha").Length > 0 || prior["validation_failure"] is not null || prior.Str("reviewDecision").Length > 0
                    || prior.Bool("review_activity") || prior.Bool("has_reviews") || prior.Int("review_count") > 0 || prior["draft"]?.GetValue<bool>() == false
                    || prior.Arr("changed_paths").Count >= config.Int("max_pr_notes", 5) || prior.Int("additions") + prior.Int("deletions") >= config.Int("max_pr_lines", 1200);
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
                    row["base_conflict"] = true;
                    row["frozen"] = true;
                    row["pause_reason"] = "Legacy generated-file PR requires an explicit source-only refresh; its reviewed state is preserved and no generated ref will be written.";
                    rows.Add(row);
                    continue;
                }
                if (prior.Str("export_operation_id").Length > 0)
                {
                    try
                    {
                        bool current = await Worker.ArtifactCurrentAsync(api, config, state, prior, pr.Obj("head").Str("sha"), cancellationToken);
                        row["export_required"] = !current || prior.Str("export_check_status") != "success";
                        if (!current) Worker.RequestArtifactRefresh(state, prior, pr.Obj("head").Str("sha"));
                    }
                    catch (Exception error) when (error is IOException or RuntimeFailure or InvalidDataException or JsonException or FormatException)
                    {
                        row["export_required"] = true;
                        row["frozen"] = true;
                        row["pause_reason"] = error.Message;
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
                    loadedBranchNotes = true;
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
                row["frozen"] = row.Bool("frozen") || feedback.Count > 0 || !pr.Bool("draft", true) || paths.Length >= config.Int("max_pr_notes", 5)
                    || files.OfType<JsonObject>().Sum(file => file.Int("additions") + file.Int("deletions")) >= config.Int("max_pr_lines", 1200);
                row["changed_paths"] = Copies(paths.Select(value => JsonValue.Create(value)));
                row["review_started_head_sha"] = row["review_started_head_sha"]?.DeepClone() ?? (feedback.Count > 0 ? pr.Obj("head")["sha"]?.DeepClone() : null);
                JsonObject raw = pr.Copy();
                raw["changed_paths"] = Copies(paths.Select(value => JsonValue.Create(value)));
                managed[pr.Int("number")] = raw;
            }
            rows.Add(row);
        }
        if (loadedBranchNotes)
        {
            IReadOnlySet<string> repairIds = RepairInputs.ReadIds(root);
            NoteDocument[] current = notes.OfType<JsonObject>()
                .Select(note => NoteDocument.Parse(note.Str("content"), note.Str("path"), Path.Combine(root, note.Str("path"))))
                .Concat(Core.SpecialNotes.Where(path => !byPath.ContainsKey(path) && File.Exists(Path.Combine(root, path)))
                    .Select(path => NoteDocument.Load(Path.Combine(root, path), root))).ToArray();
            Issue[] issues = current.SelectMany(note => Validation.ValidateNote(note, Path.Combine(root, "Vault", "Home")))
                .Concat(Validation.ValidateGlobalQardIds(current)).ToArray();
            foreach (JsonObject note in notes.OfType<JsonObject>())
            {
                RepairInputs.Apply(note, repairIds);
                note["violations"] = new JsonArray(issues.Where(issue => issue.Path == note.Str("path"))
                    .Select(issue => (JsonNode)new JsonObject { ["code"] = issue.Code, ["line"] = issue.Line, ["message"] = issue.Message }).ToArray());
            }
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
        OperationJournal.CompactFinalizedExports(state, FeedbackPr);
        return (state, managed, allFeedback);
    }

    private async Task<JsonObject> FinalizeExportReceiptsAsync(JsonObject state, JsonObject pr, string head, bool postFeedback, CancellationToken cancellationToken)
    {
        var operations = state.Obj("export_operations").Where(pair => pair.Value is JsonObject operation && operation.Str("topic") == pr.Str("topic_id") && operation.Int("generation") == pr.Int("generation"))
            .OrderBy(pair => pair.Value!.Obj("receipts").Arr("records").Count).ThenBy(pair => pair.Value!.Str("updated_at"), StringComparer.Ordinal).ThenBy(pair => pair.Key, StringComparer.Ordinal).ToArray();
        foreach (KeyValuePair<string, JsonNode?> pair in operations)
        {
            if (FeedbackPr > 0 && !FeedbackOperationMatches(pair.Value!.AsObject())) continue;
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
                state = WorkloadReceipts.Apply(state, receipt);
                EnsureObject(state, "finalized_exports")[pair.Key] = new JsonObject { ["head_sha"] = head };
            }
            if (needsFeedback)
            {
                foreach (JsonObject record in WorkloadReceipts.Records(receipt).OfType<JsonObject>())
                {
                    await FeedbackReceiptAsync(record.RequiredObject("proposal"), record.RequiredObject("batch"), head, true, cancellationToken);
                }
                EnsureObject(state, "export_feedback_receipts")[pair.Key] = true;
            }
        }
        OperationJournal.CompactFinalizedExports(state, FeedbackPr);
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
            if (!FeedbackOperationMatches(operation)) continue;
            JsonObject receipt = operation.RequiredObject("receipts");
            if (receipt.Count == 0)
            {
                throw new Conflict("Completed operation lacks source/review receipts.");
            }
            state = WorkloadReceipts.Apply(state, receipt);
            string key = $"{receipt.Str("topic_id")}:{receipt.Int("generation")}";
            JsonObject row = EnsureObject(state.RequiredObject("prs"), key);
            row["proposal_records"] = WorkloadReceipts.History(receipt);
            row["head_sha"] = operation.Obj("evidence")["head_sha"]?.DeepClone();
            row["base_note_hashes"] = receipt["base_note_hashes"]?.DeepClone();
            foreach (JsonObject record in WorkloadReceipts.Records(receipt).OfType<JsonObject>())
            {
                await FeedbackReceiptAsync(record.RequiredObject("proposal"), record.RequiredObject("batch"), operation.Obj("evidence").Str("head_sha"), true, cancellationToken);
            }
            EnsureObject(state, "finalized_operations")[pair.Key] = true;

        }
        await SaveAsync(state, "finalize verified publication receipts", cancellationToken);
        foreach (string id in state.Obj("completed_operations").Select(pair => pair.Key).ToArray())
        {
            if (state.Obj("finalized_operations").Bool(id) && FeedbackOperationMatches(state.Obj("completed_operations").Obj(id)))
            {
                await new OperationJournal(store, clock).CompactFinalizedAsync(id, cancellationToken);
            }
        }
    }

    private async Task FeedbackReceiptAsync(JsonObject proposal, JsonObject batch, string? head, bool apply, CancellationToken cancellationToken)
    {
        if (!apply || api is null || batch.Obj("pr").Int("number") < 1 || proposal.Arr("feedback").Count == 0
            || FeedbackPr > 0 && batch.Obj("pr").Int("number") != FeedbackPr)
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
