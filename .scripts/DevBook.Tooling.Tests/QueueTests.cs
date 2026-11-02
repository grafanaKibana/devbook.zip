using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;
using ImprovementQueue = DevBook.Tooling.Improvement.Queue;

namespace DevBook.Tooling.Tests;

public sealed class QueueTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void FeedbackOutranksFlaggedNotesWhichOutrankOrdinaryNewNotes(bool feedback)
    {
        // Arrange
        string flaggedPath = "Vault/Home/Programming/ZZZ/Flagged.md";
        string feedbackPath = "Vault/Home/Programming/YYY/Feedback.md";
        JsonObject state = Core.NewState();
        JsonObject flagged = DomainFixtures.NoteRecord(flaggedPath);
        RepairInputs.Apply(flagged, new HashSet<string> { "stable_1" });
        var notes = new JsonArray(DomainFixtures.NoteRecord(), flagged, DomainFixtures.NoteRecord(feedbackPath));
        if (feedback)
        {
            state.Obj("feedback")["request"] = new JsonObject
            {
                ["status"] = "pending",
                ["topic"] = Core.TopicFor(feedbackPath),
                ["paths"] = new JsonArray(feedbackPath)
            };
        }

        // Act
        JsonObject batch = ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = 1 })!;

        // Assert
        batch.Arr("notes").Should().ContainSingle().Which.Str("path").Should().Be(feedback ? feedbackPath : flaggedPath);
        batch.Arr("notes")[0]!.Str("content").Should().Be(DomainFixtures.Note);
        batch.Str("topic").Should().Be("Programming");
    }

    [Theory]
    [InlineData("unchanged")]
    [InlineData("flags")]
    [InlineData("evaluation")]
    public void ReviewedFlagIsSelectedAgainOnlyWhenItsInputsChange(string change)
    {
        // Arrange
        JsonObject note = DomainFixtures.NoteRecord();
        RepairInputs.Apply(note, new HashSet<string> { "stable_1" });
        JsonObject state = Core.NewState();
        state.Obj("notes")[DomainFixtures.Path] = new JsonObject
        {
            ["content_hash"] = note.Str("hash"),
            ["rules_hash"] = "rules",
            ["outcome"] = "changed",
            ["repair_input_hash"] = change == "flags" ? "old-flags" : note.Str("repair_input_hash"),
            ["evaluation_hash"] = "policy"
        };
        var config = new JsonObject { ["evaluation_hash"] = change == "evaluation" ? "new-policy" : "policy" };

        // Act
        JsonObject? batch = ImprovementQueue.SelectBatch(state, new JsonArray(note), "rules", config);

        // Assert
        if (change == "unchanged")
        {
            batch.Should().BeNull();
        }
        else
        {
            batch!.Arr("notes")[0]!.Str("selection_reason").Should().Be(change == "flags" ? "needs_fixing" : "evaluation_changed");
        }
    }

    [Fact]
    public void NewRepairFlagCannotBypassReviewFreeze()
    {
        // Arrange
        JsonObject note = DomainFixtures.NoteRecord();
        RepairInputs.Apply(note, new HashSet<string> { "stable_1" });
        JsonObject state = Core.SyncPrs(Core.NewState(), new JsonArray(new JsonObject
        {
            ["topic_id"] = Core.TopicId(Core.TopicFor(DomainFixtures.Path)),
            ["generation"] = 1,
            ["number"] = 7,
            ["status"] = "open",
            ["draft"] = true,
            ["review_activity"] = true
        }));

        // Act
        JsonObject? batch = ImprovementQueue.SelectBatch(state, new JsonArray(note), "rules");

        // Assert
        batch.Should().BeNull();
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    public void FeedbackRequestIsPackedAsOneCompletePathScope(int limit)
    {
        // Arrange
        string other = "Vault/Home/Programming/Network/Transport/TCP.md";
        JsonObject state = Core.NewState();
        state.Obj("feedback")["request"] = new JsonObject
        {
            ["status"] = "pending",
            ["topic"] = Core.TopicFor(other),
            ["paths"] = new JsonArray(DomainFixtures.Path, other)
        };
        var notes = new JsonArray(DomainFixtures.NoteRecord(), DomainFixtures.NoteRecord(other));

        // Act
        JsonObject batch = ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = limit })!;

        // Assert
        batch.Arr("feedback").Should().ContainSingle();
        batch.Arr("notes").Count.Should().Be(limit == 2 ? 2 : 0);
    }

    [Fact]
    public void ManualTargetConfigurationIsRejected()
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "selection-" + Guid.NewGuid().ToString("N"));
        var config = new JsonObject { ["target_note"] = DomainFixtures.Path, ["review_focus"] = "An imposed change" };

        // Act
        Action construct = () => new ImprovementEngine(root, config, new MemoryStateStore(Core.NewState()));

        // Assert
        construct.Should().Throw<ArgumentException>().WithMessage("Manual note targeting is not supported*");
    }

}
