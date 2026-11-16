using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using System.Text.Json.Nodes;
using System.Text;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ExportTests
{
    [Theory]
    [InlineData("verify")]
    [InlineData("export")]
    public async Task RetiredReceiptCommandsCannotApproveAnUnmanagedBranch(string mode)
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture();

        // Act
        int result = await Receipt.RunAsync([mode, "--repo-root", fixture.Root,
            "--base-ref", "HEAD", "--head-ref", "feature/source-only"]);

        // Assert
        result.Should().Be(1);
    }

    [Fact]
    public async Task ImmutableExportLeavesIndexUntouchedAndPreservesUndatedSources()
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
        Git.Paths(fixture.Root, "diff", "--cached", "--name-only", "-z").Should().BeEmpty();
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
        public int PublishCount { get; private set; }
        public int FailPublishNumber { get; set; }
        private readonly JsonObject Publishingsettings;

        public PublishingPublishingFixture(bool published = true)
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
            File.WriteAllText(Path.Combine(Root, "Vault/Home/Card.md"), "---\npublish: true\n" + (published ? "published: 2020-01-01T00:00:00.000Z\n" : "") + "---\nA complete card owning note.\n");
            File.WriteAllText(Path.Combine(Root, "Vault/Home/Undated.md"), "---\npublish: false\n---\nUnrelated undated note.\n");
            if (published)
            {
                File.WriteAllText(Path.Combine(Root, "Web/content/Card.md"), "Original generated output\n");
            }
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
                PublishCount++;
                if (PublishCount == FailPublishNumber)
                {
                    throw new SyncException("Fixture publication failed.");
                }
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

        public void Write(string path, string content)
        {
            string target = Path.Combine(Root, path);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.WriteAllText(target, content);
        }

        public void Commit()
        {
            Git.Run(Root, "add", "--all");
            Git.Run(Root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture");
        }

        public void Dispose() => Directory.Delete(Root, true);
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

    [Fact]
    public async Task FirstSuccessfulExportRecordsPublicationBeforeFinalRender()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture(published: false);
        var context = new SyncerContext(fixture.Root, fixture.CommandAsync, timeout: TimeSpan.FromSeconds(10));
        DateTimeOffset started = DateTimeOffset.UtcNow;

        // Act
        await Syncer.ExportAsync(context, prepareLocalDates: true);

        // Assert
        IReadOnlyDictionary<string, FrontmatterValue> fields = Markdown.SplitFrontmatter(File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Card.md"))).Values;
        DateTimeOffset.Parse(fields["published"].Text).Should().BeOnOrAfter(started).And.BeOnOrBefore(DateTimeOffset.UtcNow);
        fixture.PublishCount.Should().Be(2);
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Undated.md")).Should().NotContain("published:");
    }

    [Fact]
    public async Task ImmutableExportPointsMissingPublicationDatesToLocalPreview()
    {
        using var fixture = new PublishingPublishingFixture(published: false);
        var context = new SyncerContext(fixture.Root, fixture.CommandAsync, timeout: TimeSpan.FromSeconds(10));

        Func<Task> export = () => Syncer.ExportAsync(context);

        await export.Should().ThrowAsync<NoteDateException>().WithMessage("*site preview*Vault open in Obsidian*CLI enabled*");
        fixture.PublishCount.Should().Be(0);
    }

    [Fact]
    public async Task FailedFirstExportDoesNotCreatePublicationDate()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture(published: false) { FailPublishNumber = 1 };
        var context = new SyncerContext(fixture.Root, fixture.CommandAsync, timeout: TimeSpan.FromSeconds(10));

        // Act
        Func<Task> export = () => Syncer.ExportAsync(context, prepareLocalDates: true);

        // Assert
        await export.Should().ThrowAsync<SyncException>();
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Card.md")).Should().NotContain("published:");
    }

    [Fact]
    public async Task RetryAfterFailedFinalRenderPreservesFirstSuccessfulPublication()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture(published: false) { FailPublishNumber = 2 };
        var context = new SyncerContext(fixture.Root, fixture.CommandAsync, timeout: TimeSpan.FromSeconds(10));
        try
        {
            await Syncer.ExportAsync(context, prepareLocalDates: true);
        }
        catch (SyncException)
        {
            // The failed final pass leaves owned output for explicit recovery.
        }
        string prepared = File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Card.md"));
        File.Delete(Path.Combine(fixture.Root, "Web/content/Card.md"));
        Syncer.GuardOutput(context);

        // Act
        await Syncer.ExportAsync(context, prepareLocalDates: true);

        // Assert
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Card.md")).Should().Be(prepared);
        fixture.PublishCount.Should().Be(3);
        prepared.Should().Contain("published:");
    }

    [Fact]
    public void PublicationBackfillFollowsRenamesWithoutUsingEarlierSourceDates()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture();
        string body = string.Concat(Enumerable.Repeat("Stable note content survives publication and historical renames.\n", 12));
        fixture.Write("Vault/Legacy/Old.md", "---\npublished: 1990-01-01T00:00:00.000Z\n---\n" + body);
        fixture.Commit();
        Git.Run(fixture.Root, "mv", "Vault/Legacy/Old.md", "Web/content/Old.md");
        fixture.Write("Web/content/Old.md", "---\npublished: 2020-01-01T00:00:00.000Z\n---\n" + body);
        fixture.Commit();
        string firstExport = Git.Text(fixture.Root, "rev-parse", "HEAD");
        Git.Run(fixture.Root, "mv", "Web/content/Old.md", "Web/content/Recovered.md");
        const string source = "---\npublish: true\ncreated: 2001-01-01T00:00:00.000Z\nmodified: 2002-01-01T00:00:00.000Z\n---\nCurrent original source.\n";
        fixture.Write("Vault/Home/Recovered.md", source);
        fixture.Commit();
        fixture.Write("Web/content/Recovered.md", "---\npublished: 2030-01-01T00:00:00.000Z\n---\n" + body);
        fixture.Commit();

        // Act
        JsonObject result = NoteDates.BackfillPublished(fixture.Root, write: true);

        // Assert
        JsonObject recovered = result["recovered"]!.AsArray().Single()!.AsObject();
        recovered["published"]!.GetValue<string>().Should().Be("2020-01-01T00:00:00.000Z");
        recovered["commit"]!.GetValue<string>().Should().Be(firstExport);
        recovered["historical_path"]!.GetValue<string>().Should().Be("Web/content/Old.md");
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Recovered.md")).Should()
            .Be(source.Replace("modified: 2002-01-01T00:00:00.000Z\n", "modified: 2002-01-01T00:00:00.000Z\npublished: \"2020-01-01T00:00:00.000Z\"\n", StringComparison.Ordinal));
        Git.Paths(fixture.Root, "diff", "--cached", "--name-only", "-z").Should().BeEmpty();
    }

    [Fact]
    public async Task HistoricalExportWithoutPublicationDateRequiresExplicitRecovery()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture(published: false);
        fixture.Write("Web/content/Card.md", "An older export without publication metadata.\n");
        fixture.Commit();
        string source = File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Card.md"));
        var context = new SyncerContext(fixture.Root, fixture.CommandAsync, timeout: TimeSpan.FromSeconds(10));

        // Act
        Func<Task> export = () => Syncer.ExportAsync(context, prepareLocalDates: true);

        // Assert
        await export.Should().ThrowAsync<NoteDateException>().WithMessage("*Historical export*publication date*");
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Card.md")).Should().Be(source);
        fixture.PublishCount.Should().Be(0);
    }

    [Fact]
    public void PublicationRecoveryRejectsShallowHistory()
    {
        // Arrange
        using var fixture = new PublishingPublishingFixture();
        File.WriteAllText(Path.Combine(fixture.Root, ".git/shallow"), Git.Text(fixture.Root, "rev-parse", "HEAD") + "\n");

        // Act
        Action recover = () => NoteDates.RecoverPublished(fixture.Root, "Vault/Home/Card.md");

        // Assert
        recover.Should().Throw<NoteDateException>().WithMessage("*Full Git history*");
    }

}
