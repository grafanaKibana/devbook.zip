using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using System.Text.Json.Nodes;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class EngineTests
{

    [Theory]
    [InlineData("unique", true)]
    [InlineData("missing", false)]
    [InlineData("ambiguous", false)]
    public void ReviewEvidenceBindsOnlyAnUnambiguousLiteralQuotation(string scenario, bool accepted)
    {
        // Arrange
        string current = scenario == "ambiguous" ? "First\nExact quotation.\nExact quotation.\n" : "First\nExact quotation.\nContinuation.\n";
        var candidates = new Dictionary<string, string> { [DomainFixtures.Path] = current };
        JsonObject raw = DomainFixtures.UnchangedReview(new JsonObject { ["current"] = new JsonObject { [DomainFixtures.Path] = current } });
        JsonObject citation = raw.Arr("notes")[0]!.Arr("current_text_evidence")[0]!.AsObject();
        citation["quote"] = scenario == "missing" ? "Absent quotation." : scenario == "unique" ? "Exact quotation.\nContinuation." : "Exact quotation.";
        citation["line_start"] = 1;

        // Act
        (JsonObject bound, JsonArray bindings) = Review.BindEvidence(raw, candidates);
        bool clean = Review.Clean(bound, candidates, new JsonObject(), new JsonArray(), new JsonArray());

        // Assert
        clean.Should().Be(accepted);
        citation.Int("line_start").Should().Be(1);
        bindings.Count.Should().Be(accepted ? 1 : 0);
        if (accepted) bound.Arr("notes")[0]!.Arr("current_text_evidence")[0]!.Int("line_start").Should().Be(2);
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

    [Theory]
    [InlineData("fresh")]
    [InlineData("author-quota")]
    [InlineData("review-quota")]
    [InlineData("held")]
    public async Task SemanticKeepFailureGetsOneResumableRepairAndFreshReview(string scenario)
    {
        // Arrange
        using var files = new CandidateValidationRepositoryFixture();
        var clock = new EngineTestClock(DateTimeOffset.Parse("2026-10-30T12:00:00Z"));
        var model = new ReviewRepairModel(clock, scenario);
        var store = new MemoryStateStore(Core.NewState());
        var config = new JsonObject { ["max_notes_per_run"] = 1, ["max_review_repairs_per_batch"] = scenario == "held" ? 0 : 1 };
        ImprovementEngine Engine() => new(files.Root, config, store, model, clock: clock, notesLoader: files.Notes,
            validator: (_, _, _) => Task.FromResult(new JsonArray()));
        if (scenario != "fresh")
        {
            await Engine().RunAsync(withModel: true);
            clock.Advance(TimeSpan.FromHours(2));
            config["max_review_repairs_per_batch"] = 1;
        }

        // Act
        JsonObject result = await Engine().RunAsync(withModel: true);
        JsonObject state = (await store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("proposed");
        model.Authors.Should().Be(scenario == "author-quota" ? 3 : 2);
        model.Reviews.Should().Be(scenario == "review-quota" ? 3 : 2);
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
        var config = new JsonObject { ["max_notes_per_run"] = 1 };
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
        parked.Str("status").Should().Be("no_changes");
        failed.Str("status").Should().Be("review_blocked");
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
        private readonly EngineResumeModel changed = new(CandidateValidationBadPath, clock, false);

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
            if (Reviews == 1 || scenario == "always-reject" || RejectAfterResume && Reviews >= 3)
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

    private sealed class EngineResumeModel(string path, TimeProvider clock, bool limitFirstReview = true) : IModelProvider
    {
        public int Authors { get; private set; }
        public int Reviews { get; private set; }
        public JsonObject AuthorPayload { get; private set; } = new();
        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Authors++;
            AuthorPayload = payload.Copy();
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
            if (limitFirstReview && Reviews == 1)
            {
                throw new ClaudeQuotaException("weekly", clock.GetUtcNow().AddHours(1), clock.GetUtcNow().AddHours(1));
            }
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
    private const string KeepDecisionOtherBlock = "```\nA fixture example.\n```";
    private const string KeepDecisionOtherSource = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\n" + KeepDecisionOtherBlock + "\n";

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
        result.Str("status").Should().Be("no_worthwhile_changes");
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
        result.RequiredObject("review").Str("verdict").Should().Be("CLEAN");
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
        blocked.Str("status").Should().Be("review_blocked");
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
        const bool mixedBatch = false;

        using var fixture = new KeepDecisionKeepFixture();
        fixture.Model.MixedBatch = mixedBatch;
        fixture.Source += "\n```\nUnlabelled fixture fence.\n```\n";
        fixture.Violations.Add(KeepDecisionFenceViolation(fixture.Source));
        string original = fixture.Source;

        // Act
        JsonObject blocked = await fixture.Engine().RunAsync(withModel: true);
        JsonObject state = (await fixture.Store.ReadAsync()).State;

        // Assert
        blocked.Str("status").Should().Be("proposal_blocked");
        blocked.Str("stage").Should().Be("keep_structural_validation");
        blocked.Str("reason").Should().Contain(DomainFixtures.Path).And.NotContain(KeepDecisionOtherPath);
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
            Model = new KeepDecisionKeepModel(Clock);
        }

        public ImprovementEngine Engine(RuntimeApi? publicationApi = null) => new(Root, new JsonObject(), Store, Model, clock: Clock,
            publisher: publicationApi is null ? null : new GitHubRuntime(publicationApi, Store, activation: () => { }),
            snapshotShaLoader: () => "base",
            notesLoader: () =>
            {
                JsonObject note = DomainFixtures.NoteRecord(content: Source);
                note["violations"] = Violations.Copy();
                var notes = new JsonArray(note);
                if (Model.MixedBatch)
                {
                    JsonObject changed = DomainFixtures.NoteRecord(KeepDecisionOtherPath, KeepDecisionOtherSource);
                    changed["violations"] = new JsonArray(KeepDecisionFenceViolation(KeepDecisionOtherSource));
                    notes.Add(changed);
                }
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

    private sealed class KeepDecisionKeepModel(TimeProvider clock) : IModelProvider
    {
        public int Authors { get; private set; }
        public int Reviews { get; private set; }
        public bool OffsetEvidence { get; set; }
        public bool FailQuestionQuality { get; set; }
        public bool LimitFirstReview { get; set; }
        public bool MixedBatch { get; set; }
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
            if (MixedBatch)
            {
                proposal.RequiredArray("edits").Add(new JsonObject
                {
                    ["path"] = KeepDecisionOtherPath,
                    ["expected_hash"] = payload.RequiredObject("note_hashes").Str(KeepDecisionOtherPath),
                    ["before"] = KeepDecisionOtherBlock,
                    ["after"] = "```text\nA fixture example.\n```",
                    ["reason"] = "Add the required fence language.",
                    ["problem"] = "The existing explanation omits a material mechanism or boundary.",
                    ["reader_benefit"] = "The correction restores the mechanism for recall and engineering decisions.",
                    ["kind"] = "note",
                    ["learning_target"] = "same",
                    ["essential_meanings"] = new JsonArray(),
                    ["sources"] = new JsonArray(),
                    ["feedback_keys"] = new JsonArray()
                });
                proposal.RequiredArray("dispositions").Add(new JsonObject { ["path"] = KeepDecisionOtherPath, ["outcome"] = "changed", ["reason"] = "The fence language is now explicit." });
            }
            return Task.FromResult(proposal);
        }

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            Reviews++;
            ReviewPayload = payload.Copy();
            if (LimitFirstReview && Reviews == 1)
            {
                throw new ClaudeQuotaException("weekly", clock.GetUtcNow().AddHours(1), clock.GetUtcNow().AddHours(1));
            }
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
            var config = new JsonObject { ["max_notes_per_run"] = 1 };
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
            invalid["feedback"] = new JsonArray(new JsonObject { ["key"] = feedbackKey, ["outcome"] = "implemented", ["reason"] = "Clarified the requested mechanism." });
            Proposal.Validate(invalid);

            var store = new MemoryStateStore(state);
            var model = new InvalidProposalAuthor(invalid);
            ImprovementEngine Engine() => new(root, config, store, model, notesLoader: () => notes.Copy());

            // Act: quarantine the fresh or previously saved invalid proposal.
            JsonObject blocked = await Engine().RunAsync(withModel: true);
            StateSnapshot quarantined = await store.ReadAsync();

            // Assert
            blocked.Str("status").Should().Be("proposal_blocked");
            blocked.Str("reason").Should().Contain("replacement anchor must be unique");
            blocked.Int("model_calls").Should().Be(1);
            quarantined.State["pending_author_proposal"].Should().BeNull();
            JsonObject archived = quarantined.State.RequiredObject("invalid_proposals").Single().Value!.AsObject();
            JsonNode.DeepEquals(archived["proposal"], invalid).Should().BeTrue();
            archived.Obj("blocked_review").Str("stage").Should().Be("deterministic_application");
            archived.Obj("blocked_review").Str("reason").Should().Be(blocked.Str("reason"));
            archived.Arr("feedback_keys").Strings().Should().Equal(feedbackKey);
            archived.Arr("feedback_snapshot").Count.Should().Be(1);
            model.Reviews.Should().Be(0);
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
    private const string CandidateValidationOtherPath = "Vault/Home/Programming/ZZZ/Other.md";
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
        blocked.Str("status").Should().Be("proposal_blocked");
        blocked.Str("stage").Should().Be("repository_validation");
        blocked.Str("reason").Should().Contain("wikilink.unresolved").And.Contain("Missing validation target");
        held.State["pending_author_proposal"].Should().BeNull();
        JsonObject archived = held.State.Obj("invalid_proposals").Single().Value!.AsObject();
        JsonNode.DeepEquals(archived["proposal"], proposal).Should().BeTrue();
        archived.Obj("completed_review").Str("verdict").Should().Be("CLEAN");
        model.Reviews.Should().Be(1);
    }

    [Fact]
    public async Task ExternalValidatorInterruptionPreservesTheReviewedProposal()
    {
        // Arrange
        using var fixture = new CandidateValidationRepositoryFixture();
        var config = CandidateValidationConfiguration(new JsonArray("git", "rev-parse", "--verify", "refs/remotes/origin/validator-resource"));
        var store = new MemoryStateStore(Core.NewState());
        JsonObject proposal = CandidateValidationProposalFor("The clarified mechanism.");
        var model = new CandidateValidationCandidateModel(proposal) { OffsetFirstEvidence = true };
        ImprovementEngine Engine() => new(fixture.Root, config, store, model,
            notesLoader: fixture.Notes, snapshotShaLoader: () => fixture.Snapshot);

        // Act: the external validator's missing resource is an interruption, not invalid content.
        Exception? interrupted = await Record.ExceptionAsync(() => Engine().RunAsync(withModel: true));
        StateSnapshot pending = await store.ReadAsync();
        config["validator_commands"] = new JsonArray(new JsonArray("git", "rev-parse", "--verify", "HEAD"));
        JsonObject resumed = await Engine().RunAsync(withModel: true);
        JsonObject final = (await store.ReadAsync()).State;

        // Assert
        interrupted.Should().BeOfType<RuntimeFailure>().Which.Message.Should().Contain("Validation failed");
        JsonNode.DeepEquals(pending.State.Obj("pending_author_proposal")["proposal"], proposal).Should().BeTrue();
        pending.State.Obj("invalid_proposals").Count.Should().Be(0);
        pending.State.Obj("held_proposals").Count.Should().Be(0);
        model.Paths.Should().ContainSingle().Which.Should().Be(CandidateValidationBadPath);
        model.Reviews.Should().Be(2);
        pending.State.Obj("pending_author_proposal").Obj("review_evidence").Arr("bindings").Count.Should().Be(1);
        resumed.Str("status").Should().Be("proposed");
        resumed["review_evidence"].Should().BeNull();
        final.Obj("review_evidence").Count.Should().Be(1);
        final.Obj("pending_author_proposal")["review_evidence"].Should().BeNull();
    }

    private static JsonObject CandidateValidationConfiguration(JsonArray command) => new()
    {
        ["repo"] = "fixture/repo",
        ["max_notes_per_run"] = 1,
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
            var config = new JsonObject { ["max_notes_per_run"] = 1 };
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
            blocked.Str("status").Should().Be("proposal_blocked");
            blocked.Str("stage").Should().Be(stage);
            blocked.Str("reason").Should().Contain("13 distinct source URLs");
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
    public async Task Transient_fetch_failure_keeps_a_within_budget_proposal_resumable()
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "source-retry-" + Guid.NewGuid().ToString("N"));
        DomainFixtures.CreateReviewContract(root);
        try
        {
            JsonObject proposal = SourceBudgetWithSources(1);
            proposal.Arr("edits")[0]!.Arr("sources").Add(proposal.Arr("edits")[0]!.Arr("sources")[0]!.DeepClone());
            var model = new SourceBudgetAuthor(proposal);
            var store = new MemoryStateStore(Core.NewState());
            var config = new JsonObject { ["max_notes_per_run"] = 1, ["max_sources_per_run"] = 1 };
            var fetches = 0;
            ImprovementEngine Engine() => new(root, config, store, model,
                notesLoader: () => new JsonArray(DomainFixtures.NoteRecord(SourceBudgetBadPath, SourceBudgetSource)),
                sourceFetcher: (_, _) => { fetches++; return Task.FromException<string>(new IOException("Temporary source failure.")); });

            Exception? first = await Record.ExceptionAsync(() => Engine().RunAsync(withModel: true));

            // Act: resume the source-matched pending proposal after interruption.
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

    private const string ProposalSizeFirstPath = "Vault/Home/Programming/AAA/First.md";
    private const string ProposalSizeSecondPath = "Vault/Home/Programming/AAA/Second.md";
    private const string ProposalSizeOtherPath = "Vault/Home/Programming/ZZZ/Other.md";
    private const string ProposalSizeSource = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\nThe original mechanism.\n";

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task Oversized_initial_proposals_are_held_and_existing_prs_are_frozen(bool lineLimit, bool existingPr)
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "proposal-size-" + Guid.NewGuid().ToString("N"));
        DomainFixtures.CreateReviewContract(root);
        try
        {
            var notes = new JsonArray(DomainFixtures.NoteRecord(ProposalSizeFirstPath, ProposalSizeSource), DomainFixtures.NoteRecord(ProposalSizeSecondPath, ProposalSizeSource), DomainFixtures.NoteRecord(ProposalSizeOtherPath, ProposalSizeSource));
            var config = new JsonObject
            {
                ["max_notes_per_run"] = 2,
                ["max_pr_notes"] = lineLimit ? 16 : 1,
                ["max_pr_lines"] = lineLimit ? 1 : 1200
            };
            JsonObject proposal = ProposalSizeProposalFor(ProposalSizeFirstPath, ProposalSizeSecondPath);
            JsonObject state = Core.NewState();
            string topicId = Core.TopicId(Core.TopicFor(ProposalSizeFirstPath));
            string prKey = topicId + ":1";
            if (existingPr)
            {
                state.RequiredObject("prs")[prKey] = new JsonObject
                {
                    ["topic_id"] = topicId,
                    ["generation"] = 1,
                    ["number"] = 7,
                    ["status"] = "open",
                    ["frozen"] = false
                };
            }

            var store = new MemoryStateStore(state);
            var model = new ProposalSizeAuthor(proposal);
            ImprovementEngine Engine() => new(root, config, store, model, notesLoader: () => notes.Copy());

            // Act
            JsonObject blocked = await Engine().RunAsync(withModel: true);
            StateSnapshot quarantined = await store.ReadAsync();

            // Assert
            blocked.Int("model_calls").Should().Be(1);
            if (existingPr)
            {
                blocked.Str("status").Should().Be("size_limit");
                quarantined.State.Obj("prs").Obj(prKey).Bool("frozen").Should().BeTrue();
                JsonObject pending = quarantined.State.Obj("pending_author_proposal");
                JsonNode.DeepEquals(pending["proposal"], proposal).Should().BeTrue();
                pending.Obj("blocked_review").Str("reason").Should().Be("PR size limit reached");
                quarantined.State.Obj("held_proposals").Count.Should().Be(0);
                quarantined.State.Obj("invalid_proposals").Count.Should().Be(0);
            }
            else
            {
                blocked.Str("status").Should().Be("proposal_blocked");
                blocked.Str("stage").Should().Be("pr_size");
                blocked.Str("reason").Should().Contain($"2 notes (limit {config.Int("max_pr_notes")})")
                    .And.Contain($"changed lines (limit {config.Int("max_pr_lines")})");
                quarantined.State["pending_author_proposal"].Should().BeNull();
                JsonObject archived = quarantined.State.Obj("invalid_proposals").Single().Value!.AsObject();
                archived.Obj("blocked_review").Str("stage").Should().Be("pr_size");
                archived.Obj("blocked_review").Str("reason").Should().Be(blocked.Str("reason"));
                JsonNode.DeepEquals(archived["proposal"], proposal).Should().BeTrue();
                quarantined.State.Obj("held_proposals").ContainsKey(topicId).Should().BeTrue();
            }
        }

        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static JsonObject ProposalSizeProposalFor(params string[] paths) => new()
    {
        ["version"] = 1,
        ["edits"] = new JsonArray(paths.Select(path => (JsonNode)new JsonObject
        {
            ["path"] = path,
            ["expected_hash"] = LegacyIdentity.Digest(ProposalSizeSource),
            ["before"] = "The original mechanism.",
            ["after"] = "The clarified mechanism.\nThe concrete boundary.",
            ["reason"] = "Clarify the operating mechanism and boundary.",
            ["problem"] = "The existing explanation omits a material mechanism or boundary.",
            ["reader_benefit"] = "The correction restores the mechanism for recall and engineering decisions.",
            ["kind"] = "note",
            ["learning_target"] = "same",
            ["essential_meanings"] = new JsonArray(),
            ["sources"] = new JsonArray(),
            ["feedback_keys"] = new JsonArray()
        }).ToArray()),
        ["dispositions"] = new JsonArray(paths.Select(path => (JsonNode)new JsonObject { ["path"] = path, ["outcome"] = "changed", ["reason"] = "Clarified the explanation." }).ToArray()),
        ["feedback"] = new JsonArray()
    };

    private sealed class ProposalSizeAuthor(JsonObject proposal) : IModelProvider
    {
        public List<string> Paths { get; } = [];
        public int Batches { get; private set; }
        public int Reviews { get; private set; }

        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string[] paths = payload.RequiredObject("notes").Select(item => item.Key).ToArray();
            Paths.AddRange(paths);
            Batches++;
            return Task.FromResult(paths.Contains(ProposalSizeFirstPath) ? proposal.Copy() : new JsonObject
            {
                ["version"] = 1,
                ["edits"] = new JsonArray(),
                ["dispositions"] = new JsonArray(new JsonObject { ["path"] = ProposalSizeOtherPath, ["outcome"] = "keep", ["reason"] = "No worthwhile changes." }),
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
        var engine = new ImprovementEngine(files.Root, new JsonObject { ["max_notes_per_run"] = 1 }, store, model,
            notesLoader: files.Notes, validator: (_, _, _) => { validations++; return Task.FromResult(new JsonArray()); });

        // Act
        JsonObject result = await engine.RunAsync(withModel: true);

        // Assert
        result.Str("status").Should().Be("review_blocked");
        validations.Should().Be(0);
        (await store.ReadAsync()).State.Obj("notes").Count.Should().Be(0);
        (await store.ReadAsync()).State.Obj("held_proposals").Count.Should().Be(1);
    }

    [Theory]
    [InlineData("selection")]
    [InlineData("repair")]
    public async Task ChangedSelectionOrRepairInputPreservesTheOriginalPendingEnvelope(string changed)
    {
        // Arrange
        using var fixture = new KeepDecisionKeepFixture();
        fixture.Model.LimitFirstReview = true;
        await fixture.Engine().RunAsync(withModel: true);
        fixture.Clock.Advance(TimeSpan.FromHours(2));
        StateSnapshot snapshot = await fixture.Store.ReadAsync();
        JsonObject original = snapshot.State.Obj("pending_author_proposal").Copy();
        if (changed == "selection")
        {
            snapshot.State.Obj("pending_author_proposal")["topic_id"] = Core.TopicId("Programming/NET");
            snapshot.State.Obj("pending_author_proposal")["target_note"] = DomainFixtures.Path;
            snapshot.State.Obj("pending_author_proposal")["review_focus"] = "Previously supplied manual focus";
        }
        else snapshot.State.Obj("pending_author_proposal")["repair_inputs"] = new JsonObject { [DomainFixtures.Path] = "previous-flags" };
        original = snapshot.State.Obj("pending_author_proposal").Copy();
        snapshot.State["held_proposals"] = new JsonObject { [original.Str("topic_id")] = new JsonObject { ["audit"] = "existing hold retained" } };
        await fixture.Store.WriteAsync(snapshot.State, snapshot, "fixture previous policy inputs");
        const string otherPath = "Vault/Home/Programming/ZZZ/Other.md";
        JsonObject keep = DomainFixtures.Proposal(DomainFixtures.Edit());
        keep["edits"] = new JsonArray();
        keep.Arr("dispositions")[0]!["outcome"] = "keep";
        var nextModel = new SourceBudgetAuthor(keep);
        var engine = new ImprovementEngine(fixture.Root, new JsonObject { ["max_notes_per_run"] = 1 }, fixture.Store, nextModel, clock: fixture.Clock,
            notesLoader: () => new JsonArray(DomainFixtures.NoteRecord(), DomainFixtures.NoteRecord(otherPath)));

        // Act
        JsonObject result = await engine.RunAsync(withModel: true);
        JsonObject heldState = (await fixture.Store.ReadAsync()).State;
        JsonObject held = heldState.Obj("held_proposals").Single().Value!.AsObject();

        // Assert
        result.Str("status").Should().Be("no_worthwhile_changes");
        fixture.Model.Authors.Should().Be(1);
        nextModel.Paths.Should().Equal(changed == "repair" ? DomainFixtures.Path : otherPath);
        foreach (string key in new[] { "proposal", "repair_inputs", "evaluation_hash", "feedback_keys", "source_hashes", "topic_id", "target_note", "review_focus" })
            JsonNode.DeepEquals(held[key], original[key]).Should().BeTrue(key + " must retain its original input");
        heldState.Obj("invalid_proposals").Select(item => item.Value).Should().Contain(item => item.Str("audit") == "existing hold retained");
    }

    [Fact]
    public async Task CurrentReviewedKeepTakesPrecedenceOverHistoricalOpenPrProjection()
    {
        // Arrange
        using var fixture = new KeepDecisionKeepFixture();
        JsonObject oldEdit = DomainFixtures.Edit();
        string current = DomainFixtures.Note.Replace(DomainFixtures.Card, oldEdit.Str("after"));
        JsonObject note = DomainFixtures.NoteRecord(content: current);
        RepairInputs.Apply(note, new HashSet<string> { "stable_1" });
        string rules = Core.RulesVersion(fixture.Root);
        var config = new JsonObject { ["automatic_export"] = true };
        string evaluation = ClaudeProvider.EvaluationHash(config);
        JsonObject oldBatch = new() { ["notes"] = new JsonArray(DomainFixtures.NoteRecord()), ["rules_hash"] = rules, ["evaluation_hash"] = "old-policy" };
        JsonObject oldProposal = DomainFixtures.Proposal(oldEdit);
        JsonObject oldResult = Proposal.Apply(new Dictionary<string, string> { [DomainFixtures.Path] = DomainFixtures.Note }, oldProposal);
        JsonObject state = Core.NewState();
        string topic = Core.TopicFor(DomainFixtures.Path);
        state.Obj("prs")[Core.TopicId(topic) + ":1"] = new JsonObject
        {
            ["topic_id"] = Core.TopicId(topic),
            ["generation"] = 1,
            ["number"] = 7,
            ["status"] = "open",
            ["draft"] = true,
            ["frozen"] = false,
            ["proposal_records"] = new JsonArray(new JsonObject { ["batch"] = oldBatch, ["proposal"] = oldProposal, ["result"] = oldResult })
        };
        JsonObject keep = DomainFixtures.Proposal(DomainFixtures.Edit());
        keep["edits"] = new JsonArray();
        keep.Arr("dispositions")[0]!["outcome"] = "keep";
        JsonObject review = DomainFixtures.UnchangedReview(new JsonObject { ["current"] = new JsonObject { [DomainFixtures.Path] = current } });
        var reviewedBatch = new JsonObject { ["notes"] = new JsonArray(note.Copy()), ["rules_hash"] = rules, ["evaluation_hash"] = evaluation };
        state = Core.RecordOutcome(state, reviewedBatch, keep, new JsonObject { ["sources"] = new JsonObject() }, review);
        var store = new MemoryStateStore(state);
        var engine = new ImprovementEngine(fixture.Root, config, store, fixture.Model, notesLoader: () => new JsonArray(note.Copy()));

        // Act
        JsonObject result = await engine.RunAsync(withModel: true);

        // Assert
        result.Str("status").Should().Be("no_changes");
        result.Int("model_calls").Should().Be(0);
        fixture.Model.Authors.Should().Be(0);
        (await store.ReadAsync()).State.Obj("notes").Obj(DomainFixtures.Path).Str("evaluation_hash").Should().Be(evaluation);
    }

}
