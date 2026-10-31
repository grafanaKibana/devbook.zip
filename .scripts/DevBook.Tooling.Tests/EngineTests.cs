using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class EngineTests
{
    [Fact]
    public async Task AuthorCanProposeGuardedEditUsingOnlySuppliedNoteHash()
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "author-input-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(root, ".codex/agents"));
        await File.WriteAllTextAsync(Path.Combine(root, ".codex/agents/note-reviewer.toml"), "Fixture review contract");
        try
        {
            const string path = "Vault/Home/Programming/NET/Test.md";
            const string source = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\nThe original mechanism.\n";
            var clock = new TestClock(DateTimeOffset.Parse("2026-10-30T12:00:00Z"));
            var model = new ResumeModel(path, clock, limitFirstReview: false);
            var config = new JsonObject { ["max_notes_per_run"] = 1, ["repo"] = "fixture/repo" };
            var store = new MemoryStateStore(Core.NewState());
            var validations = 0;
            var engine = new ImprovementEngine(root, config, store, model, clock: clock,
                notesLoader: () => new JsonArray(new JsonObject
                {
                    ["path"] = path,
                    ["topic"] = Core.TopicFor(path),
                    ["content"] = source,
                    ["hash"] = LegacyIdentity.Digest(source),
                    ["violations"] = new JsonArray()
                }),
                validator: (_, _, _) =>
                {
                    validations++;
                    return Task.FromResult(new JsonArray(new JsonObject { ["check"] = "fixture", ["result"] = "passed" }));
                });

            // Act
            JsonObject result = await engine.RunAsync(withModel: true);

            // Assert
            model.AuthorPayload.RequiredObject("notes").Str(path).Should().Be(source);
            model.AuthorPayload.RequiredObject("note_hashes").Str(path).Should().Be(LegacyIdentity.Digest(source));
            result.Str("status").Should().Be("proposed");
            result.RequiredObject("proposal").RequiredArray("edits")[0]!.Str("expected_hash").Should().Be(LegacyIdentity.Digest(source));
            result.RequiredObject("candidate").Str(path).Should().Contain("The clarified mechanism.");
            result.RequiredObject("review").Str("verdict").Should().Be("CLEAN");
            model.Authors.Should().Be(1);
            model.Reviews.Should().Be(1);
            validations.Should().Be(1);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task ReviewerQuotaResumesExactDatedCandidateWithoutAnotherAuthorCall()
    {
        // Arrange
        string root = Path.Combine(Path.GetTempPath(), "engine-core-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(root, ".codex/agents"));
        await File.WriteAllTextAsync(Path.Combine(root, ".codex/agents/note-reviewer.toml"), "Fixture review contract");
        try
        {
            const string path = "Vault/Home/Programming/NET/Test.md";
            const string source = "---\ncreated: \"2026-01-01T00:00:00.000Z\"\nmodified: \"2026-01-01T00:00:00.000Z\"\n---\n\nThe original mechanism.\n";
            var clock = new TestClock(DateTimeOffset.Parse("2026-10-30T12:00:00Z"));
            var model = new ResumeModel(path, clock);
            var store = new MemoryStateStore(Core.NewState());
            var config = new JsonObject { ["max_notes_per_run"] = 1, ["repo"] = "fixture/repo", ["model_timeout_seconds"] = 900 };
            JsonArray Notes() => new(new JsonObject { ["path"] = path, ["topic"] = Core.TopicFor(path), ["content"] = source, ["hash"] = LegacyIdentity.Digest(source), ["violations"] = new JsonArray() });
            var validations = 0;
            ImprovementEngine Engine() => new(root, config, store, model, notesLoader: Notes, clock: clock,
                validator: (_, _, _) => { validations++; return Task.FromResult(new JsonArray(new JsonObject { ["check"] = "fixture", ["result"] = "passed" })); });

            // Act: reach the reviewer quota.
            JsonObject limited = await Engine().RunAsync(withModel: true);

            // Assert: preserve the dated proposal and notify once.
            limited.Str("status").Should().Be("cooldown");
            limited.Bool("notice").Should().BeTrue();
            JsonObject pending = (await store.ReadAsync()).State.RequiredObject("pending_author_proposal");
            string preparedAt = pending.Str("prepared_at");

            // Act: retry during cooldown.
            JsonObject quiet = await Engine().RunAsync(withModel: true);

            // Assert: skip quietly without another model call.
            quiet.Bool("notice").Should().BeFalse();
            model.Authors.Should().Be(1);
            model.Reviews.Should().Be(1);
            validations.Should().Be(0);

            // Arrange: the quota has reset.
            clock.Advance(TimeSpan.FromHours(2));

            // Act: resume the exact candidate.
            JsonObject resumed = await Engine().RunAsync(withModel: true);

            // Assert: only the reviewer is called again.
            resumed.Str("status").Should().Be("proposed");
            resumed.Int("model_calls").Should().Be(1);
            model.Authors.Should().Be(1);
            model.Reviews.Should().Be(2);
            validations.Should().Be(1);
            string candidate = resumed.RequiredObject("candidate").Str(path);
            NoteDates.Read(System.Text.Encoding.UTF8.GetBytes(candidate))["modified"].Should().Be(NoteDates.Timestamp(preparedAt));
            candidate.Should().Contain("The clarified mechanism.");
            JsonObject review = resumed.RequiredObject("review");
            Review.Clean(review, new Dictionary<string, string> { [path] = candidate }, resumed.RequiredObject("proposal"), new JsonArray(), new JsonArray()).Should().BeTrue();

            // Arrange: stale reviewer evidence.
            review.RequiredArray("notes")[0]!.RequiredArray("current_text_evidence")[0]!["quote"] = "Stale source quote";

            // Act: stale text cannot satisfy the review gate.
            bool clean = Review.Clean(review, new Dictionary<string, string> { [path] = candidate }, resumed.RequiredObject("proposal"), new JsonArray(), new JsonArray());

            // Assert
            clean.Should().BeFalse();
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private sealed class TestClock(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset instant = now;
        public override DateTimeOffset GetUtcNow() => instant;
        public void Advance(TimeSpan amount) => instant += amount;
    }

    private sealed class ResumeModel(string path, TimeProvider clock, bool limitFirstReview = true) : IModelProvider
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
                    ["quality"] = new JsonObject { ["accuracy"] = "PASS", ["clarity"] = "PASS", ["rules_compliance"] = "PASS", ["question_quality"] = "NOT APPLICABLE", ["identity_safety"] = "NOT APPLICABLE" }
                })
            });
        }
    }
}
