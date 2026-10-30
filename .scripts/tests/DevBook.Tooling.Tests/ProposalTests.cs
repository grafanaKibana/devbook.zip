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
        Dictionary<string, string> sources = new() { [DomainFixtures.Path] = DomainFixtures.Note };
        JsonObject edit = DomainFixtures.Edit();
        JsonObject proposal = DomainFixtures.Proposal(edit);
        JsonObject result = Proposal.Apply(sources, proposal);
        result.Obj("sources").Str(DomainFixtures.Path).Should().Contain("<!-- qard-id: stable_1 -->");
        result.Obj("sources").Str(DomainFixtures.Path).Should().Contain("<!-- qard-source: original -->");
        result.Arr("retired_ids").Should().BeEmpty();
        JsonObject stale = proposal.Copy();
        stale.Arr("edits")[0]!["expected_hash"] = "stale";
        Action staleApply = () => Proposal.Apply(sources, stale);
        staleApply.Should().Throw<ProposalException>().WithMessage("*CAS conflict*");
        JsonObject forbidden = proposal.Copy();
        forbidden.Arr("edits")[0]!["path"] = ".github/workflows/devbook-improvement.yml";
        forbidden.Arr("dispositions")[0]!["path"] = ".github/workflows/devbook-improvement.yml";
        Action unsafeApply = () => Proposal.Apply(sources, forbidden);
        unsafeApply.Should().Throw<ProposalException>();
        sources[DomainFixtures.Path].Should().Be(DomainFixtures.Note);
    }

    [Fact]
    public void New_targets_are_idless_and_rejected_changes_require_fingerprint_specific_owner_reconsideration()
    {
        Dictionary<string, string> sources = new() { [DomainFixtures.Path] = DomainFixtures.Note };
        string children = "<!-- qard-source: original -->\n> [!qard]- Which input matters?\n> The supplied input.\n\n<!-- qard-source: original -->\n> [!qard]- Which boundary matters?\n> The stated boundary.\n";
        JsonObject edit = DomainFixtures.Edit("split", "new", children);
        JsonObject proposal = DomainFixtures.Proposal(edit);
        JsonObject result = Proposal.Apply(sources, proposal);
        result.Arr("retired_ids").Strings().Should().Equal("stable_1");
        Proposal.Ids(result.Obj("sources").Str(DomainFixtures.Path)).Should().BeEmpty();
        JsonObject borrowedIdentity = proposal.Copy();
        borrowedIdentity.Arr("edits")[0]!["after"] = "<!-- qard-id: stable_1 -->\n" + children;
        Action borrowedApply = () => Proposal.Apply(sources, borrowedIdentity);
        borrowedApply.Should().Throw<ProposalException>().WithMessage("*ID-less*");
        JsonObject tombstone = Core.RejectionTombstone(edit, result);
        var rejected = new JsonArray(tombstone);
        Action replay = () => Proposal.Apply(sources, proposal, rejected);
        replay.Should().Throw<ProposalException>().WithMessage("*rejected edit*");
        string key = "comment:123:verified-revision";
        JsonObject reconsider = proposal.Copy();
        reconsider["decisions"] = new JsonArray(new JsonObject { ["feedback_key"] = key, ["fingerprint"] = LegacyIdentity.Proposal(edit), ["decision"] = "reconsider", ["reason"] = "Owner explicitly asks to reconsider this split." });
        var feedback = new JsonArray(new JsonObject { ["key"] = key, ["body"] = "Reconsider this split." });
        (JsonArray effective, JsonArray actions) = Proposal.BindDecisions(reconsider, new JsonArray(), rejected, feedback);
        reconsider.Arr("edits")[0]!["feedback_keys"] = new JsonArray(key);
        reconsider["feedback"] = new JsonArray(new JsonObject { ["key"] = key, ["outcome"] = "implemented", ["reason"] = "Reconsidered the requested split." });
        Proposal.Apply(sources, reconsider, effective, [key], [key]).Arr("retired_ids").Strings().Should().Equal("stable_1");
        actions.Should().HaveCount(1);
        Action forgedDecision = () => Proposal.BindDecisions(reconsider, new JsonArray(), rejected, new JsonArray());
        forgedDecision.Should().Throw<ProposalException>().WithMessage("*verified pending feedback*");
    }
}

internal static class DomainFixtures
{
    public const string Path = "Vault/Home/Programming/NET/Card.md";
    public const string Card = "<!-- qard-source: original -->\n<!-- qard-id: stable_1 -->\n> [!qard]- What is the operating idea?\n> The original answer.\n";
    public const string Note = "---\ntopic: [Programming]\nsubtopic: [NET]\nlevel: [\"2\"]\npriority: Medium\nstatus: Creation\npublish: false\n---\nThe operating idea has a concrete boundary.\n\n# Questions\n\n" + Card;

    public static JsonObject Edit(string kind = "rewrite", string target = "same", string? after = null) => new()
    {
        ["path"] = Path,
        ["expected_hash"] = LegacyIdentity.Digest(Note),
        ["before"] = Card,
        ["after"] = after ?? Card.Replace("The original answer.", "The answer explains its mechanism and boundary."),
        ["reason"] = "Explain the mechanism and boundary.",
        ["kind"] = kind,
        ["learning_target"] = target,
        ["essential_meanings"] = new JsonArray("The operating mechanism", "The important boundary"),
        ["sources"] = new JsonArray(),
        ["feedback_keys"] = new JsonArray()
    };

    public static JsonObject Proposal(JsonObject edit) => new()
    {
        ["version"] = 1,
        ["edits"] = new JsonArray(edit.Copy()),
        ["dispositions"] = new JsonArray(new JsonObject { ["path"] = edit.Str("path"), ["outcome"] = "changed", ["reason"] = "Improved the explanation." }),
        ["feedback"] = new JsonArray()
    };

    public static JsonObject NoteRecord(string path = Path, string? content = null) => new()
    {
        ["path"] = path,
        ["content"] = content ?? Note,
        ["hash"] = LegacyIdentity.Digest(content ?? Note),
        ["topic"] = Core.TopicFor(path),
        ["violations"] = new JsonArray()
    };
}
