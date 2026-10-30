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
        state = Core.SyncPrs(state, new JsonArray(pr.Copy()));
        state.Obj("prs").Count.Should().Be(1);
        state.Obj("prs").Obj($"{id}:1").Bool("frozen").Should().BeTrue();
        string firstCandidate = result.Obj("sources").Str(DomainFixtures.Path);
        string finalCandidate = firstCandidate.Replace("mechanism and boundary.", "mechanism, costs, and boundary.");
        JsonObject followup = DomainFixtures.Edit(after: edit.Str("after").Replace("mechanism and boundary.", "mechanism, costs, and boundary."));
        followup["before"] = edit.Str("after");
        followup["expected_hash"] = LegacyIdentity.Digest(firstCandidate);
        string summary = Summary.Render(topic, original, new Dictionary<string, string> { [DomainFixtures.Path] = finalCandidate }, new JsonArray(edit.Copy(), followup), new JsonArray(), new JsonArray("Core checks passed"), new Dictionary<string, string>());
        summary.Should().Contain("- Rewritten: 1").And.Contain("existing review history remains attached").And.Contain("The original answer.").And.Contain("costs, and boundary.");
        string child = "<!-- qard-source: original -->\n> [!qard]- What input matters?\n> The original input answer.\n";
        string children = child + "\n<!-- qard-source: original -->\n> [!qard]- Which boundary matters?\n> The stated boundary.\n";
        JsonObject split = DomainFixtures.Edit("split", "new", children);
        JsonObject rewrittenChild = DomainFixtures.Edit(after: child.Replace("original input answer", "current input mechanism"));
        rewrittenChild["before"] = child;
        string finalSplit = DomainFixtures.Note.Replace(DomainFixtures.Card, children.Replace("original input answer", "current input mechanism"));
        string splitSummary = Summary.Render(topic, original, new Dictionary<string, string> { [DomainFixtures.Path] = finalSplit }, new JsonArray(split, rewrittenChild.Copy()), new JsonArray(), new JsonArray(), new Dictionary<string, string>());
        splitSummary.Should().Contain("- Split: 1").And.Contain("- Rewritten: 0").And.Contain("The original answer.").And.Contain("current input mechanism").And.Contain("replacement target(s) remain ID-less");
        string anchor = "# Questions\n";
        JsonObject added = DomainFixtures.Edit("add", "new", anchor + "\n" + child);
        added["before"] = anchor;
        string finalAdded = DomainFixtures.Note.Replace(anchor, (anchor + "\n" + child).Replace("original input answer", "current input mechanism"));
        string addedSummary = Summary.Render(topic, original, new Dictionary<string, string> { [DomainFixtures.Path] = finalAdded }, new JsonArray(added, rewrittenChild), new JsonArray(), new JsonArray(), new Dictionary<string, string>());
        addedSummary.Should().Contain("- Added: 1").And.Contain("- Rewritten: 0").And.Contain("current input mechanism");
        string body = Summary.UpdateManagedBody("Owner introduction.\n", "Earlier summary", topic) + "\nOwner footer.\n";
        string updated = Summary.UpdateManagedBody(body, summary, topic);
        updated.Should().StartWith("Owner introduction.\n").And.EndWith("\nOwner footer.\n");
        Enumerable.Range(1, 6).Should().OnlyContain(number => updated.Contains($"## {number}."));
        pr["status"] = "closed";
        state = Core.SyncPrs(state, new JsonArray(pr.Copy()));
        state.Arr("rejections").Should().ContainSingle();
        state.Obj("prs").Obj($"{id}:1").ContainsKey("proposal_records").Should().BeFalse();
        state.Obj("topics").Obj(id).Int("generation").Should().Be(2);
        Action rejectedAgain = () => Proposal.Apply(original, proposal, state.Arr("rejections"));
        rejectedAgain.Should().Throw<ProposalException>();
        JsonObject merged = pr.Copy();
        merged["generation"] = 2;
        merged["number"] = 8;
        merged["status"] = "merged";
        Core.SyncPrs(state, new JsonArray(merged)).Obj("topics").Obj(id).Int("generation").Should().Be(3);
    }
}
