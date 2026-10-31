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

    [Fact]
    public void NoteValidationReportsSchemaFenceAndLinkDefects()
    {
        // Arrange
        string root = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "devbook-validation-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(System.IO.Path.Combine(root, "Vault/Home/Programming/NET"));
        Directory.CreateDirectory(System.IO.Path.Combine(root, "Vault/Assets"));
        try
        {
            string path = System.IO.Path.Combine(root, "Vault/Home/Programming/NET/Card.md");
            File.WriteAllText(path, VaultFrontmatter.Replace("topic: [Programming]", "topic: Programming") + "```\nBare fence\n```\n[[Target#Missing]] [[Absent]]\n");
            File.WriteAllText(System.IO.Path.Combine(root, "Vault/Home/Programming/NET/Target.md"), VaultFrontmatter + "# Existing\n");

            // Act
            ValidationResult result = Validation.Validate(root, "all", useBaseline: false, includeRepositoryChecks: false);

            // Assert
            result.Issues.Select(issue => issue.BaselineId).Should().Contain("frontmatter.type|Vault/Home/Programming/NET/Card.md|topic");
            result.Issues.Select(issue => issue.Code).Should().Contain("markdown.code-fence-language");
            result.Issues.Select(issue => issue.Discriminator).Should().Contain(new[] { "target#missing", "absent" });
        }

        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void LegacyMigrationPreservesTheOriginalCardIdentity()
    {
        // Arrange
        JsonObject fixture = JsonData.ParseObject(File.ReadAllText(System.IO.Path.Combine(AppContext.BaseDirectory, "fixtures", "LegacyMigration.json")));
        JsonObject manifest = fixture.RequiredObject("manifest").Copy();
        byte[] original = Convert.FromBase64String(fixture.Str("source_b64"));
        byte[] applied = Convert.FromBase64String(fixture.Str("applied_b64"));
        string root = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "devbook-migration-" + Guid.NewGuid().ToString("N"));
        string relative = manifest.Arr("files")[0]!.Str("path");
        string path = System.IO.Path.Combine(root, relative);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path)!);
        File.WriteAllBytes(path, original);
        try
        {

            // Act: apply the guarded legacy migration.
            IReadOnlyList<string> changed = Migration.Apply(root, manifest);
            byte[] migrated = File.ReadAllBytes(path);

            // Assert
            changed.Should().Equal(relative);
            migrated.Should().Equal(applied);
            QardScanner.Scan(Encoding.UTF8.GetString(migrated)).Single().Id.Should().Be("stable_legacy");
        }

        finally
        {
            Directory.Delete(root, recursive: true);
        }
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
    public void CandidateDatesAreDerivedFromTheImmutableParent()
    {
        // Arrange
        byte[] parent = Encoding.UTF8.GetBytes("---\r\ncreated_at: '2024-01-02'\r\nmodified: \"2024-02-03T10:00:00.000Z\"\r\npublish: true\r\n---\r\nOriginal mechanism.\r\n");
        byte[] candidate = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(parent).Replace("Original", "Improved", StringComparison.Ordinal));
        var instant = DateTimeOffset.Parse("2026-10-30T10:11:12.345Z");

        // Act
        byte[] prepared = NoteDates.Prepare(candidate, parent, instant);
        string text = Encoding.UTF8.GetString(prepared);

        // Assert
        text.Should().Contain("created_at: '2024-01-02'\r\n");
        text.Should().Contain("created: \"2024-01-02T00:00:00.000Z\"\r\n");
        text.Should().Contain("modified: \"2026-10-30T10:11:12.345Z\"\r\n");
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
