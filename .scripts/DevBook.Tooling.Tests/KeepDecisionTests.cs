using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class KeepDecisionTests
{
    private const string OtherPath = "Vault/Home/Programming/NET/Other.md";
    private const string OtherBlock = "```\nA fixture example.\n```";
    private const string OtherSource = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\n" + OtherBlock + "\n";

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task KeepRequiresIndependentEvidenceBeforeRecordingOutcome(bool apply)
    {
        // Arrange
        using var fixture = new KeepFixture();

        // Act
        JsonObject result = await fixture.Engine().RunAsync(apply, withModel: true);
        JsonObject state = (await fixture.Store.ReadAsync()).State;

        // Assert
        result.Str("status").Should().Be("no_worthwhile_changes");
        result.Int("model_calls").Should().Be(2);
        fixture.Model.Reviews.Should().Be(1);
        fixture.Model.ReviewPayload.RequiredObject("current").Str(DomainFixtures.Path).Should().Be(DomainFixtures.Note);
        fixture.Model.ReviewPayload.Str("review_focus").Should().BeEmpty();
        JsonObject record = state.RequiredObject("notes").RequiredObject(DomainFixtures.Path);
        record.Str("outcome").Should().Be("keep");
        JsonObject evidence = record.RequiredObject("keep_review");
        evidence.Str("content_hash").Should().Be(LegacyIdentity.Digest(DomainFixtures.Note));
        evidence.Str("rules_hash").Should().Be(record.Str("rules_hash"));
        evidence.RequiredObject("review").Arr("current_text_evidence").Should().NotBeEmpty();
        result.RequiredObject("review").Str("verdict").Should().Be("CLEAN");
        state.ContainsKey("pending_author_proposal").Should().BeFalse();
        fixture.Validations.Should().Be(0);
    }

    [Fact]
    public async Task ReviewerRejectsFalseKeepWithoutMarkingNotesCheckedOrRetryingIt()
    {
        // Arrange
        using var fixture = new KeepFixture();
        fixture.Model.RejectKeep = true;

        // Act
        JsonObject blocked = await fixture.Engine().RunAsync(withModel: true);
        JsonObject state = (await fixture.Store.ReadAsync()).State;
        JsonObject later = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        blocked.Str("status").Should().Be("review_blocked");
        state.Obj("notes").ContainsKey(DomainFixtures.Path).Should().BeFalse();
        state.RequiredObject("held_proposals").Count.Should().BePositive();
        state.ContainsKey("pending_author_proposal").Should().BeFalse();
        later.Str("status").Should().Be("no_changes");
        fixture.Model.Authors.Should().Be(1);
        fixture.Model.Reviews.Should().Be(1);
        fixture.Validations.Should().Be(0);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CleanReviewerCannotApproveKeepWithKnownNativeViolation(bool mixedBatch)
    {
        // Arrange
        using var fixture = new KeepFixture();
        fixture.Model.MixedBatch = mixedBatch;
        fixture.Source += "\n```\nUnlabelled fixture fence.\n```\n";
        fixture.Violations.Add(FenceViolation(fixture.Source));
        string original = fixture.Source;

        // Act
        JsonObject blocked = await fixture.Engine().RunAsync(withModel: true);
        JsonObject state = (await fixture.Store.ReadAsync()).State;
        JsonObject later = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        blocked.Str("status").Should().Be("proposal_blocked");
        blocked.Str("stage").Should().Be("keep_structural_validation");
        blocked.Str("reason").Should().Contain(DomainFixtures.Path).And.NotContain(OtherPath);
        JsonNode.DeepEquals(fixture.Model.AuthorPayload.RequiredObject("known_violations")[DomainFixtures.Path], fixture.Violations).Should().BeTrue();
        state.Obj("notes").Count.Should().Be(0);
        JsonObject archived = state.RequiredObject("invalid_proposals").Single().Value!.AsObject();
        archived.RequiredObject("completed_review").Str("verdict").Should().Be("CLEAN");
        archived.RequiredObject("batch").Arr("notes")[0]!.Str("content").Should().Be(original);
        fixture.Model.ReviewPayload.RequiredObject("current").Str(DomainFixtures.Path).Should().Be(original);
        later.Str("status").Should().Be("no_changes");
        fixture.Model.Authors.Should().Be(1);
        fixture.Model.Reviews.Should().Be(1);
        fixture.Validations.Should().Be(0);
    }

    private static JsonObject FenceViolation(string source) => new()
    {
        ["code"] = "markdown.code-fence-language",
        ["line"] = Array.IndexOf(source.Split('\n'), "```") + 1,
        ["message"] = "fenced code blocks need a language; use `text` when none fits"
    };

    [Fact]
    public async Task ReviewerQuotaResumesUnchangedProposalWithoutReauthoring()
    {
        // Arrange
        using var fixture = new KeepFixture();
        fixture.Model.LimitFirstReview = true;

        // Act
        JsonObject limited = await fixture.Engine().RunAsync(withModel: true);
        JsonObject quiet = await fixture.Engine().RunAsync(withModel: true);
        fixture.Clock.Advance(TimeSpan.FromHours(2));
        JsonObject resumed = await fixture.Engine().RunAsync(withModel: true);

        // Assert
        limited.Str("status").Should().Be("cooldown");
        quiet.Bool("notice").Should().BeFalse();
        resumed.Str("status").Should().Be("no_worthwhile_changes");
        resumed.Int("model_calls").Should().Be(1);
        fixture.Model.Authors.Should().Be(1);
        fixture.Model.Reviews.Should().Be(2);
        fixture.Model.ReviewPayload.RequiredObject("current").Str(DomainFixtures.Path).Should().Be(DomainFixtures.Note);
        (await fixture.Store.ReadAsync()).State.RequiredObject("notes").RequiredObject(DomainFixtures.Path)
            .RequiredObject("keep_review").Str("content_hash").Should().Be(LegacyIdentity.Digest(DomainFixtures.Note));
    }

    private sealed class KeepFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "keep-review-" + Guid.NewGuid().ToString("N"));
        public MemoryStateStore Store { get; } = new(Core.NewState());
        public KeepClock Clock { get; } = new();
        public KeepModel Model { get; }
        public int Validations { get; private set; }
        public string Source { get; set; } = DomainFixtures.Note;
        public JsonArray Violations { get; } = new();

        public KeepFixture()
        {
            Directory.CreateDirectory(Path.Combine(Root, ".codex/agents"));
            File.WriteAllText(Path.Combine(Root, ".codex/agents/note-reviewer.toml"), "Fixture review contract");
            Model = new KeepModel(Clock);
        }

        public ImprovementEngine Engine() => new(Root, new JsonObject(), Store, Model, clock: Clock,
            notesLoader: () =>
            {
                JsonObject note = DomainFixtures.NoteRecord(content: Source);
                note["violations"] = Violations.Copy();
                var notes = new JsonArray(note);
                if (Model.MixedBatch)
                {
                    JsonObject changed = DomainFixtures.NoteRecord(OtherPath, OtherSource);
                    changed["violations"] = new JsonArray(FenceViolation(OtherSource));
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

    private sealed class KeepClock : TimeProvider
    {
        private DateTimeOffset now = DateTimeOffset.Parse("2026-10-31T12:00:00Z");
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(TimeSpan amount) => now += amount;
    }

    private sealed class KeepModel(TimeProvider clock) : IModelProvider
    {
        public int Authors { get; private set; }
        public int Reviews { get; private set; }
        public bool RejectKeep { get; set; }
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
                    ["path"] = OtherPath,
                    ["expected_hash"] = payload.RequiredObject("note_hashes").Str(OtherPath),
                    ["before"] = OtherBlock,
                    ["after"] = "```text\nA fixture example.\n```",
                    ["reason"] = "Add the required fence language.",
                    ["kind"] = "note",
                    ["learning_target"] = "same",
                    ["essential_meanings"] = new JsonArray(),
                    ["sources"] = new JsonArray(),
                    ["feedback_keys"] = new JsonArray()
                });
                proposal.RequiredArray("dispositions").Add(new JsonObject { ["path"] = OtherPath, ["outcome"] = "changed", ["reason"] = "The fence language is now explicit." });
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
            if (RejectKeep)
            {
                review["verdict"] = "CHANGES REQUIRED";
                review.RequiredArray("notes")[0]!["verdict"] = "CHANGES REQUIRED";
            }
            return Task.FromResult(review);
        }
    }
}
