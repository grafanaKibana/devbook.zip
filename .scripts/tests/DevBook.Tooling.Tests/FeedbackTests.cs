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
        JsonArray first = Feedback.Normalize(new JsonArray(ordinary.Copy(), Comment(8, 999)), new JsonArray(Comment(2, 42, "inline")), new JsonArray(Comment(3, 42, "review")), allowlist, [RuntimeFixtures.NotePath]);
        first.Should().HaveCount(3);
        Feedback.Normalize(new JsonArray(ordinary.Copy()), new JsonArray(), new JsonArray(), allowlist, [RuntimeFixtures.NotePath])[0]!.Str("revision")
            .Should().Be(first.OfType<JsonObject>().Single(item => item.Str("kind") == "comment").Str("revision"));
        ordinary["body"] = "Revised feedback: explain the exception too.";
        JsonArray edited = Feedback.Normalize(new JsonArray(ordinary), new JsonArray(), new JsonArray(), allowlist, [RuntimeFixtures.NotePath]);
        edited[0]!.Str("key").Should().NotBe(first.OfType<JsonObject>().Single(item => item.Str("kind") == "comment").Str("key"));
        Feedback.ShouldFreeze(new JsonObject { ["draft"] = true }, first).Should().BeTrue();
        var edit = new JsonObject { ["path"] = RuntimeFixtures.NotePath, ["feedback_keys"] = new JsonArray(edited[0]!.Str("key")) };
        Action permitted = () => Feedback.ValidateFrozenEdits(new JsonArray(edit.Copy()), edited);
        permitted.Should().NotThrow();
        edit["path"] = "Vault/Home/Other/Unrelated.md";
        Action unrelated = () => Feedback.ValidateFrozenEdits(new JsonArray(edit), edited);
        unrelated.Should().Throw<UnsafeInput>();
        string original = "Owner's introduction.\n\n<!-- devbook-improvement:start topic=net -->\nOld summary\n<!-- devbook-improvement:end -->\n\nOwner's closing text.\n";
        string proposed = "<!-- devbook-improvement:start topic=net -->\nCumulative new summary\n<!-- devbook-improvement:end -->\n";
        Runtime.MergeManagedSection(original, proposed, "net").Should().Be(original.Replace("Old summary", "Cumulative new summary", StringComparison.Ordinal));
    }
}
