using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class SourcePublicationReviewFreezeTests
{
    [Theory]
    [InlineData(false, false, false)]
    [InlineData(false, true, false)]
    [InlineData(true, false, false)]
    [InlineData(true, true, false)]
    [InlineData(true, true, true)]
    public async Task ReadyTransitionPreservesFreezeAndRequiresSavedOwnerCausality(bool recovery, bool requested, bool legacy)
    {
        // Arrange
        var store = new MemoryStateStore(Core.NewState());
        var api = new ReviewRaceApi(store);
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        await runtime.PublishAsync(RuntimeFixtures.Request("Original", "First candidate"));
        string reviewedHead = api.Inner.Head;
        JsonObject request = RuntimeFixtures.Request("First candidate", "Next candidate");
        request["expected_pr_number"] = 1;
        request["expected_branch_sha"] = reviewedHead;
        if (requested)
        {
            api.Inner.Comments.Add(RuntimeFixtures.OwnerComment());
            JsonArray pending = await Feedback.PollAsync(api, 1, RuntimeFixtures.Allowlist());
            request["pending_feedback"] = pending.Copy();
            request["edits"] = new JsonArray(new JsonObject { ["path"] = RuntimeFixtures.NotePath, ["feedback_keys"] = new JsonArray(pending[0]!.Str("key")) });
            request["feedback_revision"] = new JsonObject
            {
                ["allowlist"] = new JsonArray("42:owner"),
                ["processed"] = new JsonObject { ["comment:7"] = pending[0]!["revision"]!.DeepClone() }
            };
        }
        api.MarkReadyOnCommit = true;
        api.InterruptAfterCommit = recovery;

        // Act
        JsonObject result;
        if (recovery)
        {
            Func<Task> interrupted = async () => await runtime.PublishAsync(request);
            await interrupted.Should().ThrowAsync<RuntimeFailure>();
            if (legacy)
            {
                StateSnapshot snapshot = await store.ReadAsync();
                JsonObject state = snapshot.State.Copy();
                state.Obj("pending_operation").Remove("edits");
                state.Obj("pending_operation").Remove("pending_feedback");
                await store.WriteAsync(state, snapshot, "fixture: legacy journal");
            }
            result = (await runtime.RecoverPendingAsync())!;
        }
        else
        {
            result = await runtime.PublishAsync(request);
        }
        JsonObject saved = (await store.ReadAsync()).State;

        // Assert
        bool allowed = requested && !legacy;
        JsonObject row = saved.Obj("prs").Obj($"{RuntimeFixtures.Topic}:1");
        row.Bool("frozen").Should().BeTrue();
        row.Str("review_started_head_sha").Should().Be(reviewedHead);
        result.Str("status").Should().Be(allowed ? "awaiting_export" : "review_started");
        api.Inner.Source.Should().Be(allowed ? "Next candidate" : "First candidate");
        api.Inner.DraftConversions.Should().Be(allowed ? 1 : 0);
        api.FreezePersistedBeforeConversion.Should().Be(allowed);
        saved["pending_operation"].Should().BeNull();
        api.Inner.PrCreates.Should().Be(1);
        if (!allowed)
        {
            api.Inner.Head.Should().Be(reviewedHead);
            saved.Obj("invalidated_operations").Single().Value!.Obj("candidate").Str(RuntimeFixtures.NotePath).Should().Be("Next candidate");
            (await runtime.RecoverPendingAsync()).Should().BeNull();
        }
    }

    private sealed class ReviewRaceApi(IStateStore store) : IGitHubApi
    {
        public RuntimeApi Inner { get; } = new();
        public string Repo => Inner.Repo;
        public bool MarkReadyOnCommit { get; set; }
        public bool InterruptAfterCommit { get; set; }
        public bool FreezePersistedBeforeConversion { get; private set; }
        private bool interrupt;

        public async Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            if (interrupt && method == "GET" && path == "/pulls/1")
            {
                interrupt = false;
                throw new RuntimeFailure("Fixture interruption after commit creation.");
            }
            JsonNode? result = await Inner.RequestAsync(method, path, payload, paginate, cancellationToken);
            if (MarkReadyOnCommit && method == "POST" && path == "/git/commits")
            {
                MarkReadyOnCommit = false;
                Inner.Pr["draft"] = false;
                interrupt = InterruptAfterCommit;
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
