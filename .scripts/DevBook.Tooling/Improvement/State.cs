using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public sealed class StateBranchStore(IGitHubApi api, string branch = Runtime.StateBranch, string path = Runtime.StatePath) : IStateStore
{
    private StateSnapshot? cached;
    private readonly HashSet<string> supersededRefs = new(StringComparer.Ordinal);
    private const int MaximumEncodedStateLength = 32_000_000;
    private const int MaximumHistoryRecords = 20;
    private const int MaximumHistoryBytes = 1_048_576;
    private CanceledWriteAttempt? canceledWrite;
    private sealed record CanceledWriteAttempt(JsonObject Input, StateSnapshot Intended);
    private string RefPath => "/git/ref/heads/" + Uri.EscapeDataString(branch);
    private string UpdateRefPath => "/git/refs/heads/" + Uri.EscapeDataString(branch);

    public async Task<StateSnapshot> ProvisionAsync(JsonObject state, string baseSha, CancellationToken cancellationToken = default)
    {
        JsonObject frozen = state.Copy();
        ValidateState(frozen);
        StateSnapshot existing = await ReadAsync(cancellationToken);
        if (existing.RefSha is not null)
        {
            return existing;
        }
        (JsonObject final, string[] removed) = BoundHistory(frozen);
        string finalEncoded = EncodeState(final);
        string? archiveEncoded = removed.Length > 0 ? EncodeState(frozen) : null;
        JsonObject parent = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{baseSha}", cancellationToken: cancellationToken);
        string parentCommit = baseSha;
        string parentTree = parent.Obj("tree").Str("sha");
        if (archiveEncoded is not null)
        {
            (parentCommit, _, parentTree) = await CreateStateCommitAsync(archiveEncoded, parentCommit, parentTree, "maintenance: preserve initial workload history", cancellationToken);
        }
        var (commit, _, _) = await CreateStateCommitAsync(finalEncoded, parentCommit, parentTree, "maintenance: initialize improvement state", cancellationToken);
        await api.RequestAsync("POST", "/git/refs", new JsonObject { ["ref"] = $"refs/heads/{branch}", ["sha"] = commit }, cancellationToken: cancellationToken);
        return await ReadAsync(cancellationToken);
    }

    public async Task<StateSnapshot> ReadAsync(CancellationToken cancellationToken = default)
    {
        JsonObject reference;
        try
        {
            reference = await ReadVisibleRefAsync(cancellationToken);
        }
        catch (GitHubApiFailure error) when (error.Status == 404)
        {
            cached = null;
            return new(new JsonObject(), null);
        }
        string head = reference.Obj("object").Str("sha");
        StateSnapshot? cachedSnapshot = cached;
        if (cachedSnapshot?.RefSha == head)
        {
            return Copy(cachedSnapshot);
        }
        cached = null;
        JsonObject commit = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{head}", cancellationToken: cancellationToken);
        JsonObject tree = await Runtime.ObjectAsync(api, "GET", $"/git/trees/{commit.Obj("tree").Str("sha")}?recursive=1", cancellationToken: cancellationToken);
        if (tree["truncated"]?.GetValue<bool>() != false)
        {
            throw new RuntimeFailure("Complete state tree is required.");
        }
        JsonObject[] entries = tree.Arr("tree").OfType<JsonObject>().Where(item => item.Str("path") == path).ToArray();
        if (entries.Length != 1 || entries[0].Str("type") != "blob" || entries[0].Str("mode") != "100644")
        {
            throw new Conflict("Existing state branch is missing its regular state blob; preserve it for recovery.");
        }
        string blobSha = entries[0].Str("sha");
        JsonObject blob = await Runtime.ObjectAsync(api, "GET", $"/git/blobs/{blobSha}", cancellationToken: cancellationToken);
        if (blob.Str("encoding") != "base64" || blob.Str("content").Count(character => !char.IsWhiteSpace(character)) > MaximumEncodedStateLength)
        {
            throw new RuntimeFailure("State blob encoding or size is invalid.");
        }
        try
        {
            byte[] data = Convert.FromBase64String(blob.Str("content"));
            JsonObject state = JsonNode.Parse(new UTF8Encoding(false, true).GetString(data)) as JsonObject ?? throw new JsonException("Object required.");
            ValidateState(state);
            var snapshot = new StateSnapshot(state, head, blobSha);
            cached = snapshot;
            return Copy(snapshot);
        }
        catch (Exception error) when (error is FormatException or DecoderFallbackException or JsonException)
        {
            throw new RuntimeFailure("State branch contains invalid JSON.");
        }
    }

    public async Task<StateSnapshot> WriteAsync(JsonObject state, StateSnapshot expected, string message, CancellationToken cancellationToken = default)
    {
        canceledWrite = null;
        JsonObject frozen = state.Copy();
        ValidateState(frozen);
        if (expected.RefSha is null)
        {
            throw new Conflict("State branch must be provisioned during confirmed activation.");
        }
        JsonObject current = await ReadVisibleRefAsync(cancellationToken);
        if (current.Obj("object").Str("sha") != expected.RefSha)
        {
            throw new Conflict("State ref changed before write.");
        }
        (JsonObject final, string[] removed) = BoundHistory(frozen);
        JsonObject? archive = null;
        if (removed.Length > 0)
        {
            StateSnapshot? cachedSnapshot = cached;
            StateSnapshot persisted = cachedSnapshot is not null && cachedSnapshot.RefSha == expected.RefSha
                ? cachedSnapshot : await ReadAsync(cancellationToken);
            if (persisted.RefSha != expected.RefSha) throw new Conflict("State ref changed before history retention.");
            JsonObject persistedHistory = persisted.State.Obj("workload_history");
            archive = frozen.Copy();
            foreach (string key in removed)
            {
                if (persistedHistory.TryGetPropertyValue(key, out JsonNode? saved)
                    && JsonNode.DeepEquals(saved, frozen.Obj("workload_history")[key]))
                {
                    archive.Obj("workload_history").Remove(key);
                }
            }
            if (JsonNode.DeepEquals(archive["workload_history"], final["workload_history"])) archive = null;
        }
        string finalEncoded = EncodeState(final);
        string? archiveEncoded = archive is null ? null : EncodeState(archive);
        JsonObject parent = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{expected.RefSha}", cancellationToken: cancellationToken);
        string parentCommit = expected.RefSha;
        string parentTree = parent.Obj("tree").Str("sha");
        if (archiveEncoded is not null)
        {
            (parentCommit, _, parentTree) = await CreateStateCommitAsync(archiveEncoded, parentCommit, parentTree, "maintenance: preserve workload history before retention", cancellationToken);
        }
        var (commit, blob, _) = await CreateStateCommitAsync(finalEncoded, parentCommit, parentTree, message, cancellationToken);
        var written = new StateSnapshot(final, commit, blob);
        try
        {
            await api.RequestAsync("PATCH", UpdateRefPath, new JsonObject { ["sha"] = commit, ["force"] = false }, cancellationToken: cancellationToken);
        }
        catch (OperationCanceledException)
        {
            canceledWrite = new CanceledWriteAttempt(frozen.Copy(), Copy(written));
            throw;
        }
        supersededRefs.Add(expected.RefSha);
        cached = written;
        return Copy(written);
    }

    internal bool MatchesCanceledWrite(JsonObject input, StateSnapshot observed) =>
        canceledWrite is { } attempt
        && JsonNode.DeepEquals(input, attempt.Input)
        && observed.RefSha == attempt.Intended.RefSha
        && observed.BlobSha == attempt.Intended.BlobSha
        && JsonNode.DeepEquals(observed.State, attempt.Intended.State);

    private static (JsonObject State, string[] Removed) BoundHistory(JsonObject frozen)
    {
        JsonObject final = frozen.Copy();
        if (!frozen.TryGetPropertyValue("workload_history", out JsonNode? value)) return (final, []);
        if (value is not JsonObject history) throw new RuntimeFailure("Workload history must be an object; preserve the current state branch before retrying.");
        var retained = new JsonObject();
        foreach (KeyValuePair<string, JsonNode?> row in history.Reverse().Take(MaximumHistoryRecords))
        {
            var candidate = new JsonObject(new[] { new KeyValuePair<string, JsonNode?>(row.Key, row.Value?.DeepClone()) }
                .Concat(retained.Select(pair => new KeyValuePair<string, JsonNode?>(pair.Key, pair.Value?.DeepClone()))));
            if (Encoding.UTF8.GetByteCount(candidate.ToJsonString(JsonData.Options)) > MaximumHistoryBytes) break;
            retained = candidate;
        }
        final["workload_history"] = retained;
        return (final, history.Where(pair => !retained.ContainsKey(pair.Key)).Select(pair => pair.Key).ToArray());
    }

    private async Task<JsonObject> ReadVisibleRefAsync(CancellationToken cancellationToken)
    {
        for (int attempt = 0; ; attempt++)
        {
            JsonObject reference = await Runtime.ObjectAsync(api, "GET", RefPath, cancellationToken: cancellationToken);
            if (!supersededRefs.Contains(reference.Obj("object").Str("sha")))
            {
                return reference;
            }
            if (attempt >= 15)
            {
                throw new Conflict("State ref still shows a superseded acknowledged write; preserve state before retrying.");
            }
            await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
        }
    }

    private static StateSnapshot Copy(StateSnapshot snapshot) =>
        new(snapshot.State.Copy(), snapshot.RefSha, snapshot.BlobSha);

    private static string EncodeState(JsonObject state)
    {
        string encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(state.ToJsonString(JsonData.Options) + "\n"));
        if (encoded.Length > MaximumEncodedStateLength)
        {
            throw new RuntimeFailure("State exceeds its readable size limit; preserve the current state branch and compact finalized records before retrying.");
        }
        return encoded;
    }

    private async Task<(string Commit, string Blob, string Tree)> CreateStateCommitAsync(string encoded, string parent, string parentTree, string message, CancellationToken cancellationToken)
    {
        JsonObject blob = await Runtime.ObjectAsync(api, "POST", "/git/blobs", new JsonObject { ["content"] = encoded, ["encoding"] = "base64" }, cancellationToken);
        JsonObject tree = await Runtime.ObjectAsync(api, "POST", "/git/trees", new JsonObject
        {
            ["base_tree"] = parentTree,
            ["tree"] = new JsonArray(new JsonObject { ["path"] = path, ["mode"] = "100644", ["type"] = "blob", ["sha"] = blob["sha"]?.DeepClone() })
        }, cancellationToken);
        JsonObject commit = await Runtime.ObjectAsync(api, "POST", "/git/commits", new JsonObject
        {
            ["message"] = message,
            ["tree"] = tree["sha"]?.DeepClone(),
            ["parents"] = new JsonArray(parent)
        }, cancellationToken);
        return (commit.Str("sha"), blob.Str("sha"), tree.Str("sha"));
    }

    internal static void ValidateState(JsonObject state)
    {
        if (state.Int("version") != 1)
        {
            throw new Conflict("Unsupported state version; never initialize over existing state.");
        }
    }
}

