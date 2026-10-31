using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class InvalidProposalTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Invalid_author_proposal_is_archived_and_does_not_block_later_topics(bool savedProposal)
    {
        // Arrange
        const string badPath = "Vault/Home/Programming/ZZZ/Bad.md";
        const string otherPath = "Vault/Home/Programming/ZZZ/Other.md";
        const string goodPath = "Vault/Home/Programming/AAA/Good.md";
        const string feedbackKey = "comment:7:revision";
        const string otherFeedbackKey = "comment:8:revision";
        string root = Path.Combine(Path.GetTempPath(), "invalid-proposal-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var notes = new JsonArray(DomainFixtures.NoteRecord(badPath), DomainFixtures.NoteRecord(otherPath), DomainFixtures.NoteRecord(goodPath));
            var config = new JsonObject { ["max_notes_per_run"] = 1 };
            JsonObject state = Core.NewState();
            state.RequiredArray("rejections").Add("existing-owner-rejection");
            state.RequiredObject("feedback")[feedbackKey] = new JsonObject
            {
                ["key"] = feedbackKey,
                ["topic"] = Core.TopicFor(badPath),
                ["status"] = "pending",
                ["paths"] = new JsonArray(badPath)
            };
            state.RequiredObject("feedback")[otherFeedbackKey] = new JsonObject
            {
                ["key"] = otherFeedbackKey,
                ["topic"] = Core.TopicFor(otherPath),
                ["status"] = "pending",
                ["paths"] = new JsonArray(otherPath)
            };
            JsonObject invalid = DomainFixtures.Proposal(new JsonObject
            {
                ["path"] = badPath,
                ["expected_hash"] = LegacyIdentity.Digest(DomainFixtures.Note),
                ["before"] = "This anchor does not exist.",
                ["after"] = "The clarified mechanism.",
                ["reason"] = "Clarify the mechanism.",
                ["kind"] = "note",
                ["learning_target"] = "same",
                ["essential_meanings"] = new JsonArray(),
                ["sources"] = new JsonArray(),
                ["feedback_keys"] = new JsonArray(feedbackKey)
            });
            invalid["feedback"] = new JsonArray(new JsonObject { ["key"] = feedbackKey, ["outcome"] = "implemented", ["reason"] = "Clarified the requested mechanism." });
            Proposal.Validate(invalid);
            if (savedProposal)
            {
                string rules = Core.RulesVersion(root);
                state["pending_author_proposal"] = new JsonObject
                {
                    ["topic_id"] = Core.TopicId(Core.TopicFor(badPath)),
                    ["batch"] = DevBook.Tooling.Improvement.Queue.SelectBatch(state, notes, rules, config),
                    ["proposal"] = invalid.Copy(),
                    ["source_hashes"] = new JsonObject { [badPath] = LegacyIdentity.Digest(DomainFixtures.Note) },
                    ["feedback_keys"] = new JsonArray(feedbackKey),
                    ["rules_hash"] = rules,
                    ["prepared_source_version"] = 1,
                    ["prepared_at"] = "2026-10-31T08:00:00Z"
                };
            }
            var store = new MemoryStateStore(state);
            var model = new Author(invalid);
            ImprovementEngine Engine() => new(root, config, store, model, notesLoader: () => notes.Copy());

            // Act: quarantine the fresh or previously saved invalid proposal.
            JsonObject blocked = await Engine().RunAsync(withModel: true);
            StateSnapshot quarantined = await store.ReadAsync();

            // Assert
            blocked.Str("status").Should().Be("proposal_blocked");
            blocked.Str("reason").Should().Contain("replacement anchor must be unique");
            blocked.Int("model_calls").Should().Be(savedProposal ? 0 : 1);
            quarantined.State["pending_author_proposal"].Should().BeNull();
            JsonObject archived = quarantined.State.RequiredObject("invalid_proposals").Single().Value!.AsObject();
            JsonNode.DeepEquals(archived["proposal"], invalid).Should().BeTrue();
            archived.Obj("blocked_review").Str("stage").Should().Be("deterministic_application");
            archived.Obj("blocked_review").Str("reason").Should().Be(blocked.Str("reason"));
            archived.Arr("feedback_keys").Strings().Should().Equal(feedbackKey);
            archived.Arr("feedback_snapshot").Count.Should().Be(2);
            quarantined.State.Obj("held_proposals").ContainsKey(Core.TopicId(Core.TopicFor(badPath))).Should().BeTrue();

            // Act: the other same-topic request keeps priority despite the one-note cap.
            JsonObject otherRequest = await Engine().RunAsync(withModel: true);
            StateSnapshot afterOtherRequest = await store.ReadAsync();

            // Assert
            otherRequest.Str("status").Should().Be("no_worthwhile_changes");
            model.Paths.Last().Should().Be(otherPath);
            afterOtherRequest.State.RequiredObject("feedback").Obj(otherFeedbackKey).Str("status").Should().Be("keep");

            // Arrange: later topic work may replace or clear the latest semantic hold.
            afterOtherRequest.State.RequiredObject("held_proposals").Clear();
            await store.WriteAsync(afterOtherRequest.State, afterOtherRequest, "fixture clears latest topic hold");

            // Act: the archived invalid batch remains held while a new topic progresses.
            JsonObject progressed = await Engine().RunAsync(withModel: true);
            StateSnapshot after = await store.ReadAsync();

            // Assert
            progressed.Str("status").Should().Be("no_worthwhile_changes");
            model.Paths.Last().Should().Be(goodPath);
            model.Paths.Should().HaveCount(savedProposal ? 2 : 3);
            after.State.Obj("notes").Obj(goodPath).Str("outcome").Should().Be("keep");
            after.State.RequiredObject("invalid_proposals").Count.Should().Be(1);
            after.State.RequiredObject("feedback").Obj(feedbackKey).Str("status").Should().Be("pending");
            after.State.RequiredArray("rejections").Strings().Should().Equal("existing-owner-rejection");
            model.Reviews.Should().Be(0);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private sealed class Author(JsonObject invalid) : IModelProvider
    {
        public List<string> Paths { get; } = [];
        public int Reviews { get; private set; }

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string path = payload.RequiredObject("notes").Single().Key;
            Paths.Add(path);
            return Task.FromResult(path == invalid.Arr("edits")[0]!.Str("path") ? invalid.Copy() : new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(),
                ["dispositions"] = new JsonArray(new JsonObject { ["path"] = path, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." }),
                ["feedback"] = new JsonArray(payload.Arr("feedback").OfType<JsonObject>().Select(item => (JsonNode)new JsonObject
                {
                    ["key"] = item.Str("key"),
                    ["outcome"] = "keep",
                    ["reason"] = "No worthwhile changes."
                }).ToArray())
            });
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Reviews++;
            throw new InvalidOperationException("Invalid edits and successful keep outcomes do not reach review.");
        }
    }
}
