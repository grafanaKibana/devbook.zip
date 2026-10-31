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
    [Theory]
    [InlineData(false, "lag")]
    [InlineData(true, "lag")]
    [InlineData(false, "foreign-head")]
    [InlineData(false, "closed")]
    [InlineData(false, "identity")]
    [InlineData(false, "timeout")]
    public async Task GeneratedRefPublicationWaitsOnlyForSafePrHeadPropagation(bool recovery, string scenario)
    {
        // Arrange
        var fixture = new WorkerFixture();
        fixture.Api.ChecksReady = true;
        var store = new MemoryStateStore(fixture.State);
        Exception? preparationFailure = null;
        if (recovery)
        {
            fixture.Api.FailBeforeRefOnce = true;

            preparationFailure = await Record.ExceptionAsync(() => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store));
        }

        // Git accepts the ref before the PR head reflects that update.
        fixture.Api.AfterRefUpdate = () =>
        {
            fixture.Api.PrHeadAfterRef = FakeExportApi.SourceHead;
            switch (scenario)
            {
                case "foreign-head":
                    fixture.Api.PrHeadAfterRef = FakeExportApi.OwnerChangedHead;
                    break;
                case "foreign-ref":
                    fixture.Api.Head = FakeExportApi.OwnerChangedHead;
                    break;
                case "closed":
                    fixture.Api.Pr["state"] = "closed";
                    break;
                case "identity":
                    fixture.Api.Pr["body"] = "Owner replaced the managed identity.";
                    break;
            }
        };
        var clock = new ExportWorkerCheckClock(DateTimeOffset.UtcNow);
        DateTimeOffset started = clock.GetUtcNow();
        var delays = 0;
        var wait = new ExportCheckWait(clock, (duration, token) =>
        {
            token.ThrowIfCancellationRequested();
            clock.Advance(duration);
            delays++;
            if (scenario == "lag")
            {
                fixture.Api.PrHeadAfterRef = null;
            }
            return Task.CompletedTask;
        });

        // Act
        JsonObject result = recovery
            ? await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request, checkWait: wait)
            : await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, checkWait: wait);
        JsonObject state = (await store.ReadAsync()).State;

        // Assert
        if (recovery) preparationFailure.Should().BeOfType<RuntimeFailure>();
        fixture.Api.RefWrites.Should().Be(1);
        fixture.Api.CommitWrites.Should().Be(1);
        if (scenario == "lag")
        {
            result.Str("status").Should().Be("exported");
            delays.Should().Be(1);
            state.Obj("finalized_exports").ContainsKey(fixture.Request.Str("op_id")).Should().BeTrue();
        }
        else
        {
            result.Str("status").Should().Be("stale");
            state.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence").Bool("export_paused").Should().BeTrue();
            state.Obj("finalized_exports").Count.Should().Be(0);
            fixture.Api.Comments.Should().BeEmpty();
            if (scenario == "timeout")
            {
                result.Str("reason").Should().Contain("Timed out");
                (clock.GetUtcNow() - started).Should().Be(TimeSpan.FromSeconds(30));
                delays.Should().Be(15);
            }
            else
            {
                delays.Should().Be(0);
            }
        }
    }

    [Fact]
    public async Task InterruptedGeneratedRefResumesTheSavedBinaryAndDeletionCommit()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        fixture.Api.FailBeforeRefOnce = true;
        Exception? interruption = await Record.ExceptionAsync(() => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store));
        fixture.Api.ChecksReady = true;

        // Act
        JsonObject result = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);

        // Assert
        interruption.Should().BeOfType<RuntimeFailure>();
        result.Str("status").Should().Be("exported");
        fixture.Api.RefWrites.Should().Be(1);
        fixture.Api.CommitWrites.Should().Be(1);
        fixture.Api.ForceWrites.Should().Be(0);
        fixture.Api.CurrentTree.Should().NotContainKey("Web/content/Removed.md");
        fixture.Api.Blobs[fixture.Api.CurrentTree["Web/content/Assets/image.png"].Sha].Should().Equal(fixture.Binary);
        fixture.Api.Comments.Should().ContainSingle();
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
        JsonObject result = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);

        // Assert
        result.Str("status").Should().Be("awaiting_checks");
        beforeConversion!.Bool("frozen").Should().BeTrue();
        beforeConversion.Str("review_started_head_sha").Should().Be(FakeExportApi.SourceHead);
        fixture.Api.DraftConversions.Should().Be(1);
        fixture.Api.Pr.Bool("draft").Should().BeTrue();
    }

    [Fact]
    public async Task ArtifactOutsideGeneratedPathsIsRejectedBeforeAnyWrite()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        fixture.Bundle.Obj("files")["Vault/Home/Overwrite.md"] = Convert.ToBase64String("unsafe"u8.ToArray());

        // Act
        Func<Task> publish = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);

        // Assert
        await publish.Should().ThrowAsync<UnsafeInput>();
        fixture.Api.CommitWrites.Should().Be(0);
        fixture.Api.RefWrites.Should().Be(0);
    }

    private static async Task MakeValidationDue(IStateStore store, JsonObject request)
    {
        StateSnapshot snapshot = await store.ReadAsync();
        JsonObject state = snapshot.State.Copy();
        state.Obj("export_operations").Obj(request.Str("op_id")).Obj("evidence")["validation_last_dispatch_at"] = Runtime.Iso(DateTimeOffset.UtcNow.AddHours(-7));
        await store.WriteAsync(state, snapshot, "fixture advance validation retry boundary");
    }

    private sealed class ExportWorkerCheckClock(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset ExportWorkercurrent = now;
        public override DateTimeOffset GetUtcNow() => ExportWorkercurrent;
        public void Advance(TimeSpan duration) => ExportWorkercurrent += duration;
    }

    internal sealed class WorkerFixture
    {
        public FakeExportApi Api { get; }
        public JsonObject Config { get; }
        public JsonObject Request { get; }
        public JsonObject Bundle { get; }
        public JsonObject State { get; }
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
                ["version"] = 1,
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
            var bytes = new Dictionary<string, byte[]?>(StringComparer.Ordinal)
            {
                ["Web/content/Card.md"] = "Updated generated note\n"u8.ToArray(),
                ["Web/content/Removed.md"] = null,
                ["Web/content/Assets/image.png"] = Binary
            };
            var predicted = original.ToDictionary(item => item.Path, StringComparer.Ordinal);
            foreach (KeyValuePair<string, byte[]?> item in bytes)
            {
                if (item.Value is null)
                {
                    predicted.Remove(item.Key);
                }
                else
                {
                    predicted[item.Key] = new GitTreeEntry(item.Key, "100644", "blob", Export.Bundle.BlobSha(item.Value));
                }
            }
            bytes[Receipt.PathName] = Encoding.UTF8.GetBytes(Receipt.Make(predicted.Values).ToJsonString());
            var files = new JsonObject();
            foreach (KeyValuePair<string, byte[]?> item in bytes)
            {
                files[item.Key] = item.Value is null ? null : Convert.ToBase64String(item.Value);
            }
            Bundle = new JsonObject { ["version"] = 1, ["expected_head"] = FakeExportApi.SourceHead, ["branch"] = ExportWorkerbranch, ["pr_number"] = 1, ["files"] = files };
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
        public bool ValidationMissing { get; set; }
        public bool FailBeforeRefOnce { get; set; }
        public int RefWrites { get; private set; }
        public int ForceWrites { get; private set; }
        public int CommitWrites { get; private set; }
        public int Dispatches { get; private set; }
        public int DraftConversions { get; private set; }
        public Func<Task>? BeforeDraftConversion { get; set; }
        public Action? AfterRefUpdate { get; set; }
        public string? PrHeadAfterRef { get; set; }
        public JsonObject Pr { get; }
        public List<JsonObject> Comments { get; } = [];
        public Dictionary<string, byte[]> Blobs { get; } = new(StringComparer.Ordinal);
        public Dictionary<string, GitTreeEntry> CurrentTree { get; private set; }
        private readonly Dictionary<string, GitTreeEntry> original;
        private readonly string ExportWorkerbranch;

        public FakeExportApi(IEnumerable<GitTreeEntry> entries, string topic, string ExportWorkerbranch)
        {
            original = entries.ToDictionary(item => item.Path, StringComparer.Ordinal);
            CurrentTree = new(original, StringComparer.Ordinal);
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
            else if (method == "GET" && path.StartsWith("/pulls?", StringComparison.Ordinal))
            {
                response = new JsonArray(Pr.Copy());
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
                Dictionary<string, GitTreeEntry> entries = path.Contains(GeneratedHead, StringComparison.Ordinal) ? CurrentTree : original;
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
                    ["tree"] = new JsonObject { ["sha"] = new string(sha == GeneratedHead ? '2' : '1', 40) },
                    ["message"] = sha == GeneratedHead ? Worker.ExportCommitMessage : "Owner source commit",
                    ["parents"] = new JsonArray(new JsonObject { ["sha"] = sha == GeneratedHead ? SourceHead : MainHead })
                };
            }
            else if (method == "POST" && path == "/git/blobs")
            {
                byte[] bytes = Convert.FromBase64String(payload.Str("content"));
                string sha = Export.Bundle.BlobSha(bytes);
                Blobs[sha] = bytes;
                response = new JsonObject { ["sha"] = sha };
            }
            else if (method == "GET" && path.StartsWith("/git/blobs/", StringComparison.Ordinal))
            {
                response = new JsonObject { ["encoding"] = "base64", ["content"] = Convert.ToBase64String(Blobs[path["/git/blobs/".Length..]]) };
            }
            else if (method == "POST" && path == "/git/trees")
            {
                CurrentTree = new(original, StringComparer.Ordinal);
                foreach (JsonObject entry in payload!.Arr("tree").OfType<JsonObject>())
                {
                    if (entry["sha"] is null)
                    {
                        CurrentTree.Remove(entry.Str("path"));
                    }
                    else
                    {
                        CurrentTree[entry.Str("path")] = new GitTreeEntry(entry.Str("path"), entry.Str("mode"), entry.Str("type"), entry.Str("sha"));
                    }
                }
                response = new JsonObject { ["sha"] = new string('2', 40) };
            }
            else if (method == "POST" && path == "/git/commits")
            {
                CommitWrites++;
                response = new JsonObject { ["sha"] = GeneratedHead };
            }
            else if (method == "PATCH" && path.StartsWith("/git/refs/heads/", StringComparison.Ordinal))
            {
                ForceWrites += payload.Bool("force") ? 1 : 0;
                if (FailBeforeRefOnce)
                {
                    FailBeforeRefOnce = false;
                    throw new RuntimeFailure("Simulated transport interruption before the ref write.");
                }
                Head = payload.Str("sha");
                RefWrites++;
                AfterRefUpdate?.Invoke();
                response = new JsonObject { ["object"] = new JsonObject { ["sha"] = Head } };
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
                    ? new JsonArray(new JsonObject { ["id"] = 1, ["name"] = "pr-title", ["head_sha"] = Head, ["conclusion"] = "success" },
                        new JsonObject { ["id"] = 2, ["name"] = "major-approval", ["head_sha"] = Head, ["conclusion"] = "success" }) : new JsonArray()
                };
            }
            else if (method == "GET" && path.EndsWith("/status", StringComparison.Ordinal))
            {
                response = new JsonObject { ["sha"] = Head, ["statuses"] = new JsonArray() };
            }
            else if (method == "GET" && path.StartsWith("/actions/workflows/vault-validation.yml/runs", StringComparison.Ordinal))
            {
                response = new JsonObject
                {
                    ["workflow_runs"] = ValidationMissing || Dispatches == 0 ? new JsonArray() : new JsonArray(new JsonObject
                    {
                        ["head_branch"] = ExportWorkerbranch,
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
                Pr["body"] = payload!["body"]!.DeepClone();
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
    public async Task AnotherWorkerLeaseBlocksGeneratedPublication()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        await new DurableLease(store, "other-worker").AcquireAsync();

        // Act
        Func<Task> publish = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);

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
        await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);
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
        fixture.Api.CommitWrites.Should().Be(1);
        fixture.Api.RefWrites.Should().Be(1);
        (await store.ReadAsync()).State.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence").Bool("export_paused").Should().BeTrue();
    }

}
