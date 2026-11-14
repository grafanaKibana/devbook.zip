using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public sealed record ExportCheckWait(TimeProvider Clock, Func<TimeSpan, CancellationToken, Task> Delay);
public sealed class ExpiredExportArtifact(string message) : RuntimeFailure(message);

public static partial class Worker
{
    private static JsonObject BoundOperation(JsonObject state, JsonObject request)
    {
        ValidateRequest(request);
        string id = request.Str("op_id");
        JsonObject operation = state.Obj("export_operations").Obj(id);
        JsonObject stored = operation.Obj("evidence").Obj("export_request");
        if (operation.Str("op_id") != id || operation.Str("topic") != request.Str("topic_id")
            || operation.Int("generation") != request.Int("generation") || operation.Str("branch") != request.Str("branch")
            || operation.Int("prepared_source_version") != 1 || !JsonNode.DeepEquals(stored, request))
        {
            throw new Conflict("Export artifact is not bound to its durable reviewed-source operation. Preserve the existing operation for recovery.");
        }
        return operation;
    }

    private static void AssertLease(JsonObject state, string owner)
    {
        JsonObject lease = state.Obj("lease");
        if (lease.Str("owner") != owner || Runtime.ParseTime(lease.Str("expires_at")) is not DateTimeOffset expires || expires <= DateTimeOffset.UtcNow)
        {
            throw new Conflict("Export state lease expired or changed before write.");
        }
    }

    private static async Task<JsonObject> RecordAsync(IStateStore store, JsonObject request, string owner, string message,
        Action<JsonObject, JsonObject> update, CancellationToken cancellationToken)
    {
        StateSnapshot snapshot = await store.ReadAsync(cancellationToken);
        AssertLease(snapshot.State, owner);
        JsonObject state = snapshot.State.Copy();
        JsonObject operation = BoundOperation(state, request);
        update(state, operation);
        operation["updated_at"] = Runtime.Iso();
        await store.WriteAsync(state, snapshot, "maintenance: " + message, cancellationToken);
        return state;
    }

    private static async Task AssertBoundLeaseAsync(IStateStore store, JsonObject request, string owner, CancellationToken cancellationToken)
    {
        JsonObject state = (await store.ReadAsync(cancellationToken)).State;
        AssertLease(state, owner);
        _ = BoundOperation(state, request);
    }

    private static async Task EnsureDraftForExportAsync(IGitHubApi api, IStateStore store, JsonObject request,
        string owner, JsonObject pr, CancellationToken cancellationToken)
    {
        if (pr["draft"]?.GetValue<bool>() == false)
        {
            string reviewedHead = Bundle.ExactHead(pr.Obj("head").Str("sha"));
            await RecordAsync(store, request, owner, "preserve owner review freeze before artifact validation", (state, _) =>
            {
                JsonObject row = state.RequiredObject("prs").RequiredObject($"{request.Str("topic_id")}:{request.Int("generation")}");
                row["frozen"] = true;
                if (row.Str("review_started_head_sha").Length == 0)
                {
                    row["review_started_head_sha"] = reviewedHead;
                }
            }, cancellationToken);
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            await Runtime.EnsureDraftForMutationAsync(api, pr, cancellationToken);
        }
    }