public sealed class MemoryStateStore : IStateStore
{
    private readonly object gate = new();
    private JsonObject state;
    private int revision = 1;

    public MemoryStateStore(JsonObject state)
    {
        StateBranchStore.ValidateState(state);
        this.state = state.Copy();
    }

    public Task<StateSnapshot> ReadAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        lock (gate)
        {
            return Task.FromResult(new StateSnapshot(state.Copy(), revision.ToString(System.Globalization.CultureInfo.InvariantCulture)));
        }
    }

    public Task<StateSnapshot> WriteAsync(JsonObject value, StateSnapshot expected, string message, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        StateBranchStore.ValidateState(value);
        lock (gate)
        {
            if (expected.RefSha != revision.ToString(System.Globalization.CultureInfo.InvariantCulture))
            {
                throw new Conflict("State CAS conflict.");
            }
            state = value.Copy();
            revision++;
            return Task.FromResult(new StateSnapshot(state.Copy(), revision.ToString(System.Globalization.CultureInfo.InvariantCulture)));
        }
    }
}

public sealed class DurableLease(IStateStore store, string owner, int ttlSeconds = 1200, TimeProvider? timeProvider = null)
{
    private readonly TimeProvider clock = timeProvider ?? TimeProvider.System;

    public async Task<StateSnapshot> AcquireAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(owner) || ttlSeconds < 1)
        {
            throw new UnsafeInput("Lease requires an owner and positive duration.");
        }
        DateTimeOffset now = clock.GetUtcNow();
        StateSnapshot snapshot = await store.ReadAsync(cancellationToken);
        JsonObject lease = snapshot.State.Obj("lease");
        if (lease.Str("owner") != owner && Runtime.ParseTime(lease.Str("expires_at")) is DateTimeOffset expires && expires > now)
        {
            throw new Conflict("Another worker holds the durable lease.");
        }
        JsonObject state = snapshot.State.Copy();
        state["lease"] = new JsonObject { ["owner"] = owner, ["acquired_at"] = Runtime.Iso(now), ["expires_at"] = Runtime.Iso(now.AddSeconds(ttlSeconds)) };
        return await store.WriteAsync(state, snapshot, "maintenance: acquire improvement lease", cancellationToken);
    }

    public async Task<StateSnapshot> ReleaseAsync(CancellationToken cancellationToken = default)
    {
        StateSnapshot snapshot = await store.ReadAsync(cancellationToken);
        if (snapshot.State.Obj("lease").Str("owner") != owner)
        {
            throw new Conflict("Lease owner changed.");
        }
        JsonObject state = snapshot.State.Copy();
        state["lease"] = null;
        return await store.WriteAsync(state, snapshot, "maintenance: release improvement lease", cancellationToken);
    }
}

