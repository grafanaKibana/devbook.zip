using DevBook.Tooling.Export;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using ExportApi = DevBook.Tooling.Tests.ExportWorkerTests.FakeExportApi;
using ExportFixture = DevBook.Tooling.Tests.ExportWorkerTests.WorkerFixture;
using FluentAssertions;
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
        var store = new MemoryStateStore(fixture.State);
        JsonObject originalOperation = fixture.State.Obj("export_operations").Obj(fixture.Request.Str("op_id"));
        JsonArray openPrRecords = fixture.State.Obj("prs").Obj(fixture.Key).Arr("proposal_records").Copy();
        string receiptHash = LegacyIdentity.Fingerprint(originalOperation["receipts"]);

        // Act
        JsonObject published = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);
        StateSnapshot finalized = await store.ReadAsync();
        JsonObject compact = finalized.State.Obj("export_operations").Obj(fixture.Request.Str("op_id"));

        // Assert
        published.Str("status").Should().Be("exported");
        compact.Bool("compacted").Should().BeTrue();
        compact["candidate"].Should().BeNull();
        compact["body"].Should().BeNull();
        compact["receipts"].Should().BeNull();
        compact.Str("receipt_hash").Should().Be(receiptHash);
        compact.Int("receipt_record_count").Should().Be(1);
        compact.Str("prepared_at").Should().Be(originalOperation.Str("prepared_at"));
        compact.Str("future_extension").Should().Be("preserved");
        compact.Obj("evidence").Str("export_verified_head").Should().Be(ExportApi.GeneratedHead);
        JsonNode.DeepEquals(compact.Obj("evidence")["export_request"], fixture.Request).Should().BeTrue();
        JsonNode.DeepEquals(finalized.State.Obj("prs").Obj(fixture.Key)["proposal_records"], openPrRecords).Should().BeTrue();
        finalized.State.Obj("feedback").Obj("comment:kept").Str("status").Should().Be("implemented");
        finalized.State.Arr("rejections").Should().ContainSingle();
    }

    [Fact]
    public async Task MaintenanceReconcilesTerminalPrsAfterTheirExportReceiptsWereCompacted()
    {
        // Arrange
        const string status = "merged";

        var fixture = ExportCompactionReviewedFixture();
        fixture.Api.ChecksReady = true;
        var store = new MemoryStateStore(fixture.State);
        await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);
        StateSnapshot snapshot = await store.ReadAsync();
        snapshot.State["cooldown"] = null;
        await store.WriteAsync(snapshot.State, snapshot, "fixture resume maintenance");
        fixture.Api.Pr["state"] = "closed";
        fixture.Api.Pr["merged"] = status == "merged";
        var publisher = new GitHubRuntime(fixture.Api, store, activation: () => { });
        var engine = new ImprovementEngine(Repository.FindRoot(), fixture.Config, store, api: fixture.Api, publisher: publisher,
            notesLoader: () => new JsonArray(DomainFixtures.NoteRecord()), snapshotShaLoader: () => ExportApi.MainHead);

        // Act
        await engine.RunAsync();
        JsonObject reconciled = (await store.ReadAsync()).State;
        JsonObject terminalPr = reconciled.Obj("prs").Obj(fixture.Key);

        // Assert
        terminalPr.Str("status").Should().Be(status);
        terminalPr["proposal_records"].Should().BeNull();
        terminalPr.Obj("terminal_audit").Int("record_count").Should().Be(1);
        reconciled.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Bool("compacted").Should().BeTrue();
        reconciled.Obj("feedback").Obj("comment:kept").Str("status").Should().Be("implemented");
        fixture.Api.CommitWrites.Should().Be(1);

    }

    [Fact]
    public async Task OversizedStateIsRejectedBeforeCreatingAnUnreadableRemoteBlob()
    {
        // Arrange
        JsonObject state = Core.NewState();
        state["oversized_extension"] = new string('x', 24_000_000);
        var api = new ExportCompactionStateSizeApi();
        var store = new StateBranchStore(api);

        // Act
        Func<Task> write = () => store.WriteAsync(state, new StateSnapshot(Core.NewState(), "current-state"), "fixture oversized state");

        // Assert
        await write.Should().ThrowAsync<RuntimeFailure>().WithMessage("*readable size limit*");
        api.Mutations.Should().Be(0);
    }

    [Theory]
    [InlineData("unchanged")]
    [InlineData("changed")]
    [InlineData("missing")]
    [InlineData("applied-with-lost-response")]
    public async Task CachedReadReturnsTheCurrentRemoteStateWithoutSharingCallerData(string scenario)
    {
        // Arrange
        var api = new CachedStateApi();
        var store = new StateBranchStore(api);
        StateSnapshot first = await store.ReadAsync();
        first.State["version"] = 99;
        first.State.Obj("notes")["caller-only"] = new JsonObject();
        string? expectedRef = "initial";
        string? expectedBlob = "initial-blob";
        string expectedMarker = "initial";
        int expectedBlobReads = 1;
        int expectedRefReads = 2;
        if (scenario == "changed")
        {
            api.Head = expectedRef = "changed";
            expectedBlob = "changed-blob";
            expectedMarker = "changed";
            expectedBlobReads = 2;
        }
        else if (scenario == "missing")
        {
            api.Head = expectedRef = expectedBlob = null;
            expectedMarker = "";
        }
        else if (scenario == "applied-with-lost-response")
        {
            api.LosePatchResponse = true;
            JsonObject update = Core.NewState();
            update["marker"] = "applied";
            Exception? failure = await Record.ExceptionAsync(() => store.WriteAsync(update,
                new StateSnapshot(Core.NewState(), "initial"), "fixture ambiguous response"));
            failure.Should().BeOfType<GitHubApiFailure>();
            update["marker"] = "caller mutation";
            expectedRef = "written";
            expectedBlob = "written-blob";
            expectedMarker = "applied";
            expectedBlobReads = 2;
            expectedRefReads = 3;
        }

        // Act
        StateSnapshot current = await store.ReadAsync();

        // Assert
        current.RefSha.Should().Be(expectedRef);
        current.BlobSha.Should().Be(expectedBlob);
        current.State.Str("marker").Should().Be(expectedMarker);
        current.State.Obj("notes").Count.Should().Be(0);
        current.State.Int("version").Should().Be(scenario == "missing" ? 0 : 1);
        api.StateReads.Should().Be(expectedBlobReads);
        api.RefReads.Should().Be(expectedRefReads);
        current.State["marker"] = "returned snapshot mutation";
        api.RemoteState.Str("marker").Should().Be(scenario == "applied-with-lost-response" ? "applied" : "initial");
    }

    [Fact]
    public async Task StateWriteFreezesCallerInputBeforeItsFirstAwait()
    {
        // Arrange
        var api = new CachedStateApi();
        var store = new StateBranchStore(api);
        StateSnapshot snapshot = await store.ReadAsync();
        JsonObject input = snapshot.State.Copy();
        input["frozen_extension"] = new JsonObject { ["nested"] = "before" };
        api.BeforeRefResponse = () => input.Obj("frozen_extension")["nested"] = "after";

        // Act
        StateSnapshot written = await store.WriteAsync(input, snapshot, "fixture frozen state");

        // Assert
        written.State.Obj("frozen_extension").Str("nested").Should().Be("before");
        api.WrittenState!.Obj("frozen_extension").Str("nested").Should().Be("before");
        input.Obj("frozen_extension").Str("nested").Should().Be("after");
        api.Patches.Should().Be(1);
    }

    private sealed class CachedStateApi : IGitHubApi
    {
        public string Repo => "owner/state";
        public string? Head { get; set; } = "initial";
        public int RefReads { get; private set; }
        public int StateReads { get; private set; }
        public int Patches { get; private set; }
        public int Mutations { get; private set; }
        public bool LosePatchResponse { get; set; }
        public Action? BeforeRefResponse { get; set; }
        public JsonObject? WrittenState { get; private set; }
        public JsonObject RemoteState { get; private set; } = InitialState();

        private static JsonObject InitialState()
        {
            JsonObject state = Core.NewState();
            state["marker"] = "initial";
            return state;
        }

        public async Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            if (method != "GET") Mutations++;
            if (method == "GET" && path.StartsWith("/git/ref/", StringComparison.Ordinal))
            {
                RefReads++;
                await Task.Yield();
                BeforeRefResponse?.Invoke();
                if (Head is null) throw new GitHubApiFailure("missing", 404);
                return new JsonObject { ["object"] = new JsonObject { ["sha"] = Head } };
            }
            if (method == "GET" && path.StartsWith("/git/commits/", StringComparison.Ordinal))
            {
                return new JsonObject { ["tree"] = new JsonObject { ["sha"] = path.Split('/').Last() } };
            }
            if (method == "GET" && path.StartsWith("/git/trees/", StringComparison.Ordinal))
            {
                string tree = path.Split('/').Last().Split('?')[0];
                return new JsonObject
                {
                    ["truncated"] = false,
                    ["tree"] = new JsonArray(new JsonObject
                    { ["path"] = Runtime.StatePath, ["type"] = "blob", ["mode"] = "100644", ["sha"] = tree + "-blob" })
                };
            }
            if (method == "GET" && path.StartsWith("/git/blobs/", StringComparison.Ordinal))
            {
                StateReads++;
                JsonObject state = RemoteState.Copy();
                if (path.EndsWith("changed-blob", StringComparison.Ordinal)) state["marker"] = "changed";
                return new JsonObject { ["encoding"] = "base64", ["content"] = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(state.ToJsonString())) };
            }
            if (method == "POST" && path == "/git/blobs")
            {
                WrittenState = JsonNode.Parse(Convert.FromBase64String(payload.Str("content")))!.AsObject();
                return new JsonObject { ["sha"] = "written-blob" };
            }
            if (method == "PATCH")
            {
                Patches++;
                Head = payload.Str("sha");
                RemoteState = WrittenState!.Copy();
                if (LosePatchResponse) throw new GitHubApiFailure("Response lost after ref update.");
            }
            return new JsonObject { ["sha"] = "written" };
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

    private sealed class ExportCompactionStateSizeApi : IGitHubApi
    {
        public string Repo => "owner/state-size";
        public int Mutations { get; private set; }

        public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            if (method != "GET")
            {
                Mutations++;
                throw new InvalidOperationException("Oversized state reached a remote mutation.");
            }
            JsonNode response = path.StartsWith("/git/ref/", StringComparison.Ordinal)
                ? new JsonObject { ["object"] = new JsonObject { ["sha"] = "current-state" } }
                : new JsonObject { ["tree"] = new JsonObject { ["sha"] = "current-tree" } };
            return Task.FromResult<JsonNode?>(response);
        }

        public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("No GraphQL mutation expected.");
    }
    [Fact]
    public async Task StaleStateWriteIsRejectedWithoutReplacingCurrentEvidence()
    {
        // Arrange
        var api = new CachedStateApi();
        var store = new StateBranchStore(api);
        StateSnapshot stale = await store.ReadAsync();
        api.Head = "another-worker-head";

        // Act
        Func<Task> write = () => store.WriteAsync(stale.State, stale, "stale write");

        // Assert
        await write.Should().ThrowAsync<Conflict>().WithMessage("*ref changed*");
        api.Head.Should().Be("another-worker-head");
        api.RemoteState.Str("marker").Should().Be("initial");
        api.Mutations.Should().Be(0);
    }

}
