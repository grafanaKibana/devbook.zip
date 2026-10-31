using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public sealed class GitHubRuntime
{
    private readonly IGitHubApi api;
    private readonly IStateStore store;
    private readonly OperationJournal journal;
    private readonly string baseBranch;
    private readonly string[] requiredChecks;
    private readonly string? leaseOwner;
    private readonly TimeProvider clock;
    private readonly int checkAttempts;
    private readonly TimeSpan checkInterval;
    private readonly Action activation;

    public GitHubRuntime(IGitHubApi api, IStateStore store, string baseBranch = "main", IEnumerable<string>? requiredChecks = null,
        string? leaseOwner = null, TimeProvider? timeProvider = null, int checkAttempts = 24, TimeSpan? checkInterval = null, Action? activation = null)
    {
        this.api = api;
        this.store = store;
        this.baseBranch = baseBranch;
        this.requiredChecks = (requiredChecks ?? Runtime.DefaultRequiredChecks).ToArray();
        this.leaseOwner = leaseOwner;
        clock = timeProvider ?? TimeProvider.System;
        journal = new(store, clock);
        this.checkAttempts = Math.Max(1, checkAttempts);
        this.checkInterval = checkInterval ?? TimeSpan.FromSeconds(5);
        this.activation = activation ?? (() => Runtime.RequireApplyActivation());
        if (api.Repo.Length == 0)
        {
            throw new UnsafeInput("Publication transport requires a configured repository.");
        }
    }

    public IGitHubApi Api => api;
    public string BaseBranch => baseBranch;

    public async Task AssertLeaseAsync(CancellationToken cancellationToken = default)
    {
        JsonObject lease = (await store.ReadAsync(cancellationToken)).State.Obj("lease");
        if (string.IsNullOrWhiteSpace(leaseOwner) || lease.Str("owner") != leaseOwner)
        {
            throw new Conflict("Durable lease ownership changed or is missing.");
        }
        if (Runtime.ParseTime(lease.Str("expires_at")) is not DateTimeOffset expires || expires <= clock.GetUtcNow())
        {
            throw new Conflict("Durable lease expired.");
        }
    }

    public async Task<string> RefShaAsync(string branch, CancellationToken cancellationToken = default) =>
        (await Runtime.ObjectAsync(api, "GET", "/git/ref/heads/" + Uri.EscapeDataString(branch), cancellationToken: cancellationToken)).Obj("object").Str("sha");

    public async Task<string> ReadNoteAsync(string path, string branch, CancellationToken cancellationToken = default)
    {
        Runtime.ValidateRelativeNotePath(path);
        string encodedPath = string.Join('/', path.Split('/').Select(Uri.EscapeDataString));
        JsonObject result = await Runtime.ObjectAsync(api, "GET", $"/contents/{encodedPath}?ref={Uri.EscapeDataString(branch)}", cancellationToken: cancellationToken);
        if (result.Str("encoding") != "base64" || result.Str("type", "file") != "file")
        {
            throw new RuntimeFailure("Branch source is not a regular base64 file.");
        }
        try
        {
            return new UTF8Encoding(false, true).GetString(Convert.FromBase64String(result.Str("content")));
        }
        catch (Exception error) when (error is FormatException or DecoderFallbackException)
        {
            throw new RuntimeFailure("Branch source is invalid.");
        }
    }

    public Task<JsonArray> OpenPrsAsync(CancellationToken cancellationToken = default) =>
        Runtime.ArrayAsync(api, "/pulls?state=open&per_page=100", cancellationToken);

    private async Task<string> EnsureBranchAsync(string branch, string baseSha, CancellationToken cancellationToken)
    {
        try
        {
            return await RefShaAsync(branch, cancellationToken);
        }
        catch (GitHubApiFailure error) when (error.Status == 404)
        {
            await api.RequestAsync("POST", "/git/refs", new JsonObject { ["ref"] = $"refs/heads/{branch}", ["sha"] = baseSha }, cancellationToken: cancellationToken);
            return await RefShaAsync(branch, cancellationToken);
        }
    }

    public async Task<JsonObject> RequireOpenPrAsync(int number, string topic, int generation, string branch, CancellationToken cancellationToken = default)
    {
        if (branch != Runtime.ExpectedManagedBranch(topic, generation))
        {
            throw new UnsafeInput("Managed branch does not match its topic generation.");
        }
        JsonObject pr = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
        if (Runtime.Lifecycle(pr) != "open" || !Runtime.ValidPrIdentity(pr, api.Repo, baseBranch, topic, generation))
        {
            throw new Conflict("Selected managed PR became terminal or changed identity.");
        }
        return pr;
    }

    private async Task<bool> TerminalGenerationExistsAsync(string topic, int generation, string branch, CancellationToken cancellationToken)
    {
        if (branch != Runtime.ExpectedManagedBranch(topic, generation))
        {
            throw new UnsafeInput("Managed branch does not match its topic generation.");
        }
        JsonArray prs = await Runtime.ArrayAsync(api, "/pulls?state=all&per_page=100", cancellationToken);
        return prs.OfType<JsonObject>().Any(pr => Runtime.Lifecycle(pr) != "open" && Runtime.ValidPrIdentity(pr, api.Repo, baseBranch, topic, generation));
    }

    private async Task<string> CreateCommitAsync(string parentSha, JsonObject candidate, string message, CancellationToken cancellationToken)
    {
        JsonObject parent = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{parentSha}", cancellationToken: cancellationToken);
        var entries = new JsonArray();
        foreach (KeyValuePair<string, JsonNode?> item in candidate.OrderBy(item => item.Key, StringComparer.Ordinal))
        {
            Runtime.ValidateRelativeNotePath(item.Key);
            string content = item.Value?.GetValue<string>() ?? throw new UnsafeInput("Candidate must contain note text.");
            JsonObject blob = await Runtime.ObjectAsync(api, "POST", "/git/blobs", new JsonObject
            {
                ["content"] = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)),
                ["encoding"] = "base64"
            }, cancellationToken);
            entries.Add(new JsonObject { ["path"] = item.Key, ["mode"] = "100644", ["type"] = "blob", ["sha"] = blob["sha"]?.DeepClone() });
        }
        JsonObject tree = await Runtime.ObjectAsync(api, "POST", "/git/trees", new JsonObject { ["base_tree"] = parent.Obj("tree")["sha"]?.DeepClone(), ["tree"] = entries }, cancellationToken);
        JsonObject commit = await Runtime.ObjectAsync(api, "POST", "/git/commits", new JsonObject { ["message"] = message, ["tree"] = tree["sha"]?.DeepClone(), ["parents"] = new JsonArray(parentSha) }, cancellationToken);
        return commit.Str("sha");
    }

    private async Task UpdateBranchCasAsync(string branch, string expectedSha, string commitSha, CancellationToken cancellationToken)
    {
        if (await RefShaAsync(branch, cancellationToken) != expectedSha)
        {
            throw new Conflict("Topic branch changed before ref update.");
        }
        await api.RequestAsync("PATCH", "/git/refs/heads/" + Uri.EscapeDataString(branch), new JsonObject { ["sha"] = commitSha, ["force"] = false }, cancellationToken: cancellationToken);
    }

    private async Task<(JsonObject Pr, bool Created)> EnsurePrAsync(string topic, int generation, string branch, string title, string body, CancellationToken cancellationToken)
    {
        JsonArray prs = await OpenPrsAsync(cancellationToken);
        JsonObject? found = Runtime.ManagedPr(prs.OfType<JsonObject>(), api.Repo, baseBranch, topic, generation, branch);
        if (found is not null)
        {
            JsonObject latest = await RequireOpenPrAsync(found.Int("number"), topic, generation, branch, cancellationToken);
            string mergedBody = Runtime.MergeManagedSection(latest.Str("body"), body, topic);
            JsonObject updated = await Runtime.ObjectAsync(api, "PATCH", $"/pulls/{found.Int("number")}", new JsonObject { ["title"] = title, ["body"] = mergedBody }, cancellationToken);
            return (updated, false);
        }
        if (await TerminalGenerationExistsAsync(topic, generation, branch, cancellationToken))
        {
            throw new Conflict("Terminal generation branch cannot be reused.");
        }
        JsonObject created = await Runtime.ObjectAsync(api, "POST", "/pulls", new JsonObject { ["title"] = title, ["body"] = body, ["head"] = branch, ["base"] = baseBranch, ["draft"] = true }, cancellationToken);
        if (!Runtime.ValidPrIdentity(created, api.Repo, baseBranch, topic, generation))
        {
            throw new Conflict("Created PR lost its machine identity.");
        }
        return (created, true);
    }

    private static JsonArray FeedbackAllowlist(JsonObject revision) => new(revision.Arr("allowlist").Strings().Select(value =>
    {
        string[] parts = value.Split(':', 2);
        if (parts.Length != 2 || !long.TryParse(parts[0], out long id))
        {
            throw new UnsafeInput("Invalid feedback identity allowlist.");
        }
        return (JsonNode)new JsonObject { ["id"] = id, ["login"] = parts[1] };
    }).ToArray());

    private async Task<bool> FeedbackUnchangedAsync(int number, JsonObject revision, JsonArray? current, CancellationToken cancellationToken)
    {
        JsonArray allowlist = FeedbackAllowlist(revision);
        current ??= allowlist.Count == 0 ? new JsonArray() : await Feedback.PollAsync(api, number, allowlist, cancellationToken);
        var revisions = new JsonObject();
        foreach (JsonObject item in current.OfType<JsonObject>())
        {
            revisions[$"{item.Str("kind")}:{item["id"]}"] = item["revision"]?.DeepClone();
        }
        return JsonNode.DeepEquals(revisions, revision.Obj("processed"));
    }

    public async Task ArchivePendingAsync(string opId, string collection, JsonObject evidence, bool freeze = false, JsonObject? terminalPr = null, CancellationToken cancellationToken = default)
    {
        if (collection is not ("terminal_operations" or "invalidated_operations" or "failed_operations" or "export_operations"))
        {
            throw new UnsafeInput("Invalid operation archive collection.");
        }
        await AssertLeaseAsync(cancellationToken);
        StateSnapshot snapshot = await store.ReadAsync(cancellationToken);
        JsonObject op = snapshot.State.Obj("pending_operation").Copy();
        if (op.Str("op_id") != opId)
        {
            throw new Conflict("Journal operation changed before archival.");
        }
        JsonObject merged = op.Obj("evidence").Copy();
        foreach (KeyValuePair<string, JsonNode?> item in evidence)
        {
            merged[item.Key] = item.Value?.DeepClone();
        }
        op["evidence"] = merged;
        op["updated_at"] = Runtime.Iso(clock.GetUtcNow());
        JsonObject state = snapshot.State.Copy();
        JsonObject archived = state.Obj(collection).Copy();
        archived[opId] = op.Copy();
        state[collection] = archived;
        state["pending_operation"] = null;
        if (freeze || terminalPr is not null || collection == "export_operations")
        {
            string key = $"{op.Str("topic")}:{op.Int("generation")}";
            JsonObject prs = state.Obj("prs").Copy();
            JsonObject pr = prs.Obj(key).Copy();
            JsonObject receipt = op.Obj("receipts");
            pr["topic_id"] = op["topic"]?.DeepClone();
            pr["generation"] = op["generation"]?.DeepClone();
            pr["number"] = op["pr_number"]?.DeepClone() ?? merged["pr_number"]?.DeepClone();
            pr["branch"] = op["branch"]?.DeepClone();
            pr["status"] = "open";
            pr["frozen"] = pr.Bool("frozen") || freeze || terminalPr is not null;
            pr["head_sha"] = merged["commit_sha"]?.DeepClone();
            if (terminalPr is not null)
            {
                pr["number"] = terminalPr["number"]?.DeepClone();
                pr["head_sha"] = terminalPr.Obj("head")["sha"]?.DeepClone() ?? pr["head_sha"]?.DeepClone();
                pr["observed_terminal_status"] = Runtime.Lifecycle(terminalPr);
            }
            if (freeze && collection == "failed_operations")
            {
                pr["validation_failure"] = merged.Copy();
            }
            if (collection == "export_operations")
            {
                pr["export_required"] = true;
                pr["export_operation_id"] = opId;
                pr["automatic_export"] = op.Bool("automatic_export");
            }
            if (receipt["records"] is not null)
            {
                pr["proposal_records"] = receipt["records"]!.DeepClone();
            }
            if (receipt["base_note_hashes"] is not null)
            {
                pr["base_note_hashes"] = receipt["base_note_hashes"]!.DeepClone();
            }
            prs[key] = pr;
            state["prs"] = prs;
        }
        await store.WriteAsync(state, snapshot, $"maintenance: archive {opId} {collection}", cancellationToken);
    }

    private async Task<JsonObject> HandoffExportAsync(string opId, string branch, string head, CancellationToken cancellationToken)
    {
        await AssertLeaseAsync(cancellationToken);
        JsonObject operation = (await store.ReadAsync(cancellationToken)).State.Obj("pending_operation");
        if (operation.Str("op_id") != opId)
        {
            throw new Conflict("Export publication journal changed.");
        }
        int number = operation.Int("pr_number", operation.Obj("evidence").Int("pr_number"));
        if (number < 1)
        {
            throw new Conflict("Export handoff lacks its owning PR number.");
        }
        var request = new JsonObject
        {
            ["version"] = 1,
            ["op_id"] = opId,
            ["pr_number"] = number,
            ["branch"] = branch,
            ["expected_head"] = head,
            ["topic_id"] = operation["topic"]?.DeepClone(),
            ["generation"] = operation["generation"]?.DeepClone(),
            ["prepared_source_version"] = operation["prepared_source_version"]?.DeepClone()
        };
        bool automatic = operation.Bool("automatic_export");
        await ArchivePendingAsync(opId, "export_operations", new JsonObject
        {
            ["commit_sha"] = head,
            ["export_head"] = head,
            ["export_request"] = request.Copy(),
            ["export_attempts"] = automatic ? 1 : 0,
            ["export_last_dispatch_at"] = automatic ? Runtime.Iso(clock.GetUtcNow()) : null,
            ["reason"] = automatic ? "Same-workflow Syncer export queued" : "Awaiting an explicitly approved local Syncer export"
        }, freeze: !automatic, cancellationToken: cancellationToken);
        var response = new JsonObject { ["op_id"] = opId, ["commit_sha"] = head, ["status"] = "awaiting_export", ["automatic_export"] = automatic };
        if (automatic)
        {
            response["export_request"] = request;
        }
        return response;
    }

    private async Task<bool> EnsureDraftForSourceAsync(JsonObject pr, JsonObject operation, bool unapplied, CancellationToken cancellationToken)
    {
        await AssertLeaseAsync(cancellationToken);
        StateSnapshot snapshot = await store.ReadAsync(cancellationToken);
        string key = $"{operation.Str("topic")}:{operation.Int("generation")}";
        JsonObject state = snapshot.State.Copy();
        JsonObject prs = state.Obj("prs").Copy();
        JsonObject row = prs.Obj(key).Copy();
        bool reviewStarted = pr["draft"]?.GetValue<bool>() == false || pr.Str("reviewDecision").Length > 0;
        if (reviewStarted)
        {
            if (state.Obj("pending_operation").Str("op_id") != operation.Str("op_id"))
            {
                throw new Conflict("Publication journal changed before preserving review freeze.");
            }
            row["topic_id"] = operation["topic"]?.DeepClone();
            row["generation"] = operation["generation"]?.DeepClone();
            row["number"] = pr["number"]?.DeepClone();
            row["branch"] = operation["branch"]?.DeepClone();
            row["status"] = "open";
            row["frozen"] = true;
            if (row.Str("review_started_head_sha").Length == 0)
            {
                row["review_started_head_sha"] = pr.Obj("head")["sha"]?.DeepClone();
            }
            prs[key] = row;
            state["prs"] = prs;
            await store.WriteAsync(state, snapshot, "maintenance: preserve owner review freeze before source update", cancellationToken);
        }
        if (unapplied && (reviewStarted || row.Str("review_started_head_sha").Length > 0))
        {
            try
            {
                if (operation["edits"] is not JsonArray edits || operation["pending_feedback"] is not JsonArray pending)
                {
                    throw new UnsafeInput("Pending candidate lacks saved owner-requested edit causality.");
                }
                HashSet<string> paths = edits.OfType<JsonObject>().Select(edit => edit.Str("path")).ToHashSet(StringComparer.Ordinal);
                if (operation.Obj("candidate").Any(item => !paths.Contains(item.Key)))
                {
                    throw new UnsafeInput("Frozen PR candidates require explicit owner-requested edits for every changed path.");
                }
                Feedback.ValidateFrozenEdits(edits, pending);
            }
            catch (UnsafeInput error)
            {
                await ArchivePendingAsync(operation.Str("op_id"), "invalidated_operations", new JsonObject
                {
                    ["reason"] = "Owner review started before branch update",
                    ["validation_error"] = error.Message
                }, cancellationToken: cancellationToken);
                return false;
            }
        }
        await AssertLeaseAsync(cancellationToken);
        await Runtime.EnsureDraftForMutationAsync(api, pr, cancellationToken);
        return true;
    }

    public async Task<JsonObject> PublishAsync(JsonObject request, CancellationToken cancellationToken = default)
    {
        activation();
        await AssertLeaseAsync(cancellationToken);
        string topic = request.Str("topic");
        int generation = request.Int("generation");
        string branch = request.Str("branch");
        if (branch != Runtime.ExpectedManagedBranch(topic, generation))
        {
            throw new UnsafeInput("Managed branch does not match its topic generation.");
        }
        if (request.Int("prepared_source_version") != 1 || Runtime.ParseTime(request.Str("prepared_at")) is null)
        {
            throw new Conflict("Publication requires the reviewed prepared-source contract.");
        }
        JsonObject expected = request.RequiredObject("expected_sources");
        JsonObject candidate = request.RequiredObject("candidate");
        if (candidate.Count == 0 || candidate.Any(item => !expected.ContainsKey(item.Key)))
        {
            throw new UnsafeInput("Candidate contains uninspected paths or no changes.");
        }
        foreach (string path in expected.Select(item => item.Key).Concat(candidate.Select(item => item.Key)))
        {
            Runtime.ValidateRelativeNotePath(path);
        }
        JsonObject? currentPr = Runtime.ManagedPr((await OpenPrsAsync(cancellationToken)).OfType<JsonObject>(), api.Repo, baseBranch, topic, generation, branch);
        int expectedNumber = request.Int("expected_pr_number");
        if (expectedNumber > 0)
        {
            currentPr = await RequireOpenPrAsync(expectedNumber, topic, generation, branch, cancellationToken);
        }
        else if (currentPr is null && await TerminalGenerationExistsAsync(topic, generation, branch, cancellationToken))
        {
            throw new Conflict("Terminal generation branch cannot be reused.");
        }
        string baseSha = request.Str("expected_base_sha");
        if (await RefShaAsync(baseBranch, cancellationToken) != baseSha)
        {
            throw new Conflict("Base branch changed before publication.");
        }
        string branchHead = await EnsureBranchAsync(branch, baseSha, cancellationToken);
        if (request.Str("expected_branch_sha") is { Length: > 0 } expectedHead && branchHead != expectedHead)
        {
            throw new Conflict("Topic branch changed before publication.");
        }
        foreach (KeyValuePair<string, JsonNode?> item in expected)
        {
            if (await ReadNoteAsync(item.Key, branch, cancellationToken) != item.Value?.GetValue<string>())
            {
                throw new Conflict("Topic branch note changed before publication: " + item.Key);
            }
        }
        bool freeze = request.Bool("freeze");
        JsonObject feedbackRevision = request.Obj("feedback_revision");
        if (currentPr is not null)
        {
            JsonArray allowlist = FeedbackAllowlist(feedbackRevision);
            JsonArray feedback = allowlist.Count == 0 ? new JsonArray() : await Feedback.PollAsync(api, currentPr.Int("number"), allowlist, cancellationToken);
            if (!await FeedbackUnchangedAsync(currentPr.Int("number"), feedbackRevision, feedback, cancellationToken))
            {
                throw new Conflict("Owner feedback changed before publication.");
            }
            freeze |= Feedback.ShouldFreeze(currentPr, feedback);
        }
        if (freeze)
        {
            HashSet<string> editedPaths = request.Arr("edits").OfType<JsonObject>().Select(edit => edit.Str("path")).ToHashSet(StringComparer.Ordinal);
            if (candidate.Any(item => !editedPaths.Contains(item.Key)))
            {
                throw new UnsafeInput("Frozen PR candidates require explicit owner-requested edits for every changed path.");
            }
            Feedback.ValidateFrozenEdits(request.Arr("edits"), request.Arr("pending_feedback"));
        }
        await AssertLeaseAsync(cancellationToken);
        string opId = Guid.NewGuid().ToString("N")[..16];
        var sourceHashes = new JsonObject();
        var candidateHashes = new JsonObject();
        foreach (KeyValuePair<string, JsonNode?> item in expected)
        {
            sourceHashes[item.Key] = LegacyIdentity.Fingerprint(item.Value);
        }
        foreach (KeyValuePair<string, JsonNode?> item in candidate)
        {
            candidateHashes[item.Key] = LegacyIdentity.Fingerprint(item.Value);
        }
        string body = request.Str("body");
        string marker = Runtime.Marker(topic, generation);
        if (!body.Contains(marker, StringComparison.Ordinal))
        {
            body = body.TrimEnd() + "\n\n" + marker + "\n";
        }
        JsonObject op = await journal.PrepareAsync(new JsonObject
        {
            ["op_id"] = opId,
            ["topic"] = topic,
            ["generation"] = generation,
            ["branch"] = branch,
            ["parent_head"] = branchHead,
            ["base_head"] = baseSha,
            ["source_hashes"] = sourceHashes,
            ["candidate_hashes"] = candidateHashes,
            ["candidate"] = candidate.Copy(),
            ["feedback_revision"] = feedbackRevision.Copy(),
            ["edits"] = new JsonArray(request.Arr("edits").OfType<JsonObject>().Select(edit => (JsonNode)new JsonObject
            {
                ["path"] = edit["path"]?.DeepClone(),
                ["feedback_keys"] = edit["feedback_keys"]?.DeepClone()
            }).ToArray()),
            ["pending_feedback"] = new JsonArray(request.Arr("pending_feedback").OfType<JsonObject>().Select(item => (JsonNode)new JsonObject
            {
                ["key"] = item["key"]?.DeepClone(),
                ["paths"] = item["paths"]?.DeepClone()
            }).ToArray()),
            ["pr_number"] = currentPr?["number"]?.DeepClone(),
            ["prior_pr_draft"] = currentPr?["draft"]?.DeepClone(),
            ["prior_review_decision"] = currentPr?["reviewDecision"]?.DeepClone(),
            ["prior_pr_head"] = currentPr?.Obj("head")["sha"]?.DeepClone(),
            ["title"] = request["title"]?.DeepClone(),
            ["body"] = body,
            ["commit_message"] = $"notes: improve {topic} [{opId}]",
            ["receipts"] = request["operation_receipts"]?.DeepClone() ?? new JsonObject(),
            ["export_required"] = request.Bool("export_required"),
            ["automatic_export"] = request.Bool("automatic_export"),
            ["prepared_source_version"] = 1,
            ["prepared_at"] = request["prepared_at"]?.DeepClone()
        }, cancellationToken);
        string commitSha = await CreateCommitAsync(branchHead, candidate, op.Str("commit_message"), cancellationToken);
        await AssertLeaseAsync(cancellationToken);
        await journal.AdvanceAsync(opId, "commit_created", new JsonObject { ["commit_sha"] = commitSha }, cancellationToken);
        if (currentPr is not null)
        {
            currentPr = await RequireOpenPrAsync(currentPr.Int("number"), topic, generation, branch, cancellationToken);
            if (!await EnsureDraftForSourceAsync(currentPr, op, true, cancellationToken))
            {
                return new JsonObject { ["op_id"] = opId, ["commit_sha"] = commitSha, ["status"] = "review_started" };
            }
        }
        if (currentPr is not null && !await FeedbackUnchangedAsync(currentPr.Int("number"), feedbackRevision, null, cancellationToken))
        {
            await ArchivePendingAsync(opId, "invalidated_operations", new JsonObject { ["reason"] = "Owner feedback changed before branch update" }, cancellationToken: cancellationToken);
            return new JsonObject { ["op_id"] = opId, ["commit_sha"] = commitSha, ["status"] = "feedback_changed" };
        }
        await AssertLeaseAsync(cancellationToken);
        await UpdateBranchCasAsync(branch, branchHead, commitSha, cancellationToken);
        await journal.AdvanceAsync(opId, "branch_updated", new JsonObject { ["branch_sha"] = commitSha }, cancellationToken);
        await AssertLeaseAsync(cancellationToken);
        if (expectedNumber > 0)
        {
            await RequireOpenPrAsync(expectedNumber, topic, generation, branch, cancellationToken);
        }
        (JsonObject pr, bool created) = await EnsurePrAsync(topic, generation, branch, request.Str("title"), body, cancellationToken);
        await journal.AdvanceAsync(opId, "pr_updated", new JsonObject { ["pr_number"] = pr["number"]?.DeepClone(), ["created"] = created }, cancellationToken);
        if (request.Bool("export_required"))
        {
            JsonObject handoff = await HandoffExportAsync(opId, branch, commitSha, cancellationToken);
            handoff["pr"] = pr.Copy();
            return handoff;
        }
        PublicationChecks? checks = await AwaitChecksAsync(opId, branch, commitSha, cancellationToken);
        if (checks is null)
        {
            return new JsonObject { ["op_id"] = opId, ["commit_sha"] = commitSha, ["pr"] = pr.Copy(), ["status"] = "awaiting_checks" };
        }
        await AssertLeaseAsync(cancellationToken);
        await journal.AdvanceAsync(opId, "committed", new JsonObject { ["head_sha"] = commitSha }, cancellationToken);
        return new JsonObject { ["op_id"] = opId, ["commit_sha"] = commitSha, ["pr"] = pr.Copy(), ["status"] = "committed", ["checks"] = checks.Checks, ["vault_validation"] = checks.VaultValidation };
    }

    public async Task<JsonObject?> RecoverPendingAsync(CancellationToken cancellationToken = default)
    {
        JsonObject? operation = (await store.ReadAsync(cancellationToken)).State["pending_operation"] as JsonObject;
        if (operation is null)
        {
            return null;
        }
        activation();
        await AssertLeaseAsync(cancellationToken);
        JsonObject op = operation.Copy();
        string opId = op.Str("op_id");
        string branch = op.Str("branch");
        string phase = op.Str("phase");
        string topic = op.Str("topic");
        int generation = op.Int("generation");
        if (branch != Runtime.ExpectedManagedBranch(topic, generation))
        {
            throw new UnsafeInput("Journal branch does not match its topic generation.");
        }
        if (!Runtime.JournalPhases.Contains(phase))
        {
            throw new Conflict("Unsupported journal phase; preserve operation for recovery.");
        }
        JsonObject evidence = op.Obj("evidence");
        string commitSha = evidence.Str("commit_sha");
        int number = op.Int("pr_number", evidence.Int("pr_number"));
        JsonObject? selected = null;
        if (number > 0)
        {
            selected = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
            if (!Runtime.ValidPrIdentity(selected, api.Repo, baseBranch, topic, generation))
            {
                throw new Conflict("Selected managed PR changed identity.");
            }
        }
        else
        {
            selected = (await Runtime.ArrayAsync(api, "/pulls?state=all&per_page=100", cancellationToken)).OfType<JsonObject>()
                .FirstOrDefault(pr => Runtime.Lifecycle(pr) != "open" && Runtime.ValidPrIdentity(pr, api.Repo, baseBranch, topic, generation));
        }
        if (selected is not null && Runtime.Lifecycle(selected) != "open")
        {
            string status = Runtime.Lifecycle(selected);
            await ArchivePendingAsync(opId, "terminal_operations", new JsonObject { ["terminal_status"] = status, ["pr_number"] = selected["number"]?.DeepClone() }, terminalPr: selected, cancellationToken: cancellationToken);
            return new JsonObject { ["op_id"] = opId, ["commit_sha"] = commitSha, ["status"] = "pr_terminal", ["terminal_status"] = status };
        }
        if (op.Int("prepared_source_version") != 1 || Runtime.ParseTime(op.Str("prepared_at")) is null)
        {
            return new JsonObject { ["op_id"] = opId, ["status"] = "prepared_source_contract_required", ["model_calls"] = 0, ["reason"] = "Legacy pending candidate has no verified prepared-source contract; preserve it for manual reconciliation." };
        }
        foreach (KeyValuePair<string, JsonNode?> item in op.Obj("candidate"))
        {
            if (op.Obj("candidate_hashes").Str(item.Key) != LegacyIdentity.Fingerprint(item.Value))
            {
                throw new Conflict("Journal candidate fingerprint changed.");
            }
        }
        if (number > 0 && phase is "prepared" or "commit_created")
        {
            bool applied = commitSha.Length != 0 && await RefShaAsync(branch, cancellationToken) == commitSha;
            if (!applied && !await FeedbackUnchangedAsync(number, op.Obj("feedback_revision"), null, cancellationToken))
            {
                await ArchivePendingAsync(opId, "invalidated_operations", new JsonObject { ["reason"] = "Owner feedback changed before recovery" }, cancellationToken: cancellationToken);
                return new JsonObject { ["op_id"] = opId, ["status"] = "feedback_changed" };
            }
        }
        if (phase == "prepared")
        {
            await AssertLeaseAsync(cancellationToken);
            commitSha = await CreateCommitAsync(op.Str("parent_head"), op.RequiredObject("candidate"), op.Str("commit_message"), cancellationToken);
            await AssertLeaseAsync(cancellationToken);
            await journal.AdvanceAsync(opId, "commit_created", new JsonObject { ["commit_sha"] = commitSha }, cancellationToken);
            phase = "commit_created";
        }
        if (phase == "commit_created")
        {
            await AssertLeaseAsync(cancellationToken);
            string current = await RefShaAsync(branch, cancellationToken);
            if (number > 0)
            {
                selected = await RequireOpenPrAsync(number, topic, generation, branch, cancellationToken);
                if (!await EnsureDraftForSourceAsync(selected, op, current != commitSha, cancellationToken))
                {
                    return new JsonObject { ["op_id"] = opId, ["commit_sha"] = commitSha, ["status"] = "review_started" };
                }
                if (current != commitSha && !await FeedbackUnchangedAsync(number, op.Obj("feedback_revision"), null, cancellationToken))
                {
                    await ArchivePendingAsync(opId, "invalidated_operations", new JsonObject { ["reason"] = "Owner feedback changed before recovery" }, cancellationToken: cancellationToken);
                    return new JsonObject { ["op_id"] = opId, ["status"] = "feedback_changed" };
                }
            }
            if (current != commitSha)
            {
                await AssertLeaseAsync(cancellationToken);
                await UpdateBranchCasAsync(branch, op.Str("parent_head"), commitSha, cancellationToken);
            }
            await journal.AdvanceAsync(opId, "branch_updated", new JsonObject { ["branch_sha"] = commitSha }, cancellationToken);
            phase = "branch_updated";
        }
        if (phase == "branch_updated")
        {
            await AssertLeaseAsync(cancellationToken);
            if (await RefShaAsync(branch, cancellationToken) != commitSha)
            {
                throw new Conflict("Topic branch changed during recovery.");
            }
            if (number > 0)
            {
                selected = await RequireOpenPrAsync(number, topic, generation, branch, cancellationToken);
                await EnsureDraftForSourceAsync(selected, op, false, cancellationToken);
            }
            (JsonObject pr, bool created) = await EnsurePrAsync(topic, generation, branch, op.Str("title"), op.Str("body"), cancellationToken);
            await journal.AdvanceAsync(opId, "pr_updated", new JsonObject { ["pr_number"] = pr["number"]?.DeepClone(), ["created"] = created }, cancellationToken);
            phase = "pr_updated";
        }
        if (phase == "pr_updated")
        {
            await AssertLeaseAsync(cancellationToken);
            if (await RefShaAsync(branch, cancellationToken) != commitSha)
            {
                throw new Conflict("Topic branch changed before publication finalization.");
            }
            if (op.Bool("export_required"))
            {
                return await HandoffExportAsync(opId, branch, commitSha, cancellationToken);
            }
            if (await AwaitChecksAsync(opId, branch, commitSha, cancellationToken) is null)
            {
                return new JsonObject { ["op_id"] = opId, ["commit_sha"] = commitSha, ["status"] = "awaiting_checks" };
            }
            phase = "checks_verified";
        }
        if (phase == "checks_verified")
        {
            await AssertLeaseAsync(cancellationToken);
            await journal.AdvanceAsync(opId, "committed", new JsonObject { ["head_sha"] = commitSha }, cancellationToken);
        }
        return new JsonObject { ["op_id"] = opId, ["commit_sha"] = commitSha, ["status"] = "recovered" };
    }

    private async Task<PublicationChecks?> AwaitChecksAsync(string opId, string branch, string head, CancellationToken cancellationToken)
    {
        JsonObject operation = (await store.ReadAsync(cancellationToken)).State.Obj("pending_operation");
        if (operation.Str("op_id") != opId)
        {
            throw new Conflict("Journal operation changed before check verification.");
        }
        if (!operation.Obj("evidence").Bool("validation_dispatched"))
        {
            await AssertLeaseAsync(cancellationToken);
            await Runtime.DispatchVaultValidationAsync(api, branch, cancellationToken);
            await journal.AdvanceAsync(opId, "pr_updated", new JsonObject { ["validation_dispatched"] = true, ["validation_dispatched_at"] = Runtime.Iso(clock.GetUtcNow()), ["check_sha"] = head }, cancellationToken);
        }
        for (var attempt = 0; attempt < checkAttempts; attempt++)
        {
            PublicationChecks checks = await Runtime.PublicationCheckStateAsync(api, branch, head, requiredChecks, cancellationToken);
            if (checks.Status == "failed")
            {
                await ArchivePendingAsync(opId, "failed_operations", new JsonObject
                {
                    ["check_sha"] = head,
                    ["commit_sha"] = head,
                    ["checks"] = checks.Checks.Copy(),
                    ["vault_validation"] = checks.VaultValidation,
                    ["reason"] = "Exact-head validation failed"
                }, freeze: true, cancellationToken: cancellationToken);
                throw new RuntimeFailure("Exact-head validation failed.");
            }
            if (checks.Status == "success")
            {
                await AssertLeaseAsync(cancellationToken);
                await journal.AdvanceAsync(opId, "checks_verified", new JsonObject { ["checks"] = checks.Checks.Copy(), ["vault_validation"] = checks.VaultValidation }, cancellationToken);
                return checks;
            }
            if (attempt + 1 < checkAttempts)
            {
                await Task.Delay(checkInterval, clock, cancellationToken);
            }
        }
        return null;
    }
}
