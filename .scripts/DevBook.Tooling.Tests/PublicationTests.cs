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
        var api = new RuntimeApi();
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        await runtime.PublishAsync(RuntimeFixtures.Request("Original", "First candidate"));
        api.Pr["body"] = "Owner introduction.\n" + api.Pr.Str("body") + "\nOwner footer.\n";
        api.Pr["draft"] = false;
        api.Comments.Add(RuntimeFixtures.OwnerComment());
        JsonArray feedback = await Feedback.PollAsync(api, 1, RuntimeFixtures.Allowlist());
        JsonObject request = RuntimeFixtures.Request("First candidate", "Second candidate");
        request["expected_pr_number"] = 1;
        request["expected_branch_sha"] = api.Head;
        request["pending_feedback"] = feedback.Copy();
        request["edits"] = new JsonArray(new JsonObject { ["path"] = RuntimeFixtures.NotePath, ["feedback_keys"] = new JsonArray(feedback[0]!.Str("key")) });
        request["feedback_revision"] = new JsonObject
        {
            ["allowlist"] = new JsonArray("42:owner"),
            ["processed"] = new JsonObject { ["comment:7"] = feedback[0]!["revision"]!.DeepClone() }
        };

        // Act
        JsonObject result = await runtime.PublishAsync(request);

        // Assert
        result.Str("status").Should().Be("awaiting_export");
        api.PrCreates.Should().Be(1);
        api.Commits.Should().Be(2);
        api.DraftConversions.Should().Be(1);
        api.ForceWrites.Should().Be(0);
        api.Pr.Obj("base").Str("ref").Should().Be("main");
        api.Pr.Str("body").Should().StartWith("Owner introduction.\n").And.EndWith("\nOwner footer.\n").And.Contain("Second candidate");
    }

    [Fact]
    public async Task ReviewStartingDuringPublicationFreezesTheOriginalHead()
    {
        // Arrange
        var store = new MemoryStateStore(Core.NewState());
        var api = new SourcePublicationReviewFreezeReviewRaceApi(store);
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
        using var fixture = new WorkloadFixture(2);
        string topic = Core.TopicId("Programming");
        var api = new RuntimeApi();
        api.SeedManagedPr(topic, fixture.Notes[0]!.Str("content"));
        foreach (JsonObject note in fixture.Notes.OfType<JsonObject>()) api.SourceFiles[note.Str("path")] = note.Str("content");
        fixture.Config["repo"] = api.Repo;
        fixture.Config["base_branch"] = "main";
        JsonObject comment = RuntimeFixtures.OwnerComment();
        comment["paths"] = new JsonArray(fixture.Notes.OfType<JsonObject>().Select(note => (JsonNode)JsonValue.Create(note.Str("path"))!).ToArray());
        api.Comments.Add(comment);
        fixture.Config["owner_allowlist"] = RuntimeFixtures.Allowlist();
        var runtime = new GitHubRuntime(api, fixture.Store, activation: () => { });
        ImprovementEngine Engine() => new(fixture.Root, fixture.Config, fixture.Store, fixture.Model, api: api, publisher: runtime,
            notesLoader: () => fixture.Notes.Copy(), clock: fixture.Clock, snapshotShaLoader: () => "base",
            validator: (_, _, _) => Task.FromResult(new JsonArray()));

        // Act
        JsonObject result = await Engine().RunAsync(apply: true, withModel: true);
        await Engine().RunAsync(apply: true, withModel: true);
        JsonObject saved = (await fixture.Store.ReadAsync()).State;

        // Assert
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

    [Theory]
    [InlineData(20, false)]
    [InlineData(200, true)]
    public async Task FeedbackLineCapacityIncludesTheExistingPrAgainstItsAuthoritativeBase(int correctionLines, bool blocked)
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
            + string.Join("\n", Enumerable.Range(0, call == 1 ? 50 : correctionLines).Select(line => $"Corrected mechanism detail {line}.")) + "\n";
        var publisher = new GitHubRuntime(api, fixture.Store, activation: () => { });
        var engine = new ImprovementEngine(fixture.Root, fixture.Config, fixture.Store, fixture.Model, api: api, publisher: publisher,
            notesLoader: () => fixture.Notes.Copy(), clock: fixture.Clock, snapshotShaLoader: () => "base",
            validator: (_, _, _) => Task.FromResult(new JsonArray()));

        // Act
        JsonObject result = await engine.RunAsync(apply: blocked, withModel: true);
        JsonObject saved = (await fixture.Store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be(blocked ? "feedback_needs_scope" : "proposed", "result: {0}", result.ToJsonString());
        fixture.Model.Authors.Should().HaveCount(2);
        fixture.Model.Reviews.Should().HaveCount(blocked ? 1 : 2);
        if (blocked)
        {
            JsonObject scope = saved.Obj("feedback_workloads").Single().Value!.AsObject();
            scope.Str("status").Should().Be("feedback_needs_scope");
            scope.Str("hold_reason").Should().Contain("1200");
            scope.Obj("size_hold_proposal").Count.Should().BePositive();
            scope.Obj("records").Count.Should().Be(1);
            api.Commits.Should().Be(0);
            api.PrCreates.Should().Be(0);
        }
        else result.Obj("candidate").ContainsKey(path).Should().BeTrue();
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

    private sealed class SourcePublicationReviewFreezeReviewRaceApi(IStateStore store) : IGitHubApi
    {
        public RuntimeApi Inner { get; } = new();
        public string Repo => Inner.Repo;
        public bool MarkReadyOnCommit { get; set; }
        public bool InterruptAfterCommit { get; set; }
        public bool FreezePersistedBeforeConversion { get; private set; }
        private bool SourcePublicationReviewFreezeinterrupt;

        public async Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            if (SourcePublicationReviewFreezeinterrupt && method == "GET" && path == "/pulls/1")
            {
                SourcePublicationReviewFreezeinterrupt = false;
                throw new RuntimeFailure("Fixture interruption after commit creation.");
            }
            JsonNode? result = await Inner.RequestAsync(method, path, payload, paginate, cancellationToken);
            if (MarkReadyOnCommit && method == "POST" && path == "/git/commits")
            {
                MarkReadyOnCommit = false;
                Inner.Pr["draft"] = false;
                SourcePublicationReviewFreezeinterrupt = InterruptAfterCommit;
            }
            return result;
        }

        public async Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default)
        {
            JsonObject row = (await store.ReadAsync(cancellationToken)).State.Obj("prs").Obj($"{RuntimeFixtures.Topic}:1");
            FreezePersistedBeforeConversion = row.Bool("frozen") && row.Str("review_started_head_sha") == Inner.Head;
            return await Inner.GraphqlAsync(query, variables, cancellationToken);
        }
    }
}
