using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using System.Text.Json.Nodes;
using System.Text;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ExportTests
{
    [Fact]
    public async Task ImmutableExportStagesGeneratedOutputAndPreservesUndatedSources()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture();
        byte[] original = File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Undated.md"));
        var context = new SyncerContext(fixture.Root, fixture.CommandAsync, timeout: TimeSpan.FromSeconds(10));
        await Syncer.ConfigureAsync(context);

        // Act
        await Syncer.ExportAsync(context);

        // Assert
        File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Undated.md")).Should().Equal(original);
        fixture.Calls.Should().ContainInOrder("quartz-syncer:cache action=tree-refresh", "quartz-syncer:publish", "quartz-syncer:delete force");
        fixture.Calls.Should().Contain(call => call.Contains("cleanOrphanedMedia", StringComparison.Ordinal));
        Git.Paths(fixture.Root, "diff", "--cached", "--name-only", "-z").Should().Equal("Web/content/Card.md");
    }

    [Fact]
    public void PersistentExportLockRejectsAnotherLocalWorker()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture();
        var context = new SyncerContext(fixture.Root);
        using FileStream first = Syncer.AcquireLock(context);

        // Act
        Action competing = () => Syncer.AcquireLock(context).Dispose();

        // Assert
        competing.Should().Throw<SyncException>();
    }

    private sealed class PublishingPublishingFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "devbook-publishing-" + Guid.NewGuid().ToString("N"));
        public List<string> Calls { get; } = [];
        private readonly JsonObject Publishingsettings;

        public PublishingPublishingFixture()
        {
            Directory.CreateDirectory(Path.Combine(Root, "Vault/Home"));
            Directory.CreateDirectory(Path.Combine(Root, "Web/content"));
            Directory.CreateDirectory(Path.Combine(Root, ".scripts"));
            Publishingsettings = new JsonObject
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
            foreach (string path in Directory.EnumerateFiles(Path.Combine(Root, "Vault"), "*", SearchOption.AllDirectories))
            {
                File.SetLastWriteTimeUtc(path, new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddTicks(7_000));
            }
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
                    stats[name] = new JsonObject { ["mtime"] = Math.Round((file.LastWriteTimeUtc - DateTime.UnixEpoch).TotalMilliseconds), ["size"] = file.Length };
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
                data = Publishingsettings.Copy();
            }
            else if (arguments[0] == "quartz-syncer:publish")
            {
                File.WriteAllText(Path.Combine(Root, "Web/content/Card.md"), "Rendered through fixture CLI boundary\n");
                data = new JsonObject { ["skipped"] = 0, ["failures"] = new JsonArray() };
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

    [Fact]
    public void ChangedPolicyBytesInvalidateAnExistingExportReceipt()
    {
        // Arrange
        GitTreeEntry[] entries = [.. Receipt.RequiredPolicyPaths.Select(path => new GitTreeEntry(path, "100644", "blob", new string('a', 40))),
            new(".scripts/DevBook.Tooling/Infrastructure/LegacyCaseFold.json", "100644", "blob", new string('b', 40)),
            new("Vault/Home/Programming/Card.md", "100644", "blob", new string('c', 40)),
            new("Web/content/Programming/Card.md", "100644", "blob", new string('d', 40))];
        JsonObject receipt = Receipt.Make(entries);
        GitTreeEntry[] changed = [.. entries.Select(entry => entry.Path.EndsWith("LegacyCaseFold.json", StringComparison.Ordinal) ? entry with { Sha = new string('f', 40) } : entry)];

        // Act
        Action validate = () => Receipt.Validate(receipt, changed);

        // Assert
        validate.Should().Throw<InvalidDataException>();
    }

    [Fact]
    public void ConcurrentSourceEditBlocksExportBeforePublication()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture();
        File.AppendAllText(Path.Combine(fixture.Root, "Vault/Home/Undated.md"), "Concurrent editor text.");
        var context = new SyncerContext(fixture.Root);

        // Act
        Action guard = () => Syncer.GuardSource(context);

        // Assert
        guard.Should().Throw<SyncException>().WithMessage("*unstaged*");
    }

}
