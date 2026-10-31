using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class PilotTests
{
    private const string Sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    [Fact]
    public void Disabled_pilot_preserves_production_configuration_without_reading_checkout()
    {
        // Arrange
        JsonObject config = Configuration();

        // Act
        JsonObject configured = Pilot.Configure(config, () => throw new InvalidOperationException("Checkout must not be read."), new Dictionary<string, string>());

        // Assert
        configured.Should().BeSameAs(config);
        configured.Str("base_branch").Should().Be("main");
        configured.Str("state_branch").Should().Be(Runtime.StateBranch);
    }

    [Fact]
    public void Authorized_pilot_isolated_from_production_preserves_content_policy()
    {
        // Arrange
        JsonObject config = Configuration();
        JsonObject original = config.Copy();

        // Act
        JsonObject configured = Pilot.Configure(config, () => Sha, Environment());

        // Assert
        configured.Should().NotBeSameAs(config);
        JsonNode.DeepEquals(config, original).Should().BeTrue();
        configured.Str("base_branch").Should().Be("feature/devbook-improvement-setup");
        configured.Str("state_branch").Should().Be("maintenance/devbook-improvement-pr181-test-state");
        configured.Int("initial_generation").Should().Be(1_810_001);
        configured.Int("max_notes_per_run").Should().Be(2);
        configured.Int("max_pr_notes").Should().Be(2);
        configured.Int("max_open_prs").Should().Be(1);
        foreach (string key in new[] { "repo", "model", "validator_commands", "allowed_source_hosts", "content_quality", "required_check_contexts" })
        {
            JsonNode.DeepEquals(configured[key], original[key]).Should().BeTrue(key + " must retain the reviewed production policy");
        }
    }

    [Theory]
    [InlineData("GITHUB_EVENT_NAME", "schedule")]
    [InlineData("GITHUB_REF", "refs/heads/main")]
    [InlineData("GITHUB_SHA", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")]
    [InlineData("CHECKOUT_SHA", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")]
    [InlineData("GITHUB_ACTOR_ID", "1")]
    [InlineData("DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED", "true")]
    public void Pilot_rejects_unapproved_execution_context(string key, string value)
    {
        // Arrange
        Dictionary<string, string> environment = Environment();
        environment[key] = value;
        JsonObject config = Configuration();
        JsonObject original = config.Copy();

        // Act
        Action configure = () => Pilot.Configure(config, () => environment.GetValueOrDefault("CHECKOUT_SHA", Sha), environment);

        // Assert
        configure.Should().Throw<ProductionGate>();
        JsonNode.DeepEquals(config, original).Should().BeTrue();
    }

    private static JsonObject Configuration() => new()
    {
        ["repo"] = "grafanaKibana/devbook.zip",
        ["base_branch"] = "main",
        ["state_branch"] = Runtime.StateBranch,
        ["model"] = "claude-sonnet-5-5",
        ["max_notes_per_run"] = 4,
        ["max_pr_notes"] = 16,
        ["max_open_prs"] = 3,
        ["validator_commands"] = new JsonArray(new JsonArray("dotnet", "test")),
        ["allowed_source_hosts"] = new JsonArray("learn.microsoft.com"),
        ["content_quality"] = new JsonObject { ["rules_version"] = 1 },
        ["required_check_contexts"] = new JsonArray("pr-title", "major-approval")
    };

    private static Dictionary<string, string> Environment() => new()
    {
        ["DEVBOOK_IMPROVEMENT_PILOT"] = "true",
        ["DEVBOOK_IMPROVEMENT_PILOT_SHA"] = Sha,
        ["DEVBOOK_IMPROVEMENT_PRODUCTION_ACTIVATED"] = "false",
        ["DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED"] = "false",
        ["GITHUB_REPOSITORY"] = "grafanaKibana/devbook.zip",
        ["GITHUB_EVENT_NAME"] = "workflow_dispatch",
        ["GITHUB_REF"] = "refs/heads/feature/devbook-improvement-setup",
        ["GITHUB_WORKFLOW_REF"] = "grafanaKibana/devbook.zip/.github/workflows/devbook-improvement.yml@refs/heads/feature/devbook-improvement-setup",
        ["GITHUB_ACTOR"] = "grafanaKibana",
        ["GITHUB_ACTOR_ID"] = "45916288",
        ["GITHUB_TRIGGERING_ACTOR"] = "grafanaKibana",
        ["GITHUB_SHA"] = Sha
    };
}