public sealed class OperationJournal(IStateStore store, TimeProvider? timeProvider = null)
{
    private readonly TimeProvider clock = timeProvider ?? TimeProvider.System;

    public static void CompactFinalizedExports(JsonObject state, int prNumber = 0)
    {
        foreach (KeyValuePair<string, JsonNode?> pair in state.Obj("export_operations"))
        {
            if (pair.Value is not JsonObject operation || operation.Bool("compacted")
                || state.Obj("finalized_exports")[pair.Key] is not JsonObject finalized)
            {
                continue;
            }
            JsonObject evidence = operation.Obj("evidence");
            if (prNumber > 0 && operation.Int("pr_number", evidence.Int("pr_number", evidence.Obj("export_request").Int("pr_number"))) != prNumber) continue;
            string prKey = $"{operation.Str("topic")}:{operation.Int("generation")}";
            bool terminal = state.Obj("prs").Obj(prKey).Str("status") is "closed" or "merged";
            if (!state.Obj("export_feedback_receipts").Bool(pair.Key) && !terminal)
            {
                continue;
            }
            JsonObject receipt = operation.RequiredObject("receipts");
            operation["workload_id"] = receipt["workload_id"]?.DeepClone() ?? operation["workload_id"]?.DeepClone();
            operation["receipt_hash"] = LegacyIdentity.Fingerprint(receipt);
            operation["receipt_record_count"] = Math.Max(1, receipt.Arr("records").Count);
            operation.Remove("candidate");
            operation.Remove("body");
            operation.Remove("receipts");
            operation["compacted"] = true;
            if (terminal && !state.Obj("export_feedback_receipts").Bool(pair.Key))
            {
                finalized["feedback_terminal"] = true;
            }
        }
    }

