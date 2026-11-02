using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using System.Text.Json.Nodes;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class EngineTests
{

    [Fact]
    public void ReviewEvidenceBindsOnlyAnUnambiguousLiteralQuotation()
    {
        // Arrange
        var cases = new[] { (Scenario: "unique", Expected: true), (Scenario: "ambiguous", Expected: false) }.Select(item =>
        {
            string current = item.Expected ? "First\nExact quotation.\nContinuation.\n" : "First\nExact quotation.\nExact quotation.\n";
            var candidates = new Dictionary<string, string> { [DomainFixtures.Path] = current };
            JsonObject raw = DomainFixtures.UnchangedReview(new JsonObject { ["current"] = new JsonObject { [DomainFixtures.Path] = current } });
            JsonObject citation = raw.Arr("notes")[0]!.Arr("current_text_evidence")[0]!.AsObject();
            citation["quote"] = item.Expected ? "Exact quotation.\nContinuation." : "Exact quotation.";
            citation["line_start"] = 1;
            return (item.Expected, Candidates: candidates, Raw: raw, Citation: citation);
        }).ToArray();

        // Act
        var results = cases.Select(item =>
        {
            (JsonObject bound, JsonArray bindings) = Review.BindEvidence(item.Raw, item.Candidates);
            return (item.Expected, Accepted: Review.Clean(bound, item.Candidates, new JsonObject(), new JsonArray(), new JsonArray()),
                Bindings: bindings.Count, OriginalLine: item.Citation.Int("line_start"),
                BoundLine: bound.Arr("notes")[0]!.Arr("current_text_evidence")[0]!.Int("line_start"));
        }).ToArray();

        // Assert
        results.Should().OnlyContain(item => item.Accepted == item.Expected && item.OriginalLine == 1
            && item.Bindings == (item.Expected ? 1 : 0) && (!item.Expected || item.BoundLine == 2));
    }

    [Fact]
    public void MissingRequiredContractBlocksBeforeModelCalls()
    {
        // Arrange
        using var fixture = new KeepDecisionKeepFixture();
        File.Delete(Path.Combine(fixture.Root, ".claude/agents/note-writer.md"));

        // Act
        Action construct = () => fixture.Engine();

        // Assert
        construct.Should().Throw<FileNotFoundException>().WithMessage("*note-writer.md*");
        fixture.Model.Authors.Should().Be(0);
        fixture.Model.Reviews.Should().Be(0);
    }

    [Fact]
    public async Task SemanticKeepFailureGetsOneResumableRepairAndFreshReview()
    {
        // Arrange
        using var files = new CandidateValidationRepositoryFixture();
        var clock = new EngineTestClock(DateTimeOffset.Parse("2026-10-30T12:00:00Z"));
        var model = new ReviewRepairModel(clock, "author-quota");
        var store = new MemoryStateStore(Core.NewState());
        var config = new JsonObject { ["max_pr_notes"] = 1, ["max_review_repairs_per_batch"] = 1 };
        ImprovementEngine Engine() => new(files.Root, config, store, model, clock: clock, notesLoader: files.Notes,
            validator: (_, _, _) => Task.FromResult(new JsonArray()));
        await Engine().RunAsync(withModel: true);
        clock.Advance(TimeSpan.FromHours(2));
        config["max_review_repairs_per_batch"] = 1;

        // Act
        JsonObject result = await Engine().RunAsync(withModel: true);
        JsonObject state = (await store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("proposed");
        model.Authors.Should().Be(3);
        model.Reviews.Should().Be(2);
        state.Obj("review_repair_attempts").Count.Should().Be(1);
        state.Obj("review_repair_attempts").Single().Value!.GetValue<int>().Should().Be(1);
        model.RepairPayload.Obj("previous_review").Str("verdict").Should().Be("CHANGES REQUIRED");
        model.RepairPayload.Obj("previous_proposal").Arr("edits").Count.Should().Be(0);
        model.RepairPayload.Obj("note_hashes").Str(CandidateValidationBadPath).Should().Be(LegacyIdentity.Digest(CandidateValidationSource));
        result.Obj("candidate").Str(CandidateValidationBadPath).Should().Contain("The clarified mechanism.");
        state.Obj("pending_author_proposal").Bool("author_repair_pending").Should().BeFalse();
    }

    [Fact]
    public async Task ParkedRepairFailureCannotRestartItsSpentAttempt()
    {
        // Arrange
        using var files = new CandidateValidationRepositoryFixture();
        var clock = new EngineTestClock(DateTimeOffset.Parse("2026-10-30T12:00:00Z"));
        var model = new ReviewRepairModel(clock, "review-quota") { RejectAfterResume = true };
        var store = new MemoryStateStore(Core.NewState());
        var config = new JsonObject { ["max_pr_notes"] = 1 };
        ImprovementEngine Engine() => new(files.Root, config, store, model, clock: clock, notesLoader: files.Notes,
            validator: (_, _, _) => throw new InvalidOperationException("Rejected edits cannot reach validation."));
        await Engine().RunAsync(withModel: true);
        clock.Advance(TimeSpan.FromHours(2));
        StateSnapshot frozen = await store.ReadAsync();
        var pr = new JsonObject
        {
            ["topic_id"] = Core.TopicId("Programming"),
            ["generation"] = 1,
            ["number"] = 7,
            ["status"] = "open",
            ["draft"] = true,
            ["frozen"] = true
        };
        await store.WriteAsync(Core.SyncPrs(frozen.State, new JsonArray(pr.Copy())), frozen, "fixture freeze repair topic");

        // Act
        JsonObject parked = await Engine().RunAsync();
        StateSnapshot freed = await store.ReadAsync();
        pr["status"] = "closed";
        await store.WriteAsync(Core.SyncPrs(freed.State, new JsonArray(pr.Copy())), freed, "fixture close frozen PR");
        JsonObject failed = await Engine().RunAsync(withModel: true);
        JsonObject next = await Engine().RunAsync();
        JsonObject state = (await store.ReadAsync()).State;

        // Assert
        parked.Str("status").Should().Be("selected");
        parked.Obj("batch").Arr("notes")[0]!.Str("path").Should().Be(CandidateValidationOtherPath);
        failed.Obj("coverage").Arr("notes").OfType<JsonObject>().Should().Contain(item => item.Str("outcome") == "review_blocked");
        failed.Int("model_calls").Should().Be(1);
        model.Authors.Should().Be(2);
        model.Reviews.Should().Be(3);
        next.Obj("batch").Arr("notes").Should().ContainSingle().Which.Str("path").Should().Be(CandidateValidationOtherPath);
        state["pending_author_proposal"].Should().BeNull();
        state.Obj("parked_review_repairs").Count.Should().Be(0);
        state.Obj("review_repair_attempts").Single().Value!.GetValue<int>().Should().Be(1);
    }

    private sealed class ReviewRepairModel(TimeProvider clock, string scenario) : IModelProvider
    {
        public int Authors { get; private set; }
        public int Reviews { get; private set; }
        public JsonObject RepairPayload { get; private set; } = new();
        public bool RejectAfterResume { get; init; }
        private readonly EngineResumeModel changed = new(CandidateValidationBadPath);

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Authors++;
            if (Authors == 1)
            {
                return Task.FromResult(new JsonObject
                {
                    ["version"] = 1,
                    ["edits"] = new JsonArray(),
                    ["feedback"] = new JsonArray(),
                    ["dispositions"] = new JsonArray(new JsonObject { ["path"] = CandidateValidationBadPath, ["outcome"] = "keep", ["reason"] = "Initial audit found no change." })
                });
            }
            RepairPayload = payload.Copy();
            if (scenario == "author-quota" && Authors == 2) throw new ClaudeQuotaException("weekly", clock.GetUtcNow().AddHours(1), clock.GetUtcNow().AddHours(1));
            return changed.AuthorAsync(payload, cancellationToken);
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Reviews++;
            if (Reviews == 1 || RejectAfterResume && Reviews >= 3)
            {
                JsonObject review = DomainFixtures.UnchangedReview(payload);
                review["verdict"] = "CHANGES REQUIRED";
                review.Arr("notes")[0]!["verdict"] = "CHANGES REQUIRED";
                review.Arr("notes")[0]!.Arr("findings").Add(new JsonObject { ["severity"] = "Medium", ["effect"] = "The mechanism is underspecified.", ["fix"] = "Explain the mechanism." });
                return Task.FromResult(review);
            }
            if (scenario == "review-quota" && Reviews == 2) throw new ClaudeQuotaException("weekly", clock.GetUtcNow().AddHours(1), clock.GetUtcNow().AddHours(1));
            return changed.ReviewAsync(payload, cancellationToken);
        }
    }

    private sealed class EngineTestClock(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset Engineinstant = now;
        public override DateTimeOffset GetUtcNow() => Engineinstant;
        public void Advance(TimeSpan amount) => Engineinstant += amount;
    }

    private sealed class EngineResumeModel(string path) : IModelProvider
    {
        public int Authors { get; private set; }
        public int Reviews { get; private set; }
        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Authors++;
            return Task.FromResult(new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(new JsonObject
                {
                    ["path"] = path,
                    ["expected_hash"] = payload.RequiredObject("note_hashes").Str(path),
                    ["before"] = "The original mechanism.",
                    ["after"] = "The clarified mechanism.",
                    ["reason"] = "Restore the mechanism",
                    ["problem"] = "The existing explanation omits a material mechanism or boundary.",
                    ["reader_benefit"] = "The correction restores the mechanism for recall and engineering decisions.",
                    ["kind"] = "note",
                    ["learning_target"] = "same",
                    ["essential_meanings"] = new JsonArray(),
                    ["sources"] = new JsonArray(),
                    ["feedback_keys"] = new JsonArray()
                }),
                ["dispositions"] = new JsonArray(new JsonObject { ["path"] = path, ["outcome"] = "changed", ["reason"] = "Clarified" }),
                ["feedback"] = new JsonArray()
            });
        }
        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Reviews++;
            string current = payload.RequiredObject("current").Str(path);
            int line = Array.FindIndex(current.Split('\n'), value => value == "The clarified mechanism.") + 1;
            return Task.FromResult(new JsonObject
            {
                ["change_checks"] = DomainFixtures.ChangeChecks(payload),
                ["verdict"] = "CLEAN",
                ["notes"] = new JsonArray(new JsonObject
                {
                    ["path"] = path,
                    ["verdict"] = "CLEAN",
                    ["summary"] = "The mechanism is concrete.",
                    ["page_type"] = "concept",
                    ["split_suggestion"] = "Keep one concept",
                    ["target_resolution"] = "RESOLVED",
                    ["findings"] = new JsonArray(),
                    ["current_text_evidence"] = new JsonArray(new JsonObject { ["quote"] = "The clarified mechanism.", ["line_start"] = line, ["reason"] = "Current target explained" }),
                    ["source_checks"] = new JsonArray(),
                    ["rejection_equivalence"] = new JsonArray(),
                    ["quality"] = new JsonObject { ["accuracy"] = "PASS", ["clarity"] = "PASS", ["rules_compliance"] = "PASS", ["question_quality"] = "PASS", ["identity_safety"] = "PASS" }
                })
            });
        }
    }

    private const string KeepDecisionOtherPath = "Vault/Home/Programming/NET/Other.md";

    [Fact]
    public async Task KeepRequiresIndependentEvidenceBeforeRecordingOutcome()
    {
        // Arrange
        const bool apply = false;

        using var fixture = new KeepDecisionKeepFixture();
        fixture.Model.OffsetEvidence = true;

        // Act
        JsonObject result = await fixture.Engine().RunAsync(apply, withModel: true);
        JsonObject state = (await fixture.Store.ReadAsync()).State;

        // Assert
        result.Obj("coverage").Arr("notes").OfType<JsonObject>().Should().Contain(item => item.Str("outcome") == "no_worthwhile_changes");
        result.Int("model_calls").Should().Be(2);
        fixture.Model.Reviews.Should().Be(1);
        fixture.Model.ReviewPayload.RequiredObject("current").Str(DomainFixtures.Path).Should().Be(DomainFixtures.Note);
        fixture.Model.ReviewPayload.ContainsKey("review_focus").Should().BeFalse();
        JsonObject record = state.RequiredObject("notes").RequiredObject(DomainFixtures.Path);
        record.Str("outcome").Should().Be("keep");
        JsonObject evidence = record.RequiredObject("keep_review");
        evidence.Str("content_hash").Should().Be(LegacyIdentity.Digest(DomainFixtures.Note));
        evidence.Str("rules_hash").Should().Be(record.Str("rules_hash"));
        evidence.RequiredObject("review").Arr("current_text_evidence").Should().NotBeEmpty();
        record.Obj("keep_review").Obj("review").Str("verdict").Should().Be("CLEAN");
        state.ContainsKey("pending_author_proposal").Should().BeFalse();
        state.Obj("review_evidence").Count.Should().Be(1);
        fixture.Validations.Should().Be(0);
    }

    [Fact]
    public async Task IndependentQuestionQualityFailureBlocksKeepBeforePublication()
    {
        // Arrange
        using var fixture = new KeepDecisionKeepFixture();
        fixture.Model.FailQuestionQuality = true;
        var publicationApi = new RuntimeApi();
        const string previousPath = "Vault/Home/Programming/NET/A Previous.md";
        const string nextPath = "Vault/Home/Programming/NET/Z Next.md";
        StateSnapshot seeded = await fixture.Store.ReadAsync();
        seeded.State["held_proposals"] = new JsonObject
        {
            [Core.TopicId("Programming")] = new JsonObject
            {
                ["topic_id"] = Core.TopicId("Programming"),
                ["rules_hash"] = Core.RulesVersion(fixture.Root),
                ["source_hashes"] = new JsonObject { [previousPath] = LegacyIdentity.Digest(DomainFixtures.Note) },
                ["feedback_snapshot"] = new JsonArray()
            }
        };
        await fixture.Store.WriteAsync(seeded.State, seeded, "fixture prior held batch");

        // Act
        JsonObject blocked = await fixture.Engine(publicationApi).RunAsync(apply: true, withModel: true);
        JsonObject state = (await fixture.Store.ReadAsync()).State;
        JsonObject next = await new ImprovementEngine(fixture.Root, new JsonObject(), fixture.Store,
            notesLoader: () => new JsonArray(DomainFixtures.NoteRecord(), DomainFixtures.NoteRecord(previousPath), DomainFixtures.NoteRecord(nextPath))).RunAsync();

        // Assert
        blocked.Obj("coverage").Arr("notes").OfType<JsonObject>().Should().Contain(item => item.Str("outcome") == "review_blocked");
        next.Obj("batch").Arr("notes").Should().ContainSingle().Which.Str("path").Should().Be(nextPath);
        state.Obj("invalid_proposals").Count.Should().Be(1);
        state.Obj("notes").ContainsKey(DomainFixtures.Path).Should().BeFalse();
        state.RequiredObject("held_proposals").Count.Should().BePositive();
        state.ContainsKey("pending_author_proposal").Should().BeFalse();
        fixture.Model.Authors.Should().Be(1);
        fixture.Model.Reviews.Should().Be(1);
        fixture.Validations.Should().Be(0);
        publicationApi.Commits.Should().Be(0);
        publicationApi.PrCreates.Should().Be(0);
        state.Obj("export_operations").Count.Should().Be(0);
        state["pending_operation"].Should().BeNull();
    }

    [Fact]
    public async Task CleanReviewerCannotApproveKeepWithKnownNativeViolation()
    {
        // Arrange
        using var fixture = new KeepDecisionKeepFixture();
        fixture.Source += "\n```\nUnlabelled fixture fence.\n```\n";
        fixture.Violations.Add(KeepDecisionFenceViolation(fixture.Source));
        string original = fixture.Source;

        // Act
        JsonObject blocked = await fixture.Engine().RunAsync(withModel: true);
        JsonObject state = (await fixture.Store.ReadAsync()).State;

        // Assert
        blocked.Obj("coverage").Arr("notes").OfType<JsonObject>().Should().Contain(item => item.Str("outcome") == "proposal_blocked");
        state.Obj("invalid_proposals").Single().Value!.Obj("blocked_review").Str("stage").Should().Be("keep_structural_validation");
        state.Obj("invalid_proposals").Single().Value!.Obj("blocked_review").Str("reason").Should().Contain(DomainFixtures.Path).And.NotContain(KeepDecisionOtherPath);
        JsonNode.DeepEquals(fixture.Model.AuthorPayload.RequiredObject("known_violations")[DomainFixtures.Path], fixture.Violations).Should().BeTrue();
        state.Obj("notes").Count.Should().Be(0);
        JsonObject archived = state.RequiredObject("invalid_proposals").Single().Value!.AsObject();
        archived.RequiredObject("completed_review").Str("verdict").Should().Be("CLEAN");
        archived.RequiredObject("batch").Arr("notes")[0]!.Str("content").Should().Be(original);
        fixture.Model.ReviewPayload.RequiredObject("current").Str(DomainFixtures.Path).Should().Be(original);
        fixture.Model.Authors.Should().Be(1);
        fixture.Model.Reviews.Should().Be(1);
        fixture.Validations.Should().Be(0);
    }

    private static JsonObject KeepDecisionFenceViolation(string source) => new()
    {
        ["code"] = "markdown.code-fence-language",
        ["line"] = Array.IndexOf(source.Split('\n'), "```") + 1,
        ["message"] = "fenced code blocks need a language; use `text` when none fits"
    };

    private sealed class KeepDecisionKeepFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "keep-review-" + Guid.NewGuid().ToString("N"));
        public MemoryStateStore Store { get; } = new(Core.NewState());
        public KeepDecisionKeepClock Clock { get; } = new();
        public KeepDecisionKeepModel Model { get; }
        public int Validations { get; private set; }
        public string Source { get; set; } = DomainFixtures.Note;
        public JsonArray Violations { get; } = new();

        public KeepDecisionKeepFixture()
        {
            DomainFixtures.CreateReviewContract(Root);
            Model = new KeepDecisionKeepModel();
        }

        public ImprovementEngine Engine(RuntimeApi? publicationApi = null) => new(Root, new JsonObject(), Store, Model, clock: Clock,
            publisher: publicationApi is null ? null : new GitHubRuntime(publicationApi, Store, activation: () => { }),
            snapshotShaLoader: () => "base",
            notesLoader: () =>
            {
                JsonObject note = DomainFixtures.NoteRecord(content: Source);
                note["violations"] = Violations.Copy();
                var notes = new JsonArray(note);
                return notes;
            },
            validator: (_, _, _) =>
            {
                Validations++;
                throw new InvalidOperationException("An unchanged note does not need candidate validation.");
            });

        public void Dispose() => Directory.Delete(Root, recursive: true);
    }

    private sealed class KeepDecisionKeepClock : TimeProvider
    {
        private DateTimeOffset KeepDecisionnow = DateTimeOffset.Parse("2026-10-31T12:00:00Z");
        public override DateTimeOffset GetUtcNow() => KeepDecisionnow;
        public void Advance(TimeSpan amount) => KeepDecisionnow += amount;
    }

    private sealed class KeepDecisionKeepModel : IModelProvider
    {
        public int Authors { get; private set; }
        public int Reviews { get; private set; }
        public bool OffsetEvidence { get; set; }
        public bool FailQuestionQuality { get; set; }
        public JsonObject AuthorPayload { get; private set; } = new();
        public JsonObject ReviewPayload { get; private set; } = new();

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Authors++;
            AuthorPayload = payload.Copy();
            var proposal = new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(),
                ["dispositions"] = new JsonArray(new JsonObject { ["path"] = DomainFixtures.Path, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." }),
                ["feedback"] = new JsonArray()
            };
            return Task.FromResult(proposal);
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Reviews++;
            ReviewPayload = payload.Copy();
            JsonObject review = DomainFixtures.UnchangedReview(payload);
            if (OffsetEvidence)
            {
                review.Arr("notes")[0]!.Arr("current_text_evidence")[0]!["line_start"] = 2;
            }
            if (FailQuestionQuality)
            {
                review.RequiredArray("notes")[0]!["quality"]!["question_quality"] = "NOT APPLICABLE";
            }
            return Task.FromResult(review);
        }
    }

    [Fact]
    public async Task InvalidAuthorProposalIsQuarantinedWithItsOriginalFeedbackScope()
    {
        // Arrange

        const string badPath = "Vault/Home/Programming/ZZZ/Bad.md";
        const string otherPath = "Vault/Home/Programming/ZZZ/Other.md";
        const string goodPath = "Vault/Home/Programming/AAA/Good.md";
        const string feedbackKey = "comment:7:revision";
        const string otherFeedbackKey = "comment:8:revision";
        string root = Path.Combine(Path.GetTempPath(), "invalid-proposal-" + Guid.NewGuid().ToString("N"));
        DomainFixtures.CreateReviewContract(root);
        try
        {
            var notes = new JsonArray(DomainFixtures.NoteRecord(badPath), DomainFixtures.NoteRecord(otherPath), DomainFixtures.NoteRecord(goodPath));
            var config = new JsonObject { ["max_pr_notes"] = 5 };
            JsonObject state = Core.NewState();
            state.RequiredArray("rejections").Add("existing-owner-rejection");
            state.RequiredObject("feedback")[feedbackKey] = new JsonObject
            {
                ["key"] = feedbackKey,
                ["topic"] = Core.TopicFor(badPath),
                ["status"] = "pending",
                ["paths"] = new JsonArray(badPath)
            };
            state.RequiredObject("feedback")[otherFeedbackKey] = new JsonObject
            {
                ["key"] = otherFeedbackKey,
                ["topic"] = Core.TopicFor(otherPath),
                ["status"] = "pending",
                ["paths"] = new JsonArray(otherPath)
            };
            JsonObject invalid = DomainFixtures.Proposal(new JsonObject
            {
                ["path"] = badPath,
                ["expected_hash"] = LegacyIdentity.Digest(DomainFixtures.Note),
                ["before"] = "This anchor does not exist.",
                ["after"] = "The clarified mechanism.",
                ["reason"] = "Clarify the mechanism.",
                ["problem"] = "The existing explanation omits a material mechanism or boundary.",
                ["reader_benefit"] = "The correction restores the mechanism for recall and engineering decisions.",
                ["kind"] = "note",
                ["learning_target"] = "same",
                ["essential_meanings"] = new JsonArray(),
                ["sources"] = new JsonArray(),
                ["feedback_keys"] = new JsonArray(feedbackKey)
            });
            invalid["feedback"] = new JsonArray(new JsonObject { ["key"] = feedbackKey, ["outcome"] = "implemented", ["reason"] = "Clarified the requested mechanism." }, new JsonObject { ["key"] = otherFeedbackKey, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." });
            Proposal.Validate(invalid);

            var store = new MemoryStateStore(state);
            var model = new InvalidProposalAuthor(invalid);
            ImprovementEngine Engine() => new(root, config, store, model, notesLoader: () => notes.Copy());

            // Act: quarantine the fresh or previously saved invalid proposal.
            JsonObject blocked = await Engine().RunAsync(withModel: true);
            StateSnapshot quarantined = await store.ReadAsync();

            // Assert
            quarantined.State.Obj("invalid_proposals").Count.Should().BePositive("result: {0}", blocked.ToJsonString());
            quarantined.State.Obj("invalid_proposals").First().Value!.Obj("blocked_review").Str("reason").Should().Contain("replacement anchor must be unique");
            blocked.Int("model_calls").Should().Be(3);
            quarantined.State["pending_author_proposal"].Should().BeNull();
            JsonObject archived = quarantined.State.RequiredObject("invalid_proposals").Single().Value!.AsObject();
            JsonNode.DeepEquals(archived["proposal"], invalid).Should().BeTrue();
            archived.Obj("blocked_review").Str("stage").Should().Be("deterministic_application");
            archived.Obj("blocked_review").Str("reason").Should().NotBeEmpty();
            archived.Arr("feedback_keys").Strings().Should().Equal(feedbackKey, otherFeedbackKey);
            archived.Arr("feedback_snapshot").Count.Should().Be(2);
            model.Reviews.Should().Be(1);
            quarantined.State.Obj("held_proposals").ContainsKey(Core.TopicId(Core.TopicFor(badPath))).Should().BeTrue();
        }

        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private sealed class InvalidProposalAuthor(JsonObject invalid) : IModelProvider
    {
        public List<string> Paths { get; } = [];
        public int Reviews { get; private set; }

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string path = payload.RequiredObject("notes").Single().Key;
            Paths.Add(path);
            return Task.FromResult(path == invalid.Arr("edits")[0]!.Str("path") ? invalid.Copy() : new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(),
                ["dispositions"] = new JsonArray(new JsonObject { ["path"] = path, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." }),
                ["feedback"] = new JsonArray(payload.Arr("feedback").OfType<JsonObject>().Select(item => (JsonNode)new JsonObject
                {
                    ["key"] = item.Str("key"),
                    ["outcome"] = "keep",
                    ["reason"] = "No worthwhile changes."
                }).ToArray())
            });
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Reviews++;
            return Task.FromResult(DomainFixtures.UnchangedReview(payload));
        }
    }

    private const string CandidateValidationBadPath = "Vault/Home/Programming/AAA/Card.md";
    private const string CandidateValidationOtherPath = "Vault/Home/ZZProgramming/Other.md";
    private const string CandidateValidationSource = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\nThe original mechanism.\n";

    [Fact]
    public async Task InvalidCandidateIsHeldAfterIndependentReview()
    {
        // Arrange

        using var fixture = new CandidateValidationRepositoryFixture();
        JsonObject proposal = CandidateValidationProposalFor("The clarified mechanism.\n\n[[Missing validation target]]");
        var config = CandidateValidationConfiguration(new JsonArray("git", "rev-parse", "--verify", "HEAD"));
        JsonObject state = Core.NewState();

        var store = new MemoryStateStore(state);
        var model = new CandidateValidationCandidateModel(proposal);
        ImprovementEngine Engine() => new(fixture.Root, config, store, model,
            notesLoader: fixture.Notes, snapshotShaLoader: () => fixture.Snapshot);

        // Act: use the real isolated content validator after semantic review.
        JsonObject blocked = await Engine().RunAsync(withModel: true);
        StateSnapshot held = await store.ReadAsync();

        // Assert
        blocked.Obj("coverage").Arr("notes").OfType<JsonObject>().Should().Contain(item => item.Str("outcome") == "proposal_blocked");
        held.State.Obj("invalid_proposals").First().Value!.Obj("blocked_review").Str("stage").Should().Be("repository_validation");
        held.State.Obj("invalid_proposals").First().Value!.Obj("blocked_review").Str("reason").Should().Contain("wikilink.unresolved").And.Contain("Missing validation target");
        held.State["pending_author_proposal"].Should().BeNull();
        JsonObject archived = held.State.Obj("invalid_proposals").Single().Value!.AsObject();
        JsonNode.DeepEquals(archived["proposal"], proposal).Should().BeTrue();
        archived.Obj("completed_review").Str("verdict").Should().Be("CLEAN");
        model.Reviews.Should().Be(1);
    }

    [Fact]
    public async Task ProcessLossDuringValidationRetainsItsOriginalContentDeadlineAndCompletedReview()
    {
        // Arrange
        using var fixture = new CandidateValidationRepositoryFixture();
        var clock = new WorkloadClock();
        var store = new MemoryStateStore(Core.NewState());
        JsonObject proposal = CandidateValidationProposalFor("The clarified mechanism.");
        var model = new CandidateValidationCandidateModel(proposal) { OffsetFirstEvidence = true };
        var validations = 0;
        ImprovementEngine Engine() => new(fixture.Root, new JsonObject(), store, model, clock: clock,
            notesLoader: fixture.Notes, snapshotShaLoader: () => fixture.Snapshot,
            validator: (_, _, _) =>
            {
                validations++;
                clock.Advance(TimeSpan.FromMinutes(20));
                throw new SimulatedProcessLoss();
            });

        // Act
        Exception? crashed = await Record.ExceptionAsync(() => Engine().RunAsync(withModel: true));
        StateSnapshot pending = await store.ReadAsync();
        JsonObject resumed = await Engine().RunAsync(withModel: true);
        JsonObject final = (await store.ReadAsync()).State;

        // Assert
        crashed.Should().BeOfType<SimulatedProcessLoss>();
        pending.State.Obj("focused_workload").Str("phase").Should().Be("validation_reserved");
        pending.State.Obj("focused_workload").Str("reservation_deadline").Should().NotBeEmpty();
        JsonNode.DeepEquals(pending.State.Obj("pending_author_proposal")["proposal"], proposal).Should().BeTrue();
        pending.State.Obj("pending_author_proposal").Obj("review_evidence").Arr("bindings").Should().ContainSingle();
        model.Paths.Should().ContainSingle().Which.Should().Be(CandidateValidationBadPath);
        model.Reviews.Should().Be(1);
        validations.Should().Be(1);
        resumed.Str("status").Should().Be("time_limit");
        final.Obj("focused_workload")["elapsed_seconds"]!.GetValue<double>().Should().BeGreaterThanOrEqualTo(1800);
        final.Obj("invalid_proposals").Count.Should().Be(0);
        final.Obj("held_proposals").Count.Should().Be(0);
    }

    private static JsonObject CandidateValidationConfiguration(JsonArray command) => new()
    {
        ["repo"] = "fixture/repo",
        ["max_pr_notes"] = 1,
        ["validator_commands"] = new JsonArray(command)
    };

    private static JsonObject CandidateValidationProposalFor(string after) => DomainFixtures.Proposal(new JsonObject
    {
        ["path"] = CandidateValidationBadPath,
        ["expected_hash"] = LegacyIdentity.Digest(CandidateValidationSource),
        ["before"] = "The original mechanism.",
        ["after"] = after,
        ["reason"] = "Clarify the mechanism.",
        ["problem"] = "The existing explanation omits a material mechanism or boundary.",
        ["reader_benefit"] = "The correction restores the mechanism for recall and engineering decisions.",
        ["kind"] = "note",
        ["learning_target"] = "same",
        ["essential_meanings"] = new JsonArray(),
        ["sources"] = new JsonArray(),
        ["feedback_keys"] = new JsonArray()
    });

    private sealed class CandidateValidationRepositoryFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "candidate-validation-" + Guid.NewGuid().ToString("N"));
        public string Snapshot { get; }

        public CandidateValidationRepositoryFixture()
        {
            DomainFixtures.CreateReviewContract(Root);
            foreach (string path in new[] { CandidateValidationBadPath, CandidateValidationOtherPath })
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(Root, path))!);
                File.WriteAllText(Path.Combine(Root, path), CandidateValidationSource);
            }
            Git.Run(Root, "init", "--quiet", "--initial-branch=main");
            Git.Run(Root, "config", "user.name", "Fixture");
            Git.Run(Root, "config", "user.email", "fixture@example.invalid");
            Git.Run(Root, "add", ".");
            Git.Run(Root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture: candidate validation");
            Snapshot = Git.Text(Root, "rev-parse", "HEAD");
        }

        public JsonArray Notes() => new(DomainFixtures.NoteRecord(CandidateValidationBadPath, CandidateValidationSource), DomainFixtures.NoteRecord(CandidateValidationOtherPath, CandidateValidationSource));

        public void Dispose() => Directory.Delete(Root, recursive: true);
    }

    private sealed class CandidateValidationCandidateModel(JsonObject proposal) : IModelProvider
    {
        public bool RejectValue { get; init; }
        public bool OffsetFirstEvidence { get; init; }
        public List<string> Paths { get; } = [];
        public int Reviews { get; private set; }

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string path = payload.RequiredObject("notes").Single().Key;
            Paths.Add(path);
            return Task.FromResult(path == CandidateValidationBadPath ? proposal.Copy() : new JsonObject
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
            string[] lines = payload.RequiredObject("current").Str(CandidateValidationBadPath).Split('\n');
            int line = Array.IndexOf(lines, "The clarified mechanism.");
            return Task.FromResult(new JsonObject
            {
                ["change_checks"] = DomainFixtures.ChangeChecks(payload, RejectValue ? "NOT WORTHWHILE" : "WORTHWHILE"),
                ["verdict"] = "CLEAN",
                ["notes"] = new JsonArray(new JsonObject
                {
                    ["path"] = CandidateValidationBadPath,
                    ["verdict"] = "CLEAN",
                    ["summary"] = "The current explanation states its mechanism.",
                    ["page_type"] = "concept",
                    ["split_suggestion"] = "Keep one mechanism.",
                    ["target_resolution"] = "RESOLVED",
                    ["findings"] = new JsonArray(),
                    ["current_text_evidence"] = new JsonArray(new JsonObject { ["quote"] = lines[line], ["line_start"] = OffsetFirstEvidence && Reviews == 1 ? 1 : line + 1, ["reason"] = "The current explanation addresses the target." }),
                    ["source_checks"] = new JsonArray(),
                    ["rejection_equivalence"] = new JsonArray(),
                    ["quality"] = new JsonObject { ["accuracy"] = "PASS", ["clarity"] = "PASS", ["rules_compliance"] = "PASS", ["question_quality"] = "PASS", ["identity_safety"] = "PASS" }
                })
            });
        }
    }

    private const string SourceBudgetBadPath = "Vault/Home/Programming/AAA/ManySources.md";
    private const string SourceBudgetGoodPath = "Vault/Home/Programming/ZZZ/Other.md";
    private const string SourceBudgetSource = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\nThe original mechanism.\n";

    [Fact]
    public async Task OverBudgetSourcesAreQuarantinedBeforeNetworkAccess()
    {
        // Arrange

        string root = Path.Combine(Path.GetTempPath(), "source-budget-" + Guid.NewGuid().ToString("N"));
        DomainFixtures.CreateReviewContract(root);
        try
        {
            var notes = new JsonArray(DomainFixtures.NoteRecord(SourceBudgetBadPath, SourceBudgetSource), DomainFixtures.NoteRecord(SourceBudgetGoodPath, SourceBudgetSource));
            var config = new JsonObject { ["max_pr_notes"] = 1 };
            JsonObject proposal = SourceBudgetWithSources(13);
            string stage = "source_budget";
            JsonObject state = Core.NewState();

            var store = new MemoryStateStore(state);
            var model = new SourceBudgetAuthor(proposal);
            var fetches = 0;
            ImprovementEngine Engine() => new(root, config, store, model, notesLoader: () => notes.Copy(),
                sourceFetcher: async (url, token) =>
                {
                    fetches++;
                    await Runtime.ValidateSourceUrlAsync(url, token);
                    return "Primary documentation.";
                });

            // Act: quarantine the fresh or saved invalid proposal without network work.
            JsonObject blocked = await Engine().RunAsync(withModel: true);
            StateSnapshot afterBlocked = await store.ReadAsync();

            // Assert
            blocked.Obj("coverage").Arr("notes").OfType<JsonObject>().Should().Contain(item => item.Str("outcome") == "proposal_blocked");
            afterBlocked.State.Obj("invalid_proposals").First().Value!.Obj("blocked_review").Str("stage").Should().Be(stage);
            afterBlocked.State.Obj("invalid_proposals").First().Value!.Obj("blocked_review").Str("reason").Should().Contain("13 distinct source URLs");
            afterBlocked.State["pending_author_proposal"].Should().BeNull();
            JsonObject archived = afterBlocked.State.Obj("invalid_proposals").Single().Value!.AsObject();
            archived.Obj("blocked_review").Str("stage").Should().Be(stage);
            JsonNode.DeepEquals(archived["proposal"], proposal).Should().BeTrue();
            fetches.Should().Be(0);
        }

        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task ProcessLossDuringSourceRetrievalRetainsItsOriginalContentDeadlineAndAuthorResponse()
    {
        // Arrange
        using var fixture = new WorkloadFixture(1);
        JsonObject proposal = SourceBudgetWithSources(1);
        var model = new SourceBudgetAuthor(proposal);
        var fetches = 0;
        ImprovementEngine Engine() => new(fixture.Root, new JsonObject(), fixture.Store, model, clock: fixture.Clock,
            notesLoader: () => new JsonArray(DomainFixtures.NoteRecord(SourceBudgetBadPath, SourceBudgetSource)),
            sourceFetcher: (_, _) =>
            {
                fetches++;
                fixture.Clock.Advance(TimeSpan.FromMinutes(20));
                throw new SimulatedProcessLoss();
            });

        // Act
        Exception? crashed = await Record.ExceptionAsync(() => Engine().RunAsync(withModel: true));
        StateSnapshot pending = await fixture.Store.ReadAsync();
        JsonObject resumed = await Engine().RunAsync(withModel: true);
        JsonObject final = (await fixture.Store.ReadAsync()).State;

        // Assert
        crashed.Should().BeOfType<SimulatedProcessLoss>();
        pending.State.Obj("focused_workload").Str("phase").Should().Be("source_reserved");
        pending.State.Obj("focused_workload").Str("reservation_deadline").Should().NotBeEmpty();
        JsonNode.DeepEquals(pending.State.Obj("pending_author_proposal")["proposal"], proposal).Should().BeTrue();
        model.Paths.Should().ContainSingle();
        model.Reviews.Should().Be(0);
        fetches.Should().Be(1);
        resumed.Str("status").Should().Be("time_limit");
        final.Obj("focused_workload")["elapsed_seconds"]!.GetValue<double>().Should().BeGreaterThanOrEqualTo(1800);
        final.Obj("invalid_proposals").Count.Should().Be(0);
        final.Obj("held_proposals").Count.Should().Be(0);
    }

    private static JsonObject SourceBudgetWithSources(int count, string host = "learn.microsoft.com")
    {
        string[] urls = Enumerable.Range(1, count).Select(index => $"https://{host}/dotnet/source-{index}").ToArray();
        return DomainFixtures.Proposal(new JsonObject
        {
            ["path"] = SourceBudgetBadPath,
            ["expected_hash"] = LegacyIdentity.Digest(SourceBudgetSource),
            ["before"] = "The original mechanism.",
            ["after"] = "The clarified mechanism.\n\n" + string.Join('\n', urls.Select(url => $"- [Primary source]({url})")),
            ["reason"] = "Clarify the mechanism from primary sources.",
            ["problem"] = "The existing explanation omits a material mechanism or boundary.",
            ["reader_benefit"] = "The correction restores the mechanism for recall and engineering decisions.",
            ["kind"] = "note",
            ["learning_target"] = "same",
            ["essential_meanings"] = new JsonArray(),
            ["sources"] = new JsonArray(urls.Select(url => (JsonNode)new JsonObject { ["url"] = url, ["claim"] = "The clarified mechanism.", ["version"] = "Current documentation" }).ToArray()),
            ["feedback_keys"] = new JsonArray()
        });
    }

    private sealed class SourceBudgetAuthor(JsonObject proposal) : IModelProvider
    {
        public List<string> Paths { get; } = [];
        public int Reviews { get; private set; }

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string path = payload.RequiredObject("notes").Single().Key;
            Paths.Add(path);
            return Task.FromResult(path == SourceBudgetBadPath ? proposal.Copy() : new JsonObject
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
            return Task.FromResult(DomainFixtures.UnchangedReview(payload));
        }
    }

    [Fact]
    public async Task MoreThanFourKeepsContinueWithinTheSelectedTopLevelTopic()
    {
        // Arrange
        using var fixture = new WorkloadFixture(7, otherTopic: true);

        // Act
        JsonObject result = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        fixture.Model.Authors.Should().HaveCount(7);
        fixture.Model.Reviews.Should().HaveCount(7);
        fixture.Model.Authors.Should().OnlyContain(payload => payload.Obj("notes").Count == 1);
        fixture.Model.Reviews.Should().OnlyContain(payload => payload.Obj("current").Count == 1);
        fixture.Model.Authors.SelectMany(payload => payload.Obj("notes").Select(note => note.Key))
            .Should().OnlyContain(path => path.StartsWith("Vault/Home/Programming/", StringComparison.Ordinal));
        result.Int("model_calls").Should().Be(14);
        result.Obj("candidate").Count.Should().Be(0);
    }

    [Fact]
    public async Task FiveDistinctChangedNotesStopBeforeTheSixthAuthorEvenWithSeveralEditsPerNote()
    {
        // Arrange
        using var fixture = new WorkloadFixture(7);
        fixture.Model.Change = _ => true;
        fixture.Model.MultipleEdits = true;

        // Act
        JsonObject result = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        fixture.Model.Authors.Should().HaveCount(5);
        fixture.Model.Reviews.Should().HaveCount(5);
        result.Obj("candidate").Count.Should().Be(5);
        result.Int("model_calls").Should().Be(10);
        (await fixture.Store.ReadAsync()).State.Obj("focused_workload").Arr("accepted_records").Should().HaveCount(5);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AuthoredLineCapacityHoldsOversizedNotesAndDefersOnlyTheCurrentCandidate(bool oversizedAlone)
    {
        // Arrange
        using var fixture = new WorkloadFixture(3);
        fixture.Model.Change = _ => true;
        fixture.Model.ChangedCard = call => DomainFixtures.Card.Replace("The original answer.", "The clarified mechanism.")
            + (call < 3 ? string.Join("\n", Enumerable.Range(0, oversizedAlone ? 1250 : 610).Select(line => $"Concrete mechanism detail {line}.")) + "\n" : "");

        // Act
        JsonObject result = await fixture.Engine().RunAsync(withModel: true);
        JsonObject saved = (await fixture.Store.ReadAsync()).State;

        // Assert
        fixture.Model.Authors.Should().HaveCount(3);
        result.Obj("candidate").Count.Should().Be(oversizedAlone ? 1 : 2);
        result.Obj("candidate").ContainsKey(fixture.Notes[2]!.Str("path")).Should().BeTrue();
        if (oversizedAlone)
        {
            saved.Obj("held_proposals").Count.Should().BePositive();
            saved.Obj("invalid_proposals").Select(pair => pair.Value).OfType<JsonObject>()
                .Where(record => record.Obj("blocked_review").Str("stage") == "pr_size")
                .SelectMany(record => record.Obj("source_hashes").Select(source => source.Key)).Distinct()
                .Should().Contain(fixture.Notes[0]!.Str("path")).And.Contain(fixture.Notes[1]!.Str("path"));
        }
        else
        {
            saved.Obj("deferred_proposals").Count.Should().Be(1);
            saved.Obj("held_proposals").Count.Should().Be(0);
        }
        Review.ChangedLines(result.Str("diff")).Should().BeLessThanOrEqualTo(1200);
    }

    [Fact]
    public async Task ExhaustionSealsAllAcceptedNotesIntoOnePartialCandidate()
    {
        // Arrange
        using var fixture = new WorkloadFixture(2);
        fixture.Model.Change = _ => true;

        // Act
        JsonObject result = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        result.Str("status").Should().Be("proposed");
        result.Obj("candidate").Count.Should().Be(2);
        fixture.Model.Authors.Should().HaveCount(2);
        (await fixture.Store.ReadAsync()).State.Obj("focused_workload").Arr("accepted_records").Should().HaveCount(2);
    }

    [Fact]
    public async Task TwentyCallReservationsPreventAnEleventhAuthor()
    {
        // Arrange
        using var fixture = new WorkloadFixture(15);

        // Act
        JsonObject result = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        fixture.Model.Authors.Should().HaveCount(10);
        fixture.Model.Reviews.Should().HaveCount(10);
        result.Int("model_calls").Should().Be(20);
        (await fixture.Store.ReadAsync()).State.Obj("focused_workload").Int("calls_reserved").Should().Be(20);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ModelCancellationPreservesRecoveryAndDistinguishesCallerFromInjectedDeadline(bool callerCancellation)
    {
        // Arrange
        using var fixture = new WorkloadFixture(2);
        using var caller = new CancellationTokenSource();
        var api = new RuntimeApi();
        var publisher = new GitHubRuntime(api, fixture.Store, activation: () => { });
        bool canceled = false;
        fixture.Model.Change = _ => callerCancellation;
        fixture.Model.BeforeAuthor = async (call, token) =>
        {
            if (callerCancellation && call == 1) return;
            if (callerCancellation) caller.Cancel();
            else fixture.Clock.Advance(TimeSpan.FromMinutes(15));
            canceled = token.IsCancellationRequested;
            await Task.Delay(Timeout.InfiniteTimeSpan, token);
        };
        var engine = new ImprovementEngine(fixture.Root, fixture.Config, fixture.Store, fixture.Model, publisher: publisher,
            notesLoader: () => fixture.Notes.Copy(), clock: fixture.Clock, snapshotShaLoader: () => "base",
            validator: (_, _, _) => Task.FromResult(new JsonArray()));

        // Act
        JsonObject result = await engine.RunAsync(apply: callerCancellation, withModel: true, cancellationToken: caller.Token);
        JsonObject saved = (await fixture.Store.ReadAsync()).State;

        // Assert
        canceled.Should().BeTrue();
        fixture.Model.Authors.Should().HaveCount(callerCancellation ? 2 : 1);
        fixture.Model.Reviews.Should().HaveCount(callerCancellation ? 1 : 0);
        saved.Obj("focused_workload").Int("calls_reserved").Should().Be(callerCancellation ? 3 : 1);
        saved.Obj("focused_workload").Str("status").Should().Be("sealed");
        if (callerCancellation)
        {
            result.Str("status").Should().Be("caller_cancelled");
            saved.Obj("focused_workload").Arr("accepted_records").Should().ContainSingle();
            api.Commits.Should().Be(0);
            api.Acknowledgments.Should().Be(0);
            api.PrCreates.Should().Be(0);
        }
        else fixture.Clock.DueTimes.Should().Contain(TimeSpan.FromMinutes(15));
    }

    [Fact]
    public async Task ThirtyMinutesOfContentTimeStopsBeforeAnotherAuthor()
    {
        // Arrange
        using var fixture = new WorkloadFixture(4);
        fixture.Model.BeforeReview = (_, _) =>
        {
            fixture.Clock.Advance(TimeSpan.FromMinutes(10));
            return Task.CompletedTask;
        };

        // Act
        JsonObject result = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        fixture.Model.Authors.Should().HaveCount(3);
        fixture.Model.Reviews.Should().HaveCount(3);
        result.Int("model_calls").Should().Be(6);
        (await fixture.Store.ReadAsync()).State.Obj("focused_workload")["elapsed_seconds"]!.GetValue<double>().Should().BeGreaterThanOrEqualTo(1800);
    }

    [Fact]
    public async Task DetachedCheckoutValidatesCandidateAgainstSnapshotWithoutLocalMain()
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "devbook-detached-validation-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(root, ".scripts"));
        Directory.CreateDirectory(Path.Combine(root, ".codex/agents"));
        Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(root, DomainFixtures.Path))!);
        try
        {
            await File.WriteAllTextAsync(Path.Combine(root, DomainFixtures.Path), DomainFixtures.Note);
            await File.WriteAllTextAsync(Path.Combine(root, ".scripts/snapshot.txt"), "verified\n");
            DomainFixtures.CreateReviewContract(root);
            Git.Run(root, "init", "--quiet", "--initial-branch=main");
            Git.Run(root, "config", "user.name", "Fixture");
            Git.Run(root, "config", "user.email", "fixture@example.invalid");
            Git.Run(root, "add", ".");
            Git.Run(root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture: verified snapshot");
            string snapshot = Git.Text(root, "rev-parse", "HEAD");
            Git.Run(root, "update-ref", "refs/remotes/origin/main", snapshot);
            Git.Run(root, "checkout", "--quiet", "--detach", snapshot);
            Git.Run(root, "branch", "-D", "main");
            await File.WriteAllTextAsync(Path.Combine(root, ".scripts/snapshot.txt"), "later head\n");
            Git.Run(root, "add", ".scripts/snapshot.txt");
            Git.Run(root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture: later checkout");
            var config = new JsonObject
            {
                ["repo"] = "fixture/repo",
                ["base_branch"] = "main",
                ["validator_commands"] = new JsonArray(
                    new JsonArray("git", "grep", "--quiet", "--fixed-strings", "The answer explains its mechanism and boundary.", "--", DomainFixtures.Path),
                    new JsonArray("git", "grep", "--quiet", "--basic-regexp", "^verified$", "--", ".scripts/snapshot.txt"))
            };
            var engine = new ImprovementEngine(root, config, new MemoryStateStore(Core.NewState()), new IsolatedValidationCandidateModel(),
                notesLoader: () => new JsonArray(DomainFixtures.NoteRecord()), snapshotShaLoader: () => snapshot);

            // Act: exercise the real isolated validator, not an injected validation adapter.
            JsonObject result = await engine.RunAsync(withModel: true);

            // Assert
            result.Str("status").Should().Be("proposed");
            result.Arr("validation").Should().HaveCount(2);
            result.Arr("validation").OfType<JsonObject>().Should().OnlyContain(row => row.Str("result") == "passed");
            Git.Text(root, "for-each-ref", "--format=%(refname:short)", "refs/heads").Should().BeEmpty();
            File.ReadAllText(Path.Combine(root, DomainFixtures.Path)).Should().Be(DomainFixtures.Note);
            File.ReadAllText(Path.Combine(root, ".scripts/snapshot.txt")).Should().Be("later head\n");
            Git.Text(root, "status", "--porcelain").Should().BeEmpty();
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private sealed class IsolatedValidationCandidateModel : IModelProvider
    {
        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default) =>
            Task.FromResult(DomainFixtures.Proposal(DomainFixtures.Edit()));

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string[] lines = payload.RequiredObject("current").Str(DomainFixtures.Path).Split('\n');
            int line = Array.FindIndex(lines, value => value.Contains("The answer explains its mechanism and boundary.", StringComparison.Ordinal));
            return Task.FromResult(new JsonObject
            {
                ["change_checks"] = DomainFixtures.ChangeChecks(payload),
                ["verdict"] = "CLEAN",
                ["notes"] = new JsonArray(new JsonObject
                {
                    ["path"] = DomainFixtures.Path,
                    ["verdict"] = "CLEAN",
                    ["summary"] = "The fixture answer states its learning target.",
                    ["page_type"] = "concept",
                    ["split_suggestion"] = "Keep one learning target",
                    ["target_resolution"] = "RESOLVED",
                    ["findings"] = new JsonArray(),
                    ["current_text_evidence"] = new JsonArray(new JsonObject { ["quote"] = lines[line], ["line_start"] = line + 1, ["reason"] = "Current answer explains the target" }),
                    ["source_checks"] = new JsonArray(),
                    ["rejection_equivalence"] = new JsonArray(),
                    ["quality"] = new JsonObject { ["accuracy"] = "PASS", ["clarity"] = "PASS", ["rules_compliance"] = "PASS", ["question_quality"] = "PASS", ["identity_safety"] = "PASS" }
                })
            });
        }
    }

    [Fact]
    public async Task NegativeIndependentValueAssessmentBlocksTheCandidateBeforeValidation()
    {
        // Arrange
        using var files = new CandidateValidationRepositoryFixture();
        var model = new CandidateValidationCandidateModel(CandidateValidationProposalFor("The clarified mechanism.")) { RejectValue = true };
        var store = new MemoryStateStore(Core.NewState());
        var validations = 0;
        var engine = new ImprovementEngine(files.Root, new JsonObject { ["max_pr_notes"] = 1 }, store, model,
            notesLoader: files.Notes, validator: (_, _, _) => { validations++; return Task.FromResult(new JsonArray()); });

        // Act
        JsonObject result = await engine.RunAsync(withModel: true);

        // Assert
        result.Obj("coverage").Arr("notes").OfType<JsonObject>().Should().Contain(item => item.Str("outcome") == "review_blocked");
        validations.Should().Be(0);
        (await store.ReadAsync()).State.Obj("notes").Count.Should().Be(0);
        (await store.ReadAsync()).State.Obj("held_proposals").Count.Should().Be(1);
    }

    [Fact]
    public async Task DeferredOtherTopicReviewRemainsIntactUntilItsTopicBecomesEligible()
    {
        // Arrange
        using var programming = new WorkloadFixture(1);
        using var network = new WorkloadFixture(1);
        const string networkPath = "Vault/Home/ZZNetworks/Other.md";
        string networkText = network.Notes[0]!.Str("content").Replace("stable_" + LegacyIdentity.Digest(network.Notes[0]!.Str("path"))[..8], "stable_" + LegacyIdentity.Digest(networkPath)[..8]);
        network.Notes.Clear();
        network.Notes.Add(DomainFixtures.NoteRecord(networkPath, networkText));
        programming.Model.Change = network.Model.Change = _ => true;
        programming.Model.BeforeReview = network.Model.BeforeReview = (call, _) => call == 1
            ? Task.FromException(new ClaudeQuotaException("weekly", programming.Clock.GetUtcNow().AddHours(1), programming.Clock.GetUtcNow().AddHours(1))) : Task.CompletedTask;
        await programming.Engine().RunAsync(withModel: true);
        await network.Engine().RunAsync(withModel: true);
        JsonObject deferred = (await network.Store.ReadAsync()).State.Obj("pending_author_proposal").Copy();
        StateSnapshot saved = await programming.Store.ReadAsync();
        saved.State["deferred_proposals"] = new JsonObject { ["network"] = deferred.Copy() };
        await programming.Store.WriteAsync(saved.State, saved, "fixture independent deferred topic");
        programming.Clock.Advance(TimeSpan.FromHours(2));
        programming.Notes.Add(DomainFixtures.NoteRecord(networkPath, networkText));

        // Act
        JsonObject result = await programming.Engine().RunAsync(withModel: true);
        JsonObject final = (await programming.Store.ReadAsync()).State;

        // Assert
        result.Obj("candidate").Select(pair => pair.Key).Should().Equal(programming.Notes[0]!.Str("path"));
        programming.Model.Authors.Should().ContainSingle();
        programming.Model.Reviews.Should().HaveCount(2);
        JsonNode.DeepEquals(final.Obj("deferred_proposals")["network"], deferred).Should().BeTrue();
        final.Obj("invalid_proposals").Count.Should().Be(0);
        final.Obj("held_proposals").Count.Should().Be(0);
    }

    [Fact]
    public async Task FeedbackBeyondTheOrdinaryPathCapEntersAVisibleScopeHoldBeforeModelCalls()
    {
        // Arrange
        using var fixture = new WorkloadFixture(6);
        StateSnapshot snapshot = await fixture.Store.ReadAsync();
        snapshot.State.Obj("feedback")["owner-request"] = new JsonObject
        {
            ["key"] = "owner-request",
            ["status"] = "pending",
            ["topic"] = "Programming",
            ["pr_number"] = 7,
            ["paths"] = new JsonArray(fixture.Notes[5]!.Str("path"))
        };
        snapshot.State.Obj("prs")[Core.TopicId("Programming") + ":1"] = new JsonObject
        {
            ["topic_id"] = Core.TopicId("Programming"),
            ["generation"] = 1,
            ["number"] = 7,
            ["status"] = "open",
            ["draft"] = true,
            ["changed_paths"] = new JsonArray(fixture.Notes.OfType<JsonObject>().Take(5).Select(note => (JsonNode)JsonValue.Create(note.Str("path"))!).ToArray())
        };
        await fixture.Store.WriteAsync(snapshot.State, snapshot, "fixture overbroad verified request");

        // Act
        JsonObject result = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        result.Str("status").Should().Be("feedback_needs_scope");
        fixture.Model.Authors.Should().BeEmpty();
        fixture.Model.Reviews.Should().BeEmpty();
        (await fixture.Store.ReadAsync()).State.Obj("feedback").Obj("owner-request").Str("status").Should().Be("feedback_needs_scope");
    }

    [Fact]
    public async Task LaterNoteQuotaKeepsAcceptedWorkAndResumesOnlyThePendingReviewInANewRun()
    {
        // Arrange
        using var fixture = new WorkloadFixture(2);
        fixture.Model.Change = call => call != 3;
        fixture.Model.BeforeReview = (call, _) => call == 2
            ? Task.FromException(new ClaudeQuotaException("weekly", fixture.Clock.GetUtcNow().AddHours(1), fixture.Clock.GetUtcNow().AddHours(1)))
            : Task.CompletedTask;
        await fixture.Engine().RunAsync(withModel: true);
        StateSnapshot interrupted = await fixture.Store.ReadAsync();
        JsonObject firstCandidate = interrupted.State.Obj("focused_workload").Copy();
        // Simulate the already verified publication handoff; its candidate must not collect more notes.
        interrupted.State.Obj("focused_workload")["status"] = "published";
        await fixture.Store.WriteAsync(interrupted.State, interrupted, "fixture verified first partial publication");
        interrupted.State.Obj("prs")[Core.TopicId("Programming") + ":1"] = new JsonObject
        {
            ["topic_id"] = Core.TopicId("Programming"),
            ["generation"] = 1,
            ["status"] = "open",
            ["draft"] = true,
            ["number"] = 7
        };
        await fixture.Store.WriteAsync(interrupted.State, await fixture.Store.ReadAsync(), "fixture open first partial PR");
        fixture.Clock.Advance(TimeSpan.FromHours(2));
        const string unrelated = "Vault/Home/ZZNetworks/Other.md";
        fixture.Notes.Add(DomainFixtures.NoteRecord(unrelated));
        await fixture.Engine().RunAsync(withModel: true);
        StateSnapshot parked = await fixture.Store.ReadAsync();
        parked.State.Obj("prs")[Core.TopicId("Programming") + ":1"]!["status"] = "merged";
        await fixture.Store.WriteAsync(parked.State, parked, "fixture merge first partial PR");
        fixture.Notes.RemoveAt(0);

        // Act
        JsonObject resumed = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        firstCandidate.Arr("accepted_records").Should().ContainSingle();
        interrupted.State.Obj("cooldown").Str("kind").Should().Be("weekly");
        fixture.Model.Authors.Should().HaveCount(3);
        fixture.Model.Reviews.Should().HaveCount(4);
        fixture.Model.Authors.Last().Obj("notes").Select(note => note.Key).Should().Equal(unrelated);
        resumed.Obj("candidate").Count.Should().Be(1);
        resumed.Int("model_calls").Should().Be(1);
        JsonObject final = (await fixture.Store.ReadAsync()).State;
        final.Obj("workload_history").Obj(firstCandidate.Str("id")).Arr("accepted_records").Should().HaveCount(1);
        final.Obj("focused_workload").Str("id").Should().NotBe(firstCandidate.Str("id"));
    }

    [Theory]
    [InlineData("workflow")]
    [InlineData("association")]
    public async Task UnverifiedReviewSignalCannotAdmitFeedbackExecution(string invalidProvenance)
    {
        // Arrange
        var api = new RuntimeApi();
        api.SeedManagedPr(Core.TopicId("Programming"), DomainFixtures.Note);
        api.Comments.Add(RuntimeFixtures.OwnerComment());
        JsonObject payload = FeedbackTriggerFixtures.Review(api);
        var config = new JsonObject { ["repo"] = api.Repo, ["owner_allowlist"] = RuntimeFixtures.Allowlist() };
        if (invalidProvenance == "workflow") api.SignalRun["workflow_id"] = 100;
        else api.SignalRun.Arr("pull_requests").Add(new JsonObject { ["number"] = 2 });

        // Act
        JsonObject result = await FeedbackTrigger.ResolveAsync(config, "workflow_run", payload, api, CancellationToken.None);

        // Assert
        result.Str("status").Should().Be("feedback_ignored");
        result.Int("feedback_pr").Should().Be(0);
        api.Commits.Should().Be(0);
        api.PrCreates.Should().Be(0);
        api.Acknowledgments.Should().Be(0);
    }

}
