using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public sealed class StateBranchStore(IGitHubApi api, string branch = Runtime.StateBranch, string path = Runtime.StatePath) : IStateStore
{
    private string RefPath => "/git/ref/heads/" + Uri.EscapeDataString(branch);
    private string UpdateRefPath => "/git/refs/heads/" + Uri.EscapeDataString(branch);

    public async Task<StateSnapshot> ProvisionAsync(JsonObject state, string baseSha, CancellationToken cancellationToken = default)
    {
        ValidateState(state);
        StateSnapshot existing = await ReadAsync(cancellationToken);
        if (existing.RefSha is not null)
        {
            return existing;
        }
        JsonObject parent = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{baseSha}", cancellationToken: cancellationToken);
        (string commit, _) = await CreateStateCommitAsync(state, baseSha, parent.Obj("tree").Str("sha"), "maintenance: initialize improvement state", cancellationToken);
        await api.RequestAsync("POST", "/git/refs", new JsonObject { ["ref"] = $"refs/heads/{branch}", ["sha"] = commit }, cancellationToken: cancellationToken);
        return await ReadAsync(cancellationToken);
    }

    public async Task<StateSnapshot> ReadAsync(CancellationToken cancellationToken = default)
    {
        JsonObject reference;
        try
        {
            reference = await Runtime.ObjectAsync(api, "GET", RefPath, cancellationToken: cancellationToken);
        }
        catch (GitHubApiFailure error) when (error.Status == 404)
        {
            return new(new JsonObject(), null);
        }
        string head = reference.Obj("object").Str("sha");
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
        if (blob.Str("encoding") != "base64" || blob.Str("content").Length > 32_000_000)
        {
            throw new RuntimeFailure("State blob encoding or size is invalid.");
        }
        try
        {
            byte[] data = Convert.FromBase64String(blob.Str("content"));
            JsonObject state = JsonNode.Parse(new UTF8Encoding(false, true).GetString(data)) as JsonObject ?? throw new JsonException("Object required.");
            ValidateState(state);
            return new(state, head, blobSha);
        }
        catch (Exception error) when (error is FormatException or DecoderFallbackException or JsonException)
        {
            throw new RuntimeFailure("State branch contains invalid JSON.");
        }
    }

    public async Task<StateSnapshot> WriteAsync(JsonObject state, StateSnapshot expected, string message, CancellationToken cancellationToken = default)
    {
        ValidateState(state);
        if (expected.RefSha is null)
        {
            throw new Conflict("State branch must be provisioned during confirmed activation.");
        }
        JsonObject current = await Runtime.ObjectAsync(api, "GET", RefPath, cancellationToken: cancellationToken);
        if (current.Obj("object").Str("sha") != expected.RefSha)
        {
            throw new Conflict("State ref changed before write.");
        }
        JsonObject parent = await Runtime.ObjectAsync(api, "GET", $"/git/commits/{expected.RefSha}", cancellationToken: cancellationToken);
        (string commit, string blob) = await CreateStateCommitAsync(state, expected.RefSha, parent.Obj("tree").Str("sha"), message, cancellationToken);
        await api.RequestAsync("PATCH", UpdateRefPath, new JsonObject { ["sha"] = commit, ["force"] = false }, cancellationToken: cancellationToken);
        return new(state.Copy(), commit, blob);
    }

    private async Task<(string Commit, string Blob)> CreateStateCommitAsync(JsonObject state, string parent, string parentTree, string message, CancellationToken cancellationToken)
    {
        string encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(state.ToJsonString(JsonData.Options) + "\n"));
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
        return (commit.Str("sha"), blob.Str("sha"));
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