    public async Task<JsonObject> PrepareAsync(JsonObject operation, CancellationToken cancellationToken = default)
    {
        StateSnapshot snapshot = await store.ReadAsync(cancellationToken);
        if (snapshot.State["pending_operation"] is not null)
        {
            throw new Conflict("Pending operation must be reconciled first.");
        }
        JsonObject op = operation.Copy();
        op["op_id"] ??= Guid.NewGuid().ToString("N")[..16];
        op["phase"] = "prepared";
        op["updated_at"] = Runtime.Iso(clock.GetUtcNow());
        JsonObject state = snapshot.State.Copy();
        state["pending_operation"] = op.Copy();
        await store.WriteAsync(state, snapshot, $"maintenance: prepare {op.Str("op_id")}", cancellationToken);
        return op;
    }

    public async Task<JsonObject> AdvanceAsync(string opId, string phase, JsonObject? evidence = null, CancellationToken cancellationToken = default)
    {
        int next = Array.IndexOf(Runtime.JournalPhases, phase);
        StateSnapshot snapshot = await store.ReadAsync(cancellationToken);
        JsonObject op = snapshot.State.Obj("pending_operation").Copy();
        int prior = Array.IndexOf(Runtime.JournalPhases, op.Str("phase"));
        if (op.Str("op_id") != opId || next < 0 || prior < 0 || (next != prior && next != prior + 1))
        {
            throw new Conflict("Journal identity or phase transition changed.");
        }
        op["phase"] = phase;
        op["updated_at"] = Runtime.Iso(clock.GetUtcNow());
        JsonObject merged = op.Obj("evidence").Copy();
        foreach (KeyValuePair<string, JsonNode?> item in evidence ?? new JsonObject())
        {
            merged[item.Key] = item.Value?.DeepClone();
        }
        op["evidence"] = merged;
        JsonObject state = snapshot.State.Copy();
        if (phase == "committed")
        {
            JsonObject completed = state.Obj("completed_operations").Copy();
            completed[opId] = op.Copy();
            state["completed_operations"] = completed;
            state["pending_operation"] = null;
        }
        else
        {
            state["pending_operation"] = op.Copy();
        }
        await store.WriteAsync(state, snapshot, $"maintenance: journal {opId} {phase}", cancellationToken);
        return op;
    }

