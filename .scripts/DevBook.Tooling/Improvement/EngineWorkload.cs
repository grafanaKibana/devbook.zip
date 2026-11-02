using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Export;

namespace DevBook.Tooling.Improvement;

public sealed partial class ImprovementEngine
{
    private JsonObject? workload;
    private long contentCheckpoint;

    private static double ElapsedSeconds(JsonObject value) => value["elapsed_seconds"]?.GetValue<double>() ?? 0;

    private void CheckpointElapsed()
    {
        if (workload is null || workload.Str("status") != "active") return;
        long now = clock.GetTimestamp();
        workload["elapsed_seconds"] = ElapsedSeconds(workload) + clock.GetElapsedTime(contentCheckpoint, now).TotalSeconds;
        contentCheckpoint = now;
        workload["checkpoint_at"] = Core.FormatTime(clock.GetUtcNow());
    }

    private double RemainingContentSeconds()
    {
        if (workload is null) return config.Int("max_run_minutes", 30) * 60 - clock.GetElapsedTime(started).TotalSeconds;
        CheckpointElapsed();
        return config.Int("max_run_minutes", 30) * 60 - ElapsedSeconds(workload);
    }

    private void EnsureContentBudget()
    {
        if (RemainingContentSeconds() <= 0) throw new WorkloadLimit("time_limit");
    }

    private bool CanStartAuthor() => RemainingContentSeconds() > 0
        && (workload?.Int("calls_reserved") ?? modelCalls) + 2 <= config.Int("max_model_calls_per_run", 20);

    private async Task ReserveCallAsync(bool review, CancellationToken cancellationToken)
    {
        EnsureContentBudget();
        int reserved = workload!.Int("calls_reserved");
        if (reserved + (review ? 1 : 2) > config.Int("max_model_calls_per_run", 20)) throw new WorkloadLimit("call_limit");
        workload!["calls_reserved"] = reserved + 1;
        workload["phase"] = review ? "review_reserved" : "author_reserved";
        workload["reservation_deadline"] = Core.FormatTime(clock.GetUtcNow().AddSeconds(Math.Min(Math.Min(900, config.Int("model_timeout_seconds", 900)), RemainingContentSeconds())));
        JsonObject state = await InitialStateAsync(cancellationToken);
        await SaveAsync(state, "reserve focused workload model call", cancellationToken);
    }

    private async Task ReserveContentPhaseAsync(JsonObject state, string phase, CancellationToken cancellationToken)
    {
        EnsureContentBudget();
        workload!["phase"] = phase + "_reserved";
        workload["reservation_deadline"] = Core.FormatTime(clock.GetUtcNow().AddSeconds(RemainingContentSeconds()));
        await SaveAsync(state, "reserve bounded " + phase + " content phase", cancellationToken);
        EnsureContentBudget();
    }

