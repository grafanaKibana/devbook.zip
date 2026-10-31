using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public class ClaudeProviderException(string message, string evidence = "") : IOException(message)
{
    public string Evidence { get; } = ClaudeProvider.SafeEvidence(evidence);
}

public sealed class ClaudeQuotaException(string kind, DateTimeOffset? resetAt, DateTimeOffset nextCheckAt, string evidence = "")
    : ClaudeProviderException($"Claude subscription {kind} limit reached", evidence)
{
    public string Kind { get; } = kind;
    public DateTimeOffset? ResetAt { get; } = resetAt;
    public DateTimeOffset NextCheckAt { get; } = nextCheckAt;
}

public sealed class ClaudeProvider : IModelProvider
{
    public const string DefaultModel = "claude-sonnet-5-5";
    private static readonly SemaphoreSlim InvocationGate = new(1, 1);
    private static readonly JsonObject Protocol = LoadProtocol();
    private readonly JsonObject config;
    private readonly IProcessRunner runner;
    private readonly TimeProvider clock;
    private readonly Func<string, string?> environment;
    public int TimeoutSeconds { get; set; }
    public JsonArray Diagnostics { get; } = new();

    public ClaudeProvider(JsonObject config, IProcessRunner? runner = null, TimeProvider? clock = null, Func<string, string?>? environment = null)
    {
        this.config = config.Copy();
        this.runner = runner ?? new SystemProcessRunner();
        this.clock = clock ?? TimeProvider.System;
        this.environment = environment ?? Environment.GetEnvironmentVariable;
        TimeoutSeconds = config.Int("model_timeout_seconds", 900);
        if (config.Int("max_model_turns", 20) is < 2 or > 100 || TimeoutSeconds < 1)
        {
            throw new ArgumentException("Invalid Claude call budget.");
        }
        foreach (string host in config.Arr("allowed_source_hosts").Strings())
        {
            if (!Regex.IsMatch(host, @"^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$"))
            {
                throw new ArgumentException("Research hosts must be plain public hostnames.");
            }
        }
    }

    public Task<JsonObject> AuthorAsync(JsonObject payload, CancellationToken cancellationToken = default) => InvokeAsync("author", payload, cancellationToken);
    public Task<JsonObject> ReviewAsync(JsonObject payload, CancellationToken cancellationToken = default) => InvokeAsync("review", payload, cancellationToken);

    private static JsonObject LoadProtocol()
    {
        using Stream stream = typeof(ClaudeProvider).Assembly.GetManifestResourceStream("DevBook.Tooling.Improvement.ProviderProtocol.json")
            ?? throw new InvalidOperationException("Provider protocol resource missing.");
        return JsonNode.Parse(stream)!.AsObject();
    }

    private string Executable()
    {
        string configured = config.Str("claude_executable", "claude");
        IEnumerable<string> candidates = Path.IsPathRooted(configured) ? [configured]
            : (environment("PATH") ?? "/usr/local/bin:/usr/bin:/bin").Split(Path.PathSeparator).Select(path => Path.Combine(path, configured));
        string? found = candidates.FirstOrDefault(File.Exists);
        return found is null ? throw new ClaudeProviderException("Claude Code executable not found.") : Path.GetFullPath(found);
    }

