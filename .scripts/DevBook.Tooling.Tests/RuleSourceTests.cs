using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class RuleSourceTests
{
    private static readonly string[] Stores = [".rulesync/skill-feedback/note-polish.json", ".rulesync/skill-feedback/qard-polish.json"];
    private static readonly string[] Skills = ["note-polish", "qard-polish"];

    [Fact]
    public void PipelineBundleMatchesConfigurationAndCarriesBothPreferenceStores()
    {
        // Arrange
        string root = Repository.FindRoot();
        JsonNode configuration = JsonNode.Parse(File.ReadAllText(Path.Combine(root, ".github", "devbook-improvement.json")))!;

        // Act
        string[] configured = configuration["content_quality"]!["authoritative_paths"]!.AsArray().Select(path => path!.GetValue<string>()).ToArray();

        // Assert
        configured.Should().BeEquivalentTo(Core.ContentAuthorities);
        Core.ContentAuthorities.Should().Contain(Stores);
    }

    [Theory]
    [InlineData(".rulesync/subagents/note-writer.md")]
    [InlineData(".rulesync/subagents/note-reviewer.md")]
    [InlineData(".claude/agents/note-writer.md")]
    [InlineData(".claude/agents/note-reviewer.md")]
    public void RoleContractsReadBothPreferenceStores(string contract)
    {
        // Arrange
        string root = Repository.FindRoot();

        // Act
        string text = File.ReadAllText(Path.Combine(root, contract));

        // Assert
        text.Should().ContainAll(Stores);
    }

    [Theory]
    [InlineData("scripts/feedback.py")]
    [InlineData("references/feedback-contract.md")]
    public void PolishSkillsShareOneFeedbackMechanism(string relative)
    {
        // Arrange
        string root = Repository.FindRoot();

        // Act
        string[] copies = Skills.Select(skill => File.ReadAllText(Path.Combine(root, ".rulesync", "skills", skill, relative)).Replace(skill, "<skill>", StringComparison.Ordinal)).ToArray();

        // Assert
        copies[1].Should().Be(copies[0]);
    }
}
