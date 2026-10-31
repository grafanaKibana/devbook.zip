using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using System.Text.Json.Nodes;
using System.Text;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ProviderTests
{
    [Fact]
    public async Task AuthorAndReviewerUseSeparateRestrictedOAuthCalls()
    {
        // Arrange
        var runner = new ProviderProviderRunner();
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
        ClaudeProvider.DefaultModel.Should().Be("claude-opus-5-5");
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
    public async Task DiagnosticsRetainResearchCountsWithoutModelTextOrToolInputs()
    {
        // Arrange
        var runner = new ProviderProviderRunner
        {
            Metadata = JsonData.ParseObject("""
                {
                  "duration_ms": 1400,
                  "duration_api_ms": 1200,
                  "num_turns": 3,
                  "subtype": "success",
                  "stop_reason": "end_turn",
                  "usage": {"input_tokens": 100, "output_tokens": 20, "cost_usd": 2, "private": "secret-fixture"},
                  "modelUsage": {"claude-opus-5-5": {"inputTokens": 100, "outputTokens": 20, "webSearchRequests": 2, "costUSD": 2}},
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
    public async Task FailedCliReportsOnlyAClosedCategoryWithoutPrivateErrorText()
    {
        // Arrange
        const string secret = "sk-ant-oat-fixture-private-token";
        var envelope = new JsonObject
        {
            ["type"] = "result",
            ["subtype"] = "error_during_execution",
            ["terminal_reason"] = "api_error",
            ["is_error"] = true,
            ["errors"] = new JsonArray("Context length limit exceeded: private-note " + secret + " https://private-note.example/secret"),
            ["result"] = "authentication_error https://private-note.example/secret"
        };
        var runner = new ProviderProviderRunner { Failure = new ProcessResult(1, Encoding.UTF8.GetBytes(envelope.ToJsonString()), []) };
        var provider = new ClaudeProvider(new JsonObject { ["claude_executable"] = "/usr/bin/true" }, runner,
            environment: name => name == "CLAUDE_CODE_OAUTH_TOKEN" ? secret : null);

        // Act
        Func<Task> invoke = async () => await provider.ReviewAsync(new JsonObject { ["notes"] = "private-note" });

        // Assert
        var failure = await invoke.Should().ThrowAsync<ClaudeProviderException>();
        failure.Which.Message.Should().Be("Claude review invocation failed with exit code 1 (category: context_input_limit).");
        failure.Which.Message.Should().NotContain(secret).And.NotContain("private-note").And.NotContain("https://");
        provider.Diagnostics.Should().BeEmpty();
    }

    private sealed class ProviderProviderRunner : IProcessRunner
    {
        public List<ProcessRequest> Requests { get; } = [];
        public JsonObject Metadata { get; init; } = new();
        public ProcessResult? Failure { get; init; }
        public Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken = default)
        {
            Requests.Add(request with { Environment = request.Environment is null ? null : new Dictionary<string, string>(request.Environment) });
            if (request.Arguments.Contains("--version"))
            {
                return Task.FromResult(new ProcessResult(0, "2.1.285 (Claude Code)"u8.ToArray(), []));
            }
            if (Failure is not null)
            {
                return Task.FromResult(Failure);
            }
            int promptIndex = request.Arguments.ToList().IndexOf("--system-prompt");
            bool reviewer = request.Arguments[promptIndex + 1].Contains("independent, read-only", StringComparison.Ordinal);
            JsonObject structured = reviewer ? JsonData.ParseObject("""
                {"verdict":"CHANGES REQUIRED","change_checks":[],"overall_reason":"Fixture block","notes":[{"path":"Vault/Home/A/B.md","verdict":"CHANGES REQUIRED","summary":"Needs an explanation","page_type":"concept","current_text_evidence":[{"quote":"Current text","line_start":1,"reason":"Missing boundary"}],"target_resolution":"UNRESOLVED","split_suggestion":"Keep together","findings":[],"source_checks":[],"rejection_equivalence":[],"quality":{"accuracy":"PASS","clarity":"FAIL","rules_compliance":"PASS","question_quality":"NOT APPLICABLE","identity_safety":"NOT APPLICABLE"}}]}
                """) : new JsonObject { ["version"] = 1, ["edits"] = new JsonArray(), ["dispositions"] = new JsonArray(), ["feedback"] = new JsonArray() };
            var envelope = new JsonObject { ["modelUsage"] = new JsonObject { [ClaudeProvider.DefaultModel] = new JsonObject() }, ["structured_output"] = structured };
            foreach (KeyValuePair<string, JsonNode?> item in Metadata)
            {
                envelope[item.Key] = item.Value?.DeepClone();
            }
            return Task.FromResult(new ProcessResult(0, Encoding.UTF8.GetBytes(envelope.ToJsonString()), []));
        }
    }
    [Fact]
    public async Task PublicHttpsSourceNeedsNoDomainAllowlist()
    {
        // Arrange
        const string url = "https://independent-research.example/paper";

        // Act
        Uri accepted = await Runtime.ValidateSourceUrlAsync(url, resolver: PublicAnswers);

        // Assert
        accepted.AbsoluteUri.Should().Be(url);
    }

    [Theory]
    [InlineData("http://public.example/")]
    [InlineData("https://owner:secret@public.example/")]
    [InlineData("https://public.example:8443/")]
    public async Task UnsafeSourceUriIsRejectedBeforeResolution(string url)
    {
        // Arrange
        var resolutions = 0;
        Task<System.Net.IPAddress[]> Resolve(string host, CancellationToken token)
        {
            resolutions++;
            return PublicAnswers(host, token);
        }

        // Act
        Func<Task> validate = () => Runtime.ValidateSourceUrlAsync(url, resolver: Resolve);

        // Assert
        await validate.Should().ThrowAsync<UnsafeInput>();
        resolutions.Should().Be(0);
    }

    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("fe80::1")]
    [InlineData("93.184.216.34,10.0.0.1")]
    public async Task AnyNonPublicDnsAnswerRejectsTheEntireSource(string answers)
    {
        // Arrange
        Task<System.Net.IPAddress[]> Resolve(string host, CancellationToken token) => Task.FromResult(answers.Split(',').Select(System.Net.IPAddress.Parse).ToArray());

        // Act
        Func<Task> validate = () => Runtime.ValidateSourceUrlAsync("https://public.example/", resolver: Resolve);

        // Assert
        await validate.Should().ThrowAsync<UnsafeInput>();
    }

    [Fact]
    public async Task RedirectFromPublicToPrivateHostIsRejectedBeforeAnotherRequest()
    {
        // Arrange
        var requests = 0;
        using var transport = new SourceTransport(request =>
        {
            requests++;
            var response = new HttpResponseMessage(System.Net.HttpStatusCode.Redirect);
            response.Headers.Location = new Uri("https://private.example/secret");
            return response;
        });
        Task<System.Net.IPAddress[]> Resolve(string host, CancellationToken token) => host == "private.example"
            ? Task.FromResult(new[] { System.Net.IPAddress.Parse("169.254.169.254") }) : PublicAnswers(host, token);

        // Act
        Func<Task> fetch = () => Runtime.FetchPrimarySourceAsync("https://public.example/", resolver: Resolve, transport: transport);

        // Assert
        await fetch.Should().ThrowAsync<UnsafeInput>();
        requests.Should().Be(1);
    }

    [Fact]
    public async Task ConnectionResolutionRejectsDnsRebindingAfterInitialAcceptance()
    {
        // Arrange
        var resolutions = 0;
        Task<System.Net.IPAddress[]> Resolve(string host, CancellationToken token) => Task.FromResult(new[]
        {
            System.Net.IPAddress.Parse(++resolutions == 1 ? "93.184.216.34" : "10.0.0.1")
        });
        await Runtime.ValidateSourceUrlAsync("https://public.example/", resolver: Resolve);

        // Act
        Func<Task> connect = () => Runtime.ResolvePublicSourceAsync("public.example", resolver: Resolve);

        // Assert
        await connect.Should().ThrowAsync<UnsafeInput>();
        resolutions.Should().Be(2);
    }

    [Theory]
    [InlineData("application/pdf", 3)]
    [InlineData("text/plain", 1)]
    public async Task FetchRejectsUnsupportedMediaOrOversizedEvidence(string media, int maximum)
    {
        // Arrange
        using var transport = new SourceTransport(_ =>
        {
            var response = new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new ByteArrayContent("abc"u8.ToArray()) };
            response.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(media);
            return response;
        });

        // Act
        Func<Task> fetch = () => Runtime.FetchPrimarySourceAsync("https://public.example/", maximum, resolver: PublicAnswers, transport: transport);

        // Assert
        await fetch.Should().ThrowAsync<UnsafeInput>();
    }

    [Theory]
    [InlineData("Weekly usage limit resets 2026-11-03T12:00:00Z", "weekly", "2026-11-03T12:00:00Z")]
    [InlineData("5-hour limit reset_at 1793448000", "five_hour", "2026-10-31T12:00:00Z")]
    [InlineData("You’ve hit your limit", "unknown", null)]
    public void QuotaParserPreservesReportedBoundaryOrUsesUnknownBackoff(string message, string kind, string? expectedReset)
    {
        // Arrange
        DateTimeOffset now = DateTimeOffset.Parse("2026-10-30T12:00:00Z");

        // Act
        ClaudeQuotaException quota = ClaudeProvider.Quota(message, now)!;

        // Assert
        quota.Kind.Should().Be(kind);
        DateTimeOffset? boundary = expectedReset is null ? null : DateTimeOffset.Parse(expectedReset);
        quota.ResetAt.Should().Be(boundary);
        quota.NextCheckAt.Should().Be(boundary ?? now.AddHours(24));
    }

    private static Task<System.Net.IPAddress[]> PublicAnswers(string host, CancellationToken token) =>
        Task.FromResult(new[] { System.Net.IPAddress.Parse("93.184.216.34") });

    private sealed class SourceTransport(Func<HttpRequestMessage, HttpResponseMessage> response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => Task.FromResult(response(request));
    }

}
