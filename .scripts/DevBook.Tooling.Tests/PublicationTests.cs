using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class PublicationTests
{
    [Fact]
    public async Task RequestedOwnerCorrectionReusesTheManagedPrAndPreservesHumanText()
    {
        // Arrange
        using var fixture = new WorkloadFixture(1);
        const string url = "https://example.com/mechanism";
        string path = fixture.Notes[0]!.Str("path");
        string baseline = fixture.Notes[0]!.Str("content") + "\n# References\n\n- [Mechanism](" + url + ")\n";
        string existing = baseline.Replace("The operating idea has a concrete boundary.", "The existing explanation has a concrete boundary.");
        var api = new RuntimeApi();
        api.SeedManagedPr(Core.TopicId("Programming"), existing);
        api.SourceFiles[path] = existing;
        api.BaseSourceFiles[path] = baseline;
        api.Pr["body"] = "Owner introduction.\n" + api.Pr.Str("body")
            + $"\n<!-- devbook-improvement:start topic={Core.TopicId("Programming")} -->\nPrevious managed summary.\n<!-- devbook-improvement:end -->\nOwner footer.\n";
        api.Pr["draft"] = false;
        JsonObject comment = RuntimeFixtures.OwnerComment();
        comment["paths"] = new JsonArray(path);
        api.Comments.Add(comment);
        api.Reviews.Add(new JsonObject
        {
            ["id"] = 10,
            ["state"] = "CHANGES_REQUESTED",
            ["body"] = "Clarify the mechanism using its existing reference.",
            ["user"] = new JsonObject { ["id"] = 42, ["login"] = "owner" },
            ["paths"] = new JsonArray(path)
        });
        api.InlineComments.Add(new JsonObject
        {
            ["id"] = 11,
            ["pull_request_review_id"] = 10,
            ["body"] = "Keep the reference beside the corrected explanation.",
            ["user"] = new JsonObject { ["id"] = 42, ["login"] = "owner" },
            ["path"] = path
        });
        JsonObject command = FeedbackTriggerFixtures.Command(api);
        fixture.Config["repo"] = api.Repo;
        fixture.Config["base_branch"] = "main";
        fixture.Config["owner_allowlist"] = RuntimeFixtures.Allowlist();
        fixture.Model.Change = _ => true;
        fixture.Model.ConfigureEdit = edit =>
        {
            edit["kind"] = "note";
            edit["before"] = "The existing explanation has a concrete boundary.";
            edit["after"] = "The operating idea explains the corrected boundary.";
            edit["sources"] = new JsonArray(new JsonObject { ["url"] = url, ["claim"] = "The mechanism has the corrected boundary.", ["version"] = "not version-specific" });
        };
        StateSnapshot initial = await fixture.Store.ReadAsync();
        initial.State["held_proposals"] = new JsonObject { ["unrelated"] = new JsonObject { ["audit"] = "preserve held ordinary proposal" } };
        initial.State["parked_proposals"] = new JsonObject { ["unrelated"] = new JsonObject { ["audit"] = "preserve parked ordinary proposal" } };
        initial.State["deferred_proposals"] = new JsonObject { ["unrelated"] = new JsonObject { ["audit"] = "preserve deferred ordinary proposal" } };
        initial.State["export_operations"] = new JsonObject { ["other-export"] = new JsonObject { ["pr_number"] = 2, ["phase"] = "awaiting_export", ["audit"] = "unrelated export evidence" } };
        initial.State["focused_workload"] = new JsonObject { ["id"] = "published-ordinary", ["status"] = "published" };
        initial.State.Obj("prs")[Core.TopicId("Programming") + ":1"] = new JsonObject
        { ["topic_id"] = Core.TopicId("Programming"), ["number"] = 1, ["status"] = "open" };
        JsonObject rejectedEdit = DomainFixtures.Edit();
        rejectedEdit["path"] = "Vault/Home/Networks/Other.md";
        initial.State.Obj("prs")["unrelated-closed:1"] = new JsonObject
        {
            ["number"] = 3,
            ["topic_id"] = Core.TopicId("Networks"),
            ["status"] = "closed",
            ["proposal_records"] = new JsonArray(new JsonObject
            {
                ["batch"] = new JsonObject { ["topic"] = "Networks" },
                ["proposal"] = DomainFixtures.Proposal(rejectedEdit),
                ["result"] = new JsonObject { ["lineage"] = new JsonArray() }
            }),
            ["terminal_audit"] = new JsonObject { ["audit"] = "preserve existing terminal evidence" }
        };
        initial.State.Arr("rejections").Add(new JsonObject
        { ["fingerprint"] = "existing-unrelated-rejection", ["path"] = "Vault/Home/Networks/Other.md", ["audit"] = "preserve rejected proposal" });
        JsonObject parkedCandidate = new()
        {
            ["workload_id"] = "published-ordinary",
            ["topic_id"] = Core.TopicId("Programming"),
            ["source_hashes"] = new JsonObject { [path] = LegacyIdentity.Digest(existing) },
            ["feedback_keys"] = new JsonArray(),
            ["proposal"] = new JsonObject { ["audit"] = "unfinished ordinary candidate" }
        };
        initial.State["pending_author_proposal"] = parkedCandidate.Copy();
        JsonObject protectedState = initial.State.Copy();
        await fixture.Store.WriteAsync(initial.State, initial, "fixture unrelated inactive work");
        await new DurableLease(fixture.Store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, fixture.Store, leaseOwner: "fixture", activation: () => { });

        // Act
        JsonObject admitted = await FeedbackTrigger.ResolveAsync(fixture.Config, "issue_comment", command, api, CancellationToken.None);
        fixture.Config["feedback_pr"] = admitted.Int("feedback_pr");
        var engine = new ImprovementEngine(fixture.Root, fixture.Config, fixture.Store, fixture.Model, api: api, publisher: runtime,
            notesLoader: () => fixture.Notes.Copy(), clock: fixture.Clock, snapshotShaLoader: () => "base",
            sourceFetcher: (_, _) => Task.FromResult("The mechanism has the corrected boundary."),
            validator: (_, _, _) => Task.FromResult(new JsonArray()));
        JsonObject result = await engine.RunAsync(apply: true, withModel: true);

        // Assert
        admitted.Str("status").Should().Be("feedback_ready");
        result.Str("status").Should().Be("awaiting_export", "result: {0}", result.ToJsonString());
        fixture.Model.Authors.Should().ContainSingle().Which.Arr("feedback").Should().HaveCount(3);
        fixture.Model.Reviews.Should().ContainSingle();
        api.PrCreates.Should().Be(0);
        api.Commits.Should().Be(1);
        api.DraftConversions.Should().Be(1);
        api.ForceWrites.Should().Be(0);
        api.Source.Should().Contain("The operating idea explains the corrected boundary.").And.Contain(url);
        JsonObject saved = (await fixture.Store.ReadAsync()).State;
        JsonNode.DeepEquals(saved.Obj("prs")["unrelated-closed:1"], protectedState.Obj("prs")["unrelated-closed:1"]).Should().BeTrue();
        JsonNode.DeepEquals(saved.Arr("rejections"), protectedState.Arr("rejections")).Should().BeTrue();
        JsonNode.DeepEquals(saved.Obj("parked_author_proposals")[LegacyIdentity.Fingerprint(parkedCandidate)], parkedCandidate).Should().BeTrue();
        JsonNode.DeepEquals(saved.Obj("held_proposals"), protectedState.Obj("held_proposals")).Should().BeTrue();
        JsonNode.DeepEquals(saved.Obj("parked_proposals"), protectedState.Obj("parked_proposals")).Should().BeTrue();
        JsonNode.DeepEquals(saved.Obj("deferred_proposals"), protectedState.Obj("deferred_proposals")).Should().BeTrue();
        JsonNode.DeepEquals(saved.Obj("export_operations")["other-export"], protectedState.Obj("export_operations")["other-export"]).Should().BeTrue();
        api.Pr.Obj("base").Str("ref").Should().Be("main");
        api.Pr.Str("body").Should().StartWith("Owner introduction.\n").And.EndWith("\nOwner footer.\n");
    }

    [Fact]
    public async Task ReviewStartingDuringPublicationFreezesTheOriginalHead()
    {
        // Arrange
        var store = new MemoryStateStore(Core.NewState());
        var api = new SourcePublicationReviewFreezeReviewRaceApi();
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        await runtime.PublishAsync(RuntimeFixtures.Request("Original", "First candidate"));
        string head = api.Inner.Head;
        JsonObject request = RuntimeFixtures.Request("First candidate", "Unrequested candidate");
        request["expected_pr_number"] = 1;
        request["expected_branch_sha"] = head;
        api.MarkReadyOnCommit = true;

        // Act
        JsonObject result = await runtime.PublishAsync(request);
        JsonObject saved = (await store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("review_started");
        api.Inner.Head.Should().Be(head);
        saved.Obj("prs").Obj(RuntimeFixtures.Topic + ":1").Bool("frozen").Should().BeTrue();
        saved.Obj("prs").Obj(RuntimeFixtures.Topic + ":1").Str("review_started_head_sha").Should().Be(head);
        saved.Obj("invalidated_operations").Count.Should().Be(1);
    }

    [Fact]
    public async Task CompleteAllKeepFeedbackIsAcknowledgedOnceWithoutAnyPublicationOperation()
    {
        // Arrange
        using var fixture = new WorkloadFixture(3);
        string topic = Core.TopicId("Programming");
        var api = new RuntimeApi();
        api.SeedManagedPr(topic, fixture.Notes[0]!.Str("content"));
        foreach (JsonObject note in fixture.Notes.OfType<JsonObject>()) api.SourceFiles[note.Str("path")] = note.Str("content");
        fixture.Config["repo"] = api.Repo;
        fixture.Config["base_branch"] = "main";
        JsonObject comment = RuntimeFixtures.OwnerComment();
        comment["paths"] = new JsonArray(fixture.Notes.OfType<JsonObject>().Take(2).Select(note => (JsonNode)JsonValue.Create(note.Str("path"))!).ToArray());
        api.Comments.Add(comment);
        api.Reviews.Add(new JsonObject
        {
            ["id"] = 19,
            ["state"] = "COMMENTED",
            ["body"] = "Recheck the existing explanation without adding detail.",
            ["user"] = new JsonObject { ["id"] = 42, ["login"] = "owner" },
            ["paths"] = comment.Arr("paths").Copy()
        });
        JsonObject signal = FeedbackTriggerFixtures.Review(api);
        FeedbackTriggerFixtures.AddUnpublishedFeedback(api, fixture.Notes[2]!.Str("path"));
        fixture.Config["owner_allowlist"] = RuntimeFixtures.Allowlist();
        var runtime = new GitHubRuntime(api, fixture.Store, activation: () => { });
        ImprovementEngine Engine() => new(fixture.Root, fixture.Config, fixture.Store, fixture.Model, api: api, publisher: runtime,
            notesLoader: () => fixture.Notes.Copy(), clock: fixture.Clock, snapshotShaLoader: () => "base",
            validator: (_, _, _) => Task.FromResult(new JsonArray()));

        // Act
        JsonObject admitted = await FeedbackTrigger.ResolveAsync(fixture.Config, "workflow_run", signal, api, CancellationToken.None);
        fixture.Config["feedback_pr"] = admitted.Int("feedback_pr");
        JsonObject result = await Engine().RunAsync(apply: true, withModel: true);
        await Engine().RunAsync(apply: true, withModel: true);
        JsonObject saved = (await fixture.Store.ReadAsync()).State;

        // Assert
        admitted.Str("status").Should().Be("feedback_ready");
        result.Str("status").Should().Be("no_worthwhile_changes", "result: {0}", result.ToJsonString());
        fixture.Model.Authors.Should().HaveCount(2);
        fixture.Model.Reviews.Should().HaveCount(2);
        saved.Obj("feedback_workloads").Select(pair => pair.Value).Should().ContainSingle(item => item.Str("status") == "completed");
        saved.Obj("feedback").Select(pair => pair.Value).Should().OnlyContain(item => item.Str("status") == "keep");
        api.Commits.Should().Be(0);
        api.PrCreates.Should().Be(0);
        api.Acknowledgments.Should().Be(1);
        saved["pending_operation"].Should().BeNull();
        saved.Obj("completed_operations").Count.Should().Be(0);
        saved.Obj("export_operations").Count.Should().Be(0);
    }

    [Fact]
    public async Task FeedbackLineCapacityIncludesTheExistingPrAgainstItsAuthoritativeBase()
    {
        // Arrange
        using var fixture = new WorkloadFixture(2);
        string path = fixture.Notes[0]!.Str("path");
        string baseline = fixture.Notes[0]!.Str("content");
        string existing = baseline + string.Join("\n", Enumerable.Range(0, 1100).Select(line => $"Existing authored detail {line}.")) + "\n";
        var api = new RuntimeApi();
        api.SeedManagedPr(Core.TopicId("Programming"), existing);
        api.SourceFiles[path] = existing;
        api.BaseSourceFiles[path] = baseline;
        string stagedPath = fixture.Notes[1]!.Str("path");
        api.SourceFiles[stagedPath] = fixture.Notes[1]!.Str("content");
        api.BaseSourceFiles[stagedPath] = fixture.Notes[1]!.Str("content");
        JsonObject comment = RuntimeFixtures.OwnerComment();
        comment["paths"] = new JsonArray(path, stagedPath);
        api.Comments.Add(comment);
        fixture.Config["repo"] = api.Repo;
        fixture.Config["base_branch"] = "main";
        fixture.Config["owner_allowlist"] = RuntimeFixtures.Allowlist();
        fixture.Model.Change = _ => true;
        fixture.Model.ChangedCard = call => DomainFixtures.Card.Replace("The original answer.", "The clarified mechanism.")
            + string.Join("\n", Enumerable.Range(0, call == 1 ? 50 : 200).Select(line => $"Corrected mechanism detail {line}.")) + "\n";
        var publisher = new GitHubRuntime(api, fixture.Store, activation: () => { });
        var engine = new ImprovementEngine(fixture.Root, fixture.Config, fixture.Store, fixture.Model, api: api, publisher: publisher,
            notesLoader: () => fixture.Notes.Copy(), clock: fixture.Clock, snapshotShaLoader: () => "base",
            validator: (_, _, _) => Task.FromResult(new JsonArray()));

        // Act
        JsonObject result = await engine.RunAsync(apply: true, withModel: true);
        JsonObject saved = (await fixture.Store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("feedback_needs_scope", "result: {0}", result.ToJsonString());
        fixture.Model.Authors.Should().HaveCount(2);
        fixture.Model.Reviews.Should().HaveCount(1);
        JsonObject scope = saved.Obj("feedback_workloads").Single().Value!.AsObject();
        scope.Str("status").Should().Be("feedback_needs_scope");
        scope.Str("hold_reason").Should().Contain("1200");
        scope.Obj("size_hold_proposal").Count.Should().BePositive();
        scope.Obj("records").Count.Should().Be(1);
        api.Commits.Should().Be(0);
        api.PrCreates.Should().Be(0);
    }

    [Theory]
    [InlineData("POST", "/pulls")]
    [InlineData("GET", "/contents/%252e%252e/config")]
    public async Task ReadOnlyGitHubTransportRejectsWritesAndEncodedTraversal(string method, string path)
    {
        // Arrange
        var api = new GhApi("owner/repo", readOnly: true);

        // Act
        Func<Task> request = () => api.RequestAsync(method, path, new JsonObject());

        // Assert
        await request.Should().ThrowAsync<UnsafeInput>();
    }

    private sealed class SourcePublicationReviewFreezeReviewRaceApi : IGitHubApi
    {
        public RuntimeApi Inner { get; } = new();
        public string Repo => Inner.Repo;
        public bool MarkReadyOnCommit { get; set; }

        public async Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            JsonNode? result = await Inner.RequestAsync(method, path, payload, paginate, cancellationToken);
            if (MarkReadyOnCommit && method == "POST" && path == "/git/commits")
            {
                MarkReadyOnCommit = false;
                Inner.Pr["draft"] = false;
            }
            return result;
        }

        public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default) =>
            Inner.GraphqlAsync(query, variables, cancellationToken);
    }
}
