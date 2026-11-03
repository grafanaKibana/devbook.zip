using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using System.Text.Json.Nodes;
using System.Text;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class VaultTests
{
    private const string VaultFrontmatter = "---\ntopic: [Programming]\nsubtopic: [NET]\nlevel: [\"2\"]\npriority: Medium\nstatus: Creation\npublish: false\n---\n";

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
