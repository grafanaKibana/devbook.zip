using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ReconciliationReviewFreezeTests
{
    private const string ProposedPath = "Vault/Home/Programming/NET/Proposed.md";
    private const string UnrelatedPath = "Vault/Home/Programming/NET/Unrelated.md";
    private const string Source = "The original mechanism.\n";
    private static readonly string TopicId = Core.TopicId(Core.TopicFor(ProposedPath));

    [Fact]
    public async Task Ready_then_draft_reconciliation_preserves_the_first_review_head_and_freeze()
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "reconciliation-review-" + Guid.NewGuid().ToString("N"));
        foreach (string path in new[] { ProposedPath, UnrelatedPath })
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(root, path))!);
            File.WriteAllText(Path.Combine(root, path), Source);
        }
        try
        {
            JsonObject state = Core.NewState();
            state.RequiredObject("prs")[TopicId + ":1"] = new JsonObject
            {
                ["topic_id"] = TopicId,
                ["generation"] = 1,
                ["number"] = 7,
                ["status"] = "open",
                ["draft"] = true,
                ["frozen"] = false,
                ["export_operation_id"] = "prior-export",
                ["base_note_hashes"] = new JsonObject
                {
                    [ProposedPath] = LegacyIdentity.Digest(Source),
                    [UnrelatedPath] = LegacyIdentity.Digest(Source)
                }
            };
            var api = new ReviewApi { Draft = false, Head = "reviewed-head" };
            var store = new MemoryStateStore(state);
            var config = new JsonObject { ["repo"] = api.Repo, ["automatic_export"] = true, ["owner_allowlist"] = RuntimeFixtures.Allowlist() };
            var model = new UnexpectedModel();
            var publisher = new GitHubRuntime(api, store, activation: () => { });
            ImprovementEngine Engine() => new(root, config, store, model, api, publisher,
                notesLoader: () => new JsonArray(DomainFixtures.NoteRecord(ProposedPath, Source), DomainFixtures.NoteRecord(UnrelatedPath, Source)),
                snapshotShaLoader: () => "base");

            // Act: observe owner review starting without any comment or submitted review.
            JsonObject ready = await Engine().RunAsync(withModel: true);
            JsonObject afterReady = (await store.ReadAsync()).State.Obj("prs").Obj(TopicId + ":1");

            // Assert
            ready.Str("status").Should().Be("no_changes");
            ready.Int("model_calls").Should().Be(0);
            afterReady.Str("review_started_head_sha").Should().Be("reviewed-head");
            afterReady.Bool("frozen").Should().BeTrue();

            // Arrange: the owner returns to draft, followed by a later head change.
            api.Draft = true;

            // Act
            JsonObject firstDraft = await Engine().RunAsync(withModel: true);
            api.Head = "later-head";
            JsonObject secondDraft = await Engine().RunAsync(withModel: true);
            JsonObject afterDrafts = (await store.ReadAsync()).State.Obj("prs").Obj(TopicId + ":1");

            // Assert: repeated reconciliation cannot reinterpret review as an export-only freeze.
            firstDraft.Str("status").Should().Be("no_changes");
            secondDraft.Str("status").Should().Be("no_changes");
            firstDraft.Int("model_calls").Should().Be(0);
            secondDraft.Int("model_calls").Should().Be(0);
            afterDrafts.Str("head_sha").Should().Be("later-head");
            afterDrafts.Str("review_started_head_sha").Should().Be("reviewed-head");
            afterDrafts.Bool("frozen").Should().BeTrue();
            model.Calls.Should().Be(0);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private sealed class UnexpectedModel : IModelProvider
    {
        public int Calls { get; private set; }

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Calls++;
            throw new InvalidOperationException("Unrelated additions must remain frozen after owner review.");
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("A frozen batch cannot reach review.");
    }

    private sealed class ReviewApi : IGitHubApi
    {
        public string Repo => "owner/repo";
        public bool Draft { get; set; }
        public string Head { get; set; } = "reviewed-head";

        public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            if (method != "GET")
            {
                throw new InvalidOperationException("Reconciliation must not mutate the PR.");
            }
            JsonNode response = path switch
            {
                "/git/ref/heads/main" => new JsonObject { ["object"] = new JsonObject { ["sha"] = "base" } },
                "/pulls?state=all&per_page=100" => new JsonArray(new JsonObject
                {
                    ["number"] = 7,
                    ["state"] = "open",
                    ["draft"] = Draft,
                    ["body"] = Runtime.Marker(TopicId, 1),
                    ["head"] = new JsonObject { ["ref"] = Runtime.ExpectedManagedBranch(TopicId, 1), ["sha"] = Head, ["repo"] = new JsonObject { ["full_name"] = Repo } },
                    ["base"] = new JsonObject { ["ref"] = "main", ["repo"] = new JsonObject { ["full_name"] = Repo } }
                }),
                "/pulls/7/files?per_page=100" => new JsonArray(new JsonObject { ["filename"] = ProposedPath, ["additions"] = 1, ["deletions"] = 1 }),
                "/issues/7/comments?per_page=100" or "/pulls/7/comments?per_page=100" or "/pulls/7/reviews?per_page=100" => new JsonArray(),
                _ when path.StartsWith("/contents/", StringComparison.Ordinal) => new JsonObject
                {
                    ["encoding"] = "base64",
                    ["type"] = "file",
                    ["content"] = Convert.ToBase64String(Encoding.UTF8.GetBytes("The already-proposed mechanism.\n"))
                },
                _ => throw new InvalidOperationException("Unexpected reconciliation request: " + path)
            };
            return Task.FromResult<JsonNode?>(response);
        }

        public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Reconciliation must not mutate the PR.");
    }
}
