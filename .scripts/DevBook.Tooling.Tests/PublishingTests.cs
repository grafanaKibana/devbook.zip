using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class PublishingTests
{
    [Fact]
    public async Task ConfigureAndImmutableExportUseOfficialSequenceWithoutChangingUndatedSource()
    {
        // Arrange
        Action invalidTimeout = () => Syncer.ResolveTimeout(null, "NaN");

        // Act
        TimeSpan configuredTimeout = Syncer.ResolveTimeout(null, "1200");
        TimeSpan boundedTimeout = Syncer.ResolveTimeout(null, "7200");
        TimeSpan explicitTimeout = Syncer.ResolveTimeout(TimeSpan.FromSeconds(30), "7200");

        // Assert
        configuredTimeout.Should().Be(TimeSpan.FromSeconds(1200));
        boundedTimeout.Should().Be(TimeSpan.FromHours(2));
        explicitTimeout.Should().Be(TimeSpan.FromSeconds(30));
        invalidTimeout.Should().Throw<SyncException>();

        // Arrange: an isolated publishing checkout.
        using var fixture = new PublishingFixture();
        byte[] original = File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Undated.md"));
        var context = new SyncerContext(fixture.Root, fixture.CommandAsync, timeout: TimeSpan.FromSeconds(10));

        // Act: configure without exporting.
        await Syncer.ConfigureAsync(context);

        // Assert
        fixture.Calls.Should().NotContain(call => call.StartsWith("quartz-syncer:publish", StringComparison.Ordinal));
        Git.Text(fixture.Root, "status", "--porcelain").Should().BeEmpty();

        // Act: export through Syncer.
        await Syncer.ExportAsync(context);

        // Assert
        File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Undated.md")).Should().Equal(original);
        fixture.Calls.Should().ContainInOrder("quartz-syncer:cache action=tree-refresh", "quartz-syncer:publish", "quartz-syncer:delete force");
        fixture.Calls.Should().Contain(call => call.Contains("cleanOrphanedMedia", StringComparison.Ordinal));
        Git.Paths(fixture.Root, "diff", "--cached", "--name-only", "-z").Should().Equal("Web/content/Card.md");

        // Arrange: Syncer reports skipped notes.
        fixture.Skipped = true;

        // Act
        Func<Task> skipped = () => Syncer.ExportAsync(context);

        // Assert
        await skipped.Should().ThrowAsync<SyncException>().WithMessage("*skipped or failed*");
    }

    [Fact]
    public async Task SourceOutputAndPersistentLockGuardsRejectUnsafeLocalPublication()
    {
        // Arrange
        using var fixture = new PublishingFixture();
        var context = new SyncerContext(fixture.Root);

        // Act: overlapping local export locks are rejected.
        using (FileStream first = Syncer.AcquireLock(context))
        {
            Action competing = () => Syncer.AcquireLock(context).Dispose();

            // Assert
            competing.Should().Throw<SyncException>();
        }
        // Act: release permits the next local export.
        using (FileStream released = Syncer.AcquireLock(context))
        {
            // Assert
            released.CanWrite.Should().BeTrue();
        }

        // Arrange: source changed outside the staged batch.
        File.AppendAllText(Path.Combine(fixture.Root, "Vault/Home/Undated.md"), "Concurrent edit\n");

        // Act
        Action source = () => Syncer.GuardSource(context);

        // Assert
        source.Should().Throw<SyncException>().WithMessage("*unstaged*");

        // Arrange: generated output already has local changes.
        File.AppendAllText(Path.Combine(fixture.Root, "Web/content/Card.md"), "Existing output\n");

        // Act
        Action outputGuard = () => Syncer.GuardOutput(context);

        // Assert
        outputGuard.Should().Throw<SyncException>().WithMessage("*already has changes*");
        Syncer.SafeText("Bearer hidden github_pat_sensitive token=hidden").Should().NotContain("hidden").And.NotContain("sensitive");

        // Arrange: maintenance hook output and diagnostics.
        using var output = new StringWriter();
        using var errors = new StringWriter();

        // Act
        await Syncer.RunMaintenanceHookAsync(context, "fixture-hook", new HookRunner(new ProcessResult(0,
            Encoding.UTF8.GetBytes("Folder rollup: 2 notes checked.\n"), [])), output, errors);

        // Assert
        output.ToString().Should().Contain("Folder rollup: 2 notes checked.");

        // Arrange: a failing hook includes secrets in its diagnostics.
        var failed = new HookRunner(new ProcessResult(1,
            Encoding.UTF8.GetBytes("Roadmap generation completed.\nBearer hidden-value\n"),
            Encoding.UTF8.GetBytes("Vault/Home/Card.md:12: qard.empty-back Missing answer.\ntoken=another-secret\n")));

        // Act
        Func<Task> hookFailure = () => Syncer.RunMaintenanceHookAsync(context, "fixture-hook", failed, output, errors);

        // Assert
        await hookFailure.Should().ThrowAsync<SyncException>().WithMessage("*commit blocked*");
        output.ToString().Should().Contain("Roadmap generation completed.").And.NotContain("hidden-value");
        errors.ToString().Should().Contain("Vault/Home/Card.md:12: qard.empty-back Missing answer.").And.NotContain("another-secret");
    }

    private sealed class HookRunner(ProcessResult result) : IProcessRunner
    {
        public Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken = default) => Task.FromResult(result);
    }

    private sealed class PublishingFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "devbook-publishing-" + Guid.NewGuid().ToString("N"));
        public List<string> Calls { get; } = [];
        public bool Skipped { get; set; }
        private readonly JsonObject settings;

        public PublishingFixture()
        {
            Directory.CreateDirectory(Path.Combine(Root, "Vault/Home"));
            Directory.CreateDirectory(Path.Combine(Root, "Web/content"));
            Directory.CreateDirectory(Path.Combine(Root, ".scripts"));
            settings = new JsonObject
            {
                ["useDatacore"] = true,
                ["autoPublishInterval"] = 0,
                ["obsidianCommentMode"] = "preserve",
                ["publishTarget"] = "local",
                ["quartzRepoPath"] = Path.Combine(Root, "Web")
            };
            File.WriteAllText(Path.Combine(Root, ".scripts/quartz-syncer.defaults.json"), "{\"useDatacore\":true,\"autoPublishInterval\":0,\"obsidianCommentMode\":\"preserve\"}");
            File.WriteAllText(Path.Combine(Root, "Vault/Home/Card.md"), "---\npublish: true\n---\nA complete card owning note.\n");
            File.WriteAllText(Path.Combine(Root, "Vault/Home/Undated.md"), "---\npublish: false\n---\nUnrelated undated note.\n");
            File.WriteAllText(Path.Combine(Root, "Web/content/Card.md"), "Original generated output\n");
            Git.Run(Root, "init", "--quiet");
            Git.Run(Root, "config", "user.name", "Fixture");
            Git.Run(Root, "config", "user.email", "fixture@example.invalid");
            Git.Run(Root, "add", "--all");
            Git.Run(Root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture");
        }

        public Task<string> CommandAsync(IReadOnlyList<string> arguments, CancellationToken cancellationToken)
        {
            string command = string.Join(' ', arguments.Where(value => value != "format=json"));
            Calls.Add(command);
            JsonObject data;
            if (arguments[0] == "eval" && arguments[1].Contains("autoPublishActive", StringComparison.Ordinal))
            {
                return Task.FromResult(new JsonObject
                {
                    ["vaultPath"] = Path.Combine(Root, "Vault"),
                    ["datacoreReady"] = true,
                    ["preserveSupported"] = true,
                    ["syncerLoaded"] = true,
                    ["autoPublishActive"] = false
                }.ToJsonString());
            }
            if (arguments[0] == "eval" && arguments[1].Contains("observedStats", StringComparison.Ordinal))
            {
                var stats = new JsonObject();
                foreach (string path in Directory.EnumerateFiles(Path.Combine(Root, "Vault"), "*", SearchOption.AllDirectories))
                {
                    string name = Path.GetRelativePath(Path.Combine(Root, "Vault"), path).Replace('\\', '/');
                    var file = new FileInfo(path);
                    stats[name] = new JsonObject { ["mtime"] = new DateTimeOffset(file.LastWriteTimeUtc).ToUnixTimeMilliseconds(), ["size"] = file.Length };
                }
                return Task.FromResult(new JsonObject
                {
                    ["inventory"] = new JsonArray(stats.Select(item => (JsonNode?)JsonValue.Create(item.Key)).ToArray()),
                    ["observedStats"] = stats,
                    ["metadataStats"] = stats.DeepClone(),
                    ["extendedReady"] = true,
                    ["nativePublishPaths"] = new JsonArray("Home/Card.md"),
                    ["extendedPublishPaths"] = new JsonArray("Home/Card.md")
                }.ToJsonString());
            }
            if (arguments[0] == "quartz-syncer:config")
            {
                data = settings.Copy();
            }
            else if (arguments[0] == "quartz-syncer:publish")
            {
                File.WriteAllText(Path.Combine(Root, "Web/content/Card.md"), "Rendered through fixture CLI boundary\n");
                data = new JsonObject { ["skipped"] = Skipped ? 1 : 0, ["failures"] = new JsonArray() };
            }
            else if (arguments[0] == "eval" && arguments[1].Contains("cleanOrphanedMedia", StringComparison.Ordinal))
            {
                data = new JsonObject { ["outcome"] = "unchanged-or-withheld" };
            }
            else if (arguments[0] == "quartz-syncer:status")
            {
                data = new JsonObject { ["unpublished"] = 0, ["deleted"] = 0 };
            }
            else
            {
                data = new JsonObject { ["cleared"] = true };
            }
            return Task.FromResult(new JsonObject { ["success"] = true, ["data"] = data }.ToJsonString());
        }

        public void Dispose() => Directory.Delete(Root, true);
    }
}
