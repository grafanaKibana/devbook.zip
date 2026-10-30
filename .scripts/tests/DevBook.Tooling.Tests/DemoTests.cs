using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class DemoTests
{
    [Fact]
    public async Task NativeDemoReusesPrHandlesEditedFeedbackAndStopsQuietlyAtQuota()
    {
        string root = Repository.FindRoot();
        System.Text.Json.Nodes.JsonObject config = JsonData.ParseObject(await File.ReadAllTextAsync(Path.Combine(root, ".github/devbook-improvement.json")));
        System.Text.Json.Nodes.JsonObject result = await Demo.RunAsync(root, config);
        result.Str("status").Should().Be("demo_complete");
        result.Bool("fixture").Should().BeTrue();
        result.Int("created_prs").Should().Be(1);
        result.Int("updated_prs").Should().BeGreaterThan(1);
        result.Int("feedback_revisions").Should().Be(2);
        result.Bool("state_preserved").Should().BeTrue();
        result.Bool("prepared_at_preserved").Should().BeTrue();
        result.Arr("question_changes").Should().NotBeEmpty();
        result.Str("diff").Should().Contain("diff --git a/Vault/Home/");
        result.Str("summary").Should().Contain("Owner-written context stays here.").And.Contain("No Claude request was made").And.Contain("Quartz export: verified");
        result.Str("limitations").ToLowerInvariant().Should().Contain("no claude request");
    }
}
