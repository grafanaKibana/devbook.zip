using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using System.Text.Json.Nodes;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class RecoveryTests
{
    private const string RecoveryBranchConflictTopicPath = "Vault/Home/Programming/AAA/Card.md";
    private const string RecoveryBranchConflictOtherPath = "Vault/Home/Programming/ZZZ/Other.md";
    private const string RecoveryBranchConflictLaterPath = "Vault/Home/Programming/AAA/Later.md";
    private const string RecoveryBranchConflictSource = "The original mechanism.\n";
    private const string RecoveryBranchConflictCandidate = "The reviewed mechanism.\n";
    private static readonly string RecoveryBranchConflictTopic = Core.TopicId(Core.TopicFor(RecoveryBranchConflictTopicPath));
    private static readonly string RecoveryBranchConflictBranch = Runtime.ExpectedManagedBranch(RecoveryBranchConflictTopic, 1);

    [Theory]
    [InlineData("prepared", false, false)]
    [InlineData("pr_updated", false, true)]
    public async Task DefinitiveBranchConflictArchivesCandidateAndPreservesAudit(string phase, bool missing, bool knownPr)
    {
        // Arrange
        using var files = new RecoveryBranchConflictNoteFiles();
        bool actualPr = knownPr || phase == "branch_updated";
        bool observedReview = phase == "pr_updated";
        var api = new RecoveryBranchConflictRecoveryApi { Missing = missing, HasPr = actualPr, Draft = !observedReview };
        JsonObject operation = RecoveryBranchConflictOperation(phase, knownPr);
        operation["receipts"] = RecoveryBranchConflictReceipt(Core.RulesVersion(files.Root));
        JsonObject state = Core.NewState();
        state["pending_operation"] = operation.Copy();
        state["pending_author_proposal"] = new JsonObject { ["topic_id"] = RecoveryBranchConflictTopic, ["proposal"] = new JsonObject { ["audit"] = "original author proposal" } };
        if (knownPr)
        {
            state.RequiredObject("prs")[RecoveryBranchConflictTopic + ":1"] = new JsonObject { ["topic_id"] = RecoveryBranchConflictTopic, ["generation"] = 1, ["number"] = 7, ["status"] = "open", ["frozen"] = false };
        }
        var store = new MemoryStateStore(state);
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });

        // Act: reconcile a definitive ref mismatch before any draft or branch mutation.
        JsonObject paused = (await runtime.RecoverPendingAsync())!;
        StateSnapshot archived = await store.ReadAsync();

        // Assert
        paused.Str("status").Should().Be("topic_paused");
        archived.State["pending_operation"].Should().BeNull();
        archived.State.Obj("pending_author_proposal").Obj("proposal").Str("audit").Should().Be("original author proposal");
        JsonObject audit = archived.State.Obj("invalidated_operations").Obj("interrupted-op");
        audit.Str("phase").Should().Be(phase);
        JsonNode.DeepEquals(audit["candidate"], operation["candidate"]).Should().BeTrue();
        audit.Str("custom_audit").Should().Be("preserve original evidence");
        audit.Obj("evidence").Str("expected_head").Should().Be(phase is "prepared" or "commit_created" ? "parent-head" : "candidate-head");
        audit.Obj("evidence").Str("observed_head").Should().Be(missing ? "" : "owner-head");
        JsonObject marker = archived.State.Obj("topics").Obj(RecoveryBranchConflictTopic).Obj("publication_conflict");
        marker.Str("op_id").Should().Be("interrupted-op");
        marker.Int("generation").Should().Be(1);
        marker.Str("reason").Should().Contain(missing ? "disappeared" : "changed");
        archived.State.Arr("rejections").Should().BeEmpty();
        archived.State.Obj("prs").Count.Should().Be(actualPr ? 1 : 0);
        if (actualPr)
        {
            JsonObject owningPr = archived.State.Obj("prs").Obj(RecoveryBranchConflictTopic + ":1");
            owningPr.Int("number").Should().Be(7);
            owningPr.Str("head_sha").Should().Be(missing ? "" : "owner-head");
            owningPr.Bool("frozen").Should().Be(observedReview);
            owningPr.Str("review_started_head_sha").Should().Be(observedReview ? "owner-head" : "");
            JsonNode.DeepEquals(owningPr["proposal_records"], WorkloadReceipts.Records(operation.Obj("receipts"))).Should().BeTrue();
        }
    }

    [Fact]
    public async Task Uncertain_ref_read_failure_preserves_the_global_journal_for_retry()
    {
        // Arrange
        var api = new RecoveryBranchConflictRecoveryApi { ReadFailure = true };
        JsonObject state = Core.NewState();
        state["pending_operation"] = RecoveryBranchConflictOperation("prepared", false);
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
        var api = new RecoveryBranchConflictRecoveryApi { HasPr = true, Head = "candidate-head", Draft = true, InterruptPrUpdate = true };
        JsonObject state = Core.NewState();
        state["pending_operation"] = RecoveryBranchConflictOperation("commit_created", true);
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

    private static JsonObject RecoveryBranchConflictOperation(string phase, bool knownPr) => new()
    {
        ["op_id"] = "interrupted-op",
        ["phase"] = phase,
        ["topic"] = RecoveryBranchConflictTopic,
        ["generation"] = 1,
        ["branch"] = RecoveryBranchConflictBranch,
        ["pr_number"] = knownPr ? 7 : 0,
        ["parent_head"] = "parent-head",
        ["candidate"] = new JsonObject { [RecoveryBranchConflictTopicPath] = RecoveryBranchConflictCandidate },
        ["candidate_hashes"] = new JsonObject { [RecoveryBranchConflictTopicPath] = LegacyIdentity.Fingerprint(JsonValue.Create(RecoveryBranchConflictCandidate)) },
        ["evidence"] = new JsonObject { ["commit_sha"] = phase == "prepared" ? "" : "candidate-head" },
        ["feedback_revision"] = new JsonObject { ["allowlist"] = new JsonArray(), ["processed"] = new JsonObject() },
        ["prepared_source_version"] = 1,
        ["prepared_at"] = "2026-10-31T08:00:00Z",
        ["custom_audit"] = "preserve original evidence"
    };

    private static JsonObject RecoveryBranchConflictReceipt(string rules)
    {
        JsonObject batch = new()
        {
            ["topic"] = Core.TopicFor(RecoveryBranchConflictTopicPath),
            ["topic_id"] = RecoveryBranchConflictTopic,
            ["notes"] = new JsonArray(DomainFixtures.NoteRecord(RecoveryBranchConflictTopicPath, RecoveryBranchConflictSource)),
            ["rules_hash"] = rules
        };
        JsonObject proposal = DomainFixtures.Proposal(new JsonObject
        {
            ["path"] = RecoveryBranchConflictTopicPath,
            ["expected_hash"] = LegacyIdentity.Digest(RecoveryBranchConflictSource),
            ["before"] = RecoveryBranchConflictSource,
            ["after"] = RecoveryBranchConflictCandidate,
            ["reason"] = "Clarify the operating mechanism.",
            ["problem"] = "The existing explanation omits a material mechanism or boundary.",
            ["reader_benefit"] = "The correction restores the mechanism for recall and engineering decisions.",
            ["kind"] = "note",
            ["learning_target"] = "same",
            ["essential_meanings"] = new JsonArray(),
            ["sources"] = new JsonArray(),
            ["feedback_keys"] = new JsonArray()
        });
        JsonObject result = new() { ["sources"] = new JsonObject { [RecoveryBranchConflictTopicPath] = RecoveryBranchConflictCandidate } };
        return new JsonObject
        {
            ["batch"] = batch,
            ["proposal"] = proposal,
            ["result"] = result,
            ["records"] = new JsonArray(new JsonObject { ["batch"] = batch.Copy(), ["proposal"] = proposal.Copy(), ["result"] = result.Copy() })
        };
    }

    private sealed class RecoveryBranchConflictNoteFiles : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "recovery-topic-" + Guid.NewGuid().ToString("N"));

        public RecoveryBranchConflictNoteFiles()
        {
            DomainFixtures.CreateReviewContract(Root);
            foreach (string path in new[] { RecoveryBranchConflictTopicPath, RecoveryBranchConflictOtherPath, RecoveryBranchConflictLaterPath })
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(Root, path))!);
                File.WriteAllText(Path.Combine(Root, path), RecoveryBranchConflictSource);
            }
        }

        public void Dispose() => Directory.Delete(Root, recursive: true);
    }

    private sealed class RecoveryBranchConflictRecoveryApi : IGitHubApi
    {
        public string Repo => "owner/repo";
        public string Head { get; set; } = "owner-head";
        public bool Missing { get; init; }
        public bool ReadFailure { get; init; }
        public bool HasPr { get; init; }
        public bool Draft { get; set; } = true;
        public bool InterruptPrUpdate { get; init; }
        public int Writes { get; private set; }
        public int BranchWrites { get; private set; }
        public List<string> Paths { get; } = [];

        private JsonObject RecoveryBranchConflictPr() => new()
        {
            ["number"] = 7,
            ["state"] = "open",
            ["draft"] = Draft,
            ["body"] = Runtime.Marker(RecoveryBranchConflictTopic, 1),
            ["head"] = new JsonObject { ["ref"] = RecoveryBranchConflictBranch, ["sha"] = Head, ["repo"] = new JsonObject { ["full_name"] = Repo } },
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
            if (path == "/git/ref/heads/" + Uri.EscapeDataString(RecoveryBranchConflictBranch))
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
                    "/pulls/7" => RecoveryBranchConflictPr(),
                    "/pulls?state=all&per_page=100" or "/pulls?state=open&per_page=100" => HasPr ? new JsonArray(RecoveryBranchConflictPr()) : new JsonArray(),
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
    [Fact]
    public async Task FeedbackChangedDuringCommitCreationArchivesCandidateWithoutUpdatingBranch()
    {
        // Arrange

        var api = new NormalPublicationFeedbackFeedbackRaceApi();
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

            api.Inner.Comments[0]!["body"] = "Withdraw that instruction; leave this note unchanged.";
            api.Inner.Comments[0]!["updated_at"] = "2026-10-31T08:00:00Z";

        };

        // Act
        JsonObject result = await runtime.PublishAsync(request);
        StateSnapshot saved = await store.ReadAsync();

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
    }

    private sealed class NormalPublicationFeedbackFeedbackRaceApi : IGitHubApi
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

    [Theory]
    [InlineData("focused_workload")]
    [InlineData("pending_operation")]
    public async Task FeedbackEntryPreservesUnrelatedUnfinishedWorkBeforeAnyRecovery(string savedWork)
    {
        // Arrange
        using var fixture = new WorkloadFixture(1);
        fixture.Config["feedback_pr"] = 1;
        var api = new RuntimeApi();
        api.SeedManagedPr(Core.TopicId("Programming"), fixture.Notes[0]!.Str("content"));
        api.Comments.Add(RuntimeFixtures.OwnerComment());
        JsonObject state = Core.NewState();
        state[savedWork] = savedWork == "focused_workload"
            ? new JsonObject { ["id"] = "ordinary", ["status"] = "active", ["accepted_records"] = new JsonArray(new JsonObject { ["audit"] = "accepted ordinary content" }) }
            : new JsonObject { ["op_id"] = "unrelated", ["pr_number"] = 2, ["phase"] = "prepared", ["candidate"] = new JsonObject { [DomainFixtures.Path] = "preserved" } };
        var store = new MemoryStateStore(state);
        var publisher = new GitHubRuntime(api, store, activation: () => { });
        var engine = new ImprovementEngine(fixture.Root, fixture.Config, store, fixture.Model, api: api, publisher: publisher,
            notesLoader: () => fixture.Notes.Copy(), clock: fixture.Clock, snapshotShaLoader: () => "base");

        // Act
        JsonObject result = await engine.RunAsync(apply: true, withModel: true);
        JsonObject saved = (await store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("feedback_paused");
        result.Int("model_calls").Should().Be(0);
        JsonNode.DeepEquals(saved, state).Should().BeTrue();
        fixture.Model.Authors.Should().BeEmpty();
        fixture.Model.Reviews.Should().BeEmpty();
        api.Commits.Should().Be(0);
        api.Acknowledgments.Should().Be(0);
    }

}
