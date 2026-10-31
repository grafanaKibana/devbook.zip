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
        // Arrange
        JsonObject state = Core.NewState();
        JsonObject note = DomainFixtures.NoteRecord();
        var notes = new JsonArray(note.Copy());

        // Act: select an unchecked note.
        JsonObject batch = ImprovementQueue.SelectBatch(state, notes, "rules")!;

        // Assert
        batch.Arr("notes").Single()!.Str("selection_reason").Should().Be("new");

        // Arrange: the current content has been reviewed.
        JsonObject keep = DomainFixtures.Proposal(DomainFixtures.Edit());
        keep["edits"] = new JsonArray();
        keep.Arr("dispositions")[0]!["outcome"] = "keep";

        // Act
        state = Core.RecordOutcome(state, batch, keep, new JsonObject { ["sources"] = new JsonObject() });

        // Assert: a legacy author-only keep needs one independent recheck.
        ImprovementQueue.SelectBatch(state, notes, "rules")!.Arr("notes").Single()!.Str("selection_reason").Should().Be("keep_unverified");
        state.Obj("notes").Obj(DomainFixtures.Path).Str("outcome").Should().Be("keep");

        // Arrange: the independent reviewer supplies current-text evidence.
        JsonObject review = DomainFixtures.UnchangedReview(new JsonObject
        {
            ["current"] = new JsonObject { [DomainFixtures.Path] = DomainFixtures.Note }
        });

        // Act
        state = Core.RecordOutcome(state, batch, keep, new JsonObject { ["sources"] = new JsonObject() }, review);

        // Assert: the verified unchanged version is skipped.
        ImprovementQueue.SelectBatch(state, notes, "rules").Should().BeNull();

        // Arrange: feedback spans two notes in one topic.
        string secondPath = "Vault/Home/Programming/NET/Other.md";
        notes.Add(DomainFixtures.NoteRecord(secondPath));
        notes.Add(DomainFixtures.NoteRecord("Vault/Home/Programming/SQL/New.md"));
        state.RequiredObject("feedback")["request"] = new JsonObject { ["key"] = "request", ["status"] = "pending", ["topic"] = Core.TopicFor(DomainFixtures.Path), ["paths"] = new JsonArray(DomainFixtures.Path, secondPath) };

        // Act
        JsonObject feedbackBatch = ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = 2 })!;

        // Assert
        feedbackBatch.Arr("notes").OfType<JsonObject>().Select(item => item.Str("path")).Should().Equal(DomainFixtures.Path, secondPath);
        feedbackBatch.Arr("feedback").Should().ContainSingle();

        // Act: the complete feedback request exceeds the batch size.
        JsonObject oversized = ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = 1 })!;

        // Assert
        oversized.Arr("notes").Should().BeEmpty();
        oversized.Arr("feedback").Should().ContainSingle();

        // Arrange: the owner has started reviewing the topic PR.
        JsonObject frozenPr = new() { ["topic_id"] = Core.TopicId(Core.TopicFor(DomainFixtures.Path)), ["generation"] = 1, ["number"] = 7, ["status"] = "open", ["draft"] = true, ["review_activity"] = true };

        // Act
        state = Core.SyncPrs(state, new JsonArray(frozenPr));

        // Assert
        ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = 2 })!.Arr("notes").OfType<JsonObject>().Select(item => item.Str("path")).Should().Equal(DomainFixtures.Path, secondPath);

        // Arrange: no feedback remains, even after a rules revision.
        state.RequiredObject("feedback").Clear();
        JsonObject legacyPr = state.Obj("prs").Select(pair => pair.Value).OfType<JsonObject>().Single();
        legacyPr.Remove("topic_id");
        legacyPr["topic"] = Core.TopicFor(DomainFixtures.Path);

        // Act: a reviewed topic stays frozen.
        JsonObject? frozenBatch = ImprovementQueue.SelectBatch(state, new JsonArray(DomainFixtures.NoteRecord(secondPath)), "new-rules");

        // Assert
        frozenBatch.Should().BeNull();
    }

    [Theory]
    [InlineData("five_hour")]
    [InlineData("weekly")]
    [InlineData("unknown")]
    public void Cooldown_keeps_reported_reset_and_quiet_episode_then_resumes(string kind)
    {
        // Arrange
        DateTimeOffset now = DateTimeOffset.Parse("2026-10-30T08:00:00Z");
        DateTimeOffset? reset = kind == "unknown" ? null : now.AddHours(kind == "weekly" ? 80 : 5);

        // Act: record the quota boundary.
        JsonObject state = Core.SetCooldown(Core.NewState(), kind, reset, now);

        // Assert
        Core.CooldownActive(state, now).Should().BeTrue();
        state.Obj("cooldown").Bool("notice_pending").Should().BeTrue();

        // Arrange: the limit episode has already been announced.
        state.Obj("cooldown")["notice_sent"] = true;

        // Act
        JsonObject repeated = Core.SetCooldown(state, kind, reset, now);

        // Assert
        repeated.Obj("cooldown").Bool("notice_pending").Should().BeFalse();
        repeated.Obj("cooldown").Bool("notice_sent").Should().BeTrue();
        Core.CooldownActive(state, reset ?? now.AddHours(24)).Should().BeFalse();
        state.Obj("cooldown").Str("reported_reset_at").Should().Be(reset is null ? "" : Core.FormatTime(reset.Value));
    }
}