    public async Task<JsonObject> CompactFinalizedAsync(string opId, CancellationToken cancellationToken = default)
    {
        StateSnapshot snapshot = await store.ReadAsync(cancellationToken);
        JsonObject op = snapshot.State.Obj("completed_operations").Obj(opId);
        if (snapshot.State.Obj("finalized_operations")[opId] is null || op.Count == 0)
        {
            throw new Conflict("Completed operation receipts must be finalized before compaction.");
        }
        if (op.Bool("compacted"))
        {
            return op.Copy();
        }
        JsonObject evidence = op.Obj("evidence");
        var compact = new JsonObject
        {
            ["op_id"] = opId,
            ["workload_id"] = op.Obj("receipts")["workload_id"]?.DeepClone() ?? op["workload_id"]?.DeepClone(),
            ["topic"] = op["topic"]?.DeepClone(),
            ["generation"] = op["generation"]?.DeepClone(),
            ["head_sha"] = evidence["head_sha"]?.DeepClone() ?? evidence["commit_sha"]?.DeepClone(),
            ["checks"] = evidence["checks"]?.DeepClone(),
            ["vault_validation"] = evidence["vault_validation"]?.DeepClone(),
            ["updated_at"] = op["updated_at"]?.DeepClone(),
            ["compacted"] = true
        };
        JsonObject state = snapshot.State.Copy();
        state.Obj("completed_operations")[opId] = compact.Copy();
        await store.WriteAsync(state, snapshot, $"maintenance: compact journal {opId}", cancellationToken);
        return compact;
    }
}
