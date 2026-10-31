using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ProposalSizeTests
{
    private const string FirstPath = "Vault/Home/Programming/AAA/First.md";
    private const string SecondPath = "Vault/Home/Programming/AAA/Second.md";
    private const string OtherPath = "Vault/Home/Programming/ZZZ/Other.md";
    private const string Source = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\nThe original mechanism.\n";

    [Theory]
    [InlineData(false, false, false)]
    [InlineData(true, false, false)]
    [InlineData(false, true, false)]
    [InlineData(true, true, false)]
    [InlineData(false, false, true)]
    public async Task Oversized_initial_proposals_are_held_and_existing_prs_are_frozen(bool savedProposal, bool lineLimit, bool existingPr)
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "proposal-size-" + Guid.NewGuid().ToString("N"));
        DomainFixtures.CreateReviewContract(root);
        try
        {
            var notes = new JsonArray(DomainFixtures.NoteRecord(FirstPath, Source), DomainFixtures.NoteRecord(SecondPath, Source), DomainFixtures.NoteRecord(OtherPath, Source));
            var config = new JsonObject
            {
                ["max_notes_per_run"] = 2,
                ["max_pr_notes"] = lineLimit ? 16 : 1,
                ["max_pr_lines"] = lineLimit ? 1 : 1200
            };
            JsonObject proposal = ProposalFor(FirstPath, SecondPath);
            JsonObject state = Core.NewState();
            string topicId = Core.TopicId(Core.TopicFor(FirstPath));
            string prKey = topicId + ":1";
            if (existingPr)
            {
                state.RequiredObject("prs")[prKey] = new JsonObject
                {
                    ["topic_id"] = topicId,
                    ["generation"] = 1,
                    ["number"] = 7,
                    ["status"] = "open",
                    ["frozen"] = false
                };
            }
            if (savedProposal)
            {
                string rules = Core.RulesVersion(root);
                state["pending_author_proposal"] = new JsonObject
                {
                    ["topic_id"] = topicId,
                    ["batch"] = DevBook.Tooling.Improvement.Queue.SelectBatch(state, notes, rules, config),
                    ["proposal"] = proposal.Copy(),
                    ["source_hashes"] = new JsonObject { [FirstPath] = LegacyIdentity.Digest(Source), [SecondPath] = LegacyIdentity.Digest(Source) },
                    ["feedback_keys"] = new JsonArray(),
                    ["rules_hash"] = rules,
                    ["prepared_source_version"] = 1,
                    ["prepared_at"] = "2026-10-31T08:00:00Z"
                };
            }
            var store = new MemoryStateStore(state);
            var model = new Author(proposal);
            ImprovementEngine Engine() => new(root, config, store, model, notesLoader: () => notes.Copy());

            // Act
            JsonObject blocked = await Engine().RunAsync(withModel: true);
            StateSnapshot quarantined = await store.ReadAsync();

            // Assert
            blocked.Int("model_calls").Should().Be(savedProposal ? 0 : 1);
            if (existingPr)
            {
                blocked.Str("status").Should().Be("size_limit");
                quarantined.State.Obj("prs").Obj(prKey).Bool("frozen").Should().BeTrue();
                JsonObject pending = quarantined.State.Obj("pending_author_proposal");
                JsonNode.DeepEquals(pending["proposal"], proposal).Should().BeTrue();
                pending.Obj("blocked_review").Str("reason").Should().Be("PR size limit reached");
                quarantined.State.Obj("held_proposals").Count.Should().Be(0);
                quarantined.State.Obj("invalid_proposals").Count.Should().Be(0);
            }
            else
            {
                blocked.Str("status").Should().Be("proposal_blocked");
                blocked.Str("stage").Should().Be("pr_size");
                blocked.Str("reason").Should().Contain($"2 notes (limit {config.Int("max_pr_notes")})")
                    .And.Contain($"changed lines (limit {config.Int("max_pr_lines")})");
                quarantined.State["pending_author_proposal"].Should().BeNull();
                JsonObject archived = quarantined.State.Obj("invalid_proposals").Single().Value!.AsObject();
                archived.Obj("blocked_review").Str("stage").Should().Be("pr_size");
                archived.Obj("blocked_review").Str("reason").Should().Be(blocked.Str("reason"));
                JsonNode.DeepEquals(archived["proposal"], proposal).Should().BeTrue();
                quarantined.State.Obj("held_proposals").ContainsKey(topicId).Should().BeTrue();
            }

            // Act: unchanged oversized work cannot monopolize later opportunities.
            JsonObject progressed = await Engine().RunAsync(withModel: true);
            JsonObject settled = await Engine().RunAsync(withModel: true);
            StateSnapshot after = await store.ReadAsync();

            // Assert
            progressed.Str("status").Should().Be("no_worthwhile_changes");
            settled.Str("status").Should().Be("no_changes");
            model.Batches.Should().Be(savedProposal ? 1 : 2);
            model.Paths.Last().Should().Be(OtherPath);
            model.Paths.Count(path => path == FirstPath || path == SecondPath).Should().Be(savedProposal ? 0 : 2);
            model.Reviews.Should().Be(1);
            after.State.Obj("notes").Obj(OtherPath).Str("outcome").Should().Be("keep");
            after.State.Obj("invalid_proposals").Count.Should().Be(existingPr ? 0 : 1);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static JsonObject ProposalFor(params string[] paths) => new()
    {
        ["version"] = 1,
        ["edits"] = new JsonArray(paths.Select(path => (JsonNode)new JsonObject
        {
            ["path"] = path,
            ["expected_hash"] = LegacyIdentity.Digest(Source),
            ["before"] = "The original mechanism.",
            ["after"] = "The clarified mechanism.\nThe concrete boundary.",
            ["reason"] = "Clarify the operating mechanism and boundary.",
            ["kind"] = "note",
            ["learning_target"] = "same",
            ["essential_meanings"] = new JsonArray(),
            ["sources"] = new JsonArray(),
            ["feedback_keys"] = new JsonArray()
        }).ToArray()),
        ["dispositions"] = new JsonArray(paths.Select(path => (JsonNode)new JsonObject { ["path"] = path, ["outcome"] = "changed", ["reason"] = "Clarified the explanation." }).ToArray()),
        ["feedback"] = new JsonArray()
    };

    private sealed class Author(JsonObject proposal) : IModelProvider
    {
        public List<string> Paths { get; } = [];
        public int Batches { get; private set; }
        public int Reviews { get; private set; }

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string[] paths = payload.RequiredObject("notes").Select(item => item.Key).ToArray();
            Paths.AddRange(paths);
            Batches++;
            return Task.FromResult(paths.Contains(FirstPath) ? proposal.Copy() : new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(),
                ["dispositions"] = new JsonArray(new JsonObject { ["path"] = OtherPath, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." }),
                ["feedback"] = new JsonArray()
            });
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Reviews++;
            payload.RequiredObject("proposal").Arr("edits").Should().BeEmpty();
            return Task.FromResult(DomainFixtures.UnchangedReview(payload));
        }
    }
}
