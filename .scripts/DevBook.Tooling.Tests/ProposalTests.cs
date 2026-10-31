using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ProposalTests
{
    [Theory]
    [InlineData("\n")]
    [InlineData("\r\n")]
    public void CompleteCardAnchorMayOmitItsTerminalNewlineWithoutChangingSeparatorsOrRestoration(string newline)
    {
        // Arrange
        string nextCard = "\n<!-- qard-id: next_2 -->\n> [!qard]- What follows?\n> Another target.\n";
        string source = (DomainFixtures.Note + nextCard).Replace("\n", newline);
        JsonObject edit = DomainFixtures.Edit();
        edit["expected_hash"] = LegacyIdentity.Digest(source);
        edit["before"] = DomainFixtures.Card.TrimEnd('\n').Replace("\n", newline);
        edit["after"] = edit.Str("before").Replace("The original answer.", "The corrected answer.");
        Dictionary<string, string> sources = new() { [DomainFixtures.Path] = source };

        // Act
        JsonObject result = Proposal.Apply(sources, DomainFixtures.Proposal(edit));
        string candidate = result.Obj("sources").Str(DomainFixtures.Path);

        // Assert
        candidate.Should().Be(source.Replace("The original answer.", "The corrected answer."));
        Proposal.Ids(candidate).Should().Equal("stable_1", "next_2");

        // Arrange: the owner rejects the accepted rewrite.
        JsonObject keep = DomainFixtures.Proposal(edit);
        keep["edits"] = new JsonArray();
        JsonArray actions = new(new JsonObject { ["decision"] = "reject", ["edit"] = edit.Copy(), ["feedback_key"] = "comment:1", ["reason"] = "Restore original wording." });

        // Act
        Proposal.RestoreRejected(keep, result, actions, new Dictionary<string, string> { [DomainFixtures.Path] = candidate });

        // Assert
        result.Obj("sources").Str(DomainFixtures.Path).Should().Be(source);

        // Arrange: incomplete content or omitted protected metadata is still unsafe.
        foreach (string incomplete in new[] { edit.Str("before")[..^1], edit.Str("before")[(edit.Str("before").IndexOf("> [!qard]", StringComparison.Ordinal))..] })
        {
            JsonObject partial = edit.Copy();
            partial["before"] = incomplete;

            // Act
            Action apply = () => Proposal.Apply(sources, DomainFixtures.Proposal(partial));

            // Assert
            apply.Should().Throw<ProposalException>().WithMessage("*complete active Qard block*");
        }
    }

    [Fact]
    public void Guarded_rewrite_preserves_identity_metadata_and_rejects_stale_or_forbidden_writes()
    {
        // Arrange
        Dictionary<string, string> sources = new() { [DomainFixtures.Path] = DomainFixtures.Note };
        JsonObject edit = DomainFixtures.Edit();
        JsonObject proposal = DomainFixtures.Proposal(edit);

        // Act
        JsonObject result = Proposal.Apply(sources, proposal);

        // Assert
        result.Obj("sources").Str(DomainFixtures.Path).Should().Contain("<!-- qard-id: stable_1 -->");
        result.Obj("sources").Str(DomainFixtures.Path).Should().Contain("<!-- qard-source: original -->");
        result.Arr("retired_ids").Should().BeEmpty();

        // Arrange: a stale expected source hash.
        JsonObject stale = proposal.Copy();
        stale.Arr("edits")[0]!["expected_hash"] = "stale";

        // Act
        Action staleApply = () => Proposal.Apply(sources, stale);

        // Assert
        staleApply.Should().Throw<ProposalException>().WithMessage("*CAS conflict*");

        // Arrange: an edit outside authorable notes.
        JsonObject forbidden = proposal.Copy();
        forbidden.Arr("edits")[0]!["path"] = ".github/workflows/devbook-improvement.yml";
        forbidden.Arr("dispositions")[0]!["path"] = ".github/workflows/devbook-improvement.yml";

        // Act
        Action unsafeApply = () => Proposal.Apply(sources, forbidden);

        // Assert
        unsafeApply.Should().Throw<ProposalException>();
        sources[DomainFixtures.Path].Should().Be(DomainFixtures.Note);
    }

    [Fact]
    public void New_targets_are_idless_and_rejected_changes_require_fingerprint_specific_owner_reconsideration()
    {
        // Arrange
        Dictionary<string, string> sources = new() { [DomainFixtures.Path] = DomainFixtures.Note };
        string children = "<!-- qard-source: original -->\n> [!qard]- Which input matters?\n> The supplied input.\n\n<!-- qard-source: original -->\n> [!qard]- Which boundary matters?\n> The stated boundary.\n";
        JsonObject edit = DomainFixtures.Edit("split", "new", children);
        JsonObject proposal = DomainFixtures.Proposal(edit);

        // Act
        JsonObject result = Proposal.Apply(sources, proposal);

        // Assert
        result.Arr("retired_ids").Strings().Should().Equal("stable_1");
        Proposal.Ids(result.Obj("sources").Str(DomainFixtures.Path)).Should().BeEmpty();

        // Arrange: split children borrowing the retired identity.
        JsonObject borrowedIdentity = proposal.Copy();
        borrowedIdentity.Arr("edits")[0]!["after"] = "<!-- qard-id: stable_1 -->\n" + children;

        // Act
        Action borrowedApply = () => Proposal.Apply(sources, borrowedIdentity);

        // Assert
        borrowedApply.Should().Throw<ProposalException>().WithMessage("*ID-less*");

        // Arrange: the owner previously rejected the proposal.
        JsonObject tombstone = Core.RejectionTombstone(edit, result);
        var rejected = new JsonArray(tombstone);

        // Act
        Action replay = () => Proposal.Apply(sources, proposal, rejected);

        // Assert
        replay.Should().Throw<ProposalException>().WithMessage("*rejected edit*");

        // Arrange: verified feedback explicitly requests reconsideration.
        string key = "comment:123:verified-revision";
        JsonObject reconsider = proposal.Copy();
        reconsider["decisions"] = new JsonArray(new JsonObject { ["feedback_key"] = key, ["fingerprint"] = LegacyIdentity.Proposal(edit), ["decision"] = "reconsider", ["reason"] = "Owner explicitly asks to reconsider this split." });
        var feedback = new JsonArray(new JsonObject { ["key"] = key, ["body"] = "Reconsider this split." });

        // Act: bind the owner decision.
        (JsonArray effective, JsonArray actions) = Proposal.BindDecisions(reconsider, new JsonArray(), rejected, feedback);
        reconsider.Arr("edits")[0]!["feedback_keys"] = new JsonArray(key);
        reconsider["feedback"] = new JsonArray(new JsonObject { ["key"] = key, ["outcome"] = "implemented", ["reason"] = "Reconsidered the requested split." });
        JsonObject reconsidered = Proposal.Apply(sources, reconsider, effective, [key], [key]);

        // Assert
        reconsidered.Arr("retired_ids").Strings().Should().Equal("stable_1");
        actions.Should().HaveCount(1);

        // Act: attempt the same decision without verified feedback.
        Action forgedDecision = () => Proposal.BindDecisions(reconsider, new JsonArray(), rejected, new JsonArray());

        // Assert
        forgedDecision.Should().Throw<ProposalException>().WithMessage("*verified pending feedback*");
    }
}
