using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class RecoveryBranchConflictTests
{
    private const string TopicPath = "Vault/Home/Programming/AAA/Card.md";
    private const string OtherPath = "Vault/Home/Programming/ZZZ/Other.md";
    private const string LaterPath = "Vault/Home/Programming/AAA/Later.md";
    private const string Source = "The original mechanism.\n";
    private const string Candidate = "The reviewed mechanism.\n";
    private static readonly string Topic = Core.TopicId(Core.TopicFor(TopicPath));
    private static readonly string Branch = Runtime.ExpectedManagedBranch(Topic, 1);

    [Theory]
    [InlineData("prepared", false, false)]
    [InlineData("commit_created", false, true)]
    [InlineData("branch_updated", true, false)]
    [InlineData("pr_updated", false, true)]
    public async Task Owner_branch_conflict_archives_the_candidate_and_allows_other_topic_work(string phase, bool missing, bool knownPr)
    {
        // Arrange
        using var files = new NoteFiles();
        bool actualPr = knownPr || phase == "branch_updated";
        bool observedReview = phase == "pr_updated";
        var api = new RecoveryApi { Missing = missing, HasPr = actualPr, Draft = !observedReview };
        JsonObject operation = Operation(phase, knownPr);
        operation["receipts"] = Receipt(Core.RulesVersion(files.Root));
        JsonObject state = Core.NewState();
        state["pending_operation"] = operation.Copy();
        state["pending_author_proposal"] = new JsonObject { ["topic_id"] = Topic, ["proposal"] = new JsonObject { ["audit"] = "original author proposal" } };
        if (knownPr)
        {
            state.RequiredObject("prs")[Topic + ":1"] = new JsonObject { ["topic_id"] = Topic, ["generation"] = 1, ["number"] = 7, ["status"] = "open", ["frozen"] = false };
        }
        var store = new MemoryStateStore(state);
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        var model = new KeepModel();
        var config = new JsonObject { ["repo"] = api.Repo };
        ImprovementEngine Engine() => new(files.Root, config, store, model, api, runtime,
            notesLoader: files.Notes, snapshotShaLoader: () => "base");

        // Act: reconcile a definitive ref mismatch before any draft or branch mutation.
        JsonObject paused = (await runtime.RecoverPendingAsync())!;
        StateSnapshot archived = await store.ReadAsync();

        // Assert
        paused.Str("status").Should().Be("topic_paused");
        archived.State["pending_operation"].Should().BeNull();
        archived.State["pending_author_proposal"].Should().BeNull();
        JsonObject audit = archived.State.Obj("invalidated_operations").Obj("interrupted-op");
        audit.Str("phase").Should().Be(phase);
        JsonNode.DeepEquals(audit["candidate"], operation["candidate"]).Should().BeTrue();
        audit.Str("custom_audit").Should().Be("preserve original evidence");
        audit.Obj("evidence").Str("expected_head").Should().Be(phase is "prepared" or "commit_created" ? "parent-head" : "candidate-head");
        audit.Obj("evidence").Str("observed_head").Should().Be(missing ? "" : "owner-head");
        JsonObject marker = archived.State.Obj("topics").Obj(Topic).Obj("publication_conflict");
        marker.Str("op_id").Should().Be("interrupted-op");
        marker.Int("generation").Should().Be(1);
        marker.Str("reason").Should().Contain(missing ? "disappeared" : "changed");
        archived.State.Arr("rejections").Should().BeEmpty();
        archived.State.Obj("prs").Count.Should().Be(actualPr ? 1 : 0);
        if (actualPr)
        {
            JsonObject owningPr = archived.State.Obj("prs").Obj(Topic + ":1");
            owningPr.Int("number").Should().Be(7);
            owningPr.Str("head_sha").Should().Be(missing ? "" : "owner-head");
            owningPr.Bool("frozen").Should().Be(observedReview);
            owningPr.Str("review_started_head_sha").Should().Be(observedReview ? "owner-head" : "");
            JsonNode.DeepEquals(owningPr["proposal_records"], operation.Obj("receipts")["records"]).Should().BeTrue();
        }

        // Arrange: a ready PR can return to draft before ordinary reconciliation sees it.
        api.Draft = true;

        // Act: the next apply opportunity must not replay the candidate or poll the paused topic.
        JsonObject progressed = await Engine().RunAsync(apply: true, withModel: true);
        JsonObject settled = await Engine().RunAsync(apply: true, withModel: true);

        // Assert
        progressed.Str("status").Should().Be("no_worthwhile_changes");
        settled.Str("status").Should().Be("topics_paused");
        model.Paths.Should().Equal(OtherPath);
        api.Writes.Should().Be(0);
        api.Paths.Should().NotContain(path => path.Contains("/files?", StringComparison.Ordinal) || path.Contains("/comments?", StringComparison.Ordinal) || path.Contains("/reviews?", StringComparison.Ordinal) || path.StartsWith("/contents/", StringComparison.Ordinal));
        api.OwnerSource.Should().Be("Owner's concurrent note edit.");
        File.ReadAllText(Path.Combine(files.Root, TopicPath)).Should().Be(Source);
        if (observedReview)
        {
            JsonObject reconciledPr = (await store.ReadAsync()).State.Obj("prs").Obj(Topic + ":1");
            reconciledPr.Bool("frozen").Should().BeTrue();
            reconciledPr.Str("review_started_head_sha").Should().Be("owner-head");
        }

        if (phase == "pr_updated")
        {
            // Arrange: closure advances the owning generation; its audit remains historical.
            api.PrClosed = true;
            files.IncludeLater = true;

            // Act
            JsonObject nextGeneration = await Engine().RunAsync(apply: true, withModel: true);
            StateSnapshot afterClosure = await store.ReadAsync();

            // Assert
            nextGeneration.Str("status").Should().Be("no_worthwhile_changes");
            model.Paths.Should().Equal(OtherPath, LaterPath, TopicPath);
            afterClosure.State.Obj("topics").Obj(Topic).Int("generation").Should().Be(2);
            afterClosure.State.Obj("topics").Obj(Topic).Obj("publication_conflict").Int("generation").Should().Be(1);
            afterClosure.State.Obj("invalidated_operations").ContainsKey("interrupted-op").Should().BeTrue();
            afterClosure.State.Arr("rejections").Should().ContainSingle().Which.Str("fingerprint")
                .Should().Be(LegacyIdentity.Proposal(operation.Obj("receipts").Obj("proposal").Arr("edits")[0]!.AsObject()));
            afterClosure.State.Obj("prs").Obj(Topic + ":1").Obj("terminal_audit").Int("record_count").Should().Be(1);
            afterClosure.State.Obj("notes").Obj(TopicPath).Str("outcome").Should().Be("keep");
            api.Writes.Should().Be(0);
        }
    }

    [Fact]
    public async Task Uncertain_ref_read_failure_preserves_the_global_journal_for_retry()
    {
        // Arrange
        var api = new RecoveryApi { ReadFailure = true };
        JsonObject state = Core.NewState();
        state["pending_operation"] = Operation("prepared", false);
        var store = new MemoryStateStore(state);
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });

        // Act
        Exception? interrupted = await Record.ExceptionAsync(() => runtime.RecoverPendingAsync());
        StateSnapshot after = await store.ReadAsync();

        // Assert
        interrupted.Should().BeOfType<GitHubApiFailure>();
        after.State.Obj("pending_operation").Str("op_id").Should().Be("interrupted-op");
        after.State.Obj("invalidated_operations").Count.Should().Be(0);
        after.State.Obj("topics").Count.Should().Be(0);
        api.Writes.Should().Be(0);
    }

    [Fact]
    public async Task Recovery_accepts_its_own_already_applied_commit_without_rewriting_the_branch()
    {
        // Arrange
        var api = new RecoveryApi { HasPr = true, Head = "candidate-head", Draft = true, InterruptPrUpdate = true };
        JsonObject state = Core.NewState();
        state["pending_operation"] = Operation("commit_created", true);
        var store = new MemoryStateStore(state);
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });

        // Act: stop at the next metadata update after the idempotent branch reconciliation.
        Exception? interrupted = await Record.ExceptionAsync(() => runtime.RecoverPendingAsync());
        StateSnapshot after = await store.ReadAsync();

        // Assert
        interrupted.Should().BeOfType<RuntimeFailure>().Which.Message.Should().Be("Fixture interrupted PR metadata update.");
        after.State.Obj("pending_operation").Str("phase").Should().Be("branch_updated");
        after.State.Obj("invalidated_operations").Count.Should().Be(0);
        after.State.Obj("topics").Count.Should().Be(0);
        api.BranchWrites.Should().Be(0);
    }

    private static JsonObject Operation(string phase, bool knownPr) => new()
    {
        ["op_id"] = "interrupted-op",
        ["phase"] = phase,
        ["topic"] = Topic,
        ["generation"] = 1,
        ["branch"] = Branch,
        ["pr_number"] = knownPr ? 7 : 0,
        ["parent_head"] = "parent-head",
        ["candidate"] = new JsonObject { [TopicPath] = Candidate },
        ["candidate_hashes"] = new JsonObject { [TopicPath] = LegacyIdentity.Fingerprint(JsonValue.Create(Candidate)) },
        ["evidence"] = new JsonObject { ["commit_sha"] = phase == "prepared" ? "" : "candidate-head" },
        ["feedback_revision"] = new JsonObject { ["allowlist"] = new JsonArray(), ["processed"] = new JsonObject() },
        ["prepared_source_version"] = 1,
        ["prepared_at"] = "2026-10-31T08:00:00Z",
        ["custom_audit"] = "preserve original evidence"
    };

    private static JsonObject Receipt(string rules)
    {
        JsonObject batch = new()
        {
            ["topic"] = Core.TopicFor(TopicPath),
            ["topic_id"] = Topic,
            ["notes"] = new JsonArray(DomainFixtures.NoteRecord(TopicPath, Source)),
            ["rules_hash"] = rules
        };
        JsonObject proposal = DomainFixtures.Proposal(new JsonObject
        {
            ["path"] = TopicPath,
            ["expected_hash"] = LegacyIdentity.Digest(Source),
            ["before"] = Source,
            ["after"] = Candidate,
            ["reason"] = "Clarify the operating mechanism.",
            ["kind"] = "note",
            ["learning_target"] = "same",
            ["essential_meanings"] = new JsonArray(),
            ["sources"] = new JsonArray(),
            ["feedback_keys"] = new JsonArray()
        });
        JsonObject result = new() { ["sources"] = new JsonObject { [TopicPath] = Candidate } };
        return new JsonObject
        {
            ["batch"] = batch,
            ["proposal"] = proposal,
            ["result"] = result,
            ["records"] = new JsonArray(new JsonObject { ["batch"] = batch.Copy(), ["proposal"] = proposal.Copy(), ["result"] = result.Copy() })
        };
    }

    private sealed class NoteFiles : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "recovery-topic-" + Guid.NewGuid().ToString("N"));
        public bool IncludeLater { get; set; }

        public NoteFiles()
        {
            DomainFixtures.CreateReviewContract(Root);
            foreach (string path in new[] { TopicPath, OtherPath, LaterPath })
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(Root, path))!);
                File.WriteAllText(Path.Combine(Root, path), Source);
            }
        }

        public JsonArray Notes()
        {
            var notes = new JsonArray(DomainFixtures.NoteRecord(TopicPath, Source), DomainFixtures.NoteRecord(OtherPath, Source));
            if (IncludeLater)
            {
                notes.Add(DomainFixtures.NoteRecord(LaterPath, Source));
            }
            return notes;
        }
        public void Dispose() => Directory.Delete(Root, recursive: true);
    }

    private sealed class KeepModel : IModelProvider
    {
        public List<string> Paths { get; } = [];

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string[] paths = payload.RequiredObject("notes").Select(item => item.Key).ToArray();
            Paths.AddRange(paths);
            return Task.FromResult(new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(),
                ["dispositions"] = new JsonArray(paths.Select(path => (JsonNode)new JsonObject { ["path"] = path, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." }).ToArray()),
                ["feedback"] = new JsonArray()
            });
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default) =>
            Task.FromResult(DomainFixtures.UnchangedReview(payload));
    }

    private sealed class RecoveryApi : IGitHubApi
    {
        public string Repo => "owner/repo";
        public string Head { get; set; } = "owner-head";
        public string OwnerSource => "Owner's concurrent note edit.";
        public bool Missing { get; init; }
        public bool ReadFailure { get; init; }
        public bool HasPr { get; init; }
        public bool Draft { get; set; } = true;
        public bool InterruptPrUpdate { get; init; }
        public bool PrClosed { get; set; }
        public int Writes { get; private set; }
        public int BranchWrites { get; private set; }
        public List<string> Paths { get; } = [];

        private JsonObject Pr() => new()
        {
            ["number"] = 7,
            ["state"] = PrClosed ? "closed" : "open",
            ["draft"] = Draft,
            ["body"] = Runtime.Marker(Topic, 1),
            ["head"] = new JsonObject { ["ref"] = Branch, ["sha"] = Head, ["repo"] = new JsonObject { ["full_name"] = Repo } },
            ["base"] = new JsonObject { ["ref"] = "main", ["repo"] = new JsonObject { ["full_name"] = Repo } }
        };

        public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            Paths.Add(path);
            if (method != "GET")
            {
                if (path.StartsWith("/git/refs", StringComparison.Ordinal))
                {
                    BranchWrites++;
                }
                if (InterruptPrUpdate && method == "PATCH" && path == "/pulls/7")
                {
                    throw new RuntimeFailure("Fixture interrupted PR metadata update.");
                }
                Writes++;
                throw new InvalidOperationException("Conflicted recovery must not mutate GitHub.");
            }
            JsonNode response;
            if (path == "/git/ref/heads/" + Uri.EscapeDataString(Branch))
            {
                if (ReadFailure)
                {
                    throw new GitHubApiFailure("Uncertain remote failure", 503);
                }
                if (Missing)
                {
                    throw new GitHubApiFailure("Missing branch", 404);
                }
                response = new JsonObject { ["object"] = new JsonObject { ["sha"] = Head } };
            }
            else
            {
                response = path switch
                {
                    "/git/ref/heads/main" => new JsonObject { ["object"] = new JsonObject { ["sha"] = "base" } },
                    "/pulls/7" => Pr(),
                    "/pulls?state=all&per_page=100" or "/pulls?state=open&per_page=100" => HasPr ? new JsonArray(Pr()) : new JsonArray(),
                    _ => throw new InvalidOperationException("Paused topics must not be polled: " + path)
                };
            }
            return Task.FromResult<JsonNode?>(response);
        }

        public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default)
        {
            Writes++;
            throw new InvalidOperationException("Conflicted recovery must not change draft status.");
        }
    }
}
