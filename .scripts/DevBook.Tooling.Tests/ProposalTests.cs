using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ProposalTests
{
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
