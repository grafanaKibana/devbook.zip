using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class VaultTests
{
    private const string Frontmatter = "---\ntopic: [Programming]\nsubtopic: [NET]\nlevel: [\"2\"]\npriority: Medium\nstatus: Creation\npublish: false\n---\n";

    [Fact]
    public void Shared_parser_preserves_native_card_identity_and_ignores_documented_cards()
    {
        // Arrange
        string text = Frontmatter + "# Questions\n\n<!-- qard-location: {\"deck\":\"Custom\",\"topic\":\"Moved\"} -->\n<!-- qard-id: stable -->\n> [!qard]- What does it mean?\n> Extra prompt.\n> <!-- qard-answer -->\n> A bounded answer.\n\n```md\n> [!qard]- Documentation?\n> Literal.\n```\n";

        // Act
        NoteDocument note = NoteDocument.Parse(text, "Vault/Home/Programming/NET/Card.md");
        IReadOnlyList<QardCard> cards = QardScanner.Scan(text);
        IReadOnlyList<Issue> frontmatterIssues = Validation.ValidateFrontmatter(note);
        IReadOnlyList<Issue> cardIssues = Validation.ValidateQardInterviews(note);
        IEnumerable<string> malformedCodes = Validation.ValidateQardInterviews(
            NoteDocument.Parse(Frontmatter + "# Questions\n> [!qard]+ Revealed?\n", note.Rel)).Select(issue => issue.Code);

        // Assert
        note.Frontmatter["level"].Items.Should().Equal("2");
        cards.Should().ContainSingle();
        cards[0].Id.Should().Be("stable");
        cards[0].Front.Should().Be("What does it mean?\nExtra prompt.");
        cards[0].Back.Should().Be("A bounded answer.");
        text[cards[0].Start..cards[0].End].Should().Be(cards[0].Text);
        frontmatterIssues.Should().BeEmpty();
        cardIssues.Should().BeEmpty();
        malformedCodes.Should().Contain(["qard.collapsed", "qard.empty-back"]);
    }

    [Fact]
    public void Validator_checks_schema_links_fences_and_keeps_baseline_out_of_staged_enforcement()
    {
        // Arrange
        string root = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "devbook-validation-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(System.IO.Path.Combine(root, "Vault/Home/Programming/NET"));
        Directory.CreateDirectory(System.IO.Path.Combine(root, "Vault/Assets"));
        try
        {
            string path = System.IO.Path.Combine(root, "Vault/Home/Programming/NET/Card.md");
            File.WriteAllText(path, Frontmatter.Replace("topic: [Programming]", "topic: Programming") + "```\nBare fence\n```\n[[Target#Missing]] [[Absent]]\n");
            File.WriteAllText(System.IO.Path.Combine(root, "Vault/Home/Programming/NET/Target.md"), Frontmatter + "# Existing\n");

            // Act
            NoteDocument note = NoteDocument.Load(path, root);

            // Assert
            Validation.ValidateFrontmatter(note).Select(issue => issue.BaselineId).Should().Contain("frontmatter.type|Vault/Home/Programming/NET/Card.md|topic");
            Validation.ValidateCodeFences(note).Select(issue => issue.Code).Should().Equal("markdown.code-fence-language");
            Validation.ValidateWikilinks(note, new VaultIndex(System.IO.Path.Combine(root, "Vault"))).Select(issue => issue.Discriminator).Should().Equal("target#missing", "absent");

            // Arrange: a baseline suppresses full-vault issues, not staged issues.
            Directory.CreateDirectory(System.IO.Path.Combine(root, ".scripts"));
            File.WriteAllText(System.IO.Path.Combine(root, ".scripts/vault-validation-baseline.json"), "{\"version\":1,\"violations\":[\"frontmatter.type|Vault/Home/Programming/NET/Card.md|topic\"]}");

            // Act: load the stored baseline.
            IReadOnlySet<string> baseline = Validation.LoadBaseline(System.IO.Path.Combine(root, ".scripts/vault-validation-baseline.json"));

            // Assert
            baseline.Should().Contain("frontmatter.type|Vault/Home/Programming/NET/Card.md|topic");

            // Arrange: stage the same invalid source.
            Git.Run(root, "init", "-q");
            Git.Run(root, "add", "Vault/Home/Programming/NET/Card.md");

            // Act: enforce current rules on staged notes.
            IEnumerable<string> stagedCodes = Validation.Validate(root, "staged").Issues.Select(issue => issue.Code);

            // Assert
            stagedCodes.Should().Contain("frontmatter.type");
            Validation.Validate(root, "all").Suppressed.Should().Be(1);
            Validation.LoadBaseline(System.IO.Path.Combine(root, "missing.json")).Should().BeEmpty();
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
