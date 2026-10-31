using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ExportWorkerTests
{
    [Fact]
    public async Task GeneratedOnlyPublicationPreservesBinaryDeletionAndResumesChecksWithoutAnotherCommit()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        fixture.Api.FailBeforeRefOnce = true;

        // Act: transport fails before updating the ref.
        Func<Task> interrupted = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);

        // Assert
        await interrupted.Should().ThrowAsync<RuntimeFailure>().WithMessage("Simulated transport interruption*");
        fixture.Api.RefWrites.Should().Be(0);

        // Act: finalize the saved commit.
        JsonObject first = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);

        // Assert
        first.Str("status").Should().Be("awaiting_checks");
        fixture.Api.RefWrites.Should().Be(1);
        fixture.Api.CommitWrites.Should().Be(1);
        fixture.Api.Dispatches.Should().Be(1);
        fixture.Api.DraftConversions.Should().Be(1);
        fixture.Api.CurrentTree.Should().NotContainKey("Web/content/Removed.md");
        fixture.Api.Blobs[fixture.Api.CurrentTree["Web/content/Assets/image.png"].Sha].Should().Equal(fixture.Binary);

        // Act: select the pending checks opportunity.
        StateSnapshot pending = await store.ReadAsync();
        ExportOpportunity opportunity = Worker.SelectOpportunity(pending.State, DateTimeOffset.UtcNow);

        // Assert
        opportunity.Mode.Should().Be("finalize");
        JsonNode.DeepEquals(opportunity.Request, fixture.Request).Should().BeTrue();

        // Arrange: required checks finish within the bounded wait.
        fixture.Config["export_check_wait_seconds"] = 20;
        var clock = new CheckClock(DateTimeOffset.UtcNow);
        var delays = 0;
        var waiting = new ExportCheckWait(clock, (duration, token) =>
        {
            token.ThrowIfCancellationRequested();
            clock.Advance(duration);
            delays++;
            fixture.Api.ChecksReady = true;
            return Task.CompletedTask;
        });

        // Act
        JsonObject resumed = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store, checkWait: waiting);

        // Assert
        delays.Should().Be(1);
        resumed.Str("status").Should().Be("exported");
        resumed.Bool("resumed").Should().BeTrue();
        fixture.Api.RefWrites.Should().Be(1);
        fixture.Api.CommitWrites.Should().Be(1);
        fixture.Api.Dispatches.Should().Be(1);
        fixture.Api.Comments.Count.Should().Be(1);
        fixture.Api.Comments[0].Str("body").Should().Contain(FakeExportApi.GeneratedHead);
        fixture.Api.Pr.Str("body").Should().StartWith("Owner introduction\n").And.EndWith("\nOwner footer").And.Contain("required checks and full-vault validation passed");
        JsonObject final = (await store.ReadAsync()).State;
        final.Obj("finalized_exports").ContainsKey(fixture.Request.Str("op_id")).Should().BeTrue();
        final.Obj("prs").Obj(fixture.Key).Bool("export_required", true).Should().BeFalse();
        final.Obj("feedback").Obj("inline:7:revision").Str("status").Should().Be("applied");
        final.Obj("cooldown").Str("kind").Should().Be("weekly");
        final["lease"].Should().BeNull();

        // Act: retry an already finalized export.
        JsonObject again = await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request);

        // Assert
        again.Str("status").Should().Be("exported");
        fixture.Api.Comments.Count.Should().Be(1);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task OwnerReadyExportPersistsReviewFreezeBeforeDraftConversionIncludingRecovery(bool recoverGeneratedRef)
    {
        // Arrange: maintenance last observed a draft without owner feedback.
        var fixture = new WorkerFixture();
        fixture.Api.Pr["draft"] = true;
        fixture.State.Obj("prs").Obj(fixture.Key)["draft"] = true;
        var store = new MemoryStateStore(fixture.State);
        if (recoverGeneratedRef)
        {
            fixture.Api.FailBeforeRefOnce = true;

            // Act: a generated commit is saved before its ref update is interrupted.
            Func<Task> interrupted = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);

            // Assert
            await interrupted.Should().ThrowAsync<RuntimeFailure>();
            fixture.Api.DraftConversions.Should().Be(0);
        }

        // Arrange: the owner marks the PR ready while its export is outstanding.
        fixture.Api.Pr["draft"] = false;
        fixture.Api.BeforeDraftConversion = async () =>
        {
            JsonObject beforeConversion = (await store.ReadAsync()).State.Obj("prs").Obj(fixture.Key);
            beforeConversion.Bool("frozen").Should().BeTrue();
            beforeConversion.Str("review_started_head_sha").Should().Be(FakeExportApi.SourceHead);
        };

        // Act
        JsonObject result = recoverGeneratedRef
            ? await Worker.FinalizeAsync(fixture.Api, fixture.Config, store, fixture.Request)
            : await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);
        StateSnapshot saved = await store.ReadAsync();
        JsonObject reconciled = Core.SyncPrs(saved.State, new JsonArray(new JsonObject
        {
            ["topic_id"] = fixture.Request.Str("topic_id"),
            ["generation"] = 1,
            ["number"] = 1,
            ["status"] = "open",
            ["draft"] = true,
            ["head_sha"] = FakeExportApi.GeneratedHead
        }));
        JsonObject? nextBatch = DevBook.Tooling.Improvement.Queue.SelectBatch(reconciled,
            new JsonArray(DomainFixtures.NoteRecord("Vault/Home/Programming/NET/Next.md")), "rules", fixture.Config);

        // Assert
        result.Str("status").Should().Be("awaiting_checks");
        fixture.Api.DraftConversions.Should().Be(1);
        fixture.Api.Pr.Bool("draft").Should().BeTrue();
        saved.State.Obj("prs").Obj(fixture.Key).Str("review_started_head_sha").Should().Be(FakeExportApi.SourceHead);
        nextBatch.Should().BeNull();
    }

    [Fact]
    public async Task UnsafeArtifactsStaleHeadsAndLeaseConflictsStopWritesAndFixtureContainsNativeDependencies()
    {
        // Arrange
        var fixture = new WorkerFixture();
        var store = new MemoryStateStore(fixture.State);
        JsonObject unsafeBundle = fixture.Bundle.Copy();
        unsafeBundle.Obj("files")["Vault/Home/Overwrite.md"] = Convert.ToBase64String("unsafe"u8.ToArray());

        // Act: attempt publication outside generated paths.
        Func<Task> unsafePublish = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, unsafeBundle, fixture.Request, store);

        // Assert
        await unsafePublish.Should().ThrowAsync<UnsafeInput>();
        fixture.Api.RefWrites.Should().Be(0);

        // Arrange: another worker owns the lease.
        var lease = new DurableLease(store, "another-worker");
        await lease.AcquireAsync();

        // Act
        Func<Task> competing = () => Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);

        // Assert
        await competing.Should().ThrowAsync<Conflict>();

        // Arrange: the owner changes the branch after export.
        await lease.ReleaseAsync();
        fixture.Api.Head = FakeExportApi.OwnerChangedHead;

        // Act
        JsonObject stale = await Worker.PublishBundleAsync(fixture.Api, fixture.Config, fixture.Bundle, fixture.Request, store);

        // Assert
        stale.Str("status").Should().Be("stale");
        fixture.Api.RefWrites.Should().Be(0);
        fixture.Api.CommitWrites.Should().Be(0);
        JsonObject state = (await store.ReadAsync()).State;
        state.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence").Bool("export_paused").Should().BeTrue();

        // Arrange: export retries have reached their due time.
        JsonObject retryState = fixture.State.Copy();
        JsonObject retryEvidence = retryState.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence");
        retryEvidence["export_last_dispatch_at"] = Runtime.Iso(DateTimeOffset.UtcNow.AddHours(-7));
        retryEvidence["export_attempts"] = 2;

        // Act
        ExportOpportunity retry = Worker.SelectOpportunity(retryState, DateTimeOffset.UtcNow);

        // Assert
        retry.Mode.Should().Be("render");
        retry.State.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence").Int("export_attempts").Should().Be(3);

        // Arrange: the last allowed retry also times out.
        retry.State.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence")["export_last_dispatch_at"] = Runtime.Iso(DateTimeOffset.UtcNow.AddHours(-7));

        // Act
        ExportOpportunity exhausted = Worker.SelectOpportunity(retry.State, DateTimeOffset.UtcNow);

        // Assert
        exhausted.Request.Should().BeNull();
        exhausted.State.Obj("export_operations").Obj(fixture.Request.Str("op_id")).Obj("evidence").Bool("export_paused").Should().BeTrue();


        // Arrange: hosted validation never starts.
        var missing = new WorkerFixture();
        missing.Api.ValidationMissing = true;
        var missingStore = new MemoryStateStore(missing.State);

        // Act
        JsonObject notStarted = await Worker.PublishBundleAsync(missing.Api, missing.Config, missing.Bundle, missing.Request, missingStore);

        // Assert
        notStarted.Str("status").Should().Be("awaiting_checks");
        missing.Api.Dispatches.Should().Be(1);

        // Act: retry before the cooldown expires.
        JsonObject earlyRetry = await Worker.FinalizeAsync(missing.Api, missing.Config, missingStore, missing.Request);

        // Assert
        earlyRetry.Str("status").Should().Be("awaiting_checks");
        missing.Api.Dispatches.Should().Be(1);

        // Act: allow only the remaining recorded dispatch attempts.
        for (var attempt = 2; attempt <= 3; attempt++)
        {
            await MakeValidationDue(missingStore, missing.Request);
            // Act
            JsonObject retried = await Worker.FinalizeAsync(missing.Api, missing.Config, missingStore, missing.Request);

            // Assert
            retried.Str("status").Should().Be("awaiting_checks");
            missing.Api.Dispatches.Should().Be(attempt);
        }

        // Arrange: the final retry boundary is due.
        await MakeValidationDue(missingStore, missing.Request);

        // Act
        JsonObject paused = await Worker.FinalizeAsync(missing.Api, missing.Config, missingStore, missing.Request);

        // Assert
        paused.Str("status").Should().Be("checks_failed");
        missing.Api.Dispatches.Should().Be(3);
        missing.Api.RefWrites.Should().Be(1);
        missing.Api.CommitWrites.Should().Be(1);
        JsonObject missingEvidence = (await missingStore.ReadAsync()).State.Obj("export_operations").Obj(missing.Request.Str("op_id")).Obj("evidence");
        missingEvidence.Bool("export_paused").Should().BeTrue();
        missingEvidence.Int("validation_attempts").Should().Be(3);
        missingEvidence.Str("validation_head").Should().Be(FakeExportApi.GeneratedHead);
        missingEvidence.Str("export_error").Should().Contain("three recorded dispatch attempts");

        // Arrange: a credential-free checkout contains all native dependencies.
        string directory = Path.Combine(Path.GetTempPath(), "devbook-fixture-contract-" + Guid.NewGuid().ToString("N"));
        try
        {
            string trusted = Path.Combine(directory, "trusted");
            foreach (string relative in Receipt.RequiredPolicyPaths.Append("Web/quartz.config.yaml"))
            {
                string path = Path.Combine(trusted, relative);
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                File.WriteAllText(path, "fixture dependency\n");
            }
            string root = Path.Combine(directory, "repo");

            // Act
            string head = Fixture.PrepareCheckout(trusted, root);

            // Assert
            head.Should().HaveLength(40);
            Receipt.Make(Receipt.TreeEntries(root)).Obj("policy").Count.Should().BeGreaterThanOrEqualTo(Receipt.RequiredPolicyPaths.Count);
            File.ReadAllText(Path.Combine(root, "Vault/Home/Topic/Undated.md")).Should().NotContain("created:").And.NotContain("modified:");
            File.ReadAllText(Path.Combine(root, "Vault/Home/Topic/Example.md")).Should().Contain("[!qard]-").And.Contain("created:");
            Git.Text(root, "status", "--porcelain").Should().BeEmpty();
        }
        finally
        {
            if (Directory.Exists(directory))
            {
                Directory.Delete(directory, true);
            }
        }
    }

    private static async Task MakeValidationDue(IStateStore store, JsonObject request)
    {
        StateSnapshot snapshot = await store.ReadAsync();
        JsonObject state = snapshot.State.Copy();
        state.Obj("export_operations").Obj(request.Str("op_id")).Obj("evidence")["validation_last_dispatch_at"] = Runtime.Iso(DateTimeOffset.UtcNow.AddHours(-7));
        await store.WriteAsync(state, snapshot, "fixture advance validation retry boundary");
    }

    private sealed class CheckClock(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset current = now;
        public override DateTimeOffset GetUtcNow() => current;
        public void Advance(TimeSpan duration) => current += duration;
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
            string branch = Runtime.ExpectedManagedBranch(topic, 1);
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
                ["branch"] = branch,
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
            Bundle = new JsonObject { ["version"] = 1, ["expected_head"] = FakeExportApi.SourceHead, ["branch"] = branch, ["pr_number"] = 1, ["files"] = files };
            Api = new FakeExportApi(original, topic, branch);
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
                    ["branch"] = branch,
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
        public int CommitWrites { get; private set; }
        public int Dispatches { get; private set; }
        public int DraftConversions { get; private set; }
        public Func<Task>? BeforeDraftConversion { get; set; }
        public JsonObject Pr { get; }
        public List<JsonObject> Comments { get; } = [];
        public Dictionary<string, byte[]> Blobs { get; } = new(StringComparer.Ordinal);
        public Dictionary<string, GitTreeEntry> CurrentTree { get; private set; }
        private readonly Dictionary<string, GitTreeEntry> original;
        private readonly string branch;

        public FakeExportApi(IEnumerable<GitTreeEntry> entries, string topic, string branch)
        {
            original = entries.ToDictionary(item => item.Path, StringComparer.Ordinal);
            CurrentTree = new(original, StringComparer.Ordinal);
            this.branch = branch;
            Pr = new JsonObject
            {
                ["number"] = 1,
                ["node_id"] = "PR_node",
                ["state"] = "open",
                ["draft"] = false,
                ["user"] = new JsonObject { ["id"] = 7, ["login"] = "owner" },
                ["body"] = "Owner introduction\n" + Runtime.Marker(topic, 1) + "\n<!-- devbook-improvement:start topic=" + topic
                    + " -->\nCumulative scope.\n<!-- devbook-export-validation -->Quartz export: awaiting export.\n<!-- devbook-improvement:end -->\nOwner footer",
                ["head"] = new JsonObject { ["ref"] = branch, ["sha"] = Head, ["repo"] = new JsonObject { ["full_name"] = Repo } },
                ["base"] = new JsonObject { ["ref"] = "main", ["sha"] = MainHead, ["repo"] = new JsonObject { ["full_name"] = Repo } }
            };
        }

        public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null, bool paginate = false, CancellationToken cancellationToken = default)
        {
            JsonNode? response;
            if (method == "GET" && path == "/pulls/1")
            {
                Pr.Obj("head")["sha"] = Head;
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
                payload.Bool("force").Should().BeFalse();
                if (FailBeforeRefOnce)
                {
                    FailBeforeRefOnce = false;
                    throw new RuntimeFailure("Simulated transport interruption before the ref write.");
                }
                Head = payload.Str("sha");
                RefWrites++;
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
                        ["head_branch"] = branch,
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
}
