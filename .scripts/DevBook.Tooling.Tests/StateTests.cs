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
        var store = new MemoryStateStore(Core.NewState());
        StateSnapshot stale = await store.ReadAsync();
        await new DurableLease(store, "owner").AcquireAsync();

        // Act
        Func<Task> write = () => store.WriteAsync(stale.State, stale, "stale write");

        // Assert
        await write.Should().ThrowAsync<Conflict>();
        (await store.ReadAsync()).State.Obj("lease").Str("owner").Should().Be("owner");
    }

    [Fact]
    public async Task CompetingLeaseCannotReplaceTheCurrentOwner()
    {
        // Arrange
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "owner").AcquireAsync();

        // Act
        Func<Task> acquire = () => new DurableLease(store, "competitor").AcquireAsync();

        // Assert
        await acquire.Should().ThrowAsync<Conflict>();
    }

    [Fact]
    public async Task CompletingJournalPreservesUnknownAndHistoricalStateFields()
    {
        // Arrange
        JsonObject original = Core.NewState();
        original["unknown_future_field"] = new JsonObject { ["nested"] = "preserved" };
        original["rejections"] = new JsonArray(new JsonObject { ["fingerprint"] = "legacy", ["semantic_fingerprint"] = "still-rejected" });
        original["retired_ids"] = new JsonObject { ["retired"] = "old-target" };
        original["feedback"] = new JsonObject { ["comment:1"] = new JsonObject { ["revision"] = "edited-revision", ["status"] = "implemented" } };
        original["cooldown"] = new JsonObject { ["kind"] = "weekly", ["until"] = "2030-01-01T00:00:00Z" };
        var store = new MemoryStateStore(original);
        var journal = new OperationJournal(store);
        JsonObject operation = await journal.PrepareAsync(new JsonObject { ["topic"] = "net", ["generation"] = 1, ["custom_operation_field"] = "retained" });
        string id = operation.Str("op_id");
        foreach (string phase in Runtime.JournalPhases.Skip(1).SkipLast(1)) await journal.AdvanceAsync(id, phase);

        // Act
        await journal.AdvanceAsync(id, Runtime.JournalPhases.Last(), new JsonObject { ["commit_sha"] = "recorded-head" });
        JsonObject completed = (await store.ReadAsync()).State;

        // Assert
        foreach (string field in new[] { "unknown_future_field", "rejections", "retired_ids", "feedback", "cooldown" })
            JsonNode.DeepEquals(completed[field], original[field]).Should().BeTrue(field + " must survive journal completion");
        completed.Obj("completed_operations").Obj(id).Str("custom_operation_field").Should().Be("retained");
        completed["pending_operation"].Should().BeNull();
    }

    [Fact]
    public void SuccessfulOutcomeRetainsExtensionsAndRecordsExactRepairEvaluationInputs()
    {
        // Arrange
        JsonObject original = Core.NewState();
        original.Obj("notes")[DomainFixtures.Path] = new JsonObject { ["future_extension"] = new JsonArray("retained") };
        JsonObject note = DomainFixtures.NoteRecord();
        note["repair_input_hash"] = "reviewed-flags";
        var batch = new JsonObject { ["notes"] = new JsonArray(note), ["rules_hash"] = "rules", ["evaluation_hash"] = "policy" };
        JsonObject proposal = DomainFixtures.Proposal(DomainFixtures.Edit());
        proposal["edits"] = new JsonArray();
        proposal.Arr("dispositions")[0]!["outcome"] = "keep";
        JsonObject review = DomainFixtures.UnchangedReview(new JsonObject { ["current"] = new JsonObject { [DomainFixtures.Path] = DomainFixtures.Note } });

        // Act
        JsonObject recorded = Core.RecordOutcome(original, batch, proposal, new JsonObject { ["sources"] = new JsonObject() }, review);

        // Assert
        JsonObject outcome = recorded.Obj("notes").Obj(DomainFixtures.Path);
        outcome.Arr("future_extension").Strings().Should().Equal("retained");
        outcome.Str("repair_input_hash").Should().Be("reviewed-flags");
        outcome.Str("evaluation_hash").Should().Be("policy");
        outcome.Obj("keep_review").Str("evaluation_hash").Should().Be("policy");
    }

}
