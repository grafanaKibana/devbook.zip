using DevBook.Tooling.Export;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using ExportApi = DevBook.Tooling.Tests.ExportWorkerTests.FakeExportApi;
using ExportFixture = DevBook.Tooling.Tests.ExportWorkerTests.WorkerFixture;
using FluentAssertions;
using System.Text;
using System.Text.Json.Nodes;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class StateTests
{

    [Fact]
    public async Task VerifiedExportCompactsPayloadsWhilePreservingUnknownFieldsAndReceipts()
    {
        // Arrange
        var fixture = ExportCompactionReviewedFixture();
        fixture.Api.ChecksReady = true;
        JsonObject originalOperation = fixture.State.Obj("export_operations").Obj(fixture.Request.Str("op_id"));
        const string secondPath = "Vault/Home/Programming/NET/Other.md";
        JsonObject secondEdit = DomainFixtures.Edit();
        secondEdit["path"] = secondPath;
        JsonObject secondProposal = DomainFixtures.Proposal(secondEdit);
        JsonObject secondBatch = new()
        {
            ["notes"] = new JsonArray(DomainFixtures.NoteRecord(secondPath)),
            ["rules_hash"] = "reviewed-rules",
            ["review_process"] = Core.FocusedReviewVersion
        };
        JsonObject secondResult = Proposal.Apply(new Dictionary<string, string> { [secondPath] = DomainFixtures.Note }, secondProposal);
        JsonObject receipts = originalOperation.Obj("receipts");
        receipts["version"] = 2;
        receipts["workload_id"] = "accepted-workload";
        receipts.Arr("records")[0]!["record_id"] = "first-record";
        receipts.Arr("records").Add(new JsonObject
        {
            ["record_id"] = "second-record",
            ["batch"] = secondBatch,
            ["proposal"] = secondProposal,
            ["result"] = secondResult,
            ["review"] = DomainFixtures.UnchangedReview(new JsonObject { ["current"] = secondResult.Obj("sources").Copy() })
        });
        receipts["proposal_history"] = receipts.Arr("records").Copy();
        fixture.State.Obj("prs").Obj(fixture.Key)["proposal_records"] = receipts.Arr("records").Copy();
        fixture.State["pending_author_proposal"] = new JsonObject { ["workload_id"] = "another-workload", ["audit"] = "retain parked work" };
        JsonArray openPrRecords = fixture.State.Obj("prs").Obj(fixture.Key).Arr("proposal_records").Copy();
        string receiptHash = LegacyIdentity.Fingerprint(originalOperation["receipts"]);
        fixture.State["held_proposals"] = new JsonObject
        {
            ["other-batch"] = new JsonObject
            {
                ["rules_hash"] = "reviewed-rules",
                ["source_hashes"] = new JsonObject { ["Vault/Home/Programming/Other.md"] = "unchanged-other-source" }
            }
        };
        fixture.State["invalid_proposals"] = new JsonObject
        {
            ["completed-batch"] = new JsonObject
            {
                ["rules_hash"] = "reviewed-rules",
                ["source_hashes"] = new JsonObject { [DomainFixtures.Path] = LegacyIdentity.Digest(DomainFixtures.Note) },
                ["repair_inputs"] = new JsonObject { [DomainFixtures.Path] = "" },
                ["feedback_keys"] = new JsonArray()
            },
            ["different-feedback"] = new JsonObject
            {
                ["rules_hash"] = "reviewed-rules",
                ["source_hashes"] = new JsonObject { [DomainFixtures.Path] = LegacyIdentity.Digest(DomainFixtures.Note) },
                ["repair_inputs"] = new JsonObject { [DomainFixtures.Path] = "different-flags" },
                ["feedback_keys"] = new JsonArray("other-feedback-revision")
            }
        };
        var store = new MemoryStateStore(fixture.State);

        // Act
        JsonObject published = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);
        StateSnapshot finalized = await store.ReadAsync();
        JsonObject compact = finalized.State.Obj("export_operations").Obj(fixture.Request.Str("op_id"));

        // Assert
        published.Str("status").Should().Be("exported");
        finalized.State.Obj("held_proposals").ContainsKey("other-batch").Should().BeTrue();
        finalized.State.Obj("invalid_proposals").ContainsKey("different-feedback").Should().BeTrue();
        finalized.State.Obj("invalid_proposals").ContainsKey("completed-batch").Should().BeFalse();
        finalized.State.Obj("completed_review_holds").Count.Should().Be(1);
        compact.Bool("compacted").Should().BeTrue();
        compact["candidate"].Should().BeNull();
        compact["body"].Should().BeNull();
        compact["receipts"].Should().BeNull();
        compact.Str("receipt_hash").Should().Be(receiptHash);
        compact.Int("receipt_record_count").Should().Be(2);
        compact.Str("workload_id").Should().Be("accepted-workload");
        finalized.State.Obj("notes").Obj(secondPath).Str("outcome").Should().Be("changed");
        finalized.State.Obj("pending_author_proposal").Str("audit").Should().Be("retain parked work");
        compact.Str("prepared_at").Should().Be(originalOperation.Str("prepared_at"));
        compact.Str("future_extension").Should().Be("preserved");
        compact.Obj("evidence").Str("export_verified_head").Should().Be(ExportApi.GeneratedHead);
        JsonNode.DeepEquals(compact.Obj("evidence")["export_request"], fixture.Request).Should().BeTrue();
        JsonNode.DeepEquals(finalized.State.Obj("prs").Obj(fixture.Key)["proposal_records"], openPrRecords).Should().BeTrue();
        finalized.State.Obj("feedback").Obj("comment:kept").Str("status").Should().Be("implemented");
        finalized.State.Arr("rejections").Should().ContainSingle();
    }

    [Theory]
    [InlineData("open")]
    [InlineData("closed")]
    [InlineData("merged")]
    public async Task LegacyNestedTopicPausesItsBroadTopicUntilThePrIsTerminal(string status)
    {
        // Arrange
        var fixture = ExportCompactionReviewedFixture();
        fixture.Api.ChecksReady = true;
        var store = new MemoryStateStore(fixture.State);
        await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);
        StateSnapshot snapshot = await store.ReadAsync();
        snapshot.State["cooldown"] = null;
        if (status == "open")
        {
            snapshot.State.Obj("topics")[fixture.Request.Str("topic_id")] = new JsonObject
            {
                ["generation"] = 1,
                ["publication_conflict"] = new JsonObject { ["generation"] = 1, ["reason"] = "Existing publication conflict" }
            };
        }
        await store.WriteAsync(snapshot.State, snapshot, "fixture resume maintenance");
        fixture.Api.Pr["state"] = status == "open" ? "open" : "closed";
        fixture.Api.Pr["merged"] = status == "merged";
        var publisher = new GitHubRuntime(fixture.Api, store, activation: () => { });
        var engine = new ImprovementEngine(Repository.FindRoot(), fixture.Config, store, api: fixture.Api, publisher: publisher,
            notesLoader: () => new JsonArray(DomainFixtures.NoteRecord(status == "open" ? "Vault/Home/Programming/CSharp/Moved.md" : DomainFixtures.Path)),
            snapshotShaLoader: () => ExportApi.MainHead);

        // Act
        JsonObject result = await engine.RunAsync();
        JsonObject reconciled = (await store.ReadAsync()).State;
        JsonObject terminalPr = reconciled.Obj("prs").Obj(fixture.Key);

        // Assert
        terminalPr.Str("status").Should().Be(status);
        result.Str("status").Should().Be(status == "open" ? "topics_paused" : "selected");
        if (status == "open")
        {
            terminalPr.Bool("base_conflict").Should().BeTrue();
            terminalPr.Arr("blocked_topic_ids").Strings().Should().Equal(Core.TopicId("Programming"));
            terminalPr.Arr("proposal_records").Count.Should().Be(1);
        }
        else
        {
            terminalPr["proposal_records"].Should().BeNull();
            terminalPr.Obj("terminal_audit").Int("record_count").Should().Be(1);
            reconciled.Obj("topics").Obj(fixture.Request.Str("topic_id")).Int("generation").Should().Be(2);
            result.Obj("batch").Str("topic").Should().Be("Programming");
        }
        reconciled.Arr("rejections").Count.Should().Be(status == "closed" ? 2 : 1);
        reconciled.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Bool("compacted").Should().BeTrue();
        reconciled.Obj("feedback").Obj("comment:kept").Str("status").Should().Be("implemented");
        fixture.Api.CommitWrites.Should().Be(1);

    }

    [Fact]
    public async Task OversizedStateIsRejectedBeforeCreatingAnUnreadableRemoteBlob()
    {
        // Arrange
        JsonObject saved = OperationalState();
        saved["workload_history"] = new JsonObject { ["already-saved"] = LargeAuditRecord() };
        var api = new CachedStateApi(saved);
        var store = new StateBranchStore(api);
        StateSnapshot snapshot = await store.ReadAsync();
        JsonObject state = snapshot.State.Copy();
        state["oversized_extension"] = new string('x', 24_000_000);

        // Act
        Func<Task> write = () => store.WriteAsync(state, snapshot, "fixture oversized state");

        // Assert
        await write.Should().ThrowAsync<RuntimeFailure>().WithMessage("*readable size limit*");
        api.Mutations.Should().Be(0);
        api.Head.Should().Be("initial");
        JsonNode.DeepEquals(api.RemoteState, saved).Should().BeTrue();
        state.Str("oversized_extension").Length.Should().Be(24_000_000);
    }

    [Fact]
    public async Task CachedReadReturnsTheCurrentRemoteStateWithoutSharingCallerData()
    {
        // Arrange
        var api = new CachedStateApi();
        var store = new StateBranchStore(api);
        StateSnapshot first = await store.ReadAsync();
        first.State["version"] = 99;
        first.State.Obj("notes")["caller-only"] = new JsonObject();
        JsonObject changed = OperationalState();
        changed["marker"] = "changed";
        api.Seed("changed", changed, "initial");
        StateSnapshot currentParent = await store.ReadAsync();
        JsonObject attempted = currentParent.State.Copy();
        attempted["workload_history"] = new JsonObject { ["unsaved"] = LargeAuditRecord() };
        api.RejectPatch = true;
        Exception? failedWrite = await Record.ExceptionAsync(() => store.WriteAsync(attempted, currentParent, "fixture rejected publication"));

        // Act
        StateSnapshot current = await store.ReadAsync();
        string marker = current.State.Str("marker");
        current.State["marker"] = "returned snapshot mutation";

        // Assert
        failedWrite.Should().BeOfType<GitHubApiFailure>();
        current.RefSha.Should().Be("changed");
        current.BlobSha.Should().Be("changed-blob");
        marker.Should().Be("changed");
        current.State.Obj("notes").Count.Should().Be(0);
        current.State.Int("version").Should().Be(1);
        api.StateReads.Should().Be(2);
        api.RefReads.Should().Be(4);
        api.Patches.Should().Be(1);
        api.RemoteState.Str("marker").Should().Be("changed");
        api.CommitWrites.Should().Be(2);
        api.RemoteState.ContainsKey("workload_history").Should().BeFalse();
        api.Parent(api.Head!).Should().Be("initial");
    }

    [Fact]
    public async Task StateWriteFreezesCallerInputBeforeItsFirstAwait()
    {
        // Arrange
        JsonObject original = OperationalState();
        original["focused_workload"] = new JsonObject { ["id"] = "unsaved", ["status"] = "active", ["audit"] = "earlier focused version" };
        var api = new CachedStateApi(original);
        var store = new StateBranchStore(api);
        StateSnapshot snapshot = await store.ReadAsync();
        snapshot = await store.WriteAsync(snapshot.State, snapshot, "fixture prior acknowledged write");
        string acknowledged = snapshot.RefSha!;
        api.RefResponses.Enqueue("initial");
        JsonObject input = snapshot.State.Copy();
        input["frozen_extension"] = new JsonObject { ["nested"] = "before" };
        input["workload_history"] = new JsonObject { ["unsaved"] = LargeAuditRecord() };
        JsonObject frozen = input.Copy();
        snapshot.State["workload_history"] = input["workload_history"]!.DeepClone();
        api.BeforeRefResponse = () => input.Obj("frozen_extension")["nested"] = "after";

        // Act
        StateSnapshot written = await store.WriteAsync(input, snapshot, "fixture frozen state");
        JsonObject saved = written.State.Copy();
        written.State.Obj("frozen_extension")["nested"] = "returned mutation";
        snapshot.State.Obj("focused_workload")["audit"] = "caller snapshot mutation";
        StateSnapshot cached = await store.ReadAsync();
        JsonObject cachedState = cached.State.Copy();
        cached.State.Obj("frozen_extension")["nested"] = "cached snapshot mutation";

        // Assert
        frozen.Obj("workload_history").ToJsonString(JsonData.Options).Length.Should().BeLessThan(1_048_576);
        Encoding.UTF8.GetByteCount(frozen.Obj("workload_history").ToJsonString(JsonData.Options)).Should().BeGreaterThan(1_048_576);
        saved.Obj("workload_history").Count.Should().Be(0);
        string intermediate = api.Parent(written.RefSha!);
        api.Parent(intermediate).Should().Be(acknowledged);
        JsonNode.DeepEquals(api.StateAt(intermediate), frozen).Should().BeTrue();
        JsonObject expected = frozen.Copy();
        expected["workload_history"] = new JsonObject();
        JsonNode.DeepEquals(saved, expected).Should().BeTrue();
        JsonNode.DeepEquals(api.RemoteState, expected).Should().BeTrue();
        input.Obj("frozen_extension").Str("nested").Should().Be("after");
        JsonNode.DeepEquals(cachedState, expected).Should().BeTrue();
        api.RemoteState.Obj("frozen_extension").Str("nested").Should().Be("before");
        api.StateAt("initial").Obj("focused_workload").Str("audit").Should().Be("earlier focused version");
        api.Patches.Should().Be(2);
        api.CommitWrites.Should().Be(3);
        api.ForcedUpdates.Should().Be(0);
    }

    [Fact]
    public async Task LeaseAcquisitionBoundsSavedLegacyHistoryBeforeTheGlobalSizeGuard()
    {
        // Arrange
        JsonObject original = OperationalState();
        var history = new JsonObject { ["large-old-prefix"] = "" };
        for (int index = 0; index < 64; index++) history[$"saved-{index:D2}"] = new JsonObject { ["audit"] = $"whole record {index}" };
        original["workload_history"] = history;
        int overhead = Encoding.UTF8.GetByteCount(original.ToJsonString(JsonData.Options) + "\n");
        history["large-old-prefix"] = new string('x', 23_999_970 - overhead);
        JsonObject withLease = original.Copy();
        withLease["lease"] = new JsonObject { ["owner"] = "new-worker", ["acquired_at"] = "2026-11-02T12:00:00Z", ["expires_at"] = "2026-11-02T12:20:00Z" };
        int encodedBefore = Convert.ToBase64String(Encoding.UTF8.GetBytes(original.ToJsonString(JsonData.Options) + "\n")).Length;
        int encodedAfter = Convert.ToBase64String(Encoding.UTF8.GetBytes(withLease.ToJsonString(JsonData.Options) + "\n")).Length;
        var newestTwentyOne = new JsonObject(history.Skip(history.Count - 21).Select(pair => new KeyValuePair<string, JsonNode?>(pair.Key, pair.Value?.DeepClone())));
        var api = new CachedStateApi(original);
        var lease = new DurableLease(new StateBranchStore(api), "new-worker");

        // Act
        StateSnapshot acquired = await lease.AcquireAsync();

        // Assert
        encodedBefore.Should().BeLessThanOrEqualTo(32_000_000);
        encodedAfter.Should().BeGreaterThan(32_000_000);
        Encoding.UTF8.GetByteCount(newestTwentyOne.ToJsonString(JsonData.Options)).Should().BeLessThan(1_048_576);
        acquired.State.Obj("workload_history").Select(pair => pair.Key).Should().Equal(history.Skip(history.Count - 20).Select(pair => pair.Key));
        foreach (KeyValuePair<string, JsonNode?> row in acquired.State.Obj("workload_history")) JsonNode.DeepEquals(row.Value, history[row.Key]).Should().BeTrue();
        Encoding.UTF8.GetByteCount(acquired.State.Obj("workload_history").ToJsonString(JsonData.Options)).Should().BeLessThanOrEqualTo(1_048_576);
        JsonObject expected = original.Copy();
        expected["workload_history"] = acquired.State["workload_history"]!.DeepClone();
        expected["lease"] = acquired.State["lease"]!.DeepClone();
        JsonNode.DeepEquals(acquired.State, expected).Should().BeTrue();
        acquired.State.Obj("lease").Str("owner").Should().Be("new-worker");
        api.Parent(acquired.RefSha!).Should().Be("initial");
        JsonNode.DeepEquals(api.StateAt("initial"), original).Should().BeTrue();
        api.CommitWrites.Should().Be(1);
        api.Patches.Should().Be(1);
        api.ForcedUpdates.Should().Be(0);
    }

    [Fact]
    public async Task CanceledCompactingEngineWritePreservesExactAttemptAndFullAncestorEvidence()
    {
        // Arrange
        JsonObject original = OperationalState();
        JsonObject published = LargeAuditRecord();
        published["status"] = "published";
        original["focused_workload"] = published.Copy();
        var api = new CachedStateApi(original);
        using var caller = new CancellationTokenSource();
        var cancellation = new OperationCanceledException("Final ref response canceled after application.", caller.Token);
        api.AfterPatch = () => { caller.Cancel(); throw cancellation; };
        var engine = new ImprovementEngine(Repository.FindRoot(), new JsonObject(), new StateBranchStore(api),
            notesLoader: () => new JsonArray(), snapshotShaLoader: () => "unused-before-model-loop");

        // Act
        Exception? failure = await Record.ExceptionAsync(() => engine.RunAsync(withModel: true, cancellationToken: caller.Token));

        // Assert
        failure.Should().BeSameAs(cancellation);
        api.Patches.Should().Be(1);
        api.CommitWrites.Should().Be(2);
        api.RefReads.Should().Be(3);
        api.ForcedUpdates.Should().Be(0);
        JsonObject saved = api.RemoteState;
        saved.Obj("workload_history").Count.Should().Be(0);
        saved.Obj("focused_workload").Str("status").Should().Be("active");
        saved.Obj("focused_workload").Str("id").Should().NotBe(published.Str("id"));
        JsonObject archived = api.StateAt(api.Parent(api.Head!));
        JsonNode.DeepEquals(archived.Obj("workload_history")[published.Str("id")], published).Should().BeTrue();
        api.Parent(api.Parent(api.Head!)).Should().Be("initial");
        JsonObject expected = original.Copy();
        expected["focused_workload"] = saved["focused_workload"]!.DeepClone();
        expected["workload_history"] = new JsonObject();
        JsonNode.DeepEquals(saved, expected).Should().BeTrue();
        JsonNode.DeepEquals(api.StateAt("initial"), original).Should().BeTrue();
    }

    private static JsonObject LargeAuditRecord() => new()
    {
        ["id"] = "unsaved",
        ["status"] = "incompatible",
        ["audit"] = new string('界', 400_000),
        ["future_metadata"] = new JsonObject { ["owner"] = "original", ["revision"] = 7 }
    };

    private static JsonObject OperationalState()
    {
        JsonObject state = Core.NewState();
        state["marker"] = "initial";
        state["focused_workload"] = new JsonObject { ["id"] = "current", ["status"] = "active", ["accepted_records"] = new JsonArray() };
        state["pending_author_proposal"] = new JsonObject { ["workload_id"] = "parked", ["proposal"] = DomainFixtures.Proposal(DomainFixtures.Edit()) };
        state["pending_operation"] = new JsonObject { ["op_id"] = "journal", ["evidence"] = new JsonObject { ["head"] = "retained" } };
        state["export_operations"] = new JsonObject { ["export"] = new JsonObject { ["receipt_hash"] = "verified", ["phase"] = "prepared" } };
        state["held_proposals"] = new JsonObject { ["hold"] = new JsonObject { ["reason"] = "retain" } };
        state.Arr("rejections").Add(new JsonObject { ["fingerprint"] = "rejected" });
        state.Obj("feedback")["comment:1"] = new JsonObject { ["revision"] = "owner-revision", ["status"] = "pending" };
        state["cooldown"] = new JsonObject { ["until"] = "2020-01-01T00:00:00Z" };
        state["future_extension"] = new JsonObject { ["nested"] = new JsonArray("retained", 7, null) };
        return state;
    }

    private sealed class CachedStateApi : IGitHubApi
    {
        private readonly Dictionary<string, JsonObject> blobs = new(StringComparer.Ordinal);
        private readonly Dictionary<string, JsonObject> trees = new(StringComparer.Ordinal);
        private readonly Dictionary<string, JsonObject> commits = new(StringComparer.Ordinal);
        private int nextObject;
        public string Repo => "owner/state";
        public string? Head { get; set; }
        public int RefReads { get; private set; }
        public int StateReads { get; private set; }
        public int Patches { get; private set; }
        public int Mutations { get; private set; }
        public int CommitWrites { get; private set; }
        public int ForcedUpdates { get; private set; }
        public bool RejectPatch { get; set; }
        public Queue<string> RefResponses { get; } = new();
        public Action? BeforeRefResponse { get; set; }
        public Action? AfterPatch { get; set; }
        public JsonObject RemoteState => StateAt(Head!);

        public CachedStateApi(JsonObject? state = null) => Seed("initial", state ?? OperationalState());

        public void Seed(string sha, JsonObject state, string? parent = null)
        {
            blobs.Add(sha + "-blob", new JsonObject { ["encoding"] = "base64", ["content"] = Convert.ToBase64String(Encoding.UTF8.GetBytes(state.ToJsonString(JsonData.Options) + "\n")) });
            trees.Add(sha + "-tree", Tree(sha + "-blob"));
            commits.Add(sha, new JsonObject { ["tree"] = new JsonObject { ["sha"] = sha + "-tree" }, ["parents"] = parent is null ? new JsonArray() : new JsonArray(parent) });
            Head = sha;
        }

        public string Parent(string commit) => commits[commit].Arr("parents")[0]!.GetValue<string>();
        public JsonObject StateAt(string commit)
        {
            string tree = commits[commit].Obj("tree").Str("sha");
            string blob = trees[tree].Arr("tree")[0]!.Str("sha");
            return JsonNode.Parse(Convert.FromBase64String(blobs[blob].Str("content")))!.AsObject();
        }

        private static JsonObject Tree(string blob) => new()
        {
            ["truncated"] = false,
            ["tree"] = new JsonArray(new JsonObject { ["path"] = Runtime.StatePath, ["type"] = "blob", ["mode"] = "100644", ["sha"] = blob })
        };

        public async Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            if (method != "GET") Mutations++;
            if (method == "GET" && path.StartsWith("/git/ref/", StringComparison.Ordinal))
            {
                RefReads++;
                await Task.Yield();
                BeforeRefResponse?.Invoke();
                if (Head is null) throw new GitHubApiFailure("missing", 404);
                return new JsonObject { ["object"] = new JsonObject { ["sha"] = RefResponses.TryDequeue(out string? observed) ? observed : Head } };
            }
            if (method == "GET" && path.StartsWith("/git/commits/", StringComparison.Ordinal)) return commits[path.Split('/').Last()].Copy();
            if (method == "GET" && path.StartsWith("/git/trees/", StringComparison.Ordinal)) return trees[path.Split('/').Last().Split('?')[0]].Copy();
            if (method == "GET" && path.StartsWith("/git/blobs/", StringComparison.Ordinal))
            {
                StateReads++;
                return blobs[path.Split('/').Last()].Copy();
            }
            string sha = $"object-{++nextObject}";
            if (method == "POST" && path == "/git/blobs") blobs.Add(sha, payload!.AsObject().Copy());
            else if (method == "POST" && path == "/git/trees")
            {
                trees[payload.Str("base_tree")].Should().NotBeNull();
                trees.Add(sha, Tree(payload!.Arr("tree")[0]!.Str("sha")));
            }
            else if (method == "POST" && path == "/git/commits")
            {
                CommitWrites++;
                string tree = payload.Str("tree");
                trees.ContainsKey(tree).Should().BeTrue();
                string parent = payload!.Arr("parents")[0]!.GetValue<string>();
                commits.ContainsKey(parent).Should().BeTrue();
                commits.Add(sha, new JsonObject { ["tree"] = new JsonObject { ["sha"] = tree }, ["parents"] = payload!["parents"]!.DeepClone() });
            }
            else if (method == "PATCH" && path.StartsWith("/git/refs/", StringComparison.Ordinal))
            {
                Patches++;
                if (payload.Bool("force")) ForcedUpdates++;
                if (RejectPatch) throw new GitHubApiFailure("Ref rejected before application.");
                commits.ContainsKey(payload.Str("sha")).Should().BeTrue();
                Head = payload.Str("sha");
                AfterPatch?.Invoke();
            }
            else throw new InvalidOperationException($"Unexpected {method} {path}.");
            return new JsonObject { ["sha"] = sha };
        }

        public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("No GraphQL expected.");
    }

    private static ExportFixture ExportCompactionReviewedFixture()
    {
        var fixture = new ExportFixture();
        JsonObject operation = fixture.State.Obj("export_operations").Obj(fixture.Request.Str("op_id"));
        JsonObject proposal = DomainFixtures.Proposal(DomainFixtures.Edit());
        var batch = new JsonObject
        {
            ["notes"] = new JsonArray(DomainFixtures.NoteRecord()),
            ["rules_hash"] = "reviewed-rules",
            ["feedback"] = new JsonArray(),
            ["pr"] = new JsonObject { ["number"] = 1 }
        };
        JsonObject result = Proposal.Apply(new Dictionary<string, string> { [DomainFixtures.Path] = DomainFixtures.Note }, proposal);
        var records = new JsonArray(new JsonObject { ["batch"] = batch.Copy(), ["proposal"] = proposal.Copy(), ["result"] = result.Copy() });
        operation["candidate"] = new JsonObject { [DomainFixtures.Path] = new string('x', 10_000) };
        operation["body"] = new string('y', 10_000);
        operation["prepared_at"] = "2026-10-31T12:00:00Z";
        operation["future_extension"] = "preserved";
        operation["receipts"] = new JsonObject { ["batch"] = batch, ["proposal"] = proposal, ["result"] = result, ["records"] = records };
        JsonObject row = fixture.State.Obj("prs").Obj(fixture.Key);
        row["topic_id"] = fixture.Request.Str("topic_id");
        row["generation"] = 1;
        row["number"] = 1;
        row["status"] = "open";
        row["proposal_records"] = records.Copy();
        fixture.State.Arr("rejections").Add(new JsonObject { ["fingerprint"] = "prior-rejection" });
        fixture.State.Obj("feedback")["comment:kept"] = new JsonObject { ["status"] = "implemented", ["revision"] = "prior-owner-revision" };
        return fixture;
    }

    [Fact]
    public async Task StaleStateWriteIsRejectedWithoutReplacingCurrentEvidence()
    {
        // Arrange
        var api = new CachedStateApi();
        var store = new StateBranchStore(api);
        StateSnapshot stale = await store.ReadAsync();
        stale.State["workload_history"] = new JsonObject { ["unsaved"] = LargeAuditRecord() };
        JsonObject original = api.RemoteState;
        api.Seed("another-worker-head", original, "initial");

        // Act
        Func<Task> write = () => store.WriteAsync(stale.State, stale, "stale write");

        // Assert
        await write.Should().ThrowAsync<Conflict>().WithMessage("*ref changed*");
        api.Head.Should().Be("another-worker-head");
        JsonNode.DeepEquals(api.RemoteState, original).Should().BeTrue();
        stale.State.Obj("workload_history").ContainsKey("unsaved").Should().BeTrue();
        api.Mutations.Should().Be(0);
    }

}
