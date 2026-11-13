using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using System.Text.Json.Nodes;
using System.Text;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class VaultTests
{
    private const string VaultFrontmatter = "---\ntopic: [Programming]\nsubtopic: [NET]\nlevel: [\"2\"]\npriority: Medium\nstatus: In Progress\npublish: false\n---\n";

    [Theory]
    [InlineData("New")]
    [InlineData("In Progress")]
    [InlineData("Established")]
    public void FrontmatterAcceptsMaterialReadinessStatuses(string status)
    {
        // Arrange
        NoteDocument note = NoteDocument.Parse(VaultFrontmatter.Replace("In Progress", status), "Vault/Home/Programming/Note.md");

        // Act
        IReadOnlyList<Issue> issues = Validation.ValidateFrontmatter(note);

        // Assert
        issues.Should().BeEmpty();
    }

    [Theory]
    [InlineData("Not-Started")]
    [InlineData("Creation")]
    [InlineData("Ready to Repeat")]
    [InlineData("Repetition")]
    [InlineData("Done")]
    public void FrontmatterRejectsRetiredStatuses(string status)
    {
        // Arrange
        NoteDocument note = NoteDocument.Parse(VaultFrontmatter.Replace("In Progress", status), "Vault/Home/Programming/Note.md");

        // Act
        IReadOnlyList<Issue> issues = Validation.ValidateFrontmatter(note);

        // Assert
        issues.Should().ContainSingle(issue => issue.Code == "frontmatter.status");
    }

    [Theory]
    [InlineData("In Progress", "New", "In Progress")]
    [InlineData("Established", "New", "New")]
    [InlineData("Established", "Established", "Established")]
    public void FolderRollupUsesMaterialReadinessStatuses(string first, string second, string expected)
    {
        // Arrange
        using var vault = new RollupRollupVault();
        vault.Write("Programming/Programming.md", "---\ntags: [FolderNote]\nstatus: unknown\npriority: High\nlevel: [\"2\"]\n---\nFolder body.\n");
        vault.Write("Programming/First.md", VaultFrontmatter.Replace("In Progress", first));
        vault.Write("Programming/Second.md", VaultFrontmatter.Replace("In Progress", second));

        // Act
        FolderRollupResult result = FolderRollup.Plan(vault.Home, vault.Root);

        // Assert
        result.Changes.Should().ContainSingle();
        result.Changes[0].Content.Should().Contain($"status: {expected}\n").And.EndWith("Folder body.\n");
    }

    [Theory]
    [InlineData("New")]
    [InlineData("In Progress")]
    [InlineData("Established")]
    public void ForcedFolderRollupPreservesExplicitStatusAndRecomputesPriorityAndLevel(string status)
    {
        // Arrange
        using var vault = new RollupRollupVault();
        vault.Write("Programming/Programming.md", $"---\ntags: [FolderNote]\nstatus: {status}\npriority: Low\nlevel: [\"1\"]\n---\nFolder body.\n");
        vault.Write("Programming/First.md", VaultFrontmatter);

        // Act
        FolderRollupResult result = FolderRollup.Sync(vault.Home, write: true, force: true, repoRoot: vault.Root);

        // Assert
        result.Changes.Should().ContainSingle();
        result.Changes[0].Details.Should().Equal("priority: Low -> Medium", "level: 1 -> 2");
        string current = File.ReadAllText(Path.Combine(vault.Home, "Programming/Programming.md"));
        current.Should().Contain($"status: {status}\n").And.Contain("priority: Medium\n").And.Contain("level:\n  - \"2\"\n")
            .And.EndWith("Folder body.\n");
        if (status != "Established")
        {
            current.Should().NotContain("Established");
        }
    }

    [Theory]
    [InlineData("Established", "Established", "4")]
    [InlineData("Established", "In Progress", "2")]
    [InlineData("In Progress", "New", "1")]
    public void RoadmapAggregatesMaterialReadinessAndShowsThreeStageLegend(string first, string second, string color)
    {
        // Arrange
        using var vault = new RollupRollupVault();
        vault.Write("Programming/Programming.md", "---\ntags: [FolderNote]\nstatus: Established\n---\n");
        vault.Write("Programming/First.md", VaultFrontmatter.Replace("In Progress", first));
        vault.Write("Programming/Second.md", VaultFrontmatter.Replace("In Progress", second));

        // Act
        RoadmapResult result = Roadmap.Generate(vault.Root);

        // Assert
        result.InvalidStatuses.Should().BeEmpty();
        JsonObject[] nodes = result.Canvas["nodes"]!.AsArray().OfType<JsonObject>().ToArray();
        nodes.Single(node => node["text"]?.GetValue<string>().StartsWith("# [[Home/Programming/", StringComparison.Ordinal) == true)
            ["color"]!.GetValue<string>().Should().Be(color);
        string[] legend = nodes.Select(node => node["text"]?.GetValue<string>() ?? "")
            .Where(text => text.StartsWith("New:", StringComparison.Ordinal)
                || text.StartsWith("In Progress:", StringComparison.Ordinal)
                || text.StartsWith("Established:", StringComparison.Ordinal)).ToArray();
        legend.Should().HaveCount(3);
        legend.Should().Contain($"{(color == "1" ? "New" : color == "2" ? "In Progress" : "Established")}: 1");
        nodes.Single(node => node["type"]?.GetValue<string>() == "group")["height"]!.GetValue<int>().Should().Be(378);
    }

    [Fact]
    public void Shared_parser_preserves_native_card_identity_and_ignores_documented_cards()
    {
        // Arrange
        string text = VaultFrontmatter + "# Questions\n\n<!-- qard-location: {\"deck\":\"Custom\",\"topic\":\"Moved\"} -->\n<!-- qard-id: stable -->\n> [!qard]- What does it mean?\n> Extra prompt.\n> <!-- qard-answer -->\n> A bounded answer.\n\n```md\n> [!qard]- Documentation?\n> Literal.\n```\n";

        // Act
        IReadOnlyList<QardCard> cards = QardScanner.Scan(text);

        // Assert
        cards.Should().ContainSingle();
        cards[0].Id.Should().Be("stable");
        cards[0].Front.Should().Be("What does it mean?\nExtra prompt.");
        cards[0].Back.Should().Be("A bounded answer.");
        text[cards[0].Start..cards[0].End].Should().Be(cards[0].Text);
    }

    private sealed class RollupRollupVault : IDisposable
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

    [Fact]
    public void RepairInventoryMapsOnlyActiveCardsAndNeverWritesPluginData()
    {
        // Arrange
        using var vault = new RollupRollupVault();
        string data = Path.Combine(vault.Root, "Vault/.obsidian/plugins/qard/data.json");
        Directory.CreateDirectory(Path.GetDirectoryName(data)!);
        File.WriteAllText(data, """{"states":{"stable_1":{"needsFixing":true},"sample":{"needsFixing":true},"orphan":{"needsFixing":true}},"other":{"private":"untouched"}}""");
        byte[] original = File.ReadAllBytes(data);
        vault.Write("Programming/NET/Card.md", DomainFixtures.Note + "\n```md\n<!-- qard-id: sample -->\n> [!qard]- Example?\n> Sample.\n```\n");

        // Act
        JsonArray inventory = DevBook.Tooling.Improvement.Core.Inventory(vault.Root);

        // Assert
        inventory.Should().ContainSingle();
        inventory[0]!.Arr("needs_fixing_ids").Strings().Should().Equal("stable_1");
        inventory[0]!.Str("repair_input_hash").Should().NotBeEmpty();
        File.ReadAllBytes(data).Should().Equal(original);
    }

    [Fact]
    public void MalformedPluginDataProducesDiagnosticWithoutChangingItsBytes()
    {
        // Arrange
        using var vault = new RollupRollupVault();
        string path = Path.Combine(vault.Root, "Vault/.obsidian/plugins/qard/data.json");
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, "{not-json");
        byte[] original = File.ReadAllBytes(path);

        // Act
        Action read = () => DevBook.Tooling.Improvement.RepairInputs.ReadIds(vault.Root);

        // Assert
        read.Should().Throw<InvalidDataException>().WithMessage("*malformed JSON*");
        File.ReadAllBytes(path).Should().Equal(original);
    }

}
