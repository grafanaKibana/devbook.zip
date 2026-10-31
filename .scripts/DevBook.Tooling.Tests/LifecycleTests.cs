using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class LifecycleTests
{
    [Fact]
    public void Managed_lifecycle_retains_review_freeze_closure_rejections_and_cumulative_human_text()
    {
        // Arrange
        string topic = Core.TopicFor(DomainFixtures.Path);
        string id = Core.TopicId(topic);
        JsonObject edit = DomainFixtures.Edit();
        JsonObject proposal = DomainFixtures.Proposal(edit);
        Dictionary<string, string> original = new() { [DomainFixtures.Path] = DomainFixtures.Note };
        JsonObject result = Proposal.Apply(original, proposal);
        JsonObject pr = new() { ["topic_id"] = id, ["generation"] = 1, ["number"] = 7, ["status"] = "open", ["draft"] = true, ["branch"] = Core.BranchFor(topic, 1) };
        JsonObject state = Core.SyncPrs(Core.NewState(), new JsonArray(pr.Copy()));
        state.RequiredObject("prs").Obj($"{id}:1")["proposal_records"] = new JsonArray(new JsonObject { ["batch"] = new JsonObject { ["notes"] = new JsonArray(DomainFixtures.NoteRecord()) }, ["proposal"] = proposal.Copy(), ["result"] = result.Copy() });
        pr["review_activity"] = true;

        // Act: owner review freezes the existing PR.
        state = Core.SyncPrs(state, new JsonArray(pr.Copy()));

        // Assert
        state.Obj("prs").Count.Should().Be(1);
        state.Obj("prs").Obj($"{id}:1").Bool("frozen").Should().BeTrue();

        // Arrange: a later rewrite of the same learning target.
        string firstCandidate = result.Obj("sources").Str(DomainFixtures.Path);
        string finalCandidate = firstCandidate.Replace("mechanism and boundary.", "mechanism, costs, and boundary.");
        JsonObject followup = DomainFixtures.Edit(after: edit.Str("after").Replace("mechanism and boundary.", "mechanism, costs, and boundary."));
        followup["before"] = edit.Str("after");
        followup["expected_hash"] = LegacyIdentity.Digest(firstCandidate);

        // Act
        string summary = Summary.Render(topic, original, new Dictionary<string, string> { [DomainFixtures.Path] = finalCandidate }, new JsonArray(edit.Copy(), followup), new JsonArray(), new JsonArray("Core checks passed"), new Dictionary<string, string>());

        // Assert
        summary.Should().Contain("- Rewritten: 1").And.Contain("existing review history remains attached").And.Contain("The original answer.").And.Contain("costs, and boundary.");

        // Arrange: a split followed by a child rewrite.
        string child = "<!-- qard-source: original -->\n> [!qard]- What input matters?\n> The original input answer.\n";
        string children = child + "\n<!-- qard-source: original -->\n> [!qard]- Which boundary matters?\n> The stated boundary.\n";
        JsonObject split = DomainFixtures.Edit("split", "new", children);
        JsonObject rewrittenChild = DomainFixtures.Edit(after: child.Replace("original input answer", "current input mechanism"));
        rewrittenChild["before"] = child;
        string finalSplit = DomainFixtures.Note.Replace(DomainFixtures.Card, children.Replace("original input answer", "current input mechanism"));

        // Act
        string splitSummary = Summary.Render(topic, original, new Dictionary<string, string> { [DomainFixtures.Path] = finalSplit }, new JsonArray(split, rewrittenChild.Copy()), new JsonArray(), new JsonArray(), new Dictionary<string, string>());

        // Assert
        splitSummary.Should().Contain("- Split: 1").And.Contain("- Rewritten: 0").And.Contain("The original answer.").And.Contain("current input mechanism").And.Contain("replacement target(s) remain ID-less");

        // Arrange: a new card followed by a rewrite.
        string anchor = "# Questions\n";
        JsonObject added = DomainFixtures.Edit("add", "new", anchor + "\n" + child);
        added["before"] = anchor;
        string finalAdded = DomainFixtures.Note.Replace(anchor, (anchor + "\n" + child).Replace("original input answer", "current input mechanism"));

        // Act
        string addedSummary = Summary.Render(topic, original, new Dictionary<string, string> { [DomainFixtures.Path] = finalAdded }, new JsonArray(added, rewrittenChild), new JsonArray(), new JsonArray(), new Dictionary<string, string>());

        // Assert
        addedSummary.Should().Contain("- Added: 1").And.Contain("- Rewritten: 0").And.Contain("current input mechanism");

        // Arrange: manual text around the managed summary.
        string body = Summary.UpdateManagedBody("Owner introduction.\n", "Earlier summary", topic) + "\nOwner footer.\n";

        // Act
        string updated = Summary.UpdateManagedBody(body, summary, topic);

        // Assert
        updated.Should().StartWith("Owner introduction.\n").And.EndWith("\nOwner footer.\n");
        Enumerable.Range(1, 6).Should().OnlyContain(number => updated.Contains($"## {number}."));

        // Arrange: the owner closes the PR without merging.
        pr["status"] = "closed";

        // Act: record closure.
        state = Core.SyncPrs(state, new JsonArray(pr.Copy()));

        // Assert
        state.Arr("rejections").Should().ContainSingle();
        state.Obj("prs").Obj($"{id}:1").ContainsKey("proposal_records").Should().BeFalse();
        state.Obj("topics").Obj(id).Int("generation").Should().Be(2);

        // Act: replay a rejected proposal.
        Action rejectedAgain = () => Proposal.Apply(original, proposal, state.Arr("rejections"));

        // Assert
        rejectedAgain.Should().Throw<ProposalException>();

        // Arrange: a later generation is merged.
        JsonObject merged = pr.Copy();
        merged["generation"] = 2;
        merged["number"] = 8;
        merged["status"] = "merged";

        // Act: advance the topic generation.
        int nextGeneration = Core.SyncPrs(state, new JsonArray(merged)).Obj("topics").Obj(id).Int("generation");

        // Assert
        nextGeneration.Should().Be(3);
    }
}