    private async Task<JsonObject> InvokeAsync(string role, JsonObject payload, CancellationToken cancellationToken)
    {
        string oauth = environment("CLAUDE_CODE_OAUTH_TOKEN") ?? throw new ClaudeProviderException("CLAUDE_CODE_OAUTH_TOKEN is required for a live Claude invocation.");
        if (oauth.Length == 0)
        {
            throw new ClaudeProviderException("CLAUDE_CODE_OAUTH_TOKEN is empty.");
        }
        string promptInput = LegacyIdentity.CanonicalJson(payload);
        if (Encoding.UTF8.GetByteCount(promptInput) > 10 * 1024 * 1024)
        {
            throw new ClaudeProviderException("Claude input exceeds the 10 MiB maintenance limit.");
        }
        string model = config.Str("model", DefaultModel);
        string[] hosts = config.Arr("allowed_source_hosts").Strings().Distinct().Order(StringComparer.Ordinal).ToArray();
        string executable = Executable();
        await InvocationGate.WaitAsync(cancellationToken);
        string temporary = Path.Combine(Path.GetTempPath(), "devbook-claude-" + Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(temporary);
            if (!OperatingSystem.IsWindows())
            {
                File.SetUnixFileMode(temporary, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
            }
            string settings = Path.Combine(temporary, "settings.json");
            string mcp = Path.Combine(temporary, "mcp.json");
            string[] allowed = ["WebSearch", .. hosts.Select(host => $"WebFetch(domain:{host})")];
            File.WriteAllText(settings, new JsonObject
            {
                ["switchModelsOnFlag"] = false,
                ["autoContinueAtUsageLimit"] = false,
                ["permissions"] = new JsonObject { ["allow"] = new JsonArray(allowed.Select(value => (JsonNode?)JsonValue.Create(value)).ToArray()) }
            }.ToJsonString());
            File.WriteAllText(mcp, "{\"mcpServers\":{}}");
            var safeEnvironment = new Dictionary<string, string>
            {
                ["CLAUDE_CONFIG_DIR"] = temporary,
                ["TMPDIR"] = temporary,
                ["PATH"] = environment("PATH") ?? "/usr/local/bin:/usr/bin:/bin",
                ["LANG"] = environment("LANG") ?? "C.UTF-8",
                ["LC_ALL"] = environment("LC_ALL") ?? "C.UTF-8"
            };
            ProcessResult version = await runner.RunAsync(new ProcessRequest(executable, ["--version"], temporary, safeEnvironment, Timeout: TimeSpan.FromSeconds(15), ClearEnvironment: true), cancellationToken);
            Match match = Regex.Match(version.Stdout, @"(\d+)\.(\d+)\.(\d+)");
            if (version.ExitCode != 0 || !match.Success || Version.Parse(match.Value) < new Version(2, 1, 284))
            {
                throw new ClaudeProviderException("Claude Code 2.1.284 or newer is required.");
            }
            safeEnvironment["CLAUDE_CODE_OAUTH_TOKEN"] = oauth;
            safeEnvironment["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = model;
            JsonObject schema = Protocol.RequiredObject(role == "author" ? "proposal_schema" : "review_schema");
            string systemPrompt = Protocol.Str(role == "author" ? "author_prompt" : "review_prompt") + "\n\n"
                + Protocol.Str("research_prompt") + "\nApproved primary-source hosts: " + string.Join(", ", hosts);
            string[] arguments = ["--print", "--output-format", "json", "--json-schema", schema.ToJsonString(), "--model", model,
                "--safe-mode", "--restricted", "--tools", hosts.Length > 0 ? "WebSearch,WebFetch" : "WebSearch",
                "--allowedTools", string.Join(',', allowed), "--disallowed-tools", "mcp__*", "--mcp-config", mcp,
                "--strict-mcp-config", "--no-session-persistence", "--permission-mode", "dontAsk", "--permission-prompts", "none",
                "--setting-sources", "", "--settings", settings, "--system-prompt", systemPrompt,
                "--max-turns", config.Int("max_model_turns", 20).ToString(CultureInfo.InvariantCulture)];
            ProcessResult completed;
            try
            {
                completed = await runner.RunAsync(new ProcessRequest(executable, arguments, temporary, safeEnvironment,
                    Encoding.UTF8.GetBytes("<untrusted-input>\n" + promptInput + "\n</untrusted-input>\nReturn the requested JSON."),
                    TimeSpan.FromSeconds(TimeoutSeconds), ClearEnvironment: true), cancellationToken);
            }
            catch (TimeoutException)
            {
                throw new ClaudeProviderException($"Claude {role} invocation exceeded its bounded deadline.");
            }
            string evidence = (completed.Stderr + "\n" + (completed.ExitCode == 0 ? "" : completed.Stdout)).Replace(oauth, "[REDACTED]", StringComparison.Ordinal);
            if (completed.ExitCode != 0)
            {
                throw Quota(evidence, clock.GetUtcNow()) ?? new ClaudeProviderException($"Claude {role} invocation failed with exit code {completed.ExitCode}.", evidence);
            }
            JsonObject envelope;
            try
            {
                envelope = JsonData.ParseObject(completed.Stdout);
            }
            catch (Exception error) when (error is JsonException or InvalidDataException)
            {
                throw new ClaudeProviderException("Claude CLI returned a malformed JSON envelope.");
            }
            if (envelope.Bool("is_error") || envelope.Str("subtype") is "error" or "failed" || envelope.Str("type") == "error")
            {
                evidence += "\n" + string.Join('\n', new[] { "error", "message", "result" }.Select(key => envelope.Str(key)));
                evidence = evidence.Replace(oauth, "[REDACTED]", StringComparison.Ordinal);
                throw Quota(evidence, clock.GetUtcNow()) ?? new ClaudeProviderException($"Claude {role} invocation returned an error.", evidence);
            }
            JsonObject usage = envelope.Obj("modelUsage");
            if (usage.Count != 1 || !usage.ContainsKey(model))
            {
                throw new ClaudeProviderException("Claude result did not prove exclusive use of requested model " + model);
            }
            JsonObject structured = envelope["structured_output"] as JsonObject
                ?? (envelope.Str("result") is { Length: > 0 } result ? JsonData.ParseObject(result) : throw new ClaudeProviderException("Claude result omitted structured output."));
            ValidateSchema(structured, schema);
            if (role == "review" && (structured.Arr("notes").Count == 0
                || (structured.Str("verdict") == "CLEAN") != structured.Arr("notes").All(note => note.Str("verdict") == "CLEAN")))
            {
                throw new ClaudeProviderException("Reviewer overall verdict conflicts with per-note results.");
            }
            Diagnostics.Add(SafeDiagnostics(role, model, envelope));
            return structured.Copy();
        }
        finally
        {
            try
            {
                if (Directory.Exists(temporary))
                {
                    Directory.Delete(temporary, recursive: true);
                }
            }
            finally
            {
                InvocationGate.Release();
            }
        }
    }

    private static JsonObject SafeDiagnostics(string role, string model, JsonObject envelope)
    {
        JsonObject result = NumericCounts(envelope, ["duration_ms", "duration_api_ms", "num_turns"]);
        result["role"] = role;
        result["model"] = model;
        string subtype = envelope.Str("subtype");
        if (subtype is "success" or "error_max_turns" or "error_max_budget_usd" or "error_during_execution" or "error_max_structured_output_retries")
        {
            result["subtype"] = subtype;
        }
        string stopReason = envelope.Str("stop_reason");
        if (stopReason is "end_turn" or "max_tokens" or "stop_sequence" or "tool_use" or "pause_turn" or "refusal")
        {
            result["stop_reason"] = stopReason;
        }

        JsonObject usage = NumericCounts(envelope.Obj("usage"), ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"]);
        if (usage.Count != 0)
        {
            result["usage"] = usage;
        }
        JsonObject modelUsage = NumericCounts(envelope.Obj("modelUsage").Obj(model),
            ["inputTokens", "outputTokens", "cacheReadInputTokens", "cacheCreationInputTokens", "webSearchRequests"]);
        if (modelUsage.Count != 0)
        {
            result["model_usage"] = modelUsage;
        }
        if (envelope["permission_denials"] is JsonArray denials)
        {
            var counts = new JsonObject();
            foreach (JsonNode? denial in denials)
            {
                string name = denial is JsonObject item ? item.Str("tool_name") : "";
                string label = name is "WebSearch" or "WebFetch" ? name : "other";
                counts[label] = counts.Int(label) + 1;
            }
            result["permission_denial_counts"] = counts;
        }
        return result;
    }

    private static JsonObject NumericCounts(JsonObject source, IEnumerable<string> keys)
    {
        var result = new JsonObject();
        foreach (string key in keys)
        {
            if (source[key] is JsonValue value && value.TryGetValue(out long count) && count >= 0)
            {
                result[key] = value.DeepClone();
            }
        }
        return result;
    }

    public static ClaudeQuotaException? Quota(string evidence, DateTimeOffset now)
    {
        if (!Regex.IsMatch(evidence, "usage limit|quota|weekly limit|5[- ]hour limit|five[- ]hour limit", RegexOptions.IgnoreCase))
        {
            return null;
        }
        DateTimeOffset? reset = null;
        Match iso = Regex.Match(evidence, @"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})");
        if (iso.Success && DateTimeOffset.TryParse(iso.Value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out DateTimeOffset instant))
        {
            reset = instant.ToUniversalTime();
        }
        else
        {
            Match epoch = Regex.Match(evidence, @"(?:reset(?:_at| at)?|resets?)\D{0,24}(1\d{9})(?!\d)", RegexOptions.IgnoreCase);
            if (epoch.Success)
            {
                reset = DateTimeOffset.FromUnixTimeSeconds(long.Parse(epoch.Groups[1].Value, CultureInfo.InvariantCulture));
            }
        }
        string kind = Regex.IsMatch(evidence, "week(?:ly)?", RegexOptions.IgnoreCase) ? "weekly" : "five_hour";
        return new ClaudeQuotaException(kind, reset, reset ?? now.AddHours(24), evidence);
    }

    public static string SafeEvidence(string evidence)
    {
        string cleaned = Regex.Replace(evidence,
            @"(?:sk-ant-[A-Za-z0-9_-]+|(?:oauth|api)[_-]?(?:token|key)\s*[:=]\s*[^\s,;]+)",
            "[REDACTED]", RegexOptions.IgnoreCase).Trim();
        return cleaned[..Math.Min(4000, cleaned.Length)];
    }

    public static void ValidateSchema(JsonNode? value, JsonObject schema, string path = "$")
    {
        void Invalid(string rule) => throw new ClaudeProviderException($"Structured output violates schema at {path}: {rule}");
        if (schema.ContainsKey("const") && !JsonNode.DeepEquals(value, schema["const"]))
        {
            Invalid("const");
        }

        if (schema["enum"] is JsonArray allowed && !allowed.Any(item => JsonNode.DeepEquals(item, value)))
        {
            Invalid("enum");
        }

        if (schema["type"] is JsonNode type)
        {
            string[] types = type is JsonArray alternatives ? alternatives.Strings().ToArray() : [type.GetValue<string>()];
            bool Matches(string candidate) => candidate switch
            {
                "object" => value is JsonObject,
                "array" => value is JsonArray,
                "string" => value?.GetValueKind() == JsonValueKind.String,
                "boolean" => value?.GetValueKind() is JsonValueKind.True or JsonValueKind.False,
                "integer" => value?.GetValueKind() == JsonValueKind.Number && decimal.TryParse(value.ToJsonString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out _),
                "number" => value?.GetValueKind() == JsonValueKind.Number,
                "null" => value is null,
                _ => false
            };
            if (!types.Any(Matches))
            {
                Invalid("type");
            }
        }
        if (value is JsonObject map)
        {
            JsonObject properties = schema.Obj("properties");
            if (schema.Arr("required").Strings().Any(key => !map.ContainsKey(key)))
            {
                Invalid("required");
            }

            if (schema["additionalProperties"]?.GetValue<bool>() == false && map.Any(item => !properties.ContainsKey(item.Key)))
            {
                Invalid("additionalProperties");
            }

            foreach (KeyValuePair<string, JsonNode?> item in map)
            {
                if (properties[item.Key] is JsonObject child)
                {
                    ValidateSchema(item.Value, child, path + "." + item.Key);
                }
            }
        }
        else if (value is JsonArray array)
        {
            if (array.Count < schema.Int("minItems"))
            {
                Invalid("minItems");
            }

            if (schema.Bool("uniqueItems") && array.Select(item => LegacyIdentity.CanonicalJson(item)).Distinct().Count() != array.Count)
            {
                Invalid("uniqueItems");
            }

            if (schema["items"] is JsonObject child)
            {
                for (var index = 0; index < array.Count; index++)
                {
                    ValidateSchema(array[index], child, $"{path}[{index}]");
                }
            }
        }
        else if (value?.GetValueKind() == JsonValueKind.String)
        {
            string text = value.GetValue<string>();
            if (text.EnumerateRunes().Count() < schema.Int("minLength"))
            {
                Invalid("minLength");
            }

            if (schema.Str("pattern") is { Length: > 0 } pattern && !Regex.IsMatch(text, pattern))
            {
                Invalid("pattern");
            }
        }
        else if (value?.GetValueKind() == JsonValueKind.Number && schema["minimum"] is JsonNode minimum && value.GetValue<double>() < minimum.GetValue<double>())
        {
            Invalid("minimum");
        }
    }
}
