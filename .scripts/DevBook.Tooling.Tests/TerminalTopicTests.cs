using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class TerminalTopicTests
{
    private const string OldPath = "Vault/Home/Programming/Retired/Card.md";
    private const string CurrentPath = "Vault/Home/Programming/Current/Card.md";
    private static readonly string OldTopic = Core.TopicFor(OldPath);
    private static readonly string OldTopicId = Core.TopicId(OldTopic);
    private static readonly string PrKey = OldTopicId + ":1";

    [Theory]
    [InlineData("closed", false)]
    [InlineData("merged", false)]
    [InlineData("closed", true)]
    [InlineData("merged", true)]
    [InlineData("open", true)]
    public async Task Missing_historical_topic_does_not_block_current_work(string status, bool priorOpen)
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "terminal-topic-" + Guid.NewGuid().ToString("N"));
        DomainFixtures.CreateReviewContract(root);
        try
        {
            JsonObject state = Core.NewState();
            JsonObject record = SavedRecord();
            if (priorOpen)
            {
                state.RequiredObject("prs")[PrKey] = new JsonObject
                {
                    ["topic_id"] = OldTopicId,
                    ["generation"] = 1,
                    ["number"] = 7,
                    ["status"] = "open",
                    ["proposal_records"] = new JsonArray(record.Copy())
                };
                if (status == "merged")
                {
                    state.RequiredObject("prs").Obj(PrKey)["export_operation_id"] = "old-export";
                    state["export_operations"] = new JsonObject
                    {
                        ["old-export"] = new JsonObject
                        {
                            ["topic"] = OldTopicId,
                            ["generation"] = 1,
                            ["receipts"] = new JsonObject
                            {
                                ["batch"] = record["batch"]!.DeepClone(),
                                ["proposal"] = record["proposal"]!.DeepClone(),
                                ["result"] = record["result"]!.DeepClone(),
                                ["records"] = new JsonArray(record.Copy())
                            }
                        }
                    };
                }
            }
            state.RequiredObject("feedback")["old-feedback"] = new JsonObject
            {
                ["key"] = "old-feedback",
                ["topic"] = OldTopic,
                ["pr_number"] = 7,
                ["status"] = "pending",
                ["paths"] = new JsonArray(OldPath)
            };
            var api = new HistoricalApi(status);
            var store = new MemoryStateStore(state);
            var model = new KeepModel();
            var config = new JsonObject { ["repo"] = api.Repo, ["owner_allowlist"] = RuntimeFixtures.Allowlist() };
            var publisher = new GitHubRuntime(api, store, activation: () => { });
            ImprovementEngine Engine() => new(root, config, store, model, api, publisher,
                notesLoader: () => new JsonArray(DomainFixtures.NoteRecord(CurrentPath)), snapshotShaLoader: () => "base");

            // Act: reconcile the old PR and process an unrelated current topic.
            JsonObject progressed = await Engine().RunAsync(withModel: true);
            JsonObject settled = await Engine().RunAsync(withModel: true);
            StateSnapshot after = await store.ReadAsync();

            // Assert
            progressed.Str("status").Should().Be("no_worthwhile_changes");
            settled.Str("status").Should().Be(status == "open" ? "topics_paused" : "no_changes");
            model.Paths.Should().Equal(CurrentPath);
            after.State.Obj("notes").Obj(CurrentPath).Str("outcome").Should().Be("keep");
            JsonObject historical = after.State.Obj("prs").Obj(PrKey);
            historical.Str("status").Should().Be(status);
            after.State.Obj("feedback").Obj("old-feedback").Str("status").Should().Be(status == "open" ? "pending" : "terminal");
            api.Paths.Should().OnlyContain(path => path == "/git/ref/heads/main" || path == "/pulls?state=all&per_page=100");
            if (status == "open")
            {
                historical.Bool("base_conflict").Should().BeTrue();
                historical.Bool("frozen").Should().BeTrue();
                historical.Str("pause_reason").Should().Contain("topic no longer exists");
                historical.Arr("proposal_records").Should().ContainSingle();
                after.State.Obj("topics").Obj(OldTopicId).Int("generation").Should().Be(1);
            }
            else
            {
                after.State.Obj("topics").Obj(OldTopicId).Int("generation").Should().Be(2);
                after.State.Obj("topics").Obj(OldTopicId).Str("last_terminal_status").Should().Be(status);
                if (priorOpen)
                {
                    historical["proposal_records"].Should().BeNull();
                    historical.Obj("terminal_audit").Int("record_count").Should().Be(1);
                }
                if (status == "closed" && priorOpen)
                {
                    after.State.Arr("rejections").Should().ContainSingle().Which.Str("fingerprint")
                        .Should().Be(LegacyIdentity.Proposal(record.Obj("proposal").Arr("edits")[0]!.AsObject()));
                }
                else
                {
                    after.State.Arr("rejections").Should().BeEmpty();
                }
                if (status == "merged" && priorOpen)
                {
                    after.State.Obj("finalized_exports").Obj("old-export").Str("head_sha").Should().Be("old-head");
                    after.State.Obj("notes").Obj(OldPath).Str("outcome").Should().Be("changed");
                }
            }
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static JsonObject SavedRecord()
    {
        JsonObject edit = DomainFixtures.Edit();
        edit["path"] = OldPath;
        JsonObject proposal = DomainFixtures.Proposal(edit);
        return new JsonObject
        {
            ["batch"] = new JsonObject
            {
                ["topic"] = OldTopic,
                ["topic_id"] = OldTopicId,
                ["notes"] = new JsonArray(DomainFixtures.NoteRecord(OldPath)),
                ["rules_hash"] = "old-rules"
            },
            ["proposal"] = proposal,
            ["result"] = new JsonObject { ["sources"] = new JsonObject { [OldPath] = DomainFixtures.Note.Replace("The original answer.", "The answer explains its mechanism and boundary.") } }
        };
    }

    private sealed class KeepModel : IModelProvider
    {
        public List<string> Paths { get; } = [];

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string path = payload.RequiredObject("notes").Single().Key;
            Paths.Add(path);
            return Task.FromResult(new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(),
                ["dispositions"] = new JsonArray(new JsonObject { ["path"] = path, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." }),
                ["feedback"] = new JsonArray()
            });
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default) =>
            Task.FromResult(DomainFixtures.UnchangedReview(payload));
    }

    private sealed class HistoricalApi(string status) : IGitHubApi
    {
        public string Repo => "owner/repo";
        public List<string> Paths { get; } = [];

        public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            if (method != "GET")
            {
                throw new InvalidOperationException("Historical PRs must not be mutated.");
            }
            Paths.Add(path);
            JsonNode result = path switch
            {
                "/git/ref/heads/main" => new JsonObject { ["object"] = new JsonObject { ["sha"] = "base" } },
                "/pulls?state=all&per_page=100" => new JsonArray(new JsonObject
                {
                    ["number"] = 7,
                    ["state"] = status == "open" ? "open" : "closed",
                    ["merged"] = status == "merged",
                    ["draft"] = true,
                    ["body"] = Runtime.Marker(OldTopicId, 1),
                    ["head"] = new JsonObject { ["ref"] = Runtime.ExpectedManagedBranch(OldTopicId, 1), ["sha"] = "old-head", ["repo"] = new JsonObject { ["full_name"] = Repo } },
                    ["base"] = new JsonObject { ["ref"] = "main", ["repo"] = new JsonObject { ["full_name"] = Repo } }
                }),
                _ => throw new InvalidOperationException("Historical PRs must not be polled: " + path)
            };
            return Task.FromResult<JsonNode?>(result);
        }

        public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("Historical PRs must not be mutated.");
    }
}