    public async Task<JsonObject> RunAsync(bool apply = false, bool withModel = false, CancellationToken cancellationToken = default)
    {
        if (FeedbackPr > 0)
        {
            JsonObject current = await InitialStateAsync(cancellationToken);
            if (FeedbackScopePause(current) is JsonObject pause) return pause;
            JsonObject pending = current.Obj("pending_author_proposal");
            if (CanParkPublishedProposal(current, pending))
            {
                EnsureObject(current, "parked_author_proposals")[LegacyIdentity.Fingerprint(pending)] = pending.Copy();
                current.Remove("pending_author_proposal");
                await SaveAsync(current, "preserve published workload's unused ordinary proposal", cancellationToken);
            }
        }
        if (!withModel) return await RunOneAsync(apply, false, cancellationToken);
        if (apply) await ReplayFeedbackAcknowledgmentsAsync(cancellationToken);
        JsonObject state = await InitialStateAsync(cancellationToken);
        if (apply && publisher is not null)
        {
            if (state["pending_operation"] is JsonObject)
            {
                JsonObject? recovery = await publisher.RecoverPendingAsync(cancellationToken);
                if (recovery is not null && recovery.Str("status") != "recovered") return recovery;
            }
            await FinalizeCompletedAsync(cancellationToken);
            state = await InitialStateAsync(cancellationToken);
        }
        workload = state.Obj("focused_workload").Copy();
        if (workload.Str("status") == "sealed" && new[] { "completed_operations", "export_operations", "invalidated_operations", "failed_operations", "terminal_operations" }
            .SelectMany(collection => state.Obj(collection).Select(item => item.Value)).OfType<JsonObject>()
            .Any(operation => operation.Obj("receipts").Str("workload_id", operation.Str("workload_id")) == workload.Str("id")
                || operation.Str("op_id") == workload.Obj("sealed_request").Str("operation_id") && operation.Str("op_id").Length > 0))
        {
            workload["status"] = "published";
            await SaveAsync(state, "reconcile focused workload publication identity", cancellationToken);
        }
        string currentRules = Core.RulesVersion(contentAuthorities);
        string currentEvaluation = ClaudeProvider.EvaluationHash(config);
        if (workload.Str("status") is "active" or "sealed"
            && workload.Arr("accepted_records").OfType<JsonObject>().Any(record => record.Str("rules_hash") != currentRules || record.Str("evaluation_hash") != currentEvaluation))
        {
            workload["status"] = "incompatible";
            workload["incompatibility"] = "Accepted evidence belongs to different rules or evaluation inputs; original receipts were archived.";
        }
        contentCheckpoint = clock.GetTimestamp();
        if (workload.Str("status") == "sealed" && workload.Str("feedback_scope_id").Length > 0 && workload["sealed_request"] is not JsonObject)
        {
            workload["status"] = "feedback_waiting";
        }
        if (workload.Str("status") == "sealed" && workload.Arr("accepted_records").Count > 0)
        {
            JsonObject? feedback = await FinishFeedbackAsync(apply, cancellationToken);
            return feedback ?? await PublishAcceptedAsync(apply, cancellationToken);
        }
        if (workload.Str("status") != "active")
        {
            if (workload.Count > 0) EnsureObject(state, "workload_history")[workload.Str("id")] = workload.Copy();
            workload = new JsonObject
            {
                ["version"] = 1,
                ["id"] = Guid.NewGuid().ToString("N"),
                ["status"] = "active",
                ["phase"] = "selecting",
                ["started_at"] = Core.FormatTime(clock.GetUtcNow()),
                ["elapsed_seconds"] = 0d,
                ["calls_reserved"] = 0,
                ["responses_received"] = 0,
                ["attempted_paths"] = new JsonArray(),
                ["accepted_records"] = new JsonArray(),
                ["outcomes"] = new JsonArray(),
                ["feedback_pr"] = FeedbackPr
            };
        }
        else if (workload.Str("phase").EndsWith("_reserved", StringComparison.Ordinal)
            && Runtime.ParseTime(workload.Str("reservation_deadline")) is DateTimeOffset reservedUntil)
        {
            // An interrupted invocation remains charged through its saved deadline.
            double interrupted = Math.Max(0, (reservedUntil - (Runtime.ParseTime(workload.Str("checkpoint_at")) ?? reservedUntil)).TotalSeconds);
            workload["elapsed_seconds"] = ElapsedSeconds(workload) + interrupted;
        }
        await SaveAsync(state, "start or resume focused workload", cancellationToken);
        string stop = "topic_exhausted";
        JsonObject last = new() { ["status"] = "no_changes" };
        using var contentTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Max(.001, RemainingContentSeconds())), clock);
        using var content = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, contentTimeout.Token);
        try
        {
            while (true)
            {
                EnsureContentBudget();
                if (workload.Arr("accepted_records").Count >= config.Int("max_pr_notes", 5)) { stop = "target_reached"; break; }
                if (workload.Int("calls_reserved") >= config.Int("max_model_calls_per_run", 20)) { stop = "call_limit"; break; }
                last = await RunOneAsync(apply, true, content.Token);
                string status = last.Str("status");
                if (status == "cooldown")
                {
                    stop = "quota";
                    workload["cooldown"] = last["cooldown"]?.DeepClone();
                    workload["quota_notice"] = last.Bool("notice");
                    break;
                }
                if (status is "no_changes" or "topics_paused") break;
                if (status is not ("proposed" or "no_worthwhile_changes" or "proposal_blocked" or "review_blocked" or "size_deferred"))
                {
                    stop = status; break;
                }
                JsonObject batch = workload.Obj("current_batch");
                string path = batch.Arr("notes").OfType<JsonObject>().FirstOrDefault()?.Str("path") ?? "";
                if (path.Length == 0) break;
                if (!workload.Arr("attempted_paths").Strings().Contains(path)) workload.Arr("attempted_paths").Add(path);
                workload.Arr("outcomes").Add(new JsonObject { ["path"] = path, ["outcome"] = status, ["reason"] = last.Str("reason"), ["result"] = last.Copy() });
                workload["phase"] = "selecting";
                state = await InitialStateAsync(content.Token);
                await SaveAsync(state, "advance focused workload", content.Token);
            }
        }
        catch (WorkloadLimit error) { stop = error.Message; }
        catch (OperationCanceledException error)
        {
            stop = cancellationToken.IsCancellationRequested ? "caller_cancelled"
                : contentTimeout.IsCancellationRequested ? "time_limit" : "provider_error";
            if (stop == "provider_error") workload["error"] = "Model call timed out: " + error.Message;
        }
        catch (Exception error) when (error is IOException or RuntimeFailure or TimeoutException)
        {
            stop = "provider_error";
            workload["error"] = error.Message;
        }
        if (cancellationToken.IsCancellationRequested) stop = "caller_cancelled";
        CheckpointElapsed();
        workload["status"] = "sealed";
        workload["phase"] = "sealed";
        workload["stop_reason"] = stop;
        workload["sealed_at"] = Core.FormatTime(clock.GetUtcNow());
        using var grace = new CancellationTokenSource(TimeSpan.FromSeconds(Math.Max(.001, Math.Min(120, 40 * 60 - clock.GetElapsedTime(started).TotalSeconds))), clock);
        bool finalSaveSucceeded = false;
        try
        {
            state = await InitialStateAsync(grace.Token);
            await SaveAsync(state, "seal focused workload and preserve unfinished proposal", grace.Token);
            finalSaveSucceeded = true;
            if (stop == "caller_cancelled")
            {
                return new JsonObject
                {
                    ["status"] = "caller_cancelled",
                    ["stop_reason"] = stop,
                    ["durable_recovery"] = true,
                    ["coverage"] = Coverage(),
                    ["model_calls"] = workload.Int("calls_reserved")
                };
            }
            using var publication = CancellationTokenSource.CreateLinkedTokenSource(grace.Token, cancellationToken);
            JsonObject? feedbackResult = await FinishFeedbackAsync(apply, publication.Token);
            if (feedbackResult is not null)
            {
                workload["status"] = "feedback_waiting";
                state = await InitialStateAsync(grace.Token);
                await SaveAsync(state, "release bounded feedback workload with durable scoped progress", grace.Token);
                if (stop == "quota")
                {
                    last["feedback_status"] = feedbackResult["status"]?.DeepClone();
                    last["stop_reason"] = stop;
                    last["coverage"] = Coverage();
                    last["model_calls"] = workload.Int("calls_reserved");
                    return last;
                }
                if (stop == "provider_error")
                {
                    feedbackResult["feedback_status"] = feedbackResult["status"]!.DeepClone();
                    feedbackResult["status"] = "provider_error";
                    feedbackResult["error"] = workload["error"]?.DeepClone();
                }
                return feedbackResult;
            }
            if (workload.Arr("accepted_records").Count > 0) return await PublishAcceptedAsync(apply, publication.Token);
            if (last.Str("status") == "no_changes" && workload.Arr("outcomes").Count > 0)
            {
                last["status"] = workload.Arr("outcomes").OfType<JsonObject>().All(item => item.Str("outcome") == "no_worthwhile_changes")
                    ? "no_worthwhile_changes" : "reviewed_with_holds";
            }
            last["error"] = workload["error"]?.DeepClone();
            last["stop_reason"] = stop;
            last["coverage"] = Coverage();
            last["model_calls"] = workload.Int("calls_reserved");
            if (stop is "call_limit" or "time_limit" or "provider_error") last["status"] = stop;
            return last;
        }
        catch (Exception error) when (error is IOException or RuntimeFailure or OperationCanceledException)
        {
            return new JsonObject { ["status"] = cancellationToken.IsCancellationRequested ? "caller_cancelled" : "finalization_failed", ["reason"] = error.Message, ["durable_recovery"] = finalSaveSucceeded, ["coverage"] = Coverage(), ["model_calls"] = workload.Int("calls_reserved") };
        }
    }

    private JsonObject Coverage() => new()
    {
        ["topic"] = workload?.Str("topic"),
        ["notes"] = workload?.Arr("outcomes").Copy(),
        ["improved_count"] = workload?.Arr("accepted_records").Count ?? 0,
        ["model_calls"] = workload?.Int("calls_reserved") ?? modelCalls,
        ["calls_reserved"] = workload?.Int("calls_reserved") ?? modelCalls,
        ["responses_received"] = workload?.Int("responses_received") ?? modelCalls,
        ["elapsed_seconds"] = workload is null ? 0 : ElapsedSeconds(workload),
        ["stop_reason"] = workload?.Str("stop_reason")
    };

    private async Task<JsonObject> PublishAcceptedAsync(bool apply, CancellationToken cancellationToken)
    {
        JsonObject saved = workload ?? throw new RuntimeFailure("Focused workload missing.");
        JsonObject request = saved.Obj("sealed_request").Copy();
        JsonArray records = saved.Arr("accepted_records");
        if (request.Count == 0)
        {
            request = saved.RequiredObject("last_request").Copy();
            var expected = new Dictionary<string, string>(StringComparer.Ordinal);
            var candidate = new Dictionary<string, string>(StringComparer.Ordinal);
            var changes = new JsonArray();
            foreach (JsonObject record in records.OfType<JsonObject>())
            {
                foreach (JsonObject note in record.Obj("batch").Arr("notes").OfType<JsonObject>()) expected[note.Str("path")] = note.Str("content");
                foreach (KeyValuePair<string, JsonNode?> item in record.Obj("result").Obj("sources")) candidate[item.Key] = item.Value!.GetValue<string>();
                foreach (JsonNode? edit in record.Obj("proposal").Arr("edits")) changes.Add(edit?.DeepClone());
            }
            foreach (JsonObject record in saved.Arr("feedback_records").OfType<JsonObject>())
            {
                foreach (JsonObject note in record.Obj("batch").Arr("notes").OfType<JsonObject>())
                {
                    expected.TryAdd(note.Str("path"), note.Str("content"));
                    candidate.TryAdd(note.Str("path"), record.Obj("result").Obj("sources").Str(note.Str("path"), note.Str("content")));
                }
            }
            string diff = await Review.DiffAsync(expected, candidate, cancellationToken);
            request["expected_sources"] = ObjectMap(expected);
            request["candidate"] = ObjectMap(candidate.Where(item => expected[item.Key] != item.Value).ToDictionary(item => item.Key, item => item.Value));
            request["edits"] = changes.Copy();
            JsonObject receipt = request.RequiredObject("operation_receipts");
            JsonArray completed = saved["feedback_records"] as JsonArray ?? records;
            receipt["records"] = completed.Copy();
            JsonArray history = receipt.Arr("proposal_history").Copy();
            HashSet<string> newIds = completed.OfType<JsonObject>().Select(record => record.Str("record_id")).ToHashSet();
            history = Copies(history.OfType<JsonObject>().Where(record => !newIds.Contains(record.Str("record_id"))));
            foreach (JsonNode? record in completed) history.Add(record?.DeepClone());
            receipt["proposal_history"] = history;
            request["operation_id"] = saved.Str("id")[..16];
            request["export_required"] = Receipt.NeedsExport(expected, candidate);
            Dictionary<string, string> summaryBefore = Map(request.Obj("base_sources"));
            Dictionary<string, string> summaryAfter = Map(request.Obj("pr_sources"));
            HashSet<string> currentPrPaths = summaryAfter.Keys.ToHashSet(StringComparer.Ordinal);
            var summaryChanges = new JsonArray();
            var summaryFeedback = new JsonArray();
            foreach (JsonObject record in history.OfType<JsonObject>())
            {
                foreach (JsonObject note in record.Obj("batch").Arr("notes").OfType<JsonObject>())
                    summaryBefore.TryAdd(note.Str("path"), note.Str("content"));
                foreach (KeyValuePair<string, JsonNode?> source in record.Obj("result").Obj("sources"))
                {
                    if (!currentPrPaths.Contains(source.Key)) summaryAfter[source.Key] = source.Value!.GetValue<string>();
                }
                foreach (JsonNode? edit in record.Obj("proposal").Arr("edits")) summaryChanges.Add(edit?.DeepClone());
                foreach (JsonObject item in record.Obj("proposal").Arr("feedback").OfType<JsonObject>())
                {
                    JsonObject entry = item.Copy();
                    entry["url"] = record.Obj("batch").Arr("feedback").OfType<JsonObject>().FirstOrDefault(source => source.Str("key") == item.Str("key"))?.Str("url", item.Str("key")) ?? item.Str("key");
                    summaryFeedback.Add(entry);
                }
            }
            int cumulativeLines = Review.ChangedLines(await Review.DiffAsync(summaryBefore, summaryAfter, cancellationToken));
            if (cumulativeLines > config.Int("max_pr_lines", 1200))
            {
                JsonObject heldState = await InitialStateAsync(cancellationToken);
                JsonObject batch = completed.OfType<JsonObject>().Last().RequiredObject("batch");
                if (batch.Arr("feedback").Count > 0)
                {
                    await HoldFeedbackLineLimitAsync(heldState, batch, new JsonObject(), cumulativeLines, cancellationToken);
                    return FeedbackResult("feedback_needs_scope");
                }
                throw new Conflict("Accepted workload exceeds cumulative authored PR source line ceiling.");
            }
            Dictionary<string, string> links = summaryAfter.Keys.ToDictionary(path => path,
                path => $"https://github.com/{config.Str("repo")}/blob/{string.Join('/', request.Str("branch").Split('/').Select(Uri.EscapeDataString))}/{string.Join('/', path.Split('/').Select(Uri.EscapeDataString))}");
            string summary = Summary.Render(summaryBefore, summaryAfter, summaryChanges, summaryFeedback, links, Coverage());
            if (request.Bool("export_required")) summary += "\n<!-- devbook-export-validation -->Quartz export: awaiting the source-bound native export and checks.\n";
            request["body"] = Summary.UpdateManagedBody(request.Str("body"), summary, saved.Str("topic"));
            saved["sealed_request"] = request.Copy();
            saved["candidate"] = ObjectMap(candidate);
            saved["summary"] = summary;
            saved["diff"] = diff;
            saved["question_changes"] = Copies(Summary.CoalesceChanges(summaryBefore, summaryAfter, summaryChanges).OfType<JsonObject>().Where(edit => edit.Str("kind") != "note"));
            JsonObject state = await InitialStateAsync(cancellationToken);
            await SaveAsync(state, "persist immutable focused publication candidate", cancellationToken);
        }
        var response = new JsonObject
        {
            ["status"] = "proposed",
            ["topic"] = saved.Str("topic"),
            ["candidate"] = saved["candidate"]?.DeepClone(),
            ["summary"] = saved.Str("summary"),
            ["diff"] = saved.Str("diff"),
            ["question_changes"] = saved["question_changes"]?.DeepClone(),
            ["validation"] = saved.Arr("validation").Copy(),
            ["proposal"] = records.OfType<JsonObject>().Last().Obj("proposal").Copy(),
            ["review"] = records.OfType<JsonObject>().Last().Obj("review").Copy(),
            ["coverage"] = Coverage(),
            ["stop_reason"] = saved.Str("stop_reason"),
            ["model_calls"] = saved.Int("calls_reserved"),
            ["error"] = saved["error"]?.DeepClone(),
            ["cooldown"] = saved["cooldown"]?.DeepClone(),
            ["notice"] = saved.Bool("quota_notice")
        };
        if (!apply)
        {
            if (saved.Str("stop_reason") == "provider_error") response["status"] = "provider_error";
            return response;
        }
        if (publisher is null) throw new RuntimeFailure("Apply requires a publication runtime.");
        Dictionary<string, string> guarded = Map(request.RequiredObject("expected_sources"));
        if (request.Int("expected_pr_number") > 0)
        {
            foreach (KeyValuePair<string, string> source in guarded)
            {
                if (await publisher.ReadNoteAsync(source.Key, request.Str("branch"), cancellationToken) != source.Value)
                    throw new Conflict("Accepted source changed before focused publication; saved candidate preserved.");
            }
        }
        else
        {
            Dictionary<string, string> current = notesLoader().OfType<JsonObject>().ToDictionary(note => note.Str("path"), note => note.Str("content"));
            if (guarded.Any(source => !current.TryGetValue(source.Key, out string? text) || text != source.Value))
                throw new Conflict("Accepted source changed before focused publication; saved candidate preserved.");
        }
        JsonObject publication = await publisher.PublishAsync(request, cancellationToken);
        response["publication"] = publication.Copy();
        response["status"] = publication.Str("status", "published");
        if (publication["export_request"] is JsonObject export) { response["export_request"] = export.Copy(); response["export_mode"] = "render"; }
        saved["status"] = "published";
        JsonObject updated = await InitialStateAsync(cancellationToken);
        await SaveAsync(updated, "record focused publication handoff", cancellationToken);
        if (response.Str("status") is not ("awaiting_checks" or "awaiting_export")) await FinalizeCompletedAsync(cancellationToken);
        if (saved.Str("stop_reason") == "provider_error")
        {
            response["publication_status"] = response["status"]!.DeepClone();
            response["status"] = "provider_error";
        }
        return response;
    }

    private sealed class WorkloadLimit(string reason) : Exception(reason);
}
