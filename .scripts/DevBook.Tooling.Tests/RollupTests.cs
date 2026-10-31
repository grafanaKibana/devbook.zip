using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Vault;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class RollupTests
{
    [Fact]
    public void FolderRollupDerivesDescendantsWithoutOverwritingValidValuesUnlessForced()
    {
        // Arrange
        using var vault = new RollupVault();
        vault.Write("Programming/Programming.md", "---\ntags: [FolderNote]\nstatus: Done\npriority: Low\nlevel: [\"1\"]\n---\nHub.\n");
        vault.Write("Programming/NET/Card.md", "---\nstatus: Creation\npriority: High\nlevel: [\"4\"]\n---\nMechanism.\n");
        vault.Write("Programming/Ignored.md", "---\ntags: [MetricsIgnore]\nstatus: Not-Started\npriority: High\nlevel: [\"9\"]\n---\nIgnored.\n");

        // Act: valid owner values remain unchanged by default.
        IReadOnlyList<FolderRollupChange> changes = FolderRollup.Plan(vault.Home, vault.Root).Changes;

        // Assert
        changes.Should().BeEmpty();

        // Act: explicitly force the descendant rollup.
        FolderRollupResult result = FolderRollup.Sync(vault.Home, write: true, force: true, repoRoot: vault.Root);

        // Assert
        result.Changes.Should().ContainSingle();
        string hub = File.ReadAllText(Path.Combine(vault.Home, "Programming/Programming.md"));
        hub.Should().Contain("status: Creation\npriority: High\nlevel:\n  - \"4\"\n");
        hub.Should().EndWith("Hub.\n");
        FolderRollup.Plan(vault.Home, vault.Root, force: true).Changes.Should().BeEmpty();
    }

    [Fact]
    public void RoadmapRetainsFolderLinksRollupColorsAndStableGeneratedComparison()
    {
        // Arrange
        using var vault = new RollupVault();
        vault.Write("Programming/Programming.md", "---\nstatus: Done\n---\n");
        vault.Write("Programming/NET/NET.md", "---\nstatus: Done\n---\n");
        vault.Write("Programming/NET/Card.md", "---\nstatus: Creation\n---\n");

        // Act
        var first = Roadmap.Generate(vault.Root, DateTimeOffset.Parse("2026-01-01T00:00:00Z"));
        var later = Roadmap.Generate(vault.Root, DateTimeOffset.Parse("2026-02-01T00:00:00Z"));

        // Assert
        first.InvalidStatuses.Should().BeEmpty();
        JsonNode topic = first.Canvas["nodes"]!.AsArray().First(node => node?["text"]?.GetValue<string>() == "# [[Home/Programming/Programming|Programming]]")!;
        topic["color"]!.GetValue<string>().Should().Be("2");
        first.Canvas["edges"]!.AsArray().Should().Contain(edge => edge!["fromSide"]!.GetValue<string>() == "right" && edge["toSide"]!.GetValue<string>() == "left");
        JsonNode.DeepEquals(Roadmap.NormalizeForComparison(first.Canvas), Roadmap.NormalizeForComparison(later.Canvas)).Should().BeTrue();
        first.Canvas["metadata"]!["frontmatter"]!["permalink"]!.GetValue<string>().Should().Be("/roadmap/");
    }

    private sealed class RollupVault : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "devbook-rollup-" + Guid.NewGuid().ToString("N"));
        public string Home => Path.Combine(Root, "Vault", "Home");

        public void Write(string relative, string content)
        {
            string target = Path.Combine(Home, relative);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.WriteAllText(target, content, new UTF8Encoding(false));
        }

        public void Dispose() => Directory.Delete(Root, true);
    }
}
