using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class NormalPublicationFeedbackTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FeedbackChangedDuringCommitCreationArchivesCandidateWithoutUpdatingBranch(bool deleted)
    {
        // Arrange
        var api = new FeedbackRaceApi();
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        await runtime.PublishAsync(RuntimeFixtures.Request("Original", "First reviewed candidate"));
        string originalHead = api.Inner.Head;
        api.Inner.Comments.Add(RuntimeFixtures.OwnerComment());
        JsonArray pending = await Feedback.PollAsync(api, 1, RuntimeFixtures.Allowlist());
        JsonObject request = RuntimeFixtures.Request("First reviewed candidate", "Withdrawn candidate");
        request["expected_pr_number"] = 1;
        request["expected_branch_sha"] = originalHead;
        request["pending_feedback"] = pending.Copy();
        request["edits"] = new JsonArray(new JsonObject { ["path"] = RuntimeFixtures.NotePath, ["feedback_keys"] = new JsonArray(pending[0]!.Str("key")) });
        request["feedback_revision"] = new JsonObject
        {
            ["allowlist"] = new JsonArray("42:owner"),
            ["processed"] = new JsonObject { ["comment:7"] = pending[0]!["revision"]!.DeepClone() }
        };
        api.AfterCommitCreated = () =>
        {
            if (deleted)
            {
                api.Inner.Comments.Clear();
            }
            else
            {
                api.Inner.Comments[0]!["body"] = "Withdraw that instruction; leave this note unchanged.";
                api.Inner.Comments[0]!["updated_at"] = "2026-10-31T08:00:00Z";
            }
        };

        // Act
        JsonObject result = await runtime.PublishAsync(request);
        StateSnapshot saved = await store.ReadAsync();
        JsonObject? recovery = await runtime.RecoverPendingAsync();

        // Assert
        result.Str("status").Should().Be("feedback_changed");
        api.Inner.Head.Should().Be(originalHead);
        api.Inner.Source.Should().Be("First reviewed candidate");
        api.Inner.Commits.Should().Be(2);
        api.Inner.PrCreates.Should().Be(1);
        api.Inner.ForceWrites.Should().Be(0);
        saved.State["pending_operation"].Should().BeNull();
        JsonObject archived = saved.State.Obj("invalidated_operations").Single().Value!.AsObject();
        archived.Obj("candidate").Str(RuntimeFixtures.NotePath).Should().Be("Withdrawn candidate");
        archived.Obj("evidence").Str("commit_sha").Should().Be("commit-2");
        archived.Obj("evidence").Str("reason").Should().Be("Owner feedback changed before branch update");
        JsonNode.DeepEquals(archived["feedback_revision"], request["feedback_revision"]).Should().BeTrue();
        recovery.Should().BeNull();
    }

    private sealed class FeedbackRaceApi : IGitHubApi
    {
        public RuntimeApi Inner { get; } = new();
        public Action? AfterCommitCreated { get; set; }
        public string Repo => Inner.Repo;

        public async Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            JsonNode? result = await Inner.RequestAsync(method, path, payload, paginate, cancellationToken);
            if (method == "POST" && path == "/git/commits" && AfterCommitCreated is Action action)
            {
                AfterCommitCreated = null;
                action();
            }
            return result;
        }

        public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default) =>
            Inner.GraphqlAsync(query, variables, cancellationToken);
    }
}
