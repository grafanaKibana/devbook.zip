using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class SourceBudgetTests
{
    private const string BadPath = "Vault/Home/Programming/AAA/ManySources.md";
    private const string GoodPath = "Vault/Home/Programming/ZZZ/Other.md";
    private const string Source = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\nThe original mechanism.\n";

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public async Task Invalid_source_workloads_are_quarantined_and_other_work_proceeds(bool savedProposal, bool unsupportedHost)
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "source-budget-" + Guid.NewGuid().ToString("N"));
        DomainFixtures.CreateReviewContract(root);
        try
        {
            var notes = new JsonArray(DomainFixtures.NoteRecord(BadPath, Source), DomainFixtures.NoteRecord(GoodPath, Source));
            var config = new JsonObject { ["max_notes_per_run"] = 1 };
            JsonObject proposal = unsupportedHost ? WithSources(1, "docs.docker.com") : WithSources(13);
            string stage = unsupportedHost ? "source_policy" : "source_budget";
            JsonObject state = Core.NewState();
            if (savedProposal)
            {
                string rules = Core.RulesVersion(root);
                state["pending_author_proposal"] = new JsonObject
                {
                    ["topic_id"] = Core.TopicId(Core.TopicFor(BadPath)),
                    ["batch"] = DevBook.Tooling.Improvement.Queue.SelectBatch(state, notes, rules, config),
                    ["proposal"] = proposal.Copy(),
                    ["source_hashes"] = new JsonObject { [BadPath] = LegacyIdentity.Digest(Source) },
                    ["feedback_keys"] = new JsonArray(),
                    ["rules_hash"] = rules,
                    ["prepared_source_version"] = 1,
                    ["prepared_at"] = "2026-10-31T08:00:00Z"
                };
            }
            var store = new MemoryStateStore(state);
            var model = new Author(proposal);
            var fetches = 0;
            ImprovementEngine Engine() => new(root, config, store, model, notesLoader: () => notes.Copy(),
                sourceFetcher: async (url, token) =>
                {
                    fetches++;
                    await Runtime.ValidateSourceUrlAsync(url, ["learn.microsoft.com"], token);
                    return "Primary documentation.";
                });

            // Act: quarantine the fresh or saved invalid proposal without network work.
            JsonObject blocked = await Engine().RunAsync(withModel: true);
            StateSnapshot afterBlocked = await store.ReadAsync();

            // Assert
            blocked.Str("status").Should().Be("proposal_blocked");
            blocked.Str("stage").Should().Be(stage);
            blocked.Str("reason").Should().Contain(unsupportedHost ? "explicitly allowed public HTTPS host" : "13 distinct source URLs");
            afterBlocked.State["pending_author_proposal"].Should().BeNull();
            JsonObject archived = afterBlocked.State.Obj("invalid_proposals").Single().Value!.AsObject();
            archived.Obj("blocked_review").Str("stage").Should().Be(stage);
            JsonNode.DeepEquals(archived["proposal"], proposal).Should().BeTrue();
            fetches.Should().Be(unsupportedHost ? 1 : 0);

            // Act: the unchanged invalid proposal cannot monopolize later opportunities.
            JsonObject progressed = await Engine().RunAsync(withModel: true);
            JsonObject settled = await Engine().RunAsync(withModel: true);
            StateSnapshot after = await store.ReadAsync();

            // Assert
            progressed.Str("status").Should().Be("no_worthwhile_changes");
            settled.Str("status").Should().Be("no_changes");
            model.Paths.Last().Should().Be(GoodPath);
            model.Paths.Should().HaveCount(savedProposal ? 1 : 2);
            model.Reviews.Should().Be(1);
            fetches.Should().Be(unsupportedHost ? 1 : 0);
            after.State.Obj("notes").Obj(GoodPath).Str("outcome").Should().Be("keep");
            after.State.Obj("invalid_proposals").Count.Should().Be(1);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task Transient_fetch_failure_keeps_a_within_budget_proposal_resumable()
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "source-retry-" + Guid.NewGuid().ToString("N"));
        DomainFixtures.CreateReviewContract(root);
        try
        {
            JsonObject proposal = WithSources(1);
            proposal.Arr("edits")[0]!.Arr("sources").Add(proposal.Arr("edits")[0]!.Arr("sources")[0]!.DeepClone());
            var model = new Author(proposal);
            var store = new MemoryStateStore(Core.NewState());
            var config = new JsonObject { ["max_notes_per_run"] = 1, ["max_sources_per_run"] = 1 };
            var fetches = 0;
            ImprovementEngine Engine() => new(root, config, store, model,
                notesLoader: () => new JsonArray(DomainFixtures.NoteRecord(BadPath, Source)),
                sourceFetcher: (_, _) => { fetches++; return Task.FromException<string>(new IOException("Temporary source failure.")); });

            // Act: a network failure is a transient interruption, including on resumption.
            Exception? first = await Record.ExceptionAsync(() => Engine().RunAsync(withModel: true));
            Exception? resumed = await Record.ExceptionAsync(() => Engine().RunAsync(withModel: true));
            StateSnapshot after = await store.ReadAsync();

            // Assert
            first.Should().BeOfType<IOException>().Which.Message.Should().Be("Temporary source failure.");
            resumed.Should().BeOfType<IOException>();
            JsonNode.DeepEquals(after.State.Obj("pending_author_proposal")["proposal"], proposal).Should().BeTrue();
            after.State.Obj("invalid_proposals").Count.Should().Be(0);
            after.State.Obj("held_proposals").Count.Should().Be(0);
            model.Paths.Should().ContainSingle();
            model.Reviews.Should().Be(0);
            fetches.Should().Be(2);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static JsonObject WithSources(int count, string host = "learn.microsoft.com")
    {
        string[] urls = Enumerable.Range(1, count).Select(index => $"https://{host}/dotnet/source-{index}").ToArray();
        return DomainFixtures.Proposal(new JsonObject
        {
            ["path"] = BadPath,
            ["expected_hash"] = LegacyIdentity.Digest(Source),
            ["before"] = "The original mechanism.",
            ["after"] = "The clarified mechanism.\n\n" + string.Join('\n', urls.Select(url => $"- [Primary source]({url})")),
            ["reason"] = "Clarify the mechanism from primary sources.",
            ["kind"] = "note",
            ["learning_target"] = "same",
            ["essential_meanings"] = new JsonArray(),
            ["sources"] = new JsonArray(urls.Select(url => (JsonNode)new JsonObject { ["url"] = url, ["claim"] = "The clarified mechanism.", ["version"] = "Current documentation" }).ToArray()),
            ["feedback_keys"] = new JsonArray()
        });
    }

    private sealed class Author(JsonObject proposal) : IModelProvider
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
            payload.RequiredObject("proposal").Arr("edits").Should().BeEmpty();
            return Task.FromResult(DomainFixtures.UnchangedReview(payload));
        }
    }
}