    public static async Task<JsonObject> PublishBundleAsync(IGitHubApi api, JsonObject config, JsonObject bundle,
        JsonObject request, IStateStore store, string? owner = null, CancellationToken cancellationToken = default,
        ExportCheckWait? checkWait = null, JsonObject? provenance = null)
    {
        _ = Bundle.Decode(bundle);
        ValidateRequest(request);
        if (api.Repo != config.Str("repo") || bundle.Int("pr_number") != request.Int("pr_number")
            || bundle.Str("branch") != request.Str("branch") || bundle.Str("expected_head") != request.Str("expected_head")
            || bundle.Obj("manifest").Str("repository") != api.Repo)
        {
            throw new UnsafeInput("Export bundle differs from its workflow request or repository.");
        }
        provenance = provenance?.Copy() ?? throw new UnsafeInput("Export completion requires independent Actions artifact provenance.");
        await ValidateTransportAsync(api, config, provenance, cancellationToken);
        owner ??= "export-" + Guid.NewGuid().ToString("N");
        var lease = new DurableLease(store, owner, ttlSeconds: 900);
        await lease.AcquireAsync(cancellationToken);
        try
        {
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            string artifactHash = LegacyIdentity.Fingerprint(bundle);
            JsonObject state = (await store.ReadAsync(cancellationToken)).State;
            JsonObject operation = BoundOperation(state, request);
            if (state.Obj("finalized_exports")[request.Str("op_id")] is JsonObject finalized
                && !operation.Obj("evidence").Bool("export_refresh_required"))
            {
                if (finalized.Str("artifact_hash") != artifactHash)
                {
                    throw new Conflict("Finalized export differs from the submitted artifact.");
                }
                return FinalizedResult(request, finalized);
            }
            JsonObject evidence = operation.Obj("evidence");
            if (evidence.Str("export_artifact_hash").Length != 0
                && (!evidence.Bool("export_refresh_required") || evidence.Bool("export_refresh_registered"))
                && (evidence.Str("export_artifact_hash") != artifactHash
                    || !JsonNode.DeepEquals(evidence["export_transport"], provenance)))
            {
                throw new Conflict("A different artifact already owns this reviewed-source operation.");
            }
            string head = request.Str("expected_head");
            JsonObject? pr = await CurrentSourceAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken);
            if (pr is null)
            {
                return await MarkStaleAsync(store, request, owner, "Reviewed source head, current base or PR lifecycle changed before artifact completion.", cancellationToken);
            }
            Dictionary<string, GitTreeEntry> source = await Bundle.TreeAsync(api, head, cancellationToken);
            Bundle.ValidateInputs(bundle, source.Values);
            if (state.Obj("finalized_exports")[request.Str("op_id")] is null)
            {
                await EnsureDraftForExportAsync(api, store, request, owner, pr, cancellationToken);
            }
            await RecordAsync(store, request, owner, "register verified native export artifact", (_, op) =>
            {
                JsonObject current = op.Obj("evidence");
                current["export_artifact_hash"] = artifactHash;
                current["export_source_sha"] = head;
                current["export_inputs_hash"] = LegacyIdentity.Fingerprint(new JsonObject
                {
                    ["sources"] = bundle.Obj("manifest")["sources"]?.DeepClone(),
                    ["policy"] = bundle.Obj("manifest")["policy"]?.DeepClone()
                });
                current["export_transport"] = provenance.Copy();
                current["export_phase"] = "artifact_registered";
                current["export_refresh_registered"] = current.Bool("export_refresh_required");
                op["evidence"] = current;
            }, cancellationToken);
            return await FinalizeWithLeaseAsync(api, config, store, request, owner, cancellationToken, checkWait);
        }
        finally
        {
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            await lease.ReleaseAsync(cleanup.Token);
        }
    }

    public static async Task ValidateTransportAsync(IGitHubApi api, JsonObject config, JsonObject provenance,
        CancellationToken cancellationToken = default)
    {
        static string Positive(string value) => Regex.IsMatch(value, "^[1-9][0-9]{0,18}$", RegexOptions.CultureInvariant)
            && long.TryParse(value, out long number) && number > 0
            ? value : throw new UnsafeInput("Invalid Actions artifact or workflow-run identity.");
        string artifactId = Positive(provenance.Str("artifact_id"));
        string runId = Positive(provenance.Str("run_id"));
        string attempt = Positive(provenance.Str("run_attempt"));
        string digest = provenance.Str("digest");
        if (!Regex.IsMatch(digest, "^(?:sha256:)?[a-f0-9]{64}$", RegexOptions.CultureInvariant)
            || !Regex.IsMatch(provenance.Str("bundle_sha256"), "^[a-f0-9]{64}$", RegexOptions.CultureInvariant))
        {
            throw new UnsafeInput("Export artifact lacks its independently recorded SHA-256 digests.");
        }
        JsonObject artifact = await Runtime.ObjectAsync(api, "GET", "/actions/artifacts/" + artifactId, cancellationToken: cancellationToken);
        JsonObject run = await Runtime.ObjectAsync(api, "GET", "/actions/runs/" + runId + "/attempts/" + attempt, cancellationToken: cancellationToken);
        string apiDigest = artifact.Str("digest").Replace("sha256:", "", StringComparison.Ordinal);
        if (artifact.Bool("expired", true))
        {
            throw new ExpiredExportArtifact("Native export artifact expired; rebuild the same authorized source with fresh validation.");
        }
        if (artifact.Str("name") != $"devbook-syncer-export-{runId}-{attempt}"
            || artifact.Obj("workflow_run")["id"]?.ToString() != runId
            || apiDigest != digest.Replace("sha256:", "", StringComparison.Ordinal)
            || run["run_attempt"]?.ToString() != attempt
            || run.Str("path").Split('@')[0] != ".github/workflows/devbook-improvement.yml"
            || run.Str("head_branch") != config.Str("base_branch", "main")
            || run.Obj("repository").Str("full_name") != api.Repo
            || run.Str("event") is not ("schedule" or "workflow_dispatch" or "issue_comment" or "workflow_run"))
        {
            throw new Conflict("Actions artifact identity, digest, expiry or trusted workflow provenance differs from its handoff.");
        }
    }

    public static async Task<bool> ArtifactCurrentAsync(IGitHubApi api, JsonObject config, JsonObject state,
        JsonObject row, string head, CancellationToken cancellationToken = default)
    {
        JsonObject operation = state.Obj("export_operations").Obj(row.Str("export_operation_id"));
        JsonObject evidence = operation.Obj("evidence");
        if (evidence.Str("export_source_sha") != head || evidence.Str("export_artifact_hash").Length == 0
            || evidence.Obj("export_request").Int("version") != 2)
        {
            return false;
        }
        try
        {
            await ValidateTransportAsync(api, config, evidence.Obj("export_transport"), cancellationToken);
        }
        catch (ExpiredExportArtifact)
        {
            return false;
        }
        catch (GitHubApiFailure error) when (error.Status == 404)
        {
            return false;
        }
        Dictionary<string, GitTreeEntry> source = await Bundle.TreeAsync(api, head, cancellationToken);
        JsonObject current = SiteArtifact.Inputs(source.Values);
        if (evidence.Str("export_inputs_hash") != LegacyIdentity.Fingerprint(current))
        {
            throw new Conflict("Recorded artifact inputs differ from the immutable source/policy tree.");
        }
        return true;
    }

    public static void RequestArtifactRefresh(JsonObject state, JsonObject row, string head)
    {
        JsonObject operation = state.Obj("export_operations").Obj(row.Str("export_operation_id"));
        JsonObject evidence = operation.Obj("evidence");
        if (evidence.Bool("export_refresh_required") || evidence.Str("export_source_sha") != head
            || evidence.Str("export_artifact_hash").Length == 0 || evidence.Obj("export_request").Int("version") != 2)
        {
            return;
        }
        JsonArray history = evidence.Arr("export_artifact_history").Copy();
        history.Add(new JsonObject
        {
            ["artifact_hash"] = evidence.Str("export_artifact_hash"), ["inputs_hash"] = evidence.Str("export_inputs_hash"),
            ["transport"] = evidence["export_transport"]?.DeepClone(), ["expired_at"] = Runtime.Iso()
        });
        while (history.Count > 3) history.RemoveAt(0);
        evidence["export_artifact_history"] = history;
        evidence["export_refresh_required"] = true;
        evidence["export_refresh_registered"] = false;
        evidence["export_attempts"] = 0;
        evidence["export_last_dispatch_at"] = null;
        evidence["export_check_status"] = "pending";
        evidence["export_error"] = "Artifact expired or was removed; rebuild the same reviewed source without changing its PR head.";
        operation["evidence"] = evidence;
        row["export_required"] = true;
        row["export_check_status"] = "pending";
    }

    private static JsonObject FinalizedResult(JsonObject request, JsonObject finalized) => new()
    {
        ["status"] = "exported",
        ["commit_sha"] = Bundle.ExactHead(finalized.Str("head_sha")),
        ["pr_number"] = request.Int("pr_number"),
        ["model_calls"] = 0,
        ["resumed"] = true
    };

    private static async Task<JsonObject> MarkStaleAsync(IStateStore store, JsonObject request, string owner, string reason, CancellationToken cancellationToken)
    {
        await RecordAsync(store, request, owner, "pause stale export operation", (_, operation) =>
        {
            JsonObject evidence = operation.Obj("evidence");
            evidence["export_paused"] = true;
            evidence["export_error"] = reason;
            operation["evidence"] = evidence;
        }, cancellationToken);
        return new JsonObject { ["status"] = "stale", ["model_calls"] = 0, ["reason"] = reason };
    }

    public static async Task<JsonObject> FinalizeAsync(IGitHubApi api, JsonObject config, IStateStore store,
        JsonObject request, string? owner = null, CancellationToken cancellationToken = default, ExportCheckWait? checkWait = null)
    {
        owner ??= "export-checks-" + Guid.NewGuid().ToString("N");
        var lease = new DurableLease(store, owner, ttlSeconds: 900);
        await lease.AcquireAsync(cancellationToken);
        try
        {
            return await FinalizeWithLeaseAsync(api, config, store, request, owner, cancellationToken, checkWait);
        }
        finally
        {
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            await lease.ReleaseAsync(cleanup.Token);
        }
    }

    public static async Task<JsonObject> FinalizeWithLeaseAsync(IGitHubApi api, JsonObject config, IStateStore store,
        JsonObject request, string owner, CancellationToken cancellationToken = default, ExportCheckWait? checkWait = null)
    {
        await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
        JsonObject state = (await store.ReadAsync(cancellationToken)).State;
        JsonObject operation = BoundOperation(state, request);
        bool previouslyFinalized = state.Obj("finalized_exports")[request.Str("op_id")] is JsonObject;
        if (previouslyFinalized && operation.Obj("evidence").Bool("export_refresh_required")
            && !operation.Obj("evidence").Bool("export_refresh_registered"))
        {
            return new JsonObject { ["status"] = "awaiting_export", ["commit_sha"] = request.Str("expected_head"), ["model_calls"] = 0 };
        }
        string head = request.Str("expected_head");
        if (operation.Obj("evidence").Str("export_source_sha") != head
            || operation.Obj("evidence").Str("export_artifact_hash").Length == 0)
        {
            throw new Conflict("Export finalization lacks a verified source-bound artifact; render this versioned request first.");
        }
        JsonObject row = state.Obj("prs").Obj($"{request.Str("topic_id")}:{request.Int("generation")}");
        if (!await ArtifactCurrentAsync(api, config, state, row, head, cancellationToken))
        {
            await RecordAsync(store, request, owner, "request expired native artifact refresh", (current, _) =>
                RequestArtifactRefresh(current, current.Obj("prs").Obj($"{request.Str("topic_id")}:{request.Int("generation")}"), head), cancellationToken);
            return new JsonObject { ["status"] = "awaiting_export", ["commit_sha"] = head, ["model_calls"] = 0 };
        }
        if (previouslyFinalized && !operation.Obj("evidence").Bool("export_refresh_required"))
        {
            return FinalizedResult(request, state.Obj("finalized_exports").Obj(request.Str("op_id")));
        }
        JsonObject? pr = await CurrentSourceAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken);
        if (pr is null)
        {
            return await MarkStaleAsync(store, request, owner, "Managed source head, current base or PR lifecycle changed before artifact checks.", cancellationToken);
        }
        string statusLine = $"<!-- devbook-export-validation -->Quartz artifact: verified for `{head}`; required checks and full-vault validation passed on that exact head.";
        bool bodyApplied = pr.Str("body").Contains(statusLine, StringComparison.Ordinal);
        long? priorBodyRun = bodyApplied && long.TryParse(operation.Obj("evidence")["export_body_prior_run_id"]?.ToString(), out long priorRun) ? priorRun : null;
        PublicationChecks checks = await AwaitChecksAsync(api, config, store, request, owner, head, checkWait, cancellationToken, priorBodyRun);
        if (checks.Status == "stale")
        {
            return await MarkStaleAsync(store, request, owner, "Managed head or PR lifecycle changed while waiting for exact-head checks.", cancellationToken);
        }
        await SaveCheckResultsAsync(store, request, owner, checks, cancellationToken);
        if (checks.Status != "success")
        {
            return new JsonObject
            {
                ["status"] = checks.Status == "failed" ? "checks_failed" : "awaiting_checks",
                ["commit_sha"] = head,
                ["pr_number"] = request.Int("pr_number"),
                ["model_calls"] = 0
            };
        }
        if (await CurrentSourceAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken) is null)
        {
            return await MarkStaleAsync(store, request, owner, "Managed head changed after export validation.", cancellationToken);
        }
        if (!await ArtifactCurrentAsync(api, config, (await store.ReadAsync(cancellationToken)).State, row, head, cancellationToken))
        {
            await RecordAsync(store, request, owner, "refresh artifact expired during validation", (current, _) =>
                RequestArtifactRefresh(current, current.Obj("prs").Obj($"{request.Str("topic_id")}:{request.Int("generation")}"), head), cancellationToken);
            return new JsonObject { ["status"] = "awaiting_export", ["commit_sha"] = head, ["model_calls"] = 0 };
        }
        if (previouslyFinalized)
        {
            await RecordAsync(store, request, owner, "refresh verified artifact for unchanged reviewed source", (current, op) =>
            {
                JsonObject proof = op.Obj("evidence");
                proof["export_refresh_required"] = false;
                proof["export_refresh_registered"] = false;
                proof["export_phase"] = "finalized";
                proof["export_verified_head"] = head;
                op["evidence"] = proof;
                JsonObject finalized = current.Obj("finalized_exports").Obj(request.Str("op_id"));
                finalized["artifact_hash"] = proof.Str("export_artifact_hash");
                finalized["validated_at"] = Runtime.Iso();
                JsonObject unchanged = current.Obj("prs").Obj($"{request.Str("topic_id")}:{request.Int("generation")}");
                unchanged["export_required"] = false;
                unchanged["export_check_status"] = "success";
            }, cancellationToken);
            return new JsonObject { ["status"] = "exported", ["commit_sha"] = head, ["refreshed"] = true, ["model_calls"] = 0 };
        }
        JsonObject reviewed = operation.Obj("receipts");
        if (reviewed.Count == 0 || WorkloadReceipts.Records(reviewed).Count == 0)
        {
            throw new Conflict("Export operation lacks independently reviewed proposal receipts; retain it for recovery.");
        }
        JsonArray records = WorkloadReceipts.Records(reviewed);
        foreach (JsonObject record in records.OfType<JsonObject>())
        {
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            await PostFeedbackReceiptAsync(api, record.Obj("proposal"), record.Obj("batch"), head, cancellationToken);
        }
        pr = await CurrentSourceAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken);
        if (pr is null)
        {
            return await MarkStaleAsync(store, request, owner, "Managed head changed while recording feedback results.", cancellationToken);
        }
        string updatedBody = Regex.Replace(pr.Str("body"), @"(?m)^<!-- devbook-export-validation -->.*$", _ => statusLine);
        if (updatedBody != pr.Str("body"))
        {
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            string merged = Runtime.MergeManagedSection(pr.Str("body"), updatedBody, request.Str("topic_id"));
            long runId = checks.PrTitleRunId ?? throw new Conflict("Managed-body update requires its validated PR Title workflow identity.");
            await RecordAsync(store, request, owner, "bind managed-body update to fresh source checks", (_, op) =>
            {
                JsonObject evidence = op.Obj("evidence");
                evidence["export_body_prior_run_id"] = runId;
                op["evidence"] = evidence;
            }, cancellationToken);
            await api.RequestAsync("PATCH", $"/pulls/{request.Int("pr_number")}", new JsonObject { ["body"] = merged }, cancellationToken: cancellationToken);
            checks = await AwaitChecksAsync(api, config, store, request, owner, head, checkWait, cancellationToken, runId);
            await SaveCheckResultsAsync(store, request, owner, checks, cancellationToken);
            if (checks.Status == "stale")
                return await MarkStaleAsync(store, request, owner, "Managed source changed while validating its deterministic body update.", cancellationToken);
            if (checks.Status != "success")
                return new JsonObject { ["status"] = checks.Status == "failed" ? "checks_failed" : "awaiting_checks", ["commit_sha"] = head, ["pr_number"] = request.Int("pr_number"), ["model_calls"] = 0 };
        }
        pr = await CurrentSourceAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken);
        if (pr is null)
        {
            return await MarkStaleAsync(store, request, owner, "Managed head changed before delivery for review.", cancellationToken);
        }
        await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
        string deliveredNode = pr.Str("node_id");
        await Runtime.EnsureReadyForReviewAsync(api, pr, cancellationToken);
        pr = await CurrentSourceAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken);
        if (pr is null)
        {
            JsonObject changed = await Runtime.ObjectAsync(api, "GET", $"/pulls/{request.Int("pr_number")}", cancellationToken: cancellationToken);
            if (changed.Str("node_id") == deliveredNode && Identity(changed, config, request.Int("pr_number"), request.Str("branch")))
            {
                await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
                await Runtime.EnsureDraftForMutationAsync(api, changed, cancellationToken);
            }
            return await MarkStaleAsync(store, request, owner, "Managed head changed during delivery for review.", cancellationToken);
        }
        if (pr.Bool("draft", true))
        {
            throw new RuntimeFailure("Verified improvement PR is still draft; retain the export operation for delivery recovery.");
        }
        StateSnapshot finalSnapshot = await store.ReadAsync(cancellationToken);
        AssertLease(finalSnapshot.State, owner);
        JsonObject final = finalSnapshot.State.Copy();
        _ = BoundOperation(final, request);
        final = WorkloadReceipts.Apply(final, reviewed);
        JsonObject finalized = final.Obj("finalized_exports").Copy();
        finalized[request.Str("op_id")] = new JsonObject { ["head_sha"] = head, ["artifact_hash"] = operation.Obj("evidence").Str("export_artifact_hash"), ["validated_at"] = Runtime.Iso() };
        final["finalized_exports"] = finalized;
        JsonObject feedbackReceipts = final.Obj("export_feedback_receipts").Copy();
        feedbackReceipts[request.Str("op_id")] = true;
        final["export_feedback_receipts"] = feedbackReceipts;
        JsonObject finalRow = final.Obj("prs").Obj($"{request.Str("topic_id")}:{request.Int("generation")}");
        if (finalRow.Str("export_operation_id") == request.Str("op_id"))
        {
            finalRow["export_required"] = false;
            finalRow["head_sha"] = head;
            finalRow["export_verified_head"] = head;
            finalRow["export_check_status"] = "success";
        }
        JsonObject finalOp = final.Obj("export_operations").Obj(request.Str("op_id"));
        JsonObject finalEvidence = finalOp.Obj("evidence");
        finalEvidence["export_phase"] = "finalized";
        finalEvidence["export_refresh_required"] = false;
        finalEvidence["export_refresh_registered"] = false;
        finalEvidence["export_verified_head"] = head;
        finalOp["evidence"] = finalEvidence;
        OperationJournal.CompactFinalizedExports(final, request.Int("pr_number"));
        await store.WriteAsync(final, finalSnapshot, "maintenance: finalize verified native artifact", cancellationToken);
        return new JsonObject { ["status"] = "exported", ["commit_sha"] = head, ["pr_number"] = request.Int("pr_number"), ["model_calls"] = 0 };
    }

    private static Task<JsonObject> SaveCheckResultsAsync(IStateStore store, JsonObject request, string owner,
        PublicationChecks checks, CancellationToken cancellationToken) =>
        RecordAsync(store, request, owner, "record source artifact exact-head check results", (_, op) =>
        {
            JsonObject evidence = op.Obj("evidence");
            evidence["export_checks"] = checks.Checks.Copy();
            evidence["export_vault_validation"] = checks.VaultValidation;
            evidence["export_pr_title_run_id"] = checks.PrTitleRunId;
            evidence["export_check_status"] = checks.Status;
            if (checks.Status == "failed")
            {
                evidence["export_paused"] = true;
                if (!evidence.Bool("export_validation_exhausted"))
                    evidence["export_error"] = "Source artifact exact-head validation failed; inspect and fix before explicitly resuming validation.";
            }
            op["evidence"] = evidence;
        }, cancellationToken);

    private static int CheckSetting(JsonObject config, string name, int fallback, int minimum, int maximum)
    {
        int value = fallback;
        if (config[name] is JsonNode node && (node is not JsonValue scalar || !scalar.TryGetValue(out value)))
        {
            throw new UnsafeInput($"{name} must be an integer.");
        }
        if (value < minimum || value > maximum)
        {
            throw new UnsafeInput($"{name} must be between {minimum} and {maximum}.");
        }
        return value;
    }

    private static async Task<string?> ValidationRunAsync(IGitHubApi api, string branch, string head, CancellationToken cancellationToken)
    {
        try
        {
            return await Runtime.VaultValidationForShaAsync(api, branch, head, cancellationToken);
        }
        catch (Conflict)
        {
            return null;
        }
    }

    private static async Task<bool?> EnsureValidationAsync(IGitHubApi api, JsonObject config, IStateStore store, JsonObject request,
        string owner, string head, CancellationToken cancellationToken)
    {
        JsonObject operation = BoundOperation((await store.ReadAsync(cancellationToken)).State, request);
        JsonObject evidence = operation.Obj("evidence");
        bool sameHead = evidence.Str("validation_head") == head;
        bool legacyAttempt = evidence.Str("export_checks_dispatched_at").Length != 0
            || evidence.Str("export_validation_dispatch_attempted_at").Length != 0;
        int attempts = sameHead ? Math.Max(evidence.Int("validation_attempts"), legacyAttempt ? 1 : 0) : legacyAttempt ? 1 : 0;
        DateTimeOffset? last = Runtime.ParseTime(sameHead ? evidence.Str("validation_last_dispatch_at")
            : evidence.Str("export_checks_dispatched_at", evidence.Str("export_validation_dispatch_attempted_at")));
        DateTimeOffset now = DateTimeOffset.UtcNow;
        if (last is not null && last.Value.AddHours(6) > now)
        {
            return true;
        }
        if (attempts >= 3)
        {
            await RecordAsync(store, request, owner, "pause missing exact-head validation after bounded retries", (state, op) =>
            {
                JsonObject current = op.Obj("evidence");
                current["export_validation_exhausted"] = true;
                current["export_paused"] = true;
                current["export_error"] = "Exact-head vault validation is missing after three recorded dispatch attempts; inspect workflow access and event gates before explicitly resuming validation.";
                op["evidence"] = current;
                JsonObject row = state.Obj("prs").Obj($"{request.Str("topic_id")}:{request.Int("generation")}");
                row["export_attention"] = current.Str("export_error");
            }, cancellationToken);
            return false;
        }
        if (await CurrentSourceAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken) is null)
        {
            return null;
        }
        await RecordAsync(store, request, owner, "record exact-head validation dispatch intent", (_, op) =>
        {
            JsonObject current = op.Obj("evidence");
            current["validation_head"] = head;
            current["validation_attempts"] = attempts + 1;
            current["validation_last_dispatch_at"] = Runtime.Iso(now);
            current["export_validation_dispatch_attempted_at"] = Runtime.Iso(now);
            op["evidence"] = current;
        }, cancellationToken);
        await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
        await Runtime.DispatchVaultValidationAsync(api, request.Str("branch"), cancellationToken);
        await RecordAsync(store, request, owner, "record exact-head validation dispatch", (_, op) =>
        {
            JsonObject current = op.Obj("evidence");
            current["export_checks_dispatched_at"] = Runtime.Iso();
            current["export_phase"] = "checks_dispatched";
            op["evidence"] = current;
        }, cancellationToken);
        return true;
    }

    private static async Task<PublicationChecks> AwaitChecksAsync(IGitHubApi api, JsonObject config, IStateStore store,
        JsonObject request, string owner, string head, ExportCheckWait? checkWait, CancellationToken cancellationToken, long? afterPrTitleRun = null)
    {
        int seconds = CheckSetting(config, "export_check_wait_seconds", 600, 0, 600);
        int interval = CheckSetting(config, "export_check_poll_seconds", 10, 1, 60);
        TimeProvider clock = checkWait?.Clock ?? TimeProvider.System;
        Func<TimeSpan, CancellationToken, Task> delay = checkWait?.Delay ?? ((duration, token) => Task.Delay(duration, token));
        JsonObject state = (await store.ReadAsync(cancellationToken)).State;
        AssertLease(state, owner);
        DateTimeOffset leaseEnd = Runtime.ParseTime(state.Obj("lease").Str("expires_at"))!.Value;
        double available = Math.Max(0, (leaseEnd - DateTimeOffset.UtcNow - TimeSpan.FromSeconds(30)).TotalSeconds);
        TimeSpan budget = TimeSpan.FromSeconds(Math.Min(seconds, available));
        DateTimeOffset deadline = clock.GetUtcNow() + budget;
        using var bounded = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        if (budget > TimeSpan.Zero)
        {
            bounded.CancelAfter(budget);
        }
        var checks = new PublicationChecks("pending", new JsonObject(), null);
        bool observed = false;
        try
        {
            while (true)
            {
                bounded.Token.ThrowIfCancellationRequested();
                if (observed && clock.GetUtcNow() >= deadline)
                {
                    return checks;
                }
                observed = true;
                await AssertBoundLeaseAsync(store, request, owner, bounded.Token);
                if (await CurrentSourceAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, bounded.Token) is null)
                {
                    return new("stale", checks.Checks, checks.VaultValidation);
                }
                string? validation = await ValidationRunAsync(api, request.Str("branch"), head, bounded.Token);
                if (validation is null)
                {
                    bool? queued = await EnsureValidationAsync(api, config, store, request, owner, head, bounded.Token);
                    if (queued is null)
                    {
                        return new("stale", checks.Checks, null);
                    }
                    if (queued == false)
                    {
                        return new("failed", checks.Checks, null);
                    }
                }
                checks = await Runtime.PublicationCheckStateAsync(api, request.Str("branch"), head,
                    config.Arr("required_check_contexts").Count == 0 ? null : config.Arr("required_check_contexts").Strings(), bounded.Token);
                if (checks.Status == "success" && afterPrTitleRun is long previous && (checks.PrTitleRunId is null || checks.PrTitleRunId <= previous))
                    checks = checks with { Status = "pending" };
                if (validation is "failure" or "error" or "cancelled" or "timed_out" or "action_required" or "startup_failure" or "stale")
                {
                    return new("failed", checks.Checks, validation);
                }
                if (checks.Status is "success" or "failed")
                {
                    return checks;
                }
                TimeSpan remaining = deadline - clock.GetUtcNow();
                if (remaining <= TimeSpan.Zero)
                {
                    return checks;
                }
                await delay(TimeSpan.FromSeconds(Math.Min(interval, remaining.TotalSeconds)), bounded.Token);
            }
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested && bounded.IsCancellationRequested)
        {
            return checks;
        }
    }

    public static async Task PostFeedbackReceiptAsync(IGitHubApi api, JsonObject proposal, JsonObject batch,
        string? sha, CancellationToken cancellationToken = default)
    {
        if (batch["pr"] is not JsonObject pr || proposal.Arr("feedback").Count == 0)
        {
            return;
        }
        int number = pr.Int("number");
        JsonObject current = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
        if (Runtime.Lifecycle(current) != "open" || (sha is not null && current.Obj("head").Str("sha") != sha))
        {
            return;
        }
        string key = LegacyIdentity.Fingerprint(proposal.Arr("feedback"), ascii: true, spaced: true)[..20];
        string marker = "<!-- devbook-feedback-result:" + key + " -->";
        JsonArray comments = await Runtime.ArrayAsync(api, $"/issues/{number}/comments?per_page=100", cancellationToken);
        if (comments.OfType<JsonObject>().Any(comment => comment.Str("body").Contains(marker, StringComparison.Ordinal)))
        {
            return;
        }
        Dictionary<string, JsonObject> queued = batch.Arr("feedback").OfType<JsonObject>().ToDictionary(item => item.Str("key"), StringComparer.Ordinal);
        var lines = new List<string> { marker, "Maintenance feedback result" + (sha is null ? "" : $" in commit `{sha}`") + ":" };
        foreach (JsonObject item in proposal.Arr("feedback").OfType<JsonObject>())
        {
            if (!queued.TryGetValue(item.Str("key"), out JsonObject? source))
            {
                throw new Conflict("Feedback receipt references unqueued owner feedback.");
            }
            lines.Add($"- {source.Str("url", item.Str("key"))}: {item.Str("outcome")} — {item.Str("reason")}");
        }
        current = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
        if (Runtime.Lifecycle(current) == "open" && (sha is null || current.Obj("head").Str("sha") == sha))
        {
            await api.RequestAsync("POST", $"/issues/{number}/comments", new JsonObject { ["body"] = string.Join('\n', lines) }, cancellationToken: cancellationToken);
        }
    }
}
