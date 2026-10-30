using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public sealed record ExportCheckWait(TimeProvider Clock, Func<TimeSpan, CancellationToken, Task> Delay);

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

    public static async Task<JsonObject> PublishBundleAsync(IGitHubApi api, JsonObject config, JsonObject bundle,
        JsonObject request, IStateStore store, string? owner = null, CancellationToken cancellationToken = default, ExportCheckWait? checkWait = null)
    {
        IReadOnlyDictionary<string, byte[]?> files = Bundle.Decode(bundle);
        ValidateRequest(request);
        if (api.Repo != config.Str("repo") || bundle.Int("pr_number") != request.Int("pr_number")
            || bundle.Str("branch") != request.Str("branch") || bundle.Str("expected_head") != request.Str("expected_head"))
        {
            throw new UnsafeInput("Export bundle differs from its workflow request or repository.");
        }
        owner ??= "export-" + Guid.NewGuid().ToString("N");
        var lease = new DurableLease(store, owner, ttlSeconds: 900);
        await lease.AcquireAsync(cancellationToken);
        try
        {
            return await PublishWithLeaseAsync(api, config, bundle, files, request, store, owner, cancellationToken, checkWait);
        }
        finally
        {
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            await lease.ReleaseAsync(cleanup.Token);
        }
    }

    private static async Task<JsonObject> PublishWithLeaseAsync(IGitHubApi api, JsonObject config, JsonObject bundle,
        IReadOnlyDictionary<string, byte[]?> files, JsonObject request, IStateStore store, string owner, CancellationToken cancellationToken, ExportCheckWait? checkWait)
    {
        await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
        string artifactHash = LegacyIdentity.Fingerprint(bundle);
        JsonObject op = BoundOperation((await store.ReadAsync(cancellationToken)).State, request);
        string priorHash = op.Obj("evidence").Str("export_artifact_hash");
        if (priorHash.Length != 0 && priorHash != artifactHash)
        {
            throw new Conflict("A different export bundle already owns this operation; preserve it rather than replacing its publication journal.");
        }
        string expected = request.Str("expected_head");
        string branch = request.Str("branch");
        int number = request.Int("pr_number");
        Dictionary<string, GitTreeEntry> predicted = await Bundle.PredictAsync(api, expected, files, cancellationToken);
        JsonObject? current = await CurrentPrAsync(api, config, number, branch, expected, cancellationToken);
        if (current is null)
        {
            string? applied = await RecognizeAppliedAsync(api, config, request, predicted, cancellationToken);
            if (applied is null)
            {
                return await StaleAsync(store, request, owner, "Source head changed or PR closed before generated publication.", cancellationToken);
            }
            await RecordAsync(store, request, owner, "recover applied generated export", (_, operation) =>
            {
                JsonObject evidence = operation.Obj("evidence");
                evidence["export_artifact_hash"] = artifactHash;
                evidence["export_commit_sha"] = applied;
                evidence["export_phase"] = "branch_updated";
                operation["evidence"] = evidence;
            }, cancellationToken);
            JsonObject resumed = await FinalizeWithLeaseAsync(api, config, store, request, owner, cancellationToken, checkWait);
            resumed["resumed"] = true;
            return resumed;
        }
        if (!await CurrentBaseAsync(api, config, current, expected, cancellationToken))
        {
            return await StaleAsync(store, request, owner, "Topic branch requires the current base before export publication.", cancellationToken);
        }
        await RecordAsync(store, request, owner, "prepare generated export publication", (_, operation) =>
        {
            JsonObject evidence = operation.Obj("evidence");
            evidence["export_artifact_hash"] = artifactHash;
            evidence["export_phase"] = "prepared";
            operation["evidence"] = evidence;
        }, cancellationToken);
        op = BoundOperation((await store.ReadAsync(cancellationToken)).State, request);
        string commitSha = op.Obj("evidence").Str("export_commit_sha");
        if (commitSha.Length == 0)
        {
            JsonObject parent = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{expected}", cancellationToken: cancellationToken);
            var changes = new JsonArray();
            foreach (KeyValuePair<string, byte[]?> item in files.OrderBy(item => item.Key, StringComparer.Ordinal))
            {
                await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
                string? sha = null;
                if (item.Value is not null)
                {
                    JsonObject blob = await Runtime.ObjectAsync(api, "POST", "/git/blobs", new JsonObject
                    {
                        ["encoding"] = "base64",
                        ["content"] = Convert.ToBase64String(item.Value)
                    }, cancellationToken);
                    sha = blob.Str("sha");
                    if (sha != Bundle.BlobSha(item.Value))
                    {
                        throw new RuntimeFailure("GitHub blob hash differs from the verified export.");
                    }
                }
                changes.Add(new JsonObject { ["path"] = item.Key, ["mode"] = "100644", ["type"] = "blob", ["sha"] = sha });
            }
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            JsonObject tree = await Runtime.ObjectAsync(api, "POST", "/git/trees", new JsonObject
            {
                ["base_tree"] = parent.Obj("tree")["sha"]?.DeepClone(),
                ["tree"] = changes
            }, cancellationToken);
            await RecordAsync(store, request, owner, "journal generated commit attempt", (_, operation) =>
            {
                JsonObject evidence = operation.Obj("evidence");
                evidence["export_tree_sha"] = tree["sha"]?.DeepClone();
                evidence["export_commit_attempted_at"] = Runtime.Iso();
                operation["evidence"] = evidence;
            }, cancellationToken);
            JsonObject commit = await Runtime.ObjectAsync(api, "POST", "/git/commits", new JsonObject
            {
                ["message"] = ExportCommitMessage,
                ["tree"] = tree["sha"]?.DeepClone(),
                ["parents"] = new JsonArray(expected)
            }, cancellationToken);
            commitSha = Bundle.ExactHead(commit.Str("sha"));
            Dictionary<string, GitTreeEntry> createdTree = await Bundle.TreeAsync(api, commitSha, cancellationToken);
            if (!Bundle.SameLeaves(createdTree.Values, predicted.Values))
            {
                throw new RuntimeFailure("Created export commit tree differs from the verified artifact.");
            }
            await RecordAsync(store, request, owner, "save generated export commit", (_, operation) =>
            {
                JsonObject evidence = operation.Obj("evidence");
                evidence["export_commit_sha"] = commitSha;
                evidence["export_phase"] = "commit_created";
                operation["evidence"] = evidence;
            }, cancellationToken);
        }
        else
        {
            JsonObject committed = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{commitSha}", cancellationToken: cancellationToken);
            if (!ExactExportCommit(committed, expected) || !Bundle.SameLeaves((await Bundle.TreeAsync(api, commitSha, cancellationToken)).Values, predicted.Values))
            {
                throw new Conflict("Journaled generated commit differs from its artifact.");
            }
        }
        current = await CurrentPrAsync(api, config, number, branch, expected, cancellationToken);
        if (current is null)
        {
            return await StaleAsync(store, request, owner, "Source head changed during generated commit creation.", cancellationToken);
        }
        await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
        await Runtime.EnsureDraftForMutationAsync(api, current, cancellationToken);
        if (await CurrentPrAsync(api, config, number, branch, expected, cancellationToken) is null)
        {
            return await StaleAsync(store, request, owner, "Managed head changed while renewing draft review.", cancellationToken);
        }
        await RecordAsync(store, request, owner, "journal generated ref update", (_, operation) =>
        {
            JsonObject evidence = operation.Obj("evidence");
            evidence["export_ref_update_attempted_at"] = Runtime.Iso();
            operation["evidence"] = evidence;
        }, cancellationToken);
        await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
        await api.RequestAsync("PATCH", "/git/refs/heads/" + Uri.EscapeDataString(branch), new JsonObject { ["sha"] = commitSha, ["force"] = false }, cancellationToken: cancellationToken);
        if (await CurrentPrAsync(api, config, number, branch, commitSha, cancellationToken) is null)
        {
            return await StaleAsync(store, request, owner, "Managed head changed after generated ref update.", cancellationToken);
        }
        await RecordAsync(store, request, owner, "record generated branch update", (_, operation) =>
        {
            JsonObject evidence = operation.Obj("evidence");
            evidence["export_phase"] = "branch_updated";
            operation["evidence"] = evidence;
        }, cancellationToken);
        return await FinalizeWithLeaseAsync(api, config, store, request, owner, cancellationToken, checkWait);
    }

    private static bool ExactExportCommit(JsonObject commit, string parent) => commit.Str("message") == ExportCommitMessage
        && commit["parents"] is JsonArray { Count: 1 } parents && parents[0].Str("sha") == parent;

    private static async Task<string?> RecognizeAppliedAsync(IGitHubApi api, JsonObject config, JsonObject request,
        Dictionary<string, GitTreeEntry> predicted, CancellationToken cancellationToken)
    {
        int number = request.Int("pr_number");
        string branch = request.Str("branch");
        JsonObject pr = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
        if (!Identity(pr, config, number, branch))
        {
            return null;
        }
        string head = Bundle.ExactHead(pr.Obj("head").Str("sha"));
        if (await CurrentPrAsync(api, config, number, branch, head, cancellationToken) is null)
        {
            return null;
        }
        JsonObject commit = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{head}", cancellationToken: cancellationToken);
        return ExactExportCommit(commit, request.Str("expected_head"))
            && Bundle.SameLeaves((await Bundle.TreeAsync(api, head, cancellationToken)).Values, predicted.Values) ? head : null;
    }

    private static Task<JsonObject> StaleAsync(IStateStore store, JsonObject request, string owner, string reason, CancellationToken cancellationToken) =>
        MarkStaleAsync(store, request, owner, reason, cancellationToken);

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
        string head = operation.Obj("evidence").Str("export_commit_sha");
        if (head.Length == 0)
        {
            throw new Conflict("Export finalization lacks its generated commit; render the bound source request first.");
        }
        _ = Bundle.ExactHead(head);
        JsonObject commit = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{head}", cancellationToken: cancellationToken);
        if (!ExactExportCommit(commit, request.Str("expected_head")))
        {
            throw new Conflict("Generated export commit parent differs from the reviewed source head.");
        }
        RemoteExportReceipt receipt = await Receipt.RemoteAsync(api, head, cancellationToken);
        if (!receipt.SourcesCurrent)
        {
            throw new Conflict("Generated export receipt does not bind the current source.");
        }
        JsonObject? pr = await CurrentPrAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken);
        if (pr is null)
        {
            JsonObject? sourcePr = await CurrentPrAsync(api, config, request.Int("pr_number"), request.Str("branch"), request.Str("expected_head"), cancellationToken);
            if (sourcePr is null || !await CurrentBaseAsync(api, config, sourcePr, request.Str("expected_head"), cancellationToken))
            {
                return await StaleAsync(store, request, owner, "Managed head or PR lifecycle changed before export checks.", cancellationToken);
            }
            Dictionary<string, GitTreeEntry> original = await Bundle.TreeAsync(api, request.Str("expected_head"), cancellationToken);
            Dictionary<string, GitTreeEntry> generated = await Bundle.TreeAsync(api, head, cancellationToken);
            JsonObject sourceBinding = Receipt.Make(original.Values);
            if (!JsonNode.DeepEquals(sourceBinding["sources"], receipt.Receipt["sources"])
                || !JsonNode.DeepEquals(sourceBinding["policy"], receipt.Receipt["policy"])
                || original.Values.Concat(generated.Values).Where(entry => entry.Type != "tree").Select(entry => entry.Path).Distinct(StringComparer.Ordinal)
                    .Any(path => original.GetValueOrDefault(path) != generated.GetValueOrDefault(path) && !Receipt.IsExportPath(path))
                || (operation.Obj("evidence").Str("export_tree_sha").Length != 0
                    && operation.Obj("evidence").Str("export_tree_sha") != commit.Obj("tree").Str("sha")))
            {
                throw new Conflict("Journaled export recovery differs from the reviewed source, policy or generated-only tree.");
            }
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            await Runtime.EnsureDraftForMutationAsync(api, sourcePr, cancellationToken);
            await RecordAsync(store, request, owner, "resume journaled generated ref update", (_, op) =>
            {
                JsonObject evidence = op.Obj("evidence");
                evidence["export_ref_update_attempted_at"] = Runtime.Iso();
                op["evidence"] = evidence;
            }, cancellationToken);
            if (await CurrentPrAsync(api, config, request.Int("pr_number"), request.Str("branch"), request.Str("expected_head"), cancellationToken) is null)
            {
                return await StaleAsync(store, request, owner, "Managed source changed during generated ref recovery.", cancellationToken);
            }
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            await api.RequestAsync("PATCH", "/git/refs/heads/" + Uri.EscapeDataString(request.Str("branch")),
                new JsonObject { ["sha"] = head, ["force"] = false }, cancellationToken: cancellationToken);
            pr = await CurrentPrAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken);
            if (pr is null)
            {
                return await StaleAsync(store, request, owner, "Managed head changed after generated ref recovery.", cancellationToken);
            }
            await RecordAsync(store, request, owner, "record recovered generated branch update", (_, op) =>
            {
                JsonObject evidence = op.Obj("evidence");
                evidence["export_phase"] = "branch_updated";
                op["evidence"] = evidence;
            }, cancellationToken);
        }
        if (state.Obj("finalized_exports")[request.Str("op_id")] is not null)
        {
            return new JsonObject { ["status"] = "exported", ["commit_sha"] = head, ["pr_number"] = request.Int("pr_number"), ["model_calls"] = 0, ["resumed"] = true };
        }
        PublicationChecks checks = await AwaitChecksAsync(api, config, store, request, owner, head, checkWait, cancellationToken);
        if (checks.Status == "stale")
        {
            return await StaleAsync(store, request, owner, "Managed head or PR lifecycle changed while waiting for exact-head checks.", cancellationToken);
        }
        await RecordAsync(store, request, owner, "record generated exact-head check results", (_, op) =>
        {
            JsonObject evidence = op.Obj("evidence");
            evidence["export_checks"] = checks.Checks.Copy();
            evidence["export_vault_validation"] = checks.VaultValidation;
            evidence["export_check_status"] = checks.Status;
            if (checks.Status == "failed")
            {
                evidence["export_paused"] = true;
                if (!evidence.Bool("export_validation_exhausted"))
                {
                    evidence["export_error"] = "Generated exact-head validation failed; inspect and fix before explicitly resuming validation.";
                }
            }
            op["evidence"] = evidence;
        }, cancellationToken);
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
        if (await CurrentPrAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken) is null)
        {
            return await StaleAsync(store, request, owner, "Managed head changed after export validation.", cancellationToken);
        }
        JsonObject reviewed = operation.Obj("receipts");
        if (reviewed.Count == 0 || reviewed["batch"] is not JsonObject || reviewed["proposal"] is not JsonObject || reviewed["result"] is not JsonObject)
        {
            throw new Conflict("Export operation lacks independently reviewed proposal receipts; retain it for recovery.");
        }
        JsonArray records = reviewed.Arr("records");
        if (records.Count == 0)
        {
            records = new JsonArray(new JsonObject { ["batch"] = reviewed["batch"]!.DeepClone(), ["proposal"] = reviewed["proposal"]!.DeepClone(), ["result"] = reviewed["result"]!.DeepClone() });
        }
        foreach (JsonObject record in records.OfType<JsonObject>())
        {
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            await PostFeedbackReceiptAsync(api, record.Obj("proposal"), record.Obj("batch"), head, cancellationToken);
        }
        pr = await CurrentPrAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken);
        if (pr is null)
        {
            return await StaleAsync(store, request, owner, "Managed head changed while recording feedback results.", cancellationToken);
        }
        string statusLine = $"<!-- devbook-export-validation -->Quartz export: verified in `{head}`; required checks and full-vault validation passed on that exact head.";
        string updatedBody = Regex.Replace(pr.Str("body"), @"(?m)^<!-- devbook-export-validation -->.*$", _ => statusLine);
        if (updatedBody != pr.Str("body"))
        {
            await AssertBoundLeaseAsync(store, request, owner, cancellationToken);
            string merged = Runtime.MergeManagedSection(pr.Str("body"), updatedBody, request.Str("topic_id"));
            await api.RequestAsync("PATCH", $"/pulls/{request.Int("pr_number")}", new JsonObject { ["body"] = merged }, cancellationToken: cancellationToken);
        }
        StateSnapshot finalSnapshot = await store.ReadAsync(cancellationToken);
        AssertLease(finalSnapshot.State, owner);
        JsonObject final = finalSnapshot.State.Copy();
        _ = BoundOperation(final, request);
        foreach (JsonObject record in records.OfType<JsonObject>())
        {
            final = Core.RecordOutcome(final, record.Obj("batch"), record.Obj("proposal"), record.Obj("result"));
        }
        Proposal.PersistDecisions(final, reviewed.Arr("decisions"));
        JsonObject finalized = final.Obj("finalized_exports").Copy();
        finalized[request.Str("op_id")] = new JsonObject { ["head_sha"] = head, ["validated_at"] = Runtime.Iso() };
        final["finalized_exports"] = finalized;
        JsonObject feedbackReceipts = final.Obj("export_feedback_receipts").Copy();
        feedbackReceipts[request.Str("op_id")] = true;
        final["export_feedback_receipts"] = feedbackReceipts;
        JsonObject row = final.Obj("prs").Obj($"{request.Str("topic_id")}:{request.Int("generation")}");
        if (row.Str("export_operation_id") == request.Str("op_id"))
        {
            row["export_required"] = false;
            row["head_sha"] = head;
            row["export_verified_head"] = head;
            row["export_check_status"] = "success";
        }
        JsonObject finalOp = final.Obj("export_operations").Obj(request.Str("op_id"));
        JsonObject finalEvidence = finalOp.Obj("evidence");
        finalEvidence["export_phase"] = "finalized";
        finalEvidence["export_verified_head"] = head;
        finalOp["evidence"] = finalEvidence;
        JsonObject pendingAuthor = final.Obj("pending_author_proposal");
        if (pendingAuthor.Str("topic_id") == request.Str("topic_id")
            && JsonNode.DeepEquals(pendingAuthor["proposal"], reviewed["proposal"]))
        {
            final.Remove("pending_author_proposal");
        }
        JsonObject held = final.Obj("held_proposals").Obj(request.Str("topic_id"));
        if (JsonNode.DeepEquals(held["proposal"], reviewed["proposal"]))
        {
            final.Obj("held_proposals").Remove(request.Str("topic_id"));
        }
        await store.WriteAsync(final, finalSnapshot, "maintenance: finalize verified generated export", cancellationToken);
        return new JsonObject { ["status"] = "exported", ["commit_sha"] = head, ["pr_number"] = request.Int("pr_number"), ["model_calls"] = 0 };
    }

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
        if (await CurrentPrAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, cancellationToken) is null)
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
        JsonObject request, string owner, string head, ExportCheckWait? checkWait, CancellationToken cancellationToken)
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
                if (await CurrentPrAsync(api, config, request.Int("pr_number"), request.Str("branch"), head, bounded.Token) is null)
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
