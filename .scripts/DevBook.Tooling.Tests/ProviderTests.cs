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
        // Arrange
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

        // Act
        JsonObject author = await provider.AuthorAsync(new JsonObject { ["topic"] = "fixture" });
        JsonObject review = await provider.ReviewAsync(new JsonObject { ["topic"] = "fixture" });

        // Assert
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
        provider.Diagnostics.Should().HaveCount(2);
        provider.Diagnostics[0]!.AsObject().Select(item => item.Key).Should().BeEquivalentTo("role", "model");
        provider.Diagnostics[1]!.Str("role").Should().Be("review");
    }

    [Fact]
    public async Task PrimaryDocumentationHostsAreAvailableWithoutAllowingLookalikes()
    {
        // Arrange
        string root = Repository.FindRoot(AppContext.BaseDirectory);
        JsonObject config = JsonData.ParseObject(await File.ReadAllTextAsync(Path.Combine(root, ".github/devbook-improvement.json")));
        config["claude_executable"] = "/usr/bin/true";
        var runner = new ProviderRunner();
        var provider = new ClaudeProvider(config, runner, environment: name => name == "CLAUDE_CODE_OAUTH_TOKEN" ? "fixture-oauth-value" : null);
        string[] hosts = config.Arr("allowed_source_hosts").Strings().ToArray();

        // Act
        await provider.AuthorAsync(new JsonObject());
        ProcessRequest call = runner.Requests.Single(request => request.Arguments.Contains("--print"));
        string allowedTools = call.Arguments[call.Arguments.ToList().IndexOf("--allowedTools") + 1];
        Func<Task> lookalike = async () => await Runtime.ValidateSourceUrlAsync("https://developers.openai.com.untrusted.example/docs", hosts);
        Func<Task> unrelated = async () => await Runtime.ValidateSourceUrlAsync("https://untrusted.example/docs", hosts);

        // Assert
        hosts.Should().Contain(["developers.openai.com", "platform.claude.com"]);
        allowedTools.Should().Contain("WebFetch(domain:developers.openai.com)").And.Contain("WebFetch(domain:platform.claude.com)");
        allowedTools.Should().NotContain("domain:*");
        await lookalike.Should().ThrowAsync<UnsafeInput>();
        await unrelated.Should().ThrowAsync<UnsafeInput>();
    }

    [Fact]
    public async Task DiagnosticsRetainResearchCountsWithoutModelTextOrToolInputs()
    {
        // Arrange
        var runner = new ProviderRunner
        {
            Metadata = JsonData.ParseObject("""
                {
                  "duration_ms": 1400,
                  "duration_api_ms": 1200,
                  "num_turns": 3,
                  "subtype": "success",
                  "stop_reason": "end_turn",
                  "usage": {"input_tokens": 100, "output_tokens": 20, "cost_usd": 2, "private": "secret-fixture"},
                  "modelUsage": {"claude-sonnet-5-5": {"inputTokens": 100, "outputTokens": 20, "webSearchRequests": 2, "costUSD": 2}},
                  "permission_denials": [
                    {"tool_name": "WebFetch", "tool_input": {"url": "https://private-note.example/secret-fixture"}},
                    {"tool_name": "WebFetch", "tool_input": {"prompt": "secret-fixture"}},
                    {"tool_name": "secret-fixture", "tool_input": "secret-fixture"}
                  ],
                  "result": "private-note and secret-fixture",
                  "session_id": "secret-fixture"
                }
                """)
        };
        var provider = new ClaudeProvider(new JsonObject { ["claude_executable"] = "/usr/bin/true" }, runner,
            environment: name => name == "CLAUDE_CODE_OAUTH_TOKEN" ? "fixture-oauth-value" : null);

        // Act
        await provider.AuthorAsync(new JsonObject { ["notes"] = "private-note" });
        JsonObject diagnostic = provider.Diagnostics.Single()!.AsObject();

        // Assert
        diagnostic.Str("role").Should().Be("author");
        diagnostic.Str("model").Should().Be(ClaudeProvider.DefaultModel);
        diagnostic.Int("duration_ms").Should().Be(1400);
        diagnostic.Int("num_turns").Should().Be(3);
        diagnostic.Str("stop_reason").Should().Be("end_turn");
        diagnostic.Obj("usage").Int("input_tokens").Should().Be(100);
        diagnostic.Obj("model_usage").Int("webSearchRequests").Should().Be(2);
        diagnostic.Obj("permission_denial_counts").Int("WebFetch").Should().Be(2);
        diagnostic.Obj("permission_denial_counts").Int("other").Should().Be(1);
        diagnostic.ToJsonString().Should().NotContain("private-note").And.NotContain("secret-fixture")
            .And.NotContain("tool_input").And.NotContain("session_id").And.NotContain("cost").And.NotContain("result");
    }

    [Fact]
    public void QuotaPreservesReportedBoundariesAndDelaysUnknownReset()
    {
        // Arrange
        DateTimeOffset now = DateTimeOffset.Parse("2026-10-30T12:00:00Z");

        // Act
        ClaudeQuotaException weekly = ClaudeProvider.Quota("Weekly usage limit resets 2026-11-03T12:00:00Z", now)!;
        ClaudeQuotaException fiveHour = ClaudeProvider.Quota("5-hour limit reset_at 1793448000", now)!;
        ClaudeQuotaException unknown = ClaudeProvider.Quota("Usage limit reached", now)!;
        ClaudeQuotaException? unrelatedFailure = ClaudeProvider.Quota("Transport failed", now);

        // Assert
        weekly.Kind.Should().Be("weekly");
        weekly.ResetAt.Should().Be(DateTimeOffset.Parse("2026-11-03T12:00:00Z"));
        fiveHour.Kind.Should().Be("five_hour");
        unknown.ResetAt.Should().BeNull();
        unknown.NextCheckAt.Should().Be(now.AddHours(24));
        unrelatedFailure.Should().BeNull();
    }

    private sealed class ProviderRunner : IProcessRunner
    {
        public List<ProcessRequest> Requests { get; } = [];
        public JsonObject Metadata { get; init; } = new();
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
            foreach (KeyValuePair<string, JsonNode?> item in Metadata)
            {
                envelope[item.Key] = item.Value?.DeepClone();
            }
            return Task.FromResult(new ProcessResult(0, Encoding.UTF8.GetBytes(envelope.ToJsonString()), []));
        }
    }
}
