using DevBook.Tooling.Export;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using System.Text.Json.Nodes;
using System.Text;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ExportWorkerTests
{
    [Fact]
    public async Task ArtifactCompletionNeverChangesTheReviewedSourceRef()
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = true;
        var store = new MemoryStateStore(fixture.State);

        // Act
        JsonObject result = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance);

        // Assert
        result.Str("status").Should().Be("exported");
        fixture.Api.Head.Should().Be(FakeExportApi.SourceHead);
        fixture.Api.RefWrites.Should().Be(0);
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.BlobWrites.Should().Be(0);
        fixture.Api.TreeRequests.Should().BeEmpty();
    }

    [Theory]
    [InlineData("expired")]
    [InlineData("digest")]
    [InlineData("run")]
    [InlineData("event")]
    [InlineData("branch")]
    [InlineData("attempt")]
    [InlineData("repository")]
    public async Task UntrustedOrExpiredArtifactCannotCompleteTheReviewedSource(string scenario)
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = true;
        switch (scenario)
        {
            case "expired": fixture.Api.Artifact["expired"] = true; break;
            case "digest": fixture.Api.Artifact["digest"] = "sha256:" + new string('c', 64); break;
            case "run": fixture.Api.Artifact.Obj("workflow_run")["id"] = 99; break;
            case "event": fixture.Api.Run["event"] = "pull_request"; break;
            case "branch": fixture.Api.Run["head_branch"] = "untrusted"; break;
            case "attempt": fixture.Api.Run["run_attempt"] = 2; break;
            case "repository": fixture.Api.Run.Obj("repository")["full_name"] = "other/repo"; break;
        }
        var store = new MemoryStateStore(fixture.State);

        // Act
        Func<Task> complete = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store,
            provenance: fixture.Provenance);

        // Assert
        await complete.Should().ThrowAsync<RuntimeFailure>();
        fixture.Api.RefWrites.Should().Be(0);
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.ReadyConversions.Should().Be(0);
    }

    [Fact]
    public async Task RegisteredArtifactResumesChecksWithoutChangingTheSourceOrRepeatingFeedback()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        JsonObject waiting = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store,
            provenance: fixture.Provenance);
        fixture.Api.ChecksReady = true;

        // Act
        JsonObject result = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);
        JsonObject replay = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);

        // Assert
        waiting.Str("status").Should().Be("awaiting_checks");
        result.Str("status").Should().Be("exported");
        replay.Bool("resumed").Should().BeTrue();
        fixture.Api.Head.Should().Be(FakeExportApi.SourceHead);
        fixture.Api.RefWrites.Should().Be(0);
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.Comments.Should().ContainSingle();
        fixture.Api.Pr.Bool("draft").Should().BeFalse();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task VerifiedExportDeliversNewAndUpdatedPrsReadyForReview(bool initiallyDraft)
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.Pr["draft"] = initiallyDraft;
        fixture.Api.ChecksReady = true;
        var store = new MemoryStateStore(fixture.State);
        JsonObject? beforeReady = null;
        fixture.Api.BeforeReadyConversion = async () => beforeReady = (await store.ReadAsync()).State;

        // Act
        JsonObject result = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance);

        // Assert
        result.Str("status").Should().Be("exported");
        fixture.Api.ReadyConversions.Should().Be(1);
        fixture.Api.Pr.Bool("draft").Should().BeFalse();
        fixture.Api.Pr.Obj("head").Str("sha").Should().Be(FakeExportApi.SourceHead);
        beforeReady!.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence")
            .Str("export_check_status").Should().Be("success");
    }

    [Theory]
    [InlineData("pending", "awaiting_checks")]
    [InlineData("failure", "checks_failed")]
    public async Task UnsuccessfulExactHeadChecksKeepTheExportDraft(string checkConclusion, string expectedStatus)
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = checkConclusion != "pending";
        fixture.Api.CheckConclusion = checkConclusion;
        var store = new MemoryStateStore(fixture.State);

        // Act
        JsonObject result = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance);

        // Assert
        result.Str("status").Should().Be(expectedStatus);
        fixture.Api.ReadyConversions.Should().Be(0);
        fixture.Api.Pr.Bool("draft").Should().BeTrue();
    }

    [Fact]
    public async Task HeadChangingDuringReadyDeliveryReturnsTheManagedPrToDraft()
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.Pr["draft"] = true;
        fixture.Api.ChecksReady = true;
        fixture.Api.BeforeReadyConversion = () =>
        {
            fixture.Api.Head = FakeExportApi.OwnerChangedHead;
            return Task.CompletedTask;
        };
        var store = new MemoryStateStore(fixture.State);

        // Act
        JsonObject result = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance);

        // Assert
        result.Str("status").Should().Be("stale");
        fixture.Api.Head.Should().Be(FakeExportApi.OwnerChangedHead);
        fixture.Api.Pr.Bool("draft").Should().BeTrue();
        (await store.ReadAsync()).State.Obj("finalized_exports").Count.Should().Be(0);
    }

    [Fact]
    public async Task OwnerReadyExportPersistsTheFirstReviewFreezeBeforeReturningToDraft()
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.Pr["draft"] = false;
        var store = new MemoryStateStore(fixture.State);
        JsonObject? beforeConversion = null;
        fixture.Api.BeforeDraftConversion = async () => beforeConversion = (await store.ReadAsync()).State.Obj("prs").Obj(fixture.Key).Copy();

        // Act
        JsonObject result = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance);

        // Assert
        result.Str("status").Should().Be("awaiting_checks");
        beforeConversion!.Bool("frozen").Should().BeTrue();
        beforeConversion.Str("review_started_head_sha").Should().Be(FakeExportApi.SourceHead);
        fixture.Api.DraftConversions.Should().Be(1);
        fixture.Api.Pr.Bool("draft").Should().BeTrue();
        fixture.Api.ReadyConversions.Should().Be(0);
    }

    [Fact]
    public async Task ArtifactOutsideGeneratedPathsIsRejectedBeforeAnyWrite()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        fixture.Bundle.Obj("files")["Vault/Home/Overwrite.md"] = Convert.ToBase64String("unsafe"u8.ToArray());

        // Act
        Func<Task> publish = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance);

        // Assert
        await publish.Should().ThrowAsync<UnsafeInput>();
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.RefWrites.Should().Be(0);
    }

    [Fact]
    public async Task ArtifactReplayCannotReplaceTheRegisteredBytes()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store,
            provenance: fixture.Provenance);
        JsonObject changed = fixture.Bundle.Copy();
        byte[] bytes = "Different native output"u8.ToArray();
        changed.Obj("files")["Web/content/Card.md"] = Convert.ToBase64String(bytes);
        changed.Obj("manifest").Obj("outputs")["Web/content/Card.md"] = Output(bytes);

        // Act
        Func<Task> replace = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, changed, fixture.Request, store,
            provenance: fixture.Provenance);

        // Assert
        await replace.Should().ThrowAsync<Conflict>();
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.RefWrites.Should().Be(0);
    }

    [Fact]
    public void LegacyGeneratedCommitRequestIsPausedWithoutDiscardingItsReview()
    {
        // Arrange
        var fixture = new WorkerFixture();
        JsonObject operation = fixture.State.Obj("export_operations").Obj(fixture.Request.Str("op_id"));
        operation.Obj("evidence").Obj("export_request")["version"] = 1;
        operation.Obj("evidence")["export_commit_sha"] = FakeExportApi.GeneratedHead;
        string reviewed = operation.Obj("receipts").ToJsonString();

        // Act
        ExportOpportunity selected = Worker.SelectOpportunity(fixture.State, DateTimeOffset.UtcNow.AddDays(1));

        // Assert
        selected.Request.Should().BeNull();
        JsonObject preserved = selected.State.Obj("export_operations").Obj(fixture.Request.Str("op_id"));
        preserved.Obj("evidence").Bool("export_paused").Should().BeTrue();
        preserved.Obj("receipts").ToJsonString().Should().Be(reviewed);
    }

    [Fact]
    public async Task ExpiredFinalizedArtifactRebuildsWithoutRepeatingReviewOrChangingItsReadyPr()
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = true;
        var store = new MemoryStateStore(fixture.State);
        await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store,
            provenance: fixture.Provenance);
        int ready = fixture.Api.ReadyConversions;
        int draft = fixture.Api.DraftConversions;
        fixture.Api.Artifact["expired"] = true;

        // Act
        JsonObject expired = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);
        ExportOpportunity retry = Worker.SelectOpportunity((await store.ReadAsync()).State, DateTimeOffset.UtcNow);
        JsonObject fresh = fixture.Provenance.Copy();
        fresh["artifact_id"] = "12";
        fresh["run_id"] = "23";
        fresh["digest"] = new string('c', 64);
        fixture.Api.Artifact["expired"] = false;
        fixture.Api.Artifact["name"] = "devbook-syncer-export-23-1";
        fixture.Api.Artifact["digest"] = "sha256:" + new string('c', 64);
        fixture.Api.Artifact.Obj("workflow_run")["id"] = 23;
        JsonObject refreshed = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store,
            provenance: fresh);
        JsonObject state = (await store.ReadAsync()).State;

        // Assert
        expired.Str("status").Should().Be("awaiting_export");
        retry.Mode.Should().Be("render");
        refreshed.Bool("refreshed").Should().BeTrue();
        fixture.Api.ReadyConversions.Should().Be(ready);
        fixture.Api.DraftConversions.Should().Be(draft);
        fixture.Api.Pr.Bool("draft").Should().BeFalse();
        fixture.Api.Comments.Should().ContainSingle();
        fixture.Api.RefWrites.Should().Be(0);
        fixture.Api.CommitWrites.Should().Be(0);
        JsonObject operation = state.Obj("export_operations").Obj(fixture.Request.Str("op_id"));
        operation.Bool("compacted").Should().BeTrue();
        operation.Obj("evidence").Arr("export_artifact_history").Count.Should().Be(1);
        operation.Obj("evidence").Bool("export_refresh_required").Should().BeFalse();
    }

    [Fact]
    public async Task ArtifactWithoutIndependentTransportCannotCompleteAPr()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);

        // Act
        Func<Task> publish = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);

        // Assert
        await publish.Should().ThrowAsync<UnsafeInput>().WithMessage("*independent*provenance*");
        fixture.Api.RefWrites.Should().Be(0);
        fixture.Api.ReadyConversions.Should().Be(0);
    }

    [Theory]
    [InlineData("head")]
    [InlineData("base")]
    [InlineData("closed")]
    [InlineData("identity")]
    public async Task ConcurrentPrChangesKeepArtifactCompletionPaused(string change)
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = true;
        fixture.Api.BeforeDraftConversion = () =>
        {
            switch (change)
            {
                case "head": fixture.Api.Head = FakeExportApi.OwnerChangedHead; break;
                case "base": fixture.Api.Pr.Obj("base")["sha"] = FakeExportApi.OwnerChangedHead; break;
                case "closed": fixture.Api.Pr["state"] = "closed"; break;
                case "identity": fixture.Api.Pr["body"] = "Owner changed PR identity."; break;
            }
            return Task.CompletedTask;
        };
        var store = new MemoryStateStore(fixture.State);

        // Act
        JsonObject result = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store,
            provenance: fixture.Provenance);

        // Assert
        result.Str("status").Should().Be("stale");
        fixture.Api.ReadyConversions.Should().Be(0);
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.RefWrites.Should().Be(0);
        (await store.ReadAsync()).State.Obj("export_operations").Obj(fixture.Request.Str("op_id"))
            .Obj("evidence").Bool("export_paused").Should().BeTrue();
    }

    [Theory]
    [InlineData("event")]
    [InlineData("path")]
    [InlineData("repository")]
    [InlineData("sha")]
    public async Task GenericGreenChecksCannotReplaceTheActualSourceExportWorkflow(string mismatch)
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = true;
        fixture.Api.PrTitleOverride = mismatch switch
        {
            "event" => new JsonObject { ["event"] = "workflow_dispatch" },
            "path" => new JsonObject { ["path"] = ".github/workflows/other.yml" },
            "repository" => new JsonObject { ["repository"] = new JsonObject { ["full_name"] = "untrusted/repo" } },
            _ => new JsonObject { ["head_sha"] = FakeExportApi.OwnerChangedHead }
        };
        var store = new MemoryStateStore(fixture.State);

        // Act
        JsonObject result = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store,
            provenance: fixture.Provenance);

        // Assert
        result.Str("status").Should().Be("awaiting_checks");
        fixture.Api.ReadyConversions.Should().Be(0);
        fixture.Api.Pr.Bool("draft").Should().BeTrue();
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.RefWrites.Should().Be(0);
    }

    [Fact]
    public async Task ManagedBodyUpdateAwaitsTheNewSourceWorkflowWithoutUpdatingTheBodyAgain()
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = true;
        fixture.Api.BodyCheckPending = true;
        var store = new MemoryStateStore(fixture.State);

        // Act
        JsonObject waiting = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store,
            provenance: fixture.Provenance);
        fixture.Api.BodyCheckPending = false;
        JsonObject completed = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);

        // Assert
        waiting.Str("status").Should().Be("awaiting_checks");
        completed.Str("status").Should().Be("exported");
        fixture.Api.BodyWrites.Should().Be(1);
        fixture.Api.ReadyConversions.Should().Be(1);
        fixture.Api.Comments.Should().ContainSingle();
        fixture.Api.RefWrites.Should().Be(0);
        fixture.Api.CommitWrites.Should().Be(0);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LostBodyUpdateResponseResumesWithoutAnExtraMutation(bool applied)
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = true;
        fixture.Api.FailBeforeBodyOnce = !applied;
        fixture.Api.FailAfterBodyOnce = applied;
        var store = new MemoryStateStore(fixture.State);
        Exception? interrupted = await Record.ExceptionAsync(() => Worker.PublishBundleAsync(fixture.Api, fixture.Config,
            fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance));

        // Act
        JsonObject completed = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);

        // Assert
        interrupted.Should().BeOfType<RuntimeFailure>();
        completed.Str("status").Should().Be("exported");
        fixture.Api.BodyWrites.Should().Be(1);
        fixture.Api.ReadyConversions.Should().Be(1);
        fixture.Api.Comments.Should().ContainSingle();
        fixture.Api.RefWrites.Should().Be(0);
        fixture.Api.CommitWrites.Should().Be(0);
    }

    private static JsonObject Output(byte[] bytes) => new()
    {
        ["sha256"] = Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(bytes)),
        ["size"] = bytes.Length,
        ["mode"] = "100644",
        ["type"] = "file"
    };

    internal sealed class WorkerFixture
    {
        public FakeExportApi Api { get; }
        public JsonObject Config { get; }
        public JsonObject Request { get; }
        public JsonObject Bundle { get; }
        public JsonObject State { get; }
        public JsonObject Provenance { get; } = new()
        {
            ["artifact_id"] = "11", ["run_id"] = "22", ["run_attempt"] = "1",
            ["digest"] = new string('a', 64), ["bundle_sha256"] = new string('b', 64)
        };
        public string Key { get; }
        public byte[] Binary { get; } = [0, 255, 128, 10, 0, 32];

        public WorkerFixture()
        {
            string topic = Core.TopicId("Programming/NET");
            string ExportWorkerbranch = Runtime.ExpectedManagedBranch(topic, 1);
            Key = topic + ":1";
            Config = new JsonObject
            {
                ["repo"] = "owner/devbook",
                ["export_check_wait_seconds"] = 0,
                ["base_branch"] = "main",
                ["owner_allowlist"] = new JsonArray(new JsonObject { ["id"] = 7, ["login"] = "owner" }),
                ["required_check_contexts"] = new JsonArray("pr-title", "major-approval")
            };
            Request = new JsonObject
            {
                ["version"] = 2,
                ["op_id"] = "operation-12345678",
                ["pr_number"] = 1,
                ["branch"] = ExportWorkerbranch,
                ["expected_head"] = FakeExportApi.SourceHead,
                ["topic_id"] = topic,
                ["generation"] = 1,
                ["prepared_source_version"] = 1
            };
            GitTreeEntry[] original = [.. Receipt.RequiredPolicyPaths.Select(path => new GitTreeEntry(path, "100644", "blob", new string('e', 40))),
                new("Vault/Home/Programming/NET/Card.md", "100644", "blob", new string('f', 40)),
                new("Web/content/Card.md", "100644", "blob", new string('8', 40)),
                new("Web/content/Removed.md", "100644", "blob", new string('9', 40))];
            var bytes = new Dictionary<string, byte[]>(StringComparer.Ordinal)
            {
                ["Web/content/Card.md"] = "Updated generated note\n"u8.ToArray(),
                ["Web/content/Assets/image.png"] = Binary,
                ["Web/quartz/styles/syncer/_index.scss"] = "/* native fixture styles */\n"u8.ToArray()
            };
            JsonObject inputs = SiteArtifact.Inputs(original);
            var outputs = new JsonObject();
            var files = new JsonObject();
            foreach ((string path, byte[] data) in bytes)
            {
                files[path] = Convert.ToBase64String(data);
                outputs[path] = Output(data);
            }
            Bundle = new JsonObject
            {
                ["version"] = 2, ["expected_head"] = FakeExportApi.SourceHead, ["branch"] = ExportWorkerbranch, ["pr_number"] = 1,
                ["manifest"] = new JsonObject
                {
                    ["version"] = 2, ["repository"] = "owner/devbook", ["source_sha"] = FakeExportApi.SourceHead, ["kind"] = "commit",
                    ["sources"] = inputs["sources"]?.DeepClone(), ["policy"] = inputs["policy"]?.DeepClone(),
                    ["runtime"] = new JsonObject
                    {
                        ["obsidian"] = "1.14.5",
                        ["plugins"] = new JsonObject(Receipt.Plugins.Select(id => new KeyValuePair<string, JsonNode?>(id, JsonValue.Create("1.0.0"))))
                    },
                    ["outputs"] = outputs
                },
                ["files"] = files
            };
            Api = new FakeExportApi(original, topic, ExportWorkerbranch);
            var feedback = new JsonObject { ["key"] = "inline:7:revision", ["url"] = "https://github.com/owner/devbook/pull/1#discussion_r7" };
            var batch = new JsonObject { ["notes"] = new JsonArray(), ["feedback"] = new JsonArray(feedback.Copy()), ["pr"] = new JsonObject { ["number"] = 1 } };
            var proposal = new JsonObject
            {
                ["dispositions"] = new JsonArray(),
                ["feedback"] = new JsonArray(new JsonObject
                {
                    ["key"] = "inline:7:revision",
                    ["outcome"] = "applied",
                    ["reason"] = "Clarified the requested mechanism."
                })
            };
            var result = new JsonObject { ["sources"] = new JsonObject() };
            State = Core.NewState();
            State.Obj("feedback")["inline:7:revision"] = new JsonObject { ["status"] = "pending" };
            State["cooldown"] = new JsonObject { ["kind"] = "weekly", ["reset_at"] = Runtime.Iso(DateTimeOffset.UtcNow.AddDays(1)) };
            State.Obj("prs")[Key] = new JsonObject { ["export_required"] = true, ["export_operation_id"] = Request.Str("op_id"), ["head_sha"] = FakeExportApi.SourceHead };
            State["export_operations"] = new JsonObject
            {
                [Request.Str("op_id")] = new JsonObject
                {
                    ["op_id"] = Request.Str("op_id"),
                    ["topic"] = topic,
                    ["generation"] = 1,
                    ["branch"] = ExportWorkerbranch,
                    ["prepared_source_version"] = 1,
                    ["evidence"] = new JsonObject { ["export_request"] = Request.Copy(), ["export_attempts"] = 1, ["export_last_dispatch_at"] = Runtime.Iso() },
                    ["receipts"] = new JsonObject
                    {
                        ["batch"] = batch,
                        ["proposal"] = proposal,
                        ["result"] = result,
                        ["records"] = new JsonArray(new JsonObject { ["batch"] = batch.Copy(), ["proposal"] = proposal.Copy(), ["result"] = result.Copy() })
                    }
                }
            };
        }
    }

    internal sealed class FakeExportApi : IGitHubApi
    {
        public const string SourceHead = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        public const string MainHead = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
        public const string GeneratedHead = "dddddddddddddddddddddddddddddddddddddddd";
        public const string OwnerChangedHead = "cccccccccccccccccccccccccccccccccccccccc";
        public string Repo => "owner/devbook";
        public string Head { get; set; } = SourceHead;
        public bool ChecksReady { get; set; }
        public string CheckConclusion { get; set; } = "success";
        public bool ValidationMissing { get; set; }
        public JsonObject PrTitleOverride { get; set; } = new();
        public long PrTitleRunId { get; private set; } = 1;
        public bool BodyCheckPending { get; set; }
        private bool bodyTriggered;
        public int BodyWrites { get; private set; }
        public bool FailBeforeBodyOnce { get; set; }
        public bool FailAfterBodyOnce { get; set; }
        public List<JsonObject> TreeRequests { get; } = [];
        public Dictionary<string, Dictionary<string, GitTreeEntry>> Trees { get; } = new(StringComparer.Ordinal);
        private readonly string generatedTree = new string('1', 40);
        public int RefWrites { get; private set; }
        public int ForceWrites { get; private set; }
        public int BlobWrites { get; private set; }
        public int CommitWrites { get; private set; }
        public int Dispatches { get; private set; }
        public int DraftConversions { get; private set; }
        public int ReadyConversions { get; private set; }
        public JsonObject Artifact { get; } = new()
        {
            ["expired"] = false, ["name"] = "devbook-syncer-export-22-1", ["digest"] = "sha256:" + new string('a', 64),
            ["workflow_run"] = new JsonObject { ["id"] = 22 }
        };
        public JsonObject Run { get; } = new()
        {
            ["run_attempt"] = 1, ["path"] = ".github/workflows/devbook-improvement.yml", ["head_branch"] = "main", ["event"] = "schedule",
            ["repository"] = new JsonObject { ["full_name"] = "owner/devbook" }
        };
        public Func<Task>? BeforeDraftConversion { get; set; }
        public Func<Task>? BeforeReadyConversion { get; set; }
        public string? PrHeadAfterRef { get; set; }
        public JsonObject Pr { get; }
        public List<JsonObject> Comments { get; } = [];
        private readonly Dictionary<string, GitTreeEntry> original;
        private readonly string ExportWorkerbranch;

        public FakeExportApi(IEnumerable<GitTreeEntry> entries, string topic, string ExportWorkerbranch)
        {
            original = entries.ToDictionary(item => item.Path, StringComparer.Ordinal);
            Trees[new string('1', 40)] = new(original, StringComparer.Ordinal);
            this.ExportWorkerbranch = ExportWorkerbranch;
            Pr = new JsonObject
            {
                ["number"] = 1,
                ["node_id"] = "PR_node",
                ["state"] = "open",
                ["draft"] = false,
                ["user"] = new JsonObject { ["id"] = 7, ["login"] = "owner" },
                ["body"] = "Owner introduction\n" + Runtime.Marker(topic, 1) + "\n<!-- devbook-improvement:start topic=" + topic
                    + " -->\nCumulative scope.\n<!-- devbook-export-validation -->Quartz export: awaiting export.\n<!-- devbook-improvement:end -->\nOwner footer",
                ["head"] = new JsonObject { ["ref"] = ExportWorkerbranch, ["sha"] = Head, ["repo"] = new JsonObject { ["full_name"] = Repo } },
                ["base"] = new JsonObject { ["ref"] = "main", ["sha"] = MainHead, ["repo"] = new JsonObject { ["full_name"] = Repo } }
            };
        }

        public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            JsonNode? response;
            if (method == "GET" && path == "/pulls/1")
            {
                Pr.Obj("head")["sha"] = RefWrites > 0 ? PrHeadAfterRef ?? Head : Head;
                response = Pr.Copy();
            }
            else if (method == "GET" && path.StartsWith("/actions/artifacts/", StringComparison.Ordinal))
            {
                response = Artifact.Copy();
            }
            else if (method == "GET" && path.StartsWith("/actions/runs/", StringComparison.Ordinal))
            {
                response = Run.Copy();
            }
            else if (method == "GET" && path.StartsWith("/pulls?", StringComparison.Ordinal))
            {
                response = new JsonArray(Pr.Copy());
            }
            else if (method == "GET" && path == "/pulls/1/files?per_page=100")
            {
                response = new JsonArray(new JsonObject { ["filename"] = DomainFixtures.Path });
            }
            else if (method == "GET" && path.StartsWith("/git/ref/heads/", StringComparison.Ordinal))
            {
                string name = Uri.UnescapeDataString(path["/git/ref/heads/".Length..]);
                response = new JsonObject { ["object"] = new JsonObject { ["sha"] = name == "main" ? MainHead : Head } };
            }
            else if (method == "GET" && path.StartsWith("/compare/", StringComparison.Ordinal))
            {
                response = new JsonObject { ["merge_base_commit"] = new JsonObject { ["sha"] = MainHead } };
            }
            else if (method == "GET" && path.StartsWith("/git/trees/", StringComparison.Ordinal))
            {
                string treeSha = path["/git/trees/".Length..].Split('?')[0];
                treeSha = treeSha switch
                {
                    GeneratedHead => generatedTree,
                    SourceHead or MainHead or OwnerChangedHead => new string('1', 40),
                    _ => treeSha
                };
                Dictionary<string, GitTreeEntry> entries = Trees[treeSha];
                response = new JsonObject
                {
                    ["truncated"] = false,
                    ["tree"] = new JsonArray(entries.Values.Select(entry => (JsonNode)new JsonObject
                    {
                        ["path"] = entry.Path,
                        ["mode"] = entry.Mode,
                        ["type"] = entry.Type,
                        ["sha"] = entry.Sha
                    }).ToArray())
                };
            }
            else if (method == "GET" && path.StartsWith("/git/commits/", StringComparison.Ordinal))
            {
                string sha = path["/git/commits/".Length..];
                response = new JsonObject
                {
                    ["sha"] = sha,
                    ["tree"] = new JsonObject { ["sha"] = sha == GeneratedHead ? generatedTree : new string('1', 40) },
                    ["message"] = sha == GeneratedHead ? Worker.ExportCommitMessage : "Owner source commit",
                    ["parents"] = new JsonArray(new JsonObject { ["sha"] = sha == GeneratedHead ? SourceHead : MainHead })
                };
            }
            else if (method == "POST" && path == "/git/blobs")
            {
                BlobWrites++;
                throw new InvalidOperationException("Artifact completion cannot upload Git blobs.");
            }
            else if (method == "POST" && path == "/git/trees")
            {
                TreeRequests.Add(payload!.AsObject().Copy());
                throw new InvalidOperationException("Artifact completion cannot upload Git trees.");
            }
            else if (method == "POST" && path == "/git/commits")
            {
                CommitWrites++;
                throw new InvalidOperationException("Artifact completion cannot create Git commits.");
            }
            else if (method == "PATCH" && path.StartsWith("/git/refs/heads/", StringComparison.Ordinal))
            {
                ForceWrites += payload.Bool("force") ? 1 : 0;
                RefWrites++;
                throw new InvalidOperationException("Artifact completion cannot move source refs.");
            }
            else if (method == "POST" && path == "/actions/workflows/vault-validation.yml/dispatches")
            {
                Dispatches++;
                response = null;
            }
            else if (method == "GET" && path.Contains("/check-runs?", StringComparison.Ordinal))
            {
                response = new JsonObject
                {
                    ["total_count"] = ChecksReady ? 2 : 0,
                    ["check_runs"] = ChecksReady
                    ? new JsonArray(new JsonObject { ["id"] = 1, ["name"] = "pr-title", ["head_sha"] = Head, ["conclusion"] = CheckConclusion },
                        new JsonObject { ["id"] = 2, ["name"] = "major-approval", ["head_sha"] = Head, ["conclusion"] = "success" }) : new JsonArray()
                };
            }
            else if (method == "GET" && path.EndsWith("/status", StringComparison.Ordinal))
            {
                response = new JsonObject { ["sha"] = Head, ["statuses"] = new JsonArray() };
            }
            else if (method == "GET" && path.StartsWith("/actions/workflows/pr-title.yml/runs", StringComparison.Ordinal))
            {
                var run = new JsonObject
                {
                    ["id"] = PrTitleRunId,
                    ["head_branch"] = ExportWorkerbranch, ["head_sha"] = Head,
                    ["event"] = "pull_request", ["path"] = ".github/workflows/pr-title.yml",
                    ["repository"] = new JsonObject { ["full_name"] = Repo },
                    ["conclusion"] = ChecksReady && (!bodyTriggered || !BodyCheckPending) ? CheckConclusion : "pending"
                };
                foreach ((string key, JsonNode? value) in PrTitleOverride) run[key] = value?.DeepClone();
                response = new JsonObject { ["workflow_runs"] = new JsonArray(run) };
            }
            else if (method == "GET" && path.StartsWith("/actions/workflows/vault-validation.yml/runs", StringComparison.Ordinal))
            {
                response = new JsonObject
                {
                    ["workflow_runs"] = ValidationMissing || Dispatches == 0 ? new JsonArray() : new JsonArray(new JsonObject
                    {
                        ["head_branch"] = ExportWorkerbranch,
                        ["event"] = "workflow_dispatch", ["path"] = ".github/workflows/vault-validation.yml",
                        ["repository"] = new JsonObject { ["full_name"] = Repo },
                        ["head_sha"] = Head,
                        ["conclusion"] = ChecksReady ? "success" : "pending"
                    })
                };
            }
            else if (method == "GET" && path.StartsWith("/issues/1/comments", StringComparison.Ordinal))
            {
                response = new JsonArray(Comments.Select(item => (JsonNode)item.Copy()).ToArray());
            }
            else if (method == "POST" && path == "/issues/1/comments")
            {
                Comments.Add((JsonObject)payload!.DeepClone());
                response = new JsonObject { ["id"] = Comments.Count };
            }
            else if (method == "PATCH" && path == "/pulls/1")
            {
                if (FailBeforeBodyOnce)
                {
                    FailBeforeBodyOnce = false;
                    throw new RuntimeFailure("Fixture transport failure before body mutation.");
                }
                Pr["body"] = payload!["body"]!.DeepClone();
                BodyWrites++;
                PrTitleRunId++;
                bodyTriggered = true;
                if (FailAfterBodyOnce)
                {
                    FailAfterBodyOnce = false;
                    throw new RuntimeFailure("Fixture transport response lost after body mutation.");
                }
                response = Pr.Copy();
            }
            else
            {
                throw new InvalidOperationException("Unexpected fake GitHub call: " + method + " " + path);
            }
            return Task.FromResult(response?.DeepClone());
        }

        public async Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default)
        {
            if (query.Contains("markPullRequestReadyForReview", StringComparison.Ordinal))
            {
                if (BeforeReadyConversion is not null)
                {
                    await BeforeReadyConversion();
                }
                ReadyConversions++;
                Pr["draft"] = false;
                return new JsonObject();
            }
            if (BeforeDraftConversion is not null)
            {
                await BeforeDraftConversion();
            }
            DraftConversions++;
            Pr["draft"] = true;
            return new JsonObject();
        }
    }

    [Fact]
    public async Task ManualExportHandoffRemainsFrozenWithoutAnAutomaticDispatchRequest()
    {
        // Arrange
        var api = new RuntimeApi();
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        JsonObject request = RuntimeFixtures.Request("Original", "Reviewed source");
        request["automatic_export"] = false;

        // Act
        JsonObject result = await runtime.PublishAsync(request);
        JsonObject state = (await store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("awaiting_export");
        result.Bool("automatic_export").Should().BeFalse();
        result.ContainsKey("export_request").Should().BeFalse();
        JsonObject operation = state.Obj("export_operations").Single().Value!.AsObject();
        operation.Obj("candidate").Str(RuntimeFixtures.NotePath).Should().Be("Reviewed source");
        operation.Obj("evidence").Int("export_attempts").Should().Be(0);
        state.Obj("prs").Single().Value!.Bool("frozen").Should().BeTrue();
    }

    [Fact]
    public async Task AnotherWorkerLeaseBlocksArtifactCompletion()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        await new DurableLease(store, "other-worker").AcquireAsync();

        // Act
        Func<Task> publish = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance);

        // Assert
        await publish.Should().ThrowAsync<Conflict>();
        fixture.Api.RefWrites.Should().Be(0);
    }

    [Fact]
    public async Task ExhaustedExactHeadValidationPausesWithoutAnotherDispatchOrCommit()
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ValidationMissing = true;
        var store = new MemoryStateStore(fixture.State);
        await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, provenance: fixture.Provenance);
        StateSnapshot snapshot = await store.ReadAsync();
        JsonObject evidence = snapshot.State.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence");
        evidence["validation_attempts"] = 3;
        evidence["validation_last_dispatch_at"] = Runtime.Iso(DateTimeOffset.UtcNow.AddHours(-7));
        await store.WriteAsync(snapshot.State, snapshot, "fixture exhausted validation");
        int dispatches = fixture.Api.Dispatches;

        // Act
        JsonObject result = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);

        // Assert
        result.Str("status").Should().Be("checks_failed");
        fixture.Api.Dispatches.Should().Be(dispatches);
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.RefWrites.Should().Be(0);
        (await store.ReadAsync()).State.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence").Bool("export_paused").Should().BeTrue();
    }

}
