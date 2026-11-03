using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;
using ImprovementQueue = DevBook.Tooling.Improvement.Queue;

namespace DevBook.Tooling.Tests;

public sealed class QueueTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void FeedbackOutranksFlaggedNotesWhichOutrankOrdinaryNewNotes(bool feedback)
    {
        // Arrange
        string flaggedPath = "Vault/Home/Programming/ZZZ/Flagged.md";
        string feedbackPath = "Vault/Home/Programming/YYY/Feedback.md";
        JsonObject state = Core.NewState();
        JsonObject flagged = DomainFixtures.NoteRecord(flaggedPath);
        RepairInputs.Apply(flagged, new HashSet<string> { "stable_1" });
        var notes = new JsonArray(DomainFixtures.NoteRecord(), flagged, DomainFixtures.NoteRecord(feedbackPath));
        if (feedback)
        {
            state.Obj("feedback")["request"] = new JsonObject
            {
                ["status"] = "pending",
                ["topic"] = Core.TopicFor(feedbackPath),
                ["paths"] = new JsonArray(feedbackPath)
            };
        }

        // Act
        JsonObject batch = ImprovementQueue.SelectBatch(state, notes, "rules", new JsonObject { ["max_notes_per_run"] = 1 })!;

        // Assert
        batch.Arr("notes").Should().ContainSingle().Which.Str("path").Should().Be(feedback ? feedbackPath : flaggedPath);
        batch.Arr("notes")[0]!.Str("content").Should().Be(DomainFixtures.Note);
        batch.Str("topic").Should().Be("Programming");
    }

    [Fact]
    public void ReviewedFlagIsSelectedAgainOnlyWhenItsInputsChange()
    {
        // Arrange
        JsonObject note = DomainFixtures.NoteRecord();
        RepairInputs.Apply(note, new HashSet<string> { "stable_1" });
        JsonObject state = Core.NewState();
        state.Obj("notes")[DomainFixtures.Path] = new JsonObject
        {
            ["content_hash"] = note.Str("hash"),
            ["rules_hash"] = "rules",
            ["outcome"] = "changed",
            ["repair_input_hash"] = "old-flags",
            ["evaluation_hash"] = "policy"
        };
        var config = new JsonObject { ["evaluation_hash"] = "policy" };

        // Act
        JsonObject? batch = ImprovementQueue.SelectBatch(state, new JsonArray(note), "rules", config);

        // Assert
        batch!.Arr("notes")[0]!.Str("selection_reason").Should().Be("needs_fixing");
    }

    [Fact]
    public async Task FlagsAndHeldRepairsCannotBypassReviewFreeze()
    {
        // Arrange
        JsonObject note = DomainFixtures.NoteRecord();
        RepairInputs.Apply(note, new HashSet<string> { "stable_1" });
        JsonObject state = Core.SyncPrs(Core.NewState(), new JsonArray(new JsonObject
        {
            ["topic_id"] = Core.TopicId(Core.TopicFor(DomainFixtures.Path)),
            ["generation"] = 1,
            ["number"] = 7,
            ["status"] = "open",
            ["draft"] = true,
            ["review_activity"] = true
        }));

        string root = Repository.FindRoot();
        string rules = Core.RulesVersion(root);
        state["held_proposals"] = new JsonObject
        {
            [Core.TopicId("Programming")] = new JsonObject
            {
                ["topic_id"] = Core.TopicId("Programming"),
                ["rules_hash"] = rules,
                ["source_hashes"] = new JsonObject { [DomainFixtures.Path] = note.Str("hash") },
                ["repair_inputs"] = new JsonObject { [DomainFixtures.Path] = note.Str("repair_input_hash") },
                ["feedback_keys"] = new JsonArray(),
                ["batch"] = new JsonObject { ["topic"] = "Programming" },
                ["blocked_review"] = new JsonObject
                {
                    ["verdict"] = "CHANGES REQUIRED",
                    ["notes"] = new JsonArray(new JsonObject
                    {
                        ["path"] = DomainFixtures.Path,
                        ["findings"] = new JsonArray(new JsonObject { ["severity"] = "Medium" })
                    })
                }
            }
        };
        JsonObject pending = state.Obj("held_proposals").Obj(Core.TopicId("Programming")).Copy();
        pending["evaluation_hash"] = ClaudeProvider.EvaluationHash(new JsonObject());
        pending["review_repair_key"] = "reserved-repair";
        pending["repair_reserved"] = true;
        pending["author_repair_pending"] = true;
        state["pending_author_proposal"] = pending;
        state["review_repair_attempts"] = new JsonObject { ["reserved-repair"] = 1 };
        var store = new MemoryStateStore(state);
        var engine = new ImprovementEngine(root, new JsonObject(), store, notesLoader: () => new JsonArray(note.Copy(), DomainFixtures.NoteRecord("Vault/Home/Networks/Other.md")));

        // Act
        JsonObject result = await engine.RunAsync();
        JsonObject final = (await store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("selected");
        result.Obj("batch").Str("topic").Should().Be("Networks");
        result.Int("model_calls").Should().Be(0);
        final["pending_author_proposal"].Should().BeNull();
        final.Obj("review_repair_attempts").Int("reserved-repair").Should().Be(1);
    }

    [Fact]
    public void FeedbackSelectionRetainsItsFullScopeWhileEvaluatingOneNote()
    {
        // Arrange
        string other = "Vault/Home/Programming/Network/Transport/TCP.md";
        JsonObject state = Core.NewState();
        state.Obj("prs")["target"] = new JsonObject
        { ["number"] = 7, ["topic_id"] = Core.TopicId("Programming"), ["status"] = "open" };
        state.Obj("feedback")["request"] = new JsonObject
        {
            ["status"] = "pending",
            ["pr_number"] = 7,
            ["topic"] = Core.TopicFor(other),
            ["paths"] = new JsonArray(DomainFixtures.Path, other)
        };

        state.Obj("feedback")["unrelated"] = new JsonObject
        { ["status"] = "pending", ["pr_number"] = 8, ["topic"] = "Networks", ["paths"] = new JsonArray("Vault/Home/Networks/Other.md") };

        // Act
        JsonObject batch = ImprovementQueue.SelectBatch(state,
            new JsonArray(DomainFixtures.NoteRecord(), DomainFixtures.NoteRecord(other), DomainFixtures.NoteRecord("Vault/Home/Networks/Other.md")), "rules", new JsonObject { ["feedback_pr"] = 7 })!;

        // Assert
        batch.Arr("notes").Should().ContainSingle();
        batch.Arr("feedback").Should().ContainSingle().Which.Arr("paths").Strings().Should().Equal(DomainFixtures.Path, other);
    }

    [Fact]
    public void EveryOpenManagedTopicIsExcludedFromOrdinarySelection()
    {
        // Arrange
        JsonObject state = Core.NewState();
        state.Obj("prs")["open"] = new JsonObject
        {
            ["topic_id"] = Core.TopicId("Programming"),
            ["generation"] = 1,
            ["status"] = "open",
            ["draft"] = true,
            ["frozen"] = false
        };

        // Act
        JsonObject? batch = ImprovementQueue.SelectBatch(state, new JsonArray(DomainFixtures.NoteRecord()), "rules");

        // Assert
        batch.Should().BeNull();
    }

    [Fact]
    public async Task ThreeMalformedReceiptsPauseTheirTopicsWithoutBlockingANewTopic()
    {
        // Arrange
        using var fixture = new WorkloadFixture(1);
        var api = new ReceiptReconciliationApi();
        JsonObject state = Core.NewState();
        var originals = new Dictionary<string, JsonObject>();
        string[] topics = ["Networks", "Databases", "Algorithms"];
        for (var index = 0; index < topics.Length; index++)
        {
            string topic = topics[index];
            string topicId = Core.TopicId(topic);
            string key = $"{topicId}:1";
            string path = $"Vault/Home/{topic}/Other.md";
            JsonObject note = DomainFixtures.NoteRecord(path);
            fixture.Notes.Add(note);
            string head = new((char)('a' + index), 40);
            string receiptSha = new((char)('d' + index), 40);
            api.Prs.Add(new JsonObject
            {
                ["number"] = index + 1,
                ["state"] = "open",
                ["draft"] = true,
                ["body"] = Runtime.Marker(topicId, 1),
                ["head"] = new JsonObject
                {
                    ["ref"] = Runtime.ExpectedManagedBranch(topicId, 1),
                    ["sha"] = head,
                    ["repo"] = new JsonObject { ["full_name"] = api.Repo }
                },
                ["base"] = new JsonObject
                {
                    ["ref"] = "main",
                    ["sha"] = api.BaseSha,
                    ["repo"] = new JsonObject { ["full_name"] = api.Repo }
                }
            });
            JsonObject prior = new()
            {
                ["topic_id"] = topicId,
                ["generation"] = 1,
                ["number"] = index + 1,
                ["status"] = "open",
                ["draft"] = true,
                ["base_note_hashes"] = new JsonObject { [path] = note.Str("hash") },
                ["changed_paths"] = new JsonArray(path),
                ["proposal_records"] = new JsonArray(new JsonObject
                {
                    ["proposal"] = DomainFixtures.Proposal(DomainFixtures.Edit()),
                    ["review"] = new JsonObject { ["verdict"] = "CLEAN", ["evidence"] = $"review-{topic}" },
                    ["source_evidence"] = new JsonObject { ["original"] = $"source-{topic}" }
                }),
                ["export_receipt"] = new JsonObject { ["original"] = $"export-{topic}" },
                ["unknown_evidence"] = new JsonObject { ["nested"] = new JsonArray(topic, "preserve") }
            };
            state.Obj("prs")[key] = prior;
            originals[key] = prior.Copy();
            api.Responses[$"/pulls/{index + 1}/files?per_page=100"] = new JsonArray(
                new JsonObject { ["filename"] = path }, new JsonObject { ["filename"] = "Web/content/Other.md" });
            var entries = new JsonArray(Receipt.RequiredPolicyPaths.Append(path).Append("Web/content/Other.md")
                .Select(input => (JsonNode)new JsonObject
                { ["path"] = input, ["mode"] = "100644", ["type"] = "blob", ["sha"] = new string('1', 40) }).ToArray());
            if (index > 0)
            {
                entries.Add(new JsonObject
                { ["path"] = Receipt.PathName, ["mode"] = "100644", ["type"] = "blob", ["sha"] = receiptSha });
                api.Responses[$"/git/blobs/{receiptSha}"] = new JsonObject
                {
                    ["encoding"] = "base64",
                    ["content"] = index == 1 ? Convert.ToBase64String(Encoding.UTF8.GetBytes("{malformed-json")) : "!invalid-base64!"
                };
            }
            api.Responses[$"/git/trees/{head}?recursive=1"] = new JsonObject { ["truncated"] = false, ["tree"] = entries };
        }
        var store = new MemoryStateStore(state);
        fixture.Config["repo"] = api.Repo;
        var publisher = new GitHubRuntime(api, store, activation: () => { });
        var engine = new ImprovementEngine(fixture.Root, fixture.Config, store, fixture.Model, api, publisher,
            notesLoader: () => fixture.Notes.Copy(), clock: fixture.Clock, snapshotShaLoader: () => api.BaseSha);

        // Act
        JsonObject result = await engine.RunAsync();

        // Assert
        JsonObject final = (await store.ReadAsync()).State;
        result.Str("status").Should().Be("selected");
        result.Obj("batch").Str("topic").Should().Be("Programming");
        result.Obj("batch").Arr("notes").Should().ContainSingle().Which.Str("path").Should().Be(fixture.Notes[0]!.Str("path"));
        result.Int("model_calls").Should().Be(0);
        result.Bool("mutated").Should().BeFalse();
        fixture.Model.Authors.Should().BeEmpty();
        fixture.Model.Reviews.Should().BeEmpty();
        final.Obj("prs").Count.Should().Be(3);
        foreach ((string key, JsonObject original) in originals)
        {
            JsonObject row = final.Obj("prs").Obj(key);
            row.Str("status").Should().Be("open");
            row.Bool("frozen").Should().BeTrue();
            row.Bool("base_conflict").Should().BeTrue();
            row.Str("pause_reason").Should().NotBeNullOrWhiteSpace();
            foreach (string field in new[] { "proposal_records", "export_receipt", "unknown_evidence", "base_note_hashes", "changed_paths" })
                JsonNode.DeepEquals(row[field], original[field]).Should().BeTrue($"{key} must retain {field}");
        }
        final.Obj("prs").Obj($"{Core.TopicId("Networks")}:1").Str("pause_reason").Should().Contain("receipt is missing");
        final.Obj("prs").Obj($"{Core.TopicId("Databases")}:1").Str("pause_reason").Should().Contain("property name");
        final.Obj("prs").Obj($"{Core.TopicId("Algorithms")}:1").Str("pause_reason").Should().Contain("Base-64");
        api.Requests.Should().Contain("GET /git/blobs/" + new string('e', 40));
        api.Requests.Should().Contain("GET /git/blobs/" + new string('f', 40));
        api.Requests.Should().OnlyContain(request => request.StartsWith("GET ", StringComparison.Ordinal));
    }

    [Fact]
    public void LegacyKeepIsReevaluatedOnceAndItsOriginalEvidenceIsArchivedIntact()
    {
        // Arrange
        JsonObject note = DomainFixtures.NoteRecord();
        JsonObject proposal = new()
        {
            ["version"] = 1,
            ["edits"] = new JsonArray(),
            ["dispositions"] = new JsonArray(new JsonObject
            { ["path"] = DomainFixtures.Path, ["outcome"] = "keep", ["reason"] = "The complete note remains useful." })
        };
        JsonObject review = DomainFixtures.UnchangedReview(new JsonObject { ["current"] = new JsonObject { [DomainFixtures.Path] = DomainFixtures.Note } });
        JsonObject batch = new() { ["notes"] = new JsonArray(note.Copy()), ["rules_hash"] = "rules", ["evaluation_hash"] = "policy" };
        JsonObject legacy = Core.RecordOutcome(Core.NewState(), batch, proposal, new JsonObject(), review);
        JsonObject originalEvidence = legacy.Obj("notes").Obj(DomainFixtures.Path).Obj("keep_review").Copy();
        JsonObject focusedBatch = ImprovementQueue.SelectBatch(legacy, new JsonArray(note.Copy()), "rules", new JsonObject { ["evaluation_hash"] = "policy" })!;

        // Act
        JsonObject focused = Core.RecordOutcome(legacy, focusedBatch, proposal, new JsonObject(), review);
        JsonObject? next = ImprovementQueue.SelectBatch(focused, new JsonArray(note.Copy()), "rules", new JsonObject { ["evaluation_hash"] = "policy" });

        // Assert
        focusedBatch.Arr("notes").Should().ContainSingle();
        focusedBatch.Str("review_process").Should().Be(Core.FocusedReviewVersion);
        next.Should().BeNull();
        JsonObject record = focused.Obj("notes").Obj(DomainFixtures.Path);
        JsonNode.DeepEquals(record.Obj("keep_review_history")[LegacyIdentity.Fingerprint(originalEvidence)], originalEvidence).Should().BeTrue();
        record.Obj("keep_review_history").Count.Should().Be(1);
        record.Obj("keep_review").Str("review_process").Should().Be(Core.FocusedReviewVersion);
    }

    [Fact]
    public void ManualTargetConfigurationIsRejected()
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "selection-" + Guid.NewGuid().ToString("N"));
        var config = new JsonObject { ["target_note"] = DomainFixtures.Path, ["review_focus"] = "An imposed change" };

        // Act
        Action construct = () => new ImprovementEngine(root, config, new MemoryStateStore(Core.NewState()));

        // Assert
        construct.Should().Throw<ArgumentException>().WithMessage("Manual note targeting is not supported*");
    }

    private sealed class ReceiptReconciliationApi : IGitHubApi
    {
        public string Repo => "owner/repo";
        public string BaseSha { get; } = new('0', 40);
        public JsonArray Prs { get; } = new();
        public Dictionary<string, JsonNode> Responses { get; } = new(StringComparer.Ordinal);
        public List<string> Requests { get; } = [];

        public Task<JsonNode?> RequestAsync(string method, string path, JsonNode? payload = null,
            bool paginate = false, CancellationToken cancellationToken = default)
        {
            Requests.Add($"{method} {path}");
            if (method != "GET") throw new InvalidOperationException($"Unexpected remote mutation: {method} {path}");
            JsonNode response = path switch
            {
                "/git/ref/heads/main" => new JsonObject { ["object"] = new JsonObject { ["sha"] = BaseSha } },
                "/pulls?state=all&per_page=100" => Prs,
                _ => Responses.TryGetValue(path, out JsonNode? value) ? value
                    : throw new InvalidOperationException($"Unexpected fixture request: {method} {path}")
            };
            return Task.FromResult<JsonNode?>(response.DeepClone());
        }

        public Task<JsonNode?> GraphqlAsync(string query, JsonObject variables, CancellationToken cancellationToken = default)
        {
            Requests.Add("GRAPHQL");
            throw new InvalidOperationException("Unexpected remote GraphQL mutation.");
        }
    }

}
