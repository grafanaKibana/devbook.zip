using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class FeedbackTests
{
    [Fact]
    public void Owner_feedback_is_revision_aware_consolidated_and_path_scoped_for_frozen_prs()
    {
        // Arrange
        JsonObject Comment(int id, int author, string kind = "comment") => new()
        {
            ["id"] = id,
            ["body"] = "Clarify the boundary, not the supplied answer.",
            ["updated_at"] = "2026-10-30T12:00:00Z",
            ["user"] = new JsonObject { ["id"] = author, ["login"] = "Owner" },
            ["path"] = kind == "inline" ? RuntimeFixtures.NotePath : null
        };
        var allowlist = new JsonArray(new JsonObject { ["id"] = 42, ["login"] = "owner" });
        JsonObject ordinary = Comment(1, 42);

        // Act: collect only verified owner feedback.
        JsonArray first = Feedback.Normalize(new JsonArray(ordinary.Copy(), Comment(8, 999)), new JsonArray(Comment(2, 42, "inline")), new JsonArray(Comment(3, 42, "review")), allowlist, [RuntimeFixtures.NotePath]);

        // Assert
        first.Should().HaveCount(3);
        Feedback.Normalize(new JsonArray(ordinary.Copy()), new JsonArray(), new JsonArray(), allowlist, [RuntimeFixtures.NotePath])[0]!.Str("revision")
            .Should().Be(first.OfType<JsonObject>().Single(item => item.Str("kind") == "comment").Str("revision"));

        // Arrange: the owner edits an existing comment.
        ordinary["body"] = "Revised feedback: explain the exception too.";

        // Act
        JsonArray edited = Feedback.Normalize(new JsonArray(ordinary), new JsonArray(), new JsonArray(), allowlist, [RuntimeFixtures.NotePath]);

        // Assert
        edited[0]!.Str("key").Should().NotBe(first.OfType<JsonObject>().Single(item => item.Str("kind") == "comment").Str("key"));
        Feedback.ShouldFreeze(new JsonObject { ["draft"] = true }, first).Should().BeTrue();

        // Arrange: a feedback-scoped edit on a frozen PR.
        var edit = new JsonObject { ["path"] = RuntimeFixtures.NotePath, ["feedback_keys"] = new JsonArray(edited[0]!.Str("key")) };

        // Act
        Action permitted = () => Feedback.ValidateFrozenEdits(new JsonArray(edit.Copy()), edited);

        // Assert
        permitted.Should().NotThrow();

        // Arrange: an unrelated edit on the frozen PR.
        edit["path"] = "Vault/Home/Other/Unrelated.md";

        // Act
        Action unrelated = () => Feedback.ValidateFrozenEdits(new JsonArray(edit), edited);

        // Assert
        unrelated.Should().Throw<UnsafeInput>();

        // Arrange: human text outside the managed section.
        string original = "Owner's introduction.\n\n<!-- devbook-improvement:start topic=net -->\nOld summary\n<!-- devbook-improvement:end -->\n\nOwner's closing text.\n";
        string proposed = "<!-- devbook-improvement:start topic=net -->\nCumulative new summary\n<!-- devbook-improvement:end -->\n";

        // Act: replace only the managed text.
        string mergedBody = Runtime.MergeManagedSection(original, proposed, "net");

        // Assert
        mergedBody.Should().Be(original.Replace("Old summary", "Cumulative new summary", StringComparison.Ordinal));
    }
}
