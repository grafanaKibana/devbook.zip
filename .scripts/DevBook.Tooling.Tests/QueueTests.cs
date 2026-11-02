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
    [InlineData("flags")]
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
    public async Task FlagsAndHeldRepairsCannotBypassReviewFreeze()
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

        string root = Repository.FindRoot();
        string rules = Core.RulesVersion(root);
        state["held_proposals"] = new JsonObject
        {
            [Core.TopicId("Programming")] = new JsonObject
            {
                ["topic_id"] = Core.TopicId("Programming"),
                ["rules_hash"] = rules,
                ["source_hashes"] = new JsonObject { [DomainFixtures.Path] = note.Str("hash") },
                ["repair_inputs"] = new JsonObject { [DomainFixtures.Path] = note.Str("repair_input_hash") },
                ["feedback_keys"] = new JsonArray(),
                ["batch"] = new JsonObject { ["topic"] = "Programming" },
                ["blocked_review"] = new JsonObject
                {
                    ["verdict"] = "CHANGES REQUIRED",
                    ["notes"] = new JsonArray(new JsonObject
                    {
                        ["path"] = DomainFixtures.Path,
                        ["findings"] = new JsonArray(new JsonObject { ["severity"] = "Medium" })
                    })
                }
            }
        };
        JsonObject pending = state.Obj("held_proposals").Obj(Core.TopicId("Programming")).Copy();
        pending["evaluation_hash"] = ClaudeProvider.EvaluationHash(new JsonObject());
        pending["review_repair_key"] = "reserved-repair";
        pending["repair_reserved"] = true;
        pending["author_repair_pending"] = true;
        state["pending_author_proposal"] = pending;
        state["review_repair_attempts"] = new JsonObject { ["reserved-repair"] = 1 };
        var store = new MemoryStateStore(state);
        var engine = new ImprovementEngine(root, new JsonObject(), store, notesLoader: () => new JsonArray(note.Copy(), DomainFixtures.NoteRecord("Vault/Home/Networks/Other.md")));

        // Act
        JsonObject result = await engine.RunAsync();
        JsonObject final = (await store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("selected");
        result.Obj("batch").Str("topic").Should().Be("Networks");
        result.Int("model_calls").Should().Be(0);
        final["pending_author_proposal"].Should().BeNull();
        final.Obj("review_repair_attempts").Int("reserved-repair").Should().Be(1);
    }

    [Fact]
    public void FeedbackSelectionRetainsItsFullScopeWhileEvaluatingOneNote()
    {
        // Arrange
        string other = "Vault/Home/Programming/Network/Transport/TCP.md";
        JsonObject state = Core.NewState();
        state.Obj("feedback")["request"] = new JsonObject
        {
            ["status"] = "pending", ["topic"] = Core.TopicFor(other),
            ["paths"] = new JsonArray(DomainFixtures.Path, other)
        };

        // Act
        JsonObject batch = ImprovementQueue.SelectBatch(state,
            new JsonArray(DomainFixtures.NoteRecord(), DomainFixtures.NoteRecord(other)), "rules", new JsonObject())!;

        // Assert
        batch.Arr("notes").Should().ContainSingle();
        batch.Arr("feedback").Should().ContainSingle().Which.Arr("paths").Strings().Should().Equal(DomainFixtures.Path, other);
    }

    [Theory]
    [InlineData(false)]
    public void EveryOpenManagedTopicIsExcludedFromOrdinarySelection(bool frozen)
    {
        // Arrange
        JsonObject state = Core.NewState();
        state.Obj("prs")["open"] = new JsonObject
        {
            ["topic_id"] = Core.TopicId("Programming"), ["generation"] = 1,
            ["status"] = "open", ["draft"] = true, ["frozen"] = frozen
        };

        // Act
        JsonObject? batch = ImprovementQueue.SelectBatch(state, new JsonArray(DomainFixtures.NoteRecord()), "rules");

        // Assert
        batch.Should().BeNull();
    }

    [Fact]
    public void ThreeOtherOpenTopicsDoNotBlockANewTopic()
    {
        // Arrange
        JsonObject state = Core.NewState();
        foreach (string topic in new[] { "Networks", "Databases", "Algorithms" })
            state.Obj("prs")[topic] = new JsonObject { ["topic_id"] = Core.TopicId(topic), ["status"] = "open", ["draft"] = true };

        // Act
        JsonObject? batch = ImprovementQueue.SelectBatch(state, new JsonArray(DomainFixtures.NoteRecord()), "rules");

        // Assert
        batch.Should().NotBeNull();
        batch!.Str("topic").Should().Be("Programming");
        batch.Arr("notes").Should().ContainSingle();
    }

    [Fact]
    public void LegacyKeepIsReevaluatedOnceAndItsOriginalEvidenceIsArchivedIntact()
    {
        // Arrange
        JsonObject note = DomainFixtures.NoteRecord();
        JsonObject proposal = new() { ["version"] = 1, ["edits"] = new JsonArray(), ["dispositions"] = new JsonArray(new JsonObject
            { ["path"] = DomainFixtures.Path, ["outcome"] = "keep", ["reason"] = "The complete note remains useful." }) };
        JsonObject review = DomainFixtures.UnchangedReview(new JsonObject { ["current"] = new JsonObject { [DomainFixtures.Path] = DomainFixtures.Note } });
        JsonObject batch = new() { ["notes"] = new JsonArray(note.Copy()), ["rules_hash"] = "rules", ["evaluation_hash"] = "policy" };
        JsonObject legacy = Core.RecordOutcome(Core.NewState(), batch, proposal, new JsonObject(), review);
        JsonObject originalEvidence = legacy.Obj("notes").Obj(DomainFixtures.Path).Obj("keep_review").Copy();
        JsonObject focusedBatch = ImprovementQueue.SelectBatch(legacy, new JsonArray(note.Copy()), "rules", new JsonObject { ["evaluation_hash"] = "policy" })!;

        // Act
        JsonObject focused = Core.RecordOutcome(legacy, focusedBatch, proposal, new JsonObject(), review);
        JsonObject? next = ImprovementQueue.SelectBatch(focused, new JsonArray(note.Copy()), "rules", new JsonObject { ["evaluation_hash"] = "policy" });

        // Assert
        focusedBatch.Arr("notes").Should().ContainSingle();
        focusedBatch.Str("review_process").Should().Be(Core.FocusedReviewVersion);
        next.Should().BeNull();
        JsonObject record = focused.Obj("notes").Obj(DomainFixtures.Path);
        JsonNode.DeepEquals(record.Obj("keep_review_history")[LegacyIdentity.Fingerprint(originalEvidence)], originalEvidence).Should().BeTrue();
        record.Obj("keep_review_history").Count.Should().Be(1);
        record.Obj("keep_review").Str("review_process").Should().Be(Core.FocusedReviewVersion);
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
