using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ProviderTests
{
    [Fact]
    public async Task AuthorAndReviewerUseSeparateRestrictedOAuthCalls()
    {
        var runner = new ProviderRunner();
        var config = new JsonObject
        {
            ["claude_executable"] = "/usr/bin/true",
            ["model"] = ClaudeProvider.DefaultModel,
            ["model_timeout_seconds"] = 600,
            ["allowed_source_hosts"] = new JsonArray("learn.microsoft.com")
        };
        var provider = new ClaudeProvider(config, runner, environment: name => name switch
        {
            "CLAUDE_CODE_OAUTH_TOKEN" => "fixture-oauth-value",
            "PATH" => "/usr/bin:/bin",
            _ => null
        });
        JsonObject author = await provider.AuthorAsync(new JsonObject { ["topic"] = "fixture" });
        JsonObject review = await provider.ReviewAsync(new JsonObject { ["topic"] = "fixture" });
        author.Int("version").Should().Be(1);
        review.Str("verdict").Should().Be("CHANGES REQUIRED");
        runner.Requests.Should().HaveCount(4);
        ProcessRequest[] calls = runner.Requests.Where(request => request.Arguments.Contains("--print")).ToArray();
        calls.Should().HaveCount(2);
        calls.Select(request => request.WorkingDirectory).Should().OnlyHaveUniqueItems();
        foreach (ProcessRequest call in calls)
        {
            call.ClearEnvironment.Should().BeTrue();
            call.Timeout.Should().Be(TimeSpan.FromSeconds(600));
            call.Environment!.Keys.Should().NotContain(["DEVBOOK_GITHUB_TOKEN", "GITHUB_TOKEN", "ANTHROPIC_API_KEY"]);
            call.Environment["CLAUDE_CODE_OAUTH_TOKEN"].Should().Be("fixture-oauth-value");
            call.Arguments.Should().Contain(["--strict-mcp-config", "--restricted", "--safe-mode", "mcp__*", "dontAsk"]);
            call.Arguments[call.Arguments.ToList().IndexOf("--tools") + 1].Should().Be("WebSearch,WebFetch");
            call.Arguments[call.Arguments.ToList().IndexOf("--model") + 1].Should().Be(ClaudeProvider.DefaultModel);
            Directory.Exists(call.WorkingDirectory).Should().BeFalse();
        }
        runner.Requests.Where(request => request.Arguments.Contains("--version")).Should().OnlyContain(request => !request.Environment!.ContainsKey("CLAUDE_CODE_OAUTH_TOKEN"));
    }

    [Fact]
    public void QuotaPreservesReportedBoundariesAndDelaysUnknownReset()
    {
        DateTimeOffset now = DateTimeOffset.Parse("2026-10-30T12:00:00Z");
        ClaudeQuotaException weekly = ClaudeProvider.Quota("Weekly usage limit resets 2026-11-03T12:00:00Z", now)!;
        weekly.Kind.Should().Be("weekly");
        weekly.ResetAt.Should().Be(DateTimeOffset.Parse("2026-11-03T12:00:00Z"));
        ClaudeProvider.Quota("5-hour limit reset_at 1793448000", now)!.Kind.Should().Be("five_hour");
        ClaudeQuotaException unknown = ClaudeProvider.Quota("Usage limit reached", now)!;
        unknown.ResetAt.Should().BeNull();
        unknown.NextCheckAt.Should().Be(now.AddHours(24));
        ClaudeProvider.Quota("Transport failed", now).Should().BeNull();
    }

    private sealed class ProviderRunner : IProcessRunner
    {
        public List<ProcessRequest> Requests { get; } = [];
        public Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken = default)
        {
            Requests.Add(request with { Environment = request.Environment is null ? null : new Dictionary<string, string>(request.Environment) });
            if (request.Arguments.Contains("--version"))
            {
                return Task.FromResult(new ProcessResult(0, "2.1.285 (Claude Code)"u8.ToArray(), []));
            }
            int promptIndex = request.Arguments.ToList().IndexOf("--system-prompt");
            bool reviewer = request.Arguments[promptIndex + 1].Contains("independent, read-only", StringComparison.Ordinal);
            JsonObject structured = reviewer ? JsonData.ParseObject("""
                {"verdict":"CHANGES REQUIRED","overall_reason":"Fixture block","notes":[{"path":"Vault/Home/A/B.md","verdict":"CHANGES REQUIRED","summary":"Needs an explanation","page_type":"concept","current_text_evidence":[{"quote":"Current text","line_start":1,"reason":"Missing boundary"}],"target_resolution":"UNRESOLVED","split_suggestion":"Keep together","findings":[],"source_checks":[],"rejection_equivalence":[],"quality":{"accuracy":"PASS","clarity":"FAIL","rules_compliance":"PASS","question_quality":"NOT APPLICABLE","identity_safety":"NOT APPLICABLE"}}]}
                """) : new JsonObject { ["version"] = 1, ["edits"] = new JsonArray(), ["dispositions"] = new JsonArray(), ["feedback"] = new JsonArray() };
            var envelope = new JsonObject { ["modelUsage"] = new JsonObject { [ClaudeProvider.DefaultModel] = new JsonObject() }, ["structured_output"] = structured };
            return Task.FromResult(new ProcessResult(0, Encoding.UTF8.GetBytes(envelope.ToJsonString()), []));
        }
    }
}
