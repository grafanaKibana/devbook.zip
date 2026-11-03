using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ProposalTests
{
    [Fact]
    public void SameTargetRewritePreservesItsCompleteProtectedMetadata()
    {
        // Arrange
        var sources = new Dictionary<string, string> { [DomainFixtures.Path] = DomainFixtures.Note };
        JsonObject proposal = DomainFixtures.Proposal(DomainFixtures.Edit());

        // Act
        JsonObject result = Proposal.Apply(sources, proposal);

        // Assert
        result.Obj("sources").Str(DomainFixtures.Path).Should().Contain("<!-- qard-id: stable_1 -->").And.Contain("<!-- qard-source: original -->");
        result.Arr("retired_ids").Should().BeEmpty();
    }

    [Theory]
    [InlineData("hash")]
    [InlineData("path")]
    public void UnsafeEditIsRejectedBeforeChangingItsSource(string invalid)
    {
        // Arrange
        var sources = new Dictionary<string, string> { [DomainFixtures.Path] = DomainFixtures.Note };
        JsonObject edit = DomainFixtures.Edit();
        edit[invalid == "hash" ? "expected_hash" : "path"] = invalid == "hash" ? "stale" : ".github/workflows/devbook-improvement.yml";
        JsonObject proposal = DomainFixtures.Proposal(edit);

        // Act
        Action apply = () => Proposal.Apply(sources, proposal);

        // Assert
        apply.Should().Throw<ProposalException>();
        sources[DomainFixtures.Path].Should().Be(DomainFixtures.Note);
    }

    [Fact]
    public void SplitTargetsCannotBorrowTheRetiredLearningIdentity()
    {
        // Arrange
        JsonObject edit = DomainFixtures.Edit("split", "new", DomainFixtures.Card + "\n> [!qard]- Another target?\n> Another answer.\n");
        var sources = new Dictionary<string, string> { [DomainFixtures.Path] = DomainFixtures.Note };

        // Act
        Action apply = () => Proposal.Apply(sources, DomainFixtures.Proposal(edit));

        // Assert
        apply.Should().Throw<ProposalException>().WithMessage("*ID-less*");
    }

    [Fact]
    public void RejectedEditCannotBeReplayedWithoutVerifiedOwnerReconsideration()
    {
        // Arrange
        JsonObject edit = DomainFixtures.Edit();
        var sources = new Dictionary<string, string> { [DomainFixtures.Path] = DomainFixtures.Note };
        JsonObject result = Proposal.Apply(sources, DomainFixtures.Proposal(edit));
        var rejected = new JsonArray(Core.RejectionTombstone(edit, result));

        // Act
        Action replay = () => Proposal.Apply(sources, DomainFixtures.Proposal(edit), rejected);

        // Assert
        replay.Should().Throw<ProposalException>().WithMessage("*rejected edit*");
    }

    [Fact]
    public void ReviewRejectsMissingOrDuplicatePerEditValueEvidence()
    {
        // Arrange
        var current = new Dictionary<string, string> { [DomainFixtures.Path] = DomainFixtures.Note };
        var cases = new[] { "missing", "duplicate" }.Select(invalid =>
        {
            JsonObject proposal = DomainFixtures.Proposal(DomainFixtures.Edit());
            JsonObject review = DomainFixtures.UnchangedReview(new JsonObject
            {
                ["current"] = new JsonObject { [DomainFixtures.Path] = DomainFixtures.Note },
                ["proposal"] = proposal
            });
            review.Arr("notes")[0]!["target_resolution"] = "RESOLVED";
            JsonArray checks = review.Arr("change_checks");
            if (invalid == "missing") checks.Clear();
            else
            {
                proposal.Arr("edits").Add(proposal.Arr("edits")[0]!.DeepClone());
                checks.Add(checks[0]!.DeepClone());
            }
            return (Proposal: proposal, Review: review);
        }).ToArray();

        // Act
        bool[] results = cases.Select(item => Review.Clean(item.Review, current, item.Proposal, new JsonArray(), new JsonArray())).ToArray();

        // Assert
        results.Should().OnlyContain(clean => !clean);
    }

    [Fact]
    public void LegacySingletonReconsiderationIsAppliedOnceAcrossReceiptReplay()
    {
        // Arrange
        JsonObject state = Core.NewState();
        state.Arr("rejections").Add(new JsonObject { ["fingerprint"] = "rejected-edit" });
        JsonObject receipt = new()
        {
            ["batch"] = new JsonObject { ["notes"] = new JsonArray() },
            ["proposal"] = new JsonObject { ["dispositions"] = new JsonArray() },
            ["result"] = new JsonObject(),
            ["decisions"] = new JsonArray(new JsonObject
            {
                ["decision"] = "reconsider",
                ["fingerprint"] = "rejected-edit",
                ["feedback_key"] = "verified-owner-revision"
            })
        };

        // Act
        JsonObject first = WorkloadReceipts.Apply(state, receipt);
        JsonObject replayed = WorkloadReceipts.Apply(first, receipt);

        // Assert
        replayed.Arr("rejections")[0]!.Arr("reconsidered_by").Strings().Should().Equal("verified-owner-revision");
        replayed.Obj("finalized_note_records").Count.Should().Be(1);
    }

    [Fact]
    public void SourceMustAppearInTheRequiredVisibleContext()
    {
        // Arrange
        const string url = "https://example.com/mechanism";
        string source = DomainFixtures.Note;
        JsonObject edit = DomainFixtures.Edit("note");
        edit["expected_hash"] = LegacyIdentity.Digest(source);
        edit["before"] = "The operating idea has a concrete boundary.";
        edit["after"] = "The operating idea explains the corrected boundary.";
        edit["sources"] = new JsonArray(new JsonObject
        {
            ["url"] = url,
            ["claim"] = "The mechanism has the corrected boundary.",
            ["version"] = "not version-specific"
        });
        var sources = new Dictionary<string, string> { [DomainFixtures.Path] = source };

        // Act
        Action apply = () => Proposal.Apply(sources, DomainFixtures.Proposal(edit));

        // Assert
        apply.Should().Throw<ProposalException>().WithMessage("*source URL missing*");
    }
}
