using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;
using ImprovementQueue = DevBook.Tooling.Improvement.Queue;

namespace DevBook.Tooling.Tests;

public sealed class TargetedSelectionTests
{
    [Fact]
    public void TargetedRecheckPreservesHistoryAndFreezeWhileSelectingOnlyRequestedNote()
    {
        // Arrange
        JsonObject state = Core.NewState();
        JsonObject target = DomainFixtures.NoteRecord();
        string otherPath = "Vault/Home/Programming/SQL/Other.md";
        var notes = new JsonArray(target.Copy(), DomainFixtures.NoteRecord(otherPath));
        JsonObject review = DomainFixtures.UnchangedReview(new JsonObject
        {
            ["current"] = new JsonObject { [DomainFixtures.Path] = target.Str("content") }
        });
        state.RequiredObject("notes")[DomainFixtures.Path] = new JsonObject
        {
            ["content_hash"] = target.Str("hash"),
            ["rules_hash"] = "rules",
            ["outcome"] = "keep",
            ["keep_review"] = new JsonObject
            {
                ["content_hash"] = target.Str("hash"),
                ["rules_hash"] = "rules",
                ["review"] = review.Arr("notes")[0]!.DeepClone()
            }
        };
        state.RequiredArray("rejections").Add(new JsonObject { ["fingerprint"] = "protected-rejection" });
        state.RequiredObject("feedback")["other"] = new JsonObject
        {
            ["status"] = "pending",
            ["topic"] = Core.TopicFor(otherPath),
            ["paths"] = new JsonArray(otherPath)
        };
        JsonObject original = state.Copy();
        var config = new JsonObject { ["target_note"] = DomainFixtures.Path, ["review_focus"] = "Check the mechanism against its source." };

        // Act
        (JsonObject selection, JsonArray scopedNotes) = ManualSelection.Apply(state, notes, config);
        JsonObject batch = ImprovementQueue.SelectBatch(selection, scopedNotes, "rules", config)!;

        // Assert
        Review.VerifiedKeep(original.Obj("notes").Obj(DomainFixtures.Path).Obj("keep_review"), DomainFixtures.Path, target.Str("content"), "rules").Should().BeTrue();
        batch.Arr("notes").Should().ContainSingle().Which.Str("path").Should().Be(DomainFixtures.Path);
        batch.Arr("feedback").Should().BeEmpty();
        JsonNode.DeepEquals(state, original).Should().BeTrue();
        JsonNode.DeepEquals(selection["rejections"], state["rejections"]).Should().BeTrue();
        state.Obj("feedback").Obj("other").Str("status").Should().Be("pending");

        // Arrange: owner review already froze the topic PR.
        state.RequiredObject("prs")["topic:1"] = new JsonObject
        {
            ["topic_id"] = Core.TopicId(Core.TopicFor(DomainFixtures.Path)),
            ["status"] = "open",
            ["number"] = 7,
            ["frozen"] = true
        };

        // Act
        (selection, scopedNotes) = ManualSelection.Apply(state, notes, config);
        JsonObject? frozen = ImprovementQueue.SelectBatch(selection, scopedNotes, "rules", config);

        // Assert
        frozen.Should().BeNull();
        state.Obj("prs").Obj("topic:1").Bool("frozen").Should().BeTrue();
    }

    [Fact]
    public void LiveTargetRequiresManualDispatchAndMatchingAllowlistedIdentity()
    {
        // Arrange
        var config = new JsonObject
        {
            ["target_note"] = DomainFixtures.Path,
            ["owner_allowlist"] = RuntimeFixtures.Allowlist()
        };
        var environment = new Dictionary<string, string>
        {
            ["GITHUB_EVENT_NAME"] = "workflow_dispatch",
            ["GITHUB_ACTOR_ID"] = "42",
            ["GITHUB_ACTOR"] = "owner",
            ["GITHUB_TRIGGERING_ACTOR"] = "owner"
        };

        // Act
        Exception? error = Record.Exception(() => ManualSelection.RequireManualOwner(config, environment));

        // Assert
        error.Should().BeNull();

        // Arrange: a schedule or mismatched account cannot request targeted rechecks.
        environment["GITHUB_EVENT_NAME"] = "schedule";

        // Act
        error = Record.Exception(() => ManualSelection.RequireManualOwner(config, environment));

        // Assert
        error.Should().BeOfType<ProductionGate>();

        // Arrange
        environment["GITHUB_EVENT_NAME"] = "workflow_dispatch";
        environment["GITHUB_ACTOR_ID"] = "999";

        // Act
        error = Record.Exception(() => ManualSelection.RequireManualOwner(config, environment));

        // Assert
        error.Should().BeOfType<ProductionGate>();
    }
}
