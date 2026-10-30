using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class StateTests
{
    [Fact]
    public async Task Durable_state_preserves_legacy_fields_and_serializes_lease_and_journal_writes()
    {
        JsonObject original = Core.NewState();
        original["unknown_future_field"] = new JsonObject { ["nested"] = "preserved" };
        original["rejections"] = new JsonArray(new JsonObject { ["fingerprint"] = "legacy", ["semantic_fingerprint"] = "still-rejected" });
        original["feedback"] = new JsonObject { ["comment:1:old"] = new JsonObject { ["revision"] = "edited-revision", ["status"] = "implemented" } };
        original["cooldown"] = new JsonObject { ["kind"] = "weekly", ["until"] = "2030-01-01T00:00:00Z" };
        original.RequiredObject("notes")[DomainFixtures.Path] = new JsonObject
        {
            ["content_hash"] = "previous-version",
            ["unknown_note_extension"] = new JsonObject { ["nested"] = new JsonArray("preserved", new JsonObject { ["future"] = true }) }
        };
        var store = new MemoryStateStore(original);
        StateSnapshot stale = await store.ReadAsync();
        var lease = new DurableLease(store, "first");
        await lease.AcquireAsync();
        Func<Task> competingLease = async () => await new DurableLease(store, "second").AcquireAsync();
        await competingLease.Should().ThrowAsync<Conflict>();
        Func<Task> staleWrite = async () => await store.WriteAsync(stale.State, stale, "stale");
        await staleWrite.Should().ThrowAsync<Conflict>();

        var journal = new OperationJournal(store);
        JsonObject operation = await journal.PrepareAsync(new JsonObject { ["topic"] = "net", ["generation"] = 1, ["custom_operation_field"] = "retained" });
        string id = operation.Str("op_id");
        foreach (string phase in Runtime.JournalPhases.Skip(1))
        {
            await journal.AdvanceAsync(id, phase, new JsonObject { ["commit_sha"] = "recorded-head" });
        }
        StateSnapshot finished = await store.ReadAsync();
        finished.State["unknown_future_field"]!.ToJsonString().Should().Be(original["unknown_future_field"]!.ToJsonString());
        JsonNode.DeepEquals(finished.State["rejections"], original["rejections"]).Should().BeTrue();
        JsonNode.DeepEquals(finished.State["feedback"], original["feedback"]).Should().BeTrue();
        JsonNode.DeepEquals(finished.State["cooldown"], original["cooldown"]).Should().BeTrue();
        finished.State.Obj("completed_operations").Obj(id).Str("custom_operation_field").Should().Be("retained");
        finished.State["pending_operation"].Should().BeNull();
        JsonObject keep = DomainFixtures.Proposal(DomainFixtures.Edit());
        keep["edits"] = new JsonArray();
        keep.Arr("dispositions")[0]!["outcome"] = "keep";
        JsonObject recorded = Core.RecordOutcome(finished.State,
            new JsonObject { ["notes"] = new JsonArray(DomainFixtures.NoteRecord()), ["rules_hash"] = "current-rules" },
            keep, new JsonObject { ["sources"] = new JsonObject() });
        JsonNode.DeepEquals(recorded.Obj("notes").Obj(DomainFixtures.Path)["unknown_note_extension"],
            original.Obj("notes").Obj(DomainFixtures.Path)["unknown_note_extension"]).Should().BeTrue();
        recorded.Obj("notes").Obj(DomainFixtures.Path).Str("content_hash").Should().Be(LegacyIdentity.Digest(DomainFixtures.Note));
        recorded.Obj("notes").Obj(DomainFixtures.Path).Str("rules_hash").Should().Be("current-rules");
        await store.WriteAsync(recorded, finished, "record reviewed note without dropping extensions");
        string topic = Core.TopicId(Core.TopicFor(DomainFixtures.Path));
        var sizedPrs = new JsonArray(new JsonObject
        {
            ["topic_id"] = topic,
            ["generation"] = 1,
            ["number"] = 1,
            ["status"] = "open",
            ["draft"] = true,
            ["note_count"] = 16,
            ["changed_lines"] = 1200
        });
        Core.SyncPrs(Core.NewState(), sizedPrs).Obj("prs").Obj($"{topic}:1").Bool("frozen").Should().BeTrue();
        Core.SyncPrs(Core.NewState(), sizedPrs, new JsonObject { ["max_pr_notes"] = 32, ["max_pr_lines"] = 2400 })
            .Obj("prs").Obj($"{topic}:1").Bool("frozen").Should().BeFalse();
        await lease.ReleaseAsync();
        await new DurableLease(store, "second").AcquireAsync();
    }
}
