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
        string text = Frontmatter + "# Questions\n\n<!-- qard-location: {\"deck\":\"Custom\",\"topic\":\"Moved\"} -->\n<!-- qard-id: stable -->\n> [!qard]- What does it mean?\n> Extra prompt.\n> <!-- qard-answer -->\n> A bounded answer.\n\n```md\n> [!qard]- Documentation?\n> Literal.\n```\n";
        NoteDocument note = NoteDocument.Parse(text, "Vault/Home/Programming/NET/Card.md");
        note.Frontmatter["level"].Items.Should().Equal("2");
        IReadOnlyList<QardCard> cards = QardScanner.Scan(text);
        cards.Should().ContainSingle();
        cards[0].Id.Should().Be("stable");
        cards[0].Front.Should().Be("What does it mean?\nExtra prompt.");
        cards[0].Back.Should().Be("A bounded answer.");
        text[cards[0].Start..cards[0].End].Should().Be(cards[0].Text);
        Validation.ValidateFrontmatter(note).Should().BeEmpty();
        Validation.ValidateQardInterviews(note).Should().BeEmpty();
        Validation.ValidateQardInterviews(NoteDocument.Parse(Frontmatter + "# Questions\n> [!qard]+ Revealed?\n", note.Rel))
            .Select(issue => issue.Code).Should().Contain(["qard.collapsed", "qard.empty-back"]);
    }

    [Fact]
    public void Validator_checks_schema_links_fences_and_keeps_baseline_out_of_staged_enforcement()
    {
        string root = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "devbook-validation-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(System.IO.Path.Combine(root, "Vault/Home/Programming/NET"));
        Directory.CreateDirectory(System.IO.Path.Combine(root, "Vault/Assets"));
        try
        {
            string path = System.IO.Path.Combine(root, "Vault/Home/Programming/NET/Card.md");
            File.WriteAllText(path, Frontmatter.Replace("topic: [Programming]", "topic: Programming") + "```\nBare fence\n```\n[[Target#Missing]] [[Absent]]\n");
            File.WriteAllText(System.IO.Path.Combine(root, "Vault/Home/Programming/NET/Target.md"), Frontmatter + "# Existing\n");
            NoteDocument note = NoteDocument.Load(path, root);
            Validation.ValidateFrontmatter(note).Select(issue => issue.BaselineId).Should().Contain("frontmatter.type|Vault/Home/Programming/NET/Card.md|topic");
            Validation.ValidateCodeFences(note).Select(issue => issue.Code).Should().Equal("markdown.code-fence-language");
            Validation.ValidateWikilinks(note, new VaultIndex(System.IO.Path.Combine(root, "Vault"))).Select(issue => issue.Discriminator).Should().Equal("target#missing", "absent");
            Directory.CreateDirectory(System.IO.Path.Combine(root, ".scripts"));
            File.WriteAllText(System.IO.Path.Combine(root, ".scripts/vault-validation-baseline.json"), "{\"version\":1,\"violations\":[\"frontmatter.type|Vault/Home/Programming/NET/Card.md|topic\"]}");
            Validation.LoadBaseline(System.IO.Path.Combine(root, ".scripts/vault-validation-baseline.json")).Should().Contain("frontmatter.type|Vault/Home/Programming/NET/Card.md|topic");
            Git.Run(root, "init", "-q");
            Git.Run(root, "add", "Vault/Home/Programming/NET/Card.md");
            Validation.Validate(root, "staged").Issues.Select(issue => issue.Code).Should().Contain("frontmatter.type");
            Validation.Validate(root, "all").Suppressed.Should().Be(1);
            Validation.LoadBaseline(System.IO.Path.Combine(root, "missing.json")).Should().BeEmpty();
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
