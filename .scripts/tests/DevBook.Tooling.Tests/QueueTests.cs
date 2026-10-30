using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;
using ImprovementQueue = DevBook.Tooling.Improvement.Queue;

namespace DevBook.Tooling.Tests;

public sealed class QueueTests
{
    [Fact]
    public void Queue_skips_reviewed_versions_and_packs_whole_feedback_requests_before_new_notes()
    {
        JsonObject state = Core.NewState();
        JsonObject note = DomainFixtures.NoteRecord();
        var notes = new JsonArray(note.Copy());
        JsonObject batch = ImprovementQueue.SelectBatch(state, notes, "rules")!;
        batch.Arr("notes").Single()!.Str("selection_reason").Should().Be("new");
        JsonObject keep = DomainFixtures.Proposal(DomainFixtures.Edit());
        keep["edits"] = new JsonArray();
        keep.Arr("dispositions")[0]!["outcome"] = "keep";
        state = Core.RecordOutcome(state, batch, keep, new JsonObject { ["sources"] = new JsonObject() });
        ImprovementQueue.SelectBatch(state, notes, "rules").Should().BeNull();
        string secondPath = "Vault/Home/Programming/NET/Other.md";
        notes.Add(DomainFixtures.NoteRecord(secondPath));
        notes.Add(DomainFixtures.NoteRecord("Vault/Home/Programming/SQL/New.md"));
        state.RequiredObject("feedback")["request"] = new JsonObject { ["key"] = "request", ["status"] = "pending", ["topic"] = Core.TopicFor(DomainFixtures.Path), ["paths"] = new JsonArray(DomainFixtures.Path, secondPath) };
        JsonObject feedbackBatch = ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = 2 })!;
        feedbackBatch.Arr("notes").OfType<JsonObject>().Select(item => item.Str("path")).Should().Equal(DomainFixtures.Path, secondPath);
        feedbackBatch.Arr("feedback").Should().ContainSingle();
        JsonObject oversized = ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = 1 })!;
        oversized.Arr("notes").Should().BeEmpty();
        oversized.Arr("feedback").Should().ContainSingle();
        JsonObject frozenPr = new() { ["topic_id"] = Core.TopicId(Core.TopicFor(DomainFixtures.Path)), ["generation"] = 1, ["number"] = 7, ["status"] = "open", ["draft"] = true, ["review_activity"] = true };
        state = Core.SyncPrs(state, new JsonArray(frozenPr));
        ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = 2 })!.Arr("notes").OfType<JsonObject>().Select(item => item.Str("path")).Should().Equal(DomainFixtures.Path, secondPath);
        state.RequiredObject("feedback").Clear();
        JsonObject legacyPr = state.Obj("prs").Select(pair => pair.Value).OfType<JsonObject>().Single();
        legacyPr.Remove("topic_id");
        legacyPr["topic"] = Core.TopicFor(DomainFixtures.Path);
        ImprovementQueue.SelectBatch(state, new JsonArray(DomainFixtures.NoteRecord(secondPath)), "new-rules").Should().BeNull();
    }

    [Theory]
    [InlineData("five_hour")]
    [InlineData("weekly")]
    [InlineData("unknown")]
    public void Cooldown_keeps_reported_reset_and_quiet_episode_then_resumes(string kind)
    {
        DateTimeOffset now = DateTimeOffset.Parse("2026-10-30T08:00:00Z");
        DateTimeOffset? reset = kind == "unknown" ? null : now.AddHours(kind == "weekly" ? 80 : 5);
        JsonObject state = Core.SetCooldown(Core.NewState(), kind, reset, now);
        Core.CooldownActive(state, now).Should().BeTrue();
        state.Obj("cooldown").Bool("notice_pending").Should().BeTrue();
        state.Obj("cooldown")["notice_sent"] = true;
        JsonObject repeated = Core.SetCooldown(state, kind, reset, now);
        repeated.Obj("cooldown").Bool("notice_pending").Should().BeFalse();
        repeated.Obj("cooldown").Bool("notice_sent").Should().BeTrue();
        Core.CooldownActive(state, reset ?? now.AddHours(24)).Should().BeFalse();
        state.Obj("cooldown").Str("reported_reset_at").Should().Be(reset is null ? "" : Core.FormatTime(reset.Value));
    }
}
