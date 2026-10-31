using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;
using ExportApi = DevBook.Tooling.Tests.ExportWorkerTests.FakeExportApi;
using ExportFixture = DevBook.Tooling.Tests.ExportWorkerTests.WorkerFixture;

namespace DevBook.Tooling.Tests;

public sealed class ExportCompactionTests
{
    [Fact]
    public async Task VerifiedExportsCompactDuplicatePayloadsAndRemainIdempotentWithTheOriginalRequest()
    {
        // Arrange
        var fixture = ReviewedFixture();
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

        // Arrange: a later retry must use the completed receipt even after PR closure.
        fixture.Api.Pr["state"] = "closed";

        // Act
        JsonObject repeatedPublication = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);
        JsonObject repeatedFinalization = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);
        StateSnapshot retried = await store.ReadAsync();

        // Assert
        repeatedPublication.Str("status").Should().Be("exported");
        repeatedFinalization.Str("commit_sha").Should().Be(ExportApi.GeneratedHead);
        fixture.Api.CommitWrites.Should().Be(1);
        fixture.Api.RefWrites.Should().Be(1);
        retried.State["lease"].Should().BeNull();
    }

    [Theory]
    [InlineData("merged")]
    [InlineData("closed")]
    public async Task MaintenanceReconcilesTerminalPrsAfterTheirExportReceiptsWereCompacted(string status)
    {
        // Arrange
        var fixture = ReviewedFixture();
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
        if (status == "closed")
        {
            reconciled.Arr("rejections").OfType<JsonObject>().Should().Contain(item => item.Str("fingerprint") == LegacyIdentity.Proposal(DomainFixtures.Edit()));
        }
    }

    [Fact]
    public async Task OversizedStateIsRejectedBeforeCreatingAnUnreadableRemoteBlob()
    {
        // Arrange
        JsonObject state = Core.NewState();
        state["oversized_extension"] = new string('x', 24_000_000);
        var api = new StateSizeApi();
        var store = new StateBranchStore(api);

        // Act
        Func<Task> write = () => store.WriteAsync(state, new StateSnapshot(Core.NewState(), "current-state"), "fixture oversized state");

        // Assert
        await write.Should().ThrowAsync<RuntimeFailure>().WithMessage("*readable size limit*");
        api.Mutations.Should().Be(0);
    }

    private static ExportFixture ReviewedFixture()
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

    private sealed class StateSizeApi : IGitHubApi
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
}
