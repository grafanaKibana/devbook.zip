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
        GitTreeEntry[] baseline = Receipt.TreeEntries(context);
        var originalReceipt = new JsonObject
        {
            ["sources"] = new JsonObject(baseline.Where(entry => Syncer.IsSource(entry.Path))
                .Select(entry => KeyValuePair.Create<string, JsonNode?>(entry.Path, new JsonObject { ["sha"] = entry.Sha }))),
            ["outputs"] = new JsonObject(baseline.Where(entry => Receipt.IsExportPath(entry.Path))
                .Select(entry => KeyValuePair.Create<string, JsonNode?>(entry.Path, new JsonObject { ["sha"] = entry.Sha })))
        };

        // Act
        await Syncer.ExportAsync(context);
        PublishedDates.Restore(context, originalReceipt);

        // Assert
        File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Undated.md")).Should().Equal(original);
        fixture.Calls.Should().ContainInOrder("quartz-syncer:cache action=tree-refresh", "quartz-syncer:publish", "quartz-syncer:delete force");
        fixture.Calls.Should().Contain(call => call.Contains("cleanOrphanedMedia", StringComparison.Ordinal));
        Git.Paths(fixture.Root, "diff", "--cached", "--name-only", "-z").Should().BeEquivalentTo(
            new[] { "Web/content/Card.md" }.Concat(fixture.DateCases.Where(item => !item.Restore).Select(item => "Web/content/" + item.Name + ".md")));
        foreach (DateCase item in fixture.DateCases)
        {
            File.ReadAllBytes(Path.Combine(fixture.Root, "Web/content/" + item.Name + ".md")).Should()
                .Equal(Encoding.UTF8.GetBytes(item.Restore ? item.Before : item.After), item.Name);
        }
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

    private sealed record DateCase(string Name, string Source, string Before, string After, bool Restore);

    private static DateCase Date(string name, string source, string beforeFields = "", string afterFields = "",
        string afterBody = "Stable body\n", bool restore = false) => new(name, source,
        "---\npublished: 2026-01-01T00:00:00.000Z\n" + beforeFields + "---\nStable body\n",
        "---\npublished: 2026-11-01T00:00:00.000Z\n" + afterFields + "---\n" + afterBody, restore);

    private sealed class PublishingPublishingFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "devbook-publishing-" + Guid.NewGuid().ToString("N"));
        public List<string> Calls { get; } = [];
        public DateCase[] DateCases { get; } =
        [
            Date("TimestampOnly", "publish: true", restore: true),
            Date("DependencyChanged", "publish: true", afterBody: "Dependency changed\n"),
            Date("AuthoredPublished", "published: 2026-01-01"),
            Date("AuthoredPublishDate", "publishDate: 2026-01-01"),
            Date("AuthoredDate", "date: 2026-01-01"),
            Date("QuotedDate", "'date': 2026-01-01"),
            Date("DuplicateSource", "publish: true\npublish: true"),
            Date("DuplicateOutput", "publish: true", beforeFields: "published: 2025-01-01T00:00:00.000Z\n",
                afterFields: "published: 2025-01-01T00:00:00.000Z\n"),
            Date("MalformedSource", "{date: 2026-01-01}"),
            Date("MultilineSource", "title: \"Unclosed\n---\ndate: 2026-01-01"),
            Date("MetadataChanged", "publish: true", beforeFields: "title: Old\n", afterFields: "title: New\n"),
            Date("BodyPublished", "publish: true", afterBody: "Stable body\npublished: 2026-01-01T00:00:00.000Z\n"),
            Date("ListMetadata", "publish: true\ntags:\n  - FolderNote", beforeFields: "tags:\n  - FolderNote\n",
                afterFields: "tags:\n  - FolderNote\n", restore: true)
        ];
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
            foreach (DateCase item in DateCases)
            {
                File.WriteAllText(Path.Combine(Root, "Vault/Home/" + item.Name + ".md"), "---\n" + (item.Source.StartsWith("publish:", StringComparison.Ordinal) ? "" : "publish: true\n") + item.Source + "\n---\nStable source\n");
                File.WriteAllText(Path.Combine(Root, "Web/content/" + item.Name + ".md"), item.Before);
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
                    ["nativePublishPaths"] = new JsonArray(stats.Where(item => item.Key != "Home/Undated.md").Select(item => (JsonNode?)JsonValue.Create(item.Key)).ToArray()),
                    ["extendedPublishPaths"] = new JsonArray(stats.Where(item => item.Key != "Home/Undated.md").Select(item => (JsonNode?)JsonValue.Create(item.Key)).ToArray())
                }.ToJsonString());
            }
            if (arguments[0] == "quartz-syncer:config")
            {
                data = Publishingsettings.Copy();
            }
            else if (arguments[0] == "quartz-syncer:publish")
            {
                File.WriteAllText(Path.Combine(Root, "Web/content/Card.md"), "Rendered through fixture CLI boundary\n");
                foreach (DateCase item in DateCases)
                {
                    File.WriteAllText(Path.Combine(Root, "Web/content/" + item.Name + ".md"), item.After);
                }
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
