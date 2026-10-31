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
    public void EditedOwnerFeedbackGetsANewRevisionAndUntrustedAuthorsAreExcluded()
    {
        // Arrange
        JsonObject owner = RuntimeFixtures.OwnerComment();
        JsonArray previous = Feedback.Normalize(new JsonArray(owner.Copy()), new JsonArray(), new JsonArray(), RuntimeFixtures.Allowlist(), [RuntimeFixtures.NotePath]);
        owner["body"] = "Please explain the corrected boundary too.";
        JsonObject stranger = owner.Copy();
        stranger.Obj("user")["id"] = 999;

        // Act
        JsonArray current = Feedback.Normalize(new JsonArray(owner, stranger), new JsonArray(), new JsonArray(), RuntimeFixtures.Allowlist(), [RuntimeFixtures.NotePath]);

        // Assert
        current.Should().ContainSingle();
        current[0]!.Str("key").Should().NotBe(previous[0]!.Str("key"));
        current[0]!.Arr("paths").Strings().Should().Equal(RuntimeFixtures.NotePath);
    }

    [Fact]
    public void TerminalPrAdvancesGenerationAndPreservesRejectionAudit()
    {
        // Arrange
        const string status = "closed";

        string topic = Core.TopicId(Core.TopicFor(DomainFixtures.Path));
        JsonObject proposal = DomainFixtures.Proposal(DomainFixtures.Edit());
        JsonObject result = Proposal.Apply(new Dictionary<string, string> { [DomainFixtures.Path] = DomainFixtures.Note }, proposal);
        var pr = new JsonObject { ["topic_id"] = topic, ["generation"] = 1, ["number"] = 7, ["status"] = "open", ["draft"] = true };
        JsonObject state = Core.SyncPrs(Core.NewState(), new JsonArray(pr.Copy()));
        state.Obj("prs").Obj(topic + ":1")["proposal_records"] = new JsonArray(new JsonObject { ["batch"] = new JsonObject(), ["proposal"] = proposal, ["result"] = result });
        pr["status"] = status;

        // Act
        JsonObject terminal = Core.SyncPrs(state, new JsonArray(pr));

        // Assert
        terminal.Obj("topics").Obj(topic).Int("generation").Should().Be(2);
        terminal.Obj("prs").Obj(topic + ":1")["proposal_records"].Should().BeNull();
        terminal.Obj("prs").Obj(topic + ":1").Obj("terminal_audit").Int("record_count").Should().Be(1);
        terminal.Arr("rejections").Count.Should().Be(status == "closed" ? 1 : 0);
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
