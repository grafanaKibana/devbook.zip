using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class CandidateValidationTests
{
    private const string BadPath = "Vault/Home/Programming/AAA/Card.md";
    private const string OtherPath = "Vault/Home/Programming/ZZZ/Other.md";
    private const string Source = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\nThe original mechanism.\n";

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Invalid_candidate_is_held_after_clean_review_and_other_topics_proceed(bool savedProposal)
    {
        // Arrange
        using var fixture = new RepositoryFixture();
        JsonObject proposal = ProposalFor("The clarified mechanism.\n\n[[Missing validation target]]");
        var config = Configuration(new JsonArray("git", "rev-parse", "--verify", "HEAD"));
        JsonObject state = Core.NewState();
        if (savedProposal)
        {
            string rules = Core.RulesVersion(fixture.Root);
            state["pending_author_proposal"] = new JsonObject
            {
                ["topic_id"] = Core.TopicId(Core.TopicFor(BadPath)),
                ["batch"] = DevBook.Tooling.Improvement.Queue.SelectBatch(state, fixture.Notes(), rules, config),
                ["proposal"] = proposal.Copy(),
                ["source_hashes"] = new JsonObject { [BadPath] = LegacyIdentity.Digest(Source) },
                ["feedback_keys"] = new JsonArray(),
                ["rules_hash"] = rules,
                ["prepared_source_version"] = 1,
                ["prepared_at"] = "2026-10-31T08:00:00Z"
            };
        }
        var store = new MemoryStateStore(state);
        var model = new CandidateModel(proposal);
        ImprovementEngine Engine() => new(fixture.Root, config, store, model,
            notesLoader: fixture.Notes, snapshotShaLoader: () => fixture.Snapshot);

        // Act: use the real isolated content validator after semantic review.
        JsonObject blocked = await Engine().RunAsync(withModel: true);
        StateSnapshot held = await store.ReadAsync();

        // Assert
        blocked.Str("status").Should().Be("proposal_blocked");
        blocked.Str("stage").Should().Be("repository_validation");
        blocked.Str("reason").Should().Contain("wikilink.unresolved").And.Contain("Missing validation target");
        held.State["pending_author_proposal"].Should().BeNull();
        JsonObject archived = held.State.Obj("invalid_proposals").Single().Value!.AsObject();
        JsonNode.DeepEquals(archived["proposal"], proposal).Should().BeTrue();
        archived.Obj("completed_review").Str("verdict").Should().Be("CLEAN");
        model.Reviews.Should().Be(1);

        // Act: unchanged invalid input cannot spend another review or block another topic.
        JsonObject progressed = await Engine().RunAsync(withModel: true);
        JsonObject settled = await Engine().RunAsync(withModel: true);

        // Assert
        progressed.Str("status").Should().Be("no_worthwhile_changes");
        settled.Str("status").Should().Be("no_changes");
        model.Paths.Count(path => path == BadPath).Should().Be(savedProposal ? 0 : 1);
        model.Paths.Last().Should().Be(OtherPath);
        model.Reviews.Should().Be(2);
        File.ReadAllText(Path.Combine(fixture.Root, BadPath)).Should().Be(Source);
        Git.Text(fixture.Root, "status", "--porcelain").Should().BeEmpty();
    }

    [Fact]
    public async Task External_validator_failure_preserves_the_proposal_and_resumes_without_reauthoring()
    {
        // Arrange
        using var fixture = new RepositoryFixture();
        var config = Configuration(new JsonArray("git", "rev-parse", "--verify", "refs/remotes/origin/validator-resource"));
        var store = new MemoryStateStore(Core.NewState());
        JsonObject proposal = ProposalFor("The clarified mechanism.");
        var model = new CandidateModel(proposal);
        ImprovementEngine Engine() => new(fixture.Root, config, store, model,
            notesLoader: fixture.Notes, snapshotShaLoader: () => fixture.Snapshot);

        // Act: the external validator's missing resource is an interruption, not invalid content.
        Exception? interrupted = await Record.ExceptionAsync(() => Engine().RunAsync(withModel: true));
        StateSnapshot pending = await store.ReadAsync();

        // Assert
        interrupted.Should().BeOfType<RuntimeFailure>().Which.Message.Should().Contain("Validation failed");
        JsonNode.DeepEquals(pending.State.Obj("pending_author_proposal")["proposal"], proposal).Should().BeTrue();
        pending.State.Obj("invalid_proposals").Count.Should().Be(0);
        pending.State.Obj("held_proposals").Count.Should().Be(0);
        model.Paths.Should().ContainSingle().Which.Should().Be(BadPath);
        model.Reviews.Should().Be(1);

        // Arrange: make the dependency available to the next isolated clone.
        Git.Run(fixture.Root, "update-ref", "refs/heads/validator-resource", fixture.Snapshot);

        // Act
        JsonObject resumed = await Engine().RunAsync(withModel: true);

        // Assert
        resumed.Str("status").Should().Be("proposed");
        resumed.Arr("validation").OfType<JsonObject>().Should().ContainSingle().Which.Str("result").Should().Be("passed");
        model.Paths.Should().ContainSingle();
        model.Reviews.Should().Be(2);
        File.ReadAllText(Path.Combine(fixture.Root, BadPath)).Should().Be(Source);
        Git.Text(fixture.Root, "status", "--porcelain").Should().BeEmpty();
    }

    private static JsonObject Configuration(JsonArray command) => new()
    {
        ["repo"] = "fixture/repo",
        ["max_notes_per_run"] = 1,
        ["validator_commands"] = new JsonArray(command)
    };

    private static JsonObject ProposalFor(string after) => DomainFixtures.Proposal(new JsonObject
    {
        ["path"] = BadPath,
        ["expected_hash"] = LegacyIdentity.Digest(Source),
        ["before"] = "The original mechanism.",
        ["after"] = after,
        ["reason"] = "Clarify the mechanism.",
        ["kind"] = "note",
        ["learning_target"] = "same",
        ["essential_meanings"] = new JsonArray(),
        ["sources"] = new JsonArray(),
        ["feedback_keys"] = new JsonArray()
    });

    private sealed class RepositoryFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "candidate-validation-" + Guid.NewGuid().ToString("N"));
        public string Snapshot { get; }

        public RepositoryFixture()
        {
            Directory.CreateDirectory(Path.Combine(Root, ".codex/agents"));
            File.WriteAllText(Path.Combine(Root, ".codex/agents/note-reviewer.toml"), "Fixture complete-note review contract");
            foreach (string path in new[] { BadPath, OtherPath })
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(Root, path))!);
                File.WriteAllText(Path.Combine(Root, path), Source);
            }
            Git.Run(Root, "init", "--quiet", "--initial-branch=main");
            Git.Run(Root, "config", "user.name", "Fixture");
            Git.Run(Root, "config", "user.email", "fixture@example.invalid");
            Git.Run(Root, "add", ".");
            Git.Run(Root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture: candidate validation");
            Snapshot = Git.Text(Root, "rev-parse", "HEAD");
        }

        public JsonArray Notes() => new(DomainFixtures.NoteRecord(BadPath, Source), DomainFixtures.NoteRecord(OtherPath, Source));

        public void Dispose() => Directory.Delete(Root, recursive: true);
    }

    private sealed class CandidateModel(JsonObject proposal) : IModelProvider
    {
        public List<string> Paths { get; } = [];
        public int Reviews { get; private set; }

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string path = payload.RequiredObject("notes").Single().Key;
            Paths.Add(path);
            return Task.FromResult(path == BadPath ? proposal.Copy() : new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(),
                ["dispositions"] = new JsonArray(new JsonObject { ["path"] = path, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." }),
                ["feedback"] = new JsonArray()
            });
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Reviews++;
            if (payload.RequiredObject("proposal").Arr("edits").Count == 0)
            {
                return Task.FromResult(DomainFixtures.UnchangedReview(payload));
            }
            string[] lines = payload.RequiredObject("current").Str(BadPath).Split('\n');
            int line = Array.IndexOf(lines, "The clarified mechanism.");
            return Task.FromResult(new JsonObject
            {
                ["verdict"] = "CLEAN",
                ["notes"] = new JsonArray(new JsonObject
                {
                    ["path"] = BadPath,
                    ["verdict"] = "CLEAN",
                    ["summary"] = "The current explanation states its mechanism.",
                    ["page_type"] = "concept",
                    ["split_suggestion"] = "Keep one mechanism.",
                    ["target_resolution"] = "RESOLVED",
                    ["findings"] = new JsonArray(),
                    ["current_text_evidence"] = new JsonArray(new JsonObject { ["quote"] = lines[line], ["line_start"] = line + 1, ["reason"] = "The current explanation addresses the target." }),
                    ["source_checks"] = new JsonArray(),
                    ["rejection_equivalence"] = new JsonArray(),
                    ["quality"] = new JsonObject { ["accuracy"] = "PASS", ["clarity"] = "PASS", ["rules_compliance"] = "PASS", ["question_quality"] = "NOT APPLICABLE", ["identity_safety"] = "NOT APPLICABLE" }
                })
            });
        }
    }
}
