using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class IsolatedValidationTests
{
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
            await File.WriteAllTextAsync(Path.Combine(root, ".codex/agents/note-reviewer.toml"), "Fixture review contract");
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
            var engine = new ImprovementEngine(root, config, new MemoryStateStore(Core.NewState()), new CandidateModel(),
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

    private sealed class CandidateModel : IModelProvider
    {
        public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default) =>
            Task.FromResult(DomainFixtures.Proposal(DomainFixtures.Edit()));

        public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default)
        {
            string[] lines = payload.RequiredObject("current").Str(DomainFixtures.Path).Split('\n');
            int line = Array.FindIndex(lines, value => value.Contains("The answer explains its mechanism and boundary.", StringComparison.Ordinal));
            return Task.FromResult(new JsonObject
            {
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
}
