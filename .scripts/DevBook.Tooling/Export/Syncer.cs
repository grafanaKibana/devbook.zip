using System.Diagnostics;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

namespace DevBook.Tooling.Export;

public sealed class SyncException(string message, Exception? inner = null) : InvalidOperationException(message, inner);

public sealed class SyncerContext
{
    public SyncerContext(string root,
        Func<IReadOnlyList<string>, CancellationToken, Task<string>>? command = null,
        IReadOnlyDictionary<string, string>? gitEnvironment = null,
        TimeSpan? timeout = null)
    {
        Root = Path.GetFullPath(root);
        GitEnvironment = gitEnvironment;
        try
        {
            Deadline = DateTimeOffset.UtcNow + Syncer.ResolveTimeout(timeout, Environment.GetEnvironmentVariable("QUARTZ_SYNC_TIMEOUT"));
        }
        catch (ArgumentOutOfRangeException error)
        {
            throw new SyncException("Export timeout cannot fit the supported overall deadline range.", error);
        }
        Command = command ?? ((arguments, cancellation) => Syncer.RunCliAsync(
            Syncer.Executable(), ["vault=" + (Environment.GetEnvironmentVariable("OBSIDIAN_VAULT") ?? "Vault"), .. arguments],
            Root, null, Remaining, cancellation));
    }

    public string Root { get; }
    public IReadOnlyDictionary<string, string>? GitEnvironment { get; }
    public DateTimeOffset Deadline { get; }
    public Func<IReadOnlyList<string>, CancellationToken, Task<string>> Command { get; }
    public TimeSpan Remaining => Deadline > DateTimeOffset.UtcNow
        ? Deadline - DateTimeOffset.UtcNow : throw new SyncException("Quartz export deadline reached.");

    public byte[] GitBytes(params string[] arguments) => new SystemProcessRunner().RunAsync(new ProcessRequest(
        "git", arguments, Root, GitEnvironment, Timeout: Remaining, ClearEnvironment: GitEnvironment is not null))
        .GetAwaiter().GetResult().EnsureSuccess("Git export operation").Output;

    public string GitText(params string[] arguments) => Encoding.UTF8.GetString(GitBytes(arguments)).TrimEnd('\r', '\n');
    public string[] GitPaths(params string[] arguments) => Encoding.UTF8.GetString(GitBytes(arguments))
        .Split('\0', StringSplitOptions.RemoveEmptyEntries);
}

public static class Syncer
{
    public static readonly string[] Outputs = ["Web/content", "Web/quartz/styles/syncer", "Web/quartz/styles/custom.scss"];

    public static TimeSpan ResolveTimeout(TimeSpan? explicitTimeout, string? localOverride)
    {
        if (explicitTimeout is TimeSpan supplied)
        {
            return supplied > TimeSpan.Zero ? supplied : throw new SyncException("Export timeout must be positive.");
        }
        if (string.IsNullOrWhiteSpace(localOverride))
        {
            return TimeSpan.FromSeconds(600);
        }
        if (!double.TryParse(localOverride, NumberStyles.Float, CultureInfo.InvariantCulture, out double seconds)
            || !double.IsFinite(seconds) || seconds <= 0 || seconds > TimeSpan.MaxValue.TotalSeconds)
        {
            throw new SyncException("QUARTZ_SYNC_TIMEOUT must be finite positive seconds representable by TimeSpan.");
        }
        try
        {
            TimeSpan value = TimeSpan.FromSeconds(seconds);
            return value > TimeSpan.Zero ? value : throw new SyncException("QUARTZ_SYNC_TIMEOUT is too small to represent.");
        }
        catch (OverflowException error)
        {
            throw new SyncException("QUARTZ_SYNC_TIMEOUT exceeds the supported TimeSpan range.", error);
        }
    }

    private static string DiagnosticTail(string value)
    {
        string[] lines = RedactSecrets(value).Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n').Split('\n');
        string redacted = string.Join(Environment.NewLine, lines.TakeLast(40).Select(line => SafeText(line, 1000)));
        return redacted.Length > 4000 ? redacted[^4000..] : redacted;
    }

    public static async Task RunMaintenanceHookAsync(SyncerContext context, string hook,
        IProcessRunner? runner = null, TextWriter? standardOutput = null, TextWriter? standardError = null,
        CancellationToken cancellationToken = default)
    {
        ProcessResult result = await (runner ?? new SystemProcessRunner()).RunAsync(new ProcessRequest("bash", [hook], context.Root,
            new Dictionary<string, string> { ["DEVBOOK_QUARTZ_MAINTENANCE"] = "1" }, Timeout: context.Remaining), cancellationToken);
        string output = DiagnosticTail(result.Stdout);
        string error = DiagnosticTail(result.Stderr);
        if (output.Length != 0)
        {
            await (standardOutput ?? Console.Out).WriteLineAsync(output.AsMemory(), cancellationToken);
        }
        if (error.Length != 0)
        {
            await (standardError ?? Console.Error).WriteLineAsync(error.AsMemory(), cancellationToken);
        }
        if (result.ExitCode != 0)
        {
            throw new SyncException("Vault maintenance or validation failed; commit blocked.");
        }
    }

    public static bool IsSource(string path) => path.StartsWith("Vault/", StringComparison.Ordinal)
        && !path.StartsWith("Vault/.obsidian/", StringComparison.Ordinal);

    public static string[] StagedSource(SyncerContext context) => context.GitPaths(
        "diff", "--cached", "--name-only", "-z", "--no-renames").Where(IsSource).ToArray();

    public static void GuardSource(SyncerContext context)
    {
        string[] dirty = [.. context.GitPaths("diff", "--name-only", "-z", "--no-renames"),
            .. context.GitPaths("ls-files", "--others", "--exclude-standard", "-z")];
        if (dirty.Any(IsSource))
        {
            throw new SyncException("Vault contains unstaged, partially staged or untracked source. Stage all intended Vault changes before committing.");
        }
    }

    public static void GuardOutput(SyncerContext context)
    {
        string[] dirty = [.. context.GitPaths(["diff", "--name-only", "-z", "--", .. Outputs]),
            .. context.GitPaths(["diff", "--cached", "--name-only", "-z", "--", .. Outputs]),
            .. context.GitPaths(["ls-files", "--others", "--exclude-standard", "-z", "--", .. Outputs])];
        if (dirty.Length != 0)
        {
            throw new SyncException("Generated Quartz output already has changes. Commit or restore those separately before exporting.");
        }
    }

    public static Dictionary<string, byte[]> Snapshot(string root)
    {
        var result = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (string path in Directory.EnumerateFiles(Path.Combine(root, "Vault"), "*", SearchOption.AllDirectories))
        {
            string relative = Path.GetRelativePath(root, path).Replace('\\', '/');
            if (!IsSource(relative))
            {
                continue;
            }
            EnsureRegularPath(root, relative);
            result[relative] = SHA256.HashData(File.ReadAllBytes(path));
        }
        return result;
    }

    public static void EnsureRegularPath(string root, string relative)
    {
        if (!SafePath(relative))
        {
            throw new SyncException("Unsafe export path.");
        }
        string current = root;
        foreach (string part in relative.Split('/'))
        {
            current = Path.Combine(current, part);
            if (File.Exists(current) || Directory.Exists(current))
            {
                if ((File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                {
                    throw new SyncException($"Export paths cannot contain symlinks: {relative}");
                }
            }
        }
    }

    public static bool SafePath(string path) => !string.IsNullOrEmpty(path) && !path.StartsWith('/')
        && !path.Contains('\\') && !path.Any(char.IsControl)
        && path.Split('/').All(part => part.Length != 0 && part is not "." and not "..");

    public static bool SameSnapshot(IReadOnlyDictionary<string, byte[]> before, IReadOnlyDictionary<string, byte[]> after) =>
        before.Count == after.Count && before.All(item => after.TryGetValue(item.Key, out byte[]? hash)
            && item.Value.AsSpan().SequenceEqual(hash));

    public static FileStream AcquireLock(SyncerContext context)
    {
        string? disabled = Environment.GetEnvironmentVariable("DOTNET_SYSTEM_IO_DISABLEFILELOCKING");
        if (disabled is "1" || string.Equals(disabled, "true", StringComparison.OrdinalIgnoreCase)
            || (AppContext.TryGetSwitch("System.IO.DisableFileLocking", out bool switchedOff) && switchedOff))
        {
            throw new SyncException(".NET file locking is disabled; export cannot acquire its cross-process guard.");
        }
        string path = context.GitText("rev-parse", "--git-path", "quartz-sync.lock");
        path = Path.IsPathRooted(path) ? path : Path.Combine(context.Root, path);
        if (File.Exists(path) && (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
        {
            throw new SyncException("Export lock cannot be a symlink.");
        }
        try
        {
            return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        }
        catch (IOException error)
        {
            throw new SyncException("Another Quartz pre-commit sync is running; retry when it finishes.", error);
        }
    }

    public static string Executable()
    {
        string? overridden = Environment.GetEnvironmentVariable("OBSIDIAN_BIN");
        if (!string.IsNullOrWhiteSpace(overridden))
        {
            return overridden;
        }
        foreach (string directory in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator))
        {
            string candidate = Path.Combine(directory, "obsidian");
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }
        foreach (string name in new[] { "obsidian", "Obsidian" })
        {
            string candidate = "/Applications/Obsidian.app/Contents/MacOS/" + name;
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }
        throw new SyncException("Obsidian CLI not found. Open DevBook in Obsidian with CLI enabled, or set OBSIDIAN_BIN.");
    }

    public static async Task<string> RunCliAsync(string executable, IReadOnlyList<string> arguments, string root,
        IReadOnlyDictionary<string, string>? environment, TimeSpan timeout, CancellationToken cancellationToken = default)
    {
        var start = new ProcessStartInfo(executable)
        {
            WorkingDirectory = root,
            UseShellExecute = false,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        foreach (string argument in arguments)
        {
            start.ArgumentList.Add(argument);
        }
        if (environment is not null)
        {
            start.Environment.Clear();
            foreach (KeyValuePair<string, string> item in environment)
            {
                start.Environment[item.Key] = item.Value;
            }
        }
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(timeout);
        using var process = new Process { StartInfo = start };
        process.Start();
        Task<string> output = process.StandardOutput.ReadToEndAsync();
        Task<string> error = process.StandardError.ReadToEndAsync();
        try
        {
            // Keep the private stdin writer alive until native asynchronous CLI work finishes.
            await process.WaitForExitAsync(deadline.Token);
            string stdout = await output.WaitAsync(deadline.Token);
            string stderr = await error.WaitAsync(deadline.Token);
            if (process.ExitCode != 0)
            {
                string details = SafeText(stderr);
                try
                {
                    details = string.Join("; ", new[] { FailureDetails(JsonNode.Parse(stdout.Trim().Replace("=> ", "", StringComparison.Ordinal))), details }
                        .Where(value => value.Length != 0));
                }
                catch (JsonException)
                {
                    // A non-JSON failure still retains bounded stderr diagnostics.
                }
                throw new SyncException($"Obsidian CLI: exit {process.ExitCode}; {details}");
            }
            return stdout;
        }
        catch (OperationCanceledException errorValue)
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await process.WaitForExitAsync(cleanup.Token);
            if (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            throw new SyncException("Obsidian command timed out; inspect the disposable session or wait for local work to finish before retrying.", errorValue);
        }
    }

    private static string RedactSecrets(string value)
    {
        string result = value;
        result = Regex.Replace(result, @"(?i)\bBearer\s+[^\s,;]+", "Bearer [redacted]");
        result = Regex.Replace(result, "(?i)(\\b(?:[\\w-]*(?:token|password|secret)|authorization|api[_-]?key)[\"']?\\s*[:=]\\s*)(?:\"[^\"]*\"|'[^']*'|[^\\s,;]+)", "$1[redacted]");
        result = Regex.Replace(result, @"(?<=://)[^/@\s]+:[^/@\s]+@", "[redacted]@");
        result = Regex.Replace(result, @"\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b", "[redacted]");
        return result;
    }

    public static string SafeText(string? value, int limit = 500)
    {
        string result = RedactSecrets(value ?? "");
        result = string.Join(' ', result.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return result.Length <= limit ? result : result[..limit];
    }

    public static string FailureDetails(JsonNode? value)
    {
        if (value is not JsonObject)
        {
            return "";
        }
        var details = new List<string> { SafeText(value.Str("error")) };
        JsonNode data = value["data"] is JsonObject nested ? nested : value;
        foreach (JsonNode? failure in data.Arr("failures").Take(3))
        {
            if (failure is JsonObject)
            {
                details.Add(string.Join(": ", new[] { SafeText(failure.Str("vaultPath"), 240), SafeText(failure.Str("error")) }
                    .Where(part => part.Length != 0)));
            }
        }
        return string.Join("; ", details.Where(part => part.Length != 0));
    }

    public static async Task<JsonObject> CliAsync(SyncerContext context, IReadOnlyList<string> arguments,
        bool structured = true, CancellationToken cancellationToken = default)
    {
        string response = (await context.Command(arguments, cancellationToken)).Trim();
        if (arguments.Count > 0 && arguments[0] == "eval" && response.StartsWith("=> ", StringComparison.Ordinal))
        {
            response = response[3..];
        }
        JsonNode? value;
        try
        {
            value = JsonNode.Parse(response);
        }
        catch (JsonException error)
        {
            throw new SyncException($"{arguments[0]}: malformed JSON; export completion cannot be verified.", error);
        }
        if (value is not JsonObject result || (result["success"] is JsonValue success && success.TryGetValue(out bool flag) && !flag)
            || (structured && !result.Bool("success")))
        {
            throw new SyncException($"{arguments[0]}: Syncer reported failure; {FailureDetails(value)}");
        }
        return structured ? result["data"] as JsonObject
            ?? throw new SyncException($"{arguments[0]}: unexpected response; export completion cannot be verified.") : result;
    }

    private static async Task<JsonObject> LoadedVaultAsync(SyncerContext context, CancellationToken cancellationToken)
    {
        const string probe = "JSON.stringify({vaultPath:app.vault.adapter.getBasePath(),datacoreReady:!!window.datacore&&app.plugins.plugins.datacore?.core?.initialized===true,preserveSupported:JSON.stringify(app.setting.pluginTabs.find(t=>t.id==='quartz-syncer')?.getSettingDefinitions?.()??[]).includes('obsidianCommentMode'),syncerLoaded:!!app.plugins.plugins['quartz-syncer'],autoPublishActive:app.plugins.plugins['quartz-syncer']?.getEngineStatus?.()?.autoPublish})";
        JsonObject identity = await CliAsync(context, ["eval", "code=" + probe], false, cancellationToken);
        if (Path.GetFullPath(identity.Str("vaultPath")) != Path.Combine(context.Root, "Vault"))
        {
            throw new SyncException("Connected Obsidian vault does not match this checkout's Vault directory.");
        }
        if (!identity.Bool("syncerLoaded") || !identity.Bool("preserveSupported"))
        {
            throw new SyncException("The running Quartz Syncer does not support Preserve. Reload the installed PR build before committing.");
        }
        if (identity["autoPublishActive"] is not JsonValue state || !state.TryGetValue(out bool _))
        {
            throw new SyncException("Quartz Syncer's background publishing state cannot be verified.");
        }
        return identity;
    }

    private static async Task<JsonObject> ReloadAsync(SyncerContext context, CancellationToken cancellationToken)
    {
        await context.Command(["plugin:reload", "id=quartz-syncer"], cancellationToken);
        JsonObject identity = await LoadedVaultAsync(context, cancellationToken);
        if (identity.Bool("autoPublishActive"))
        {
            throw new SyncException("Quartz Syncer's background publisher is still active after reload; commit blocked.");
        }
        return identity;
    }

    public static async Task<(JsonObject Settings, JsonObject Identity)> ConfigureAsync(SyncerContext context,
        CancellationToken cancellationToken = default)
    {
        JsonObject identity = await LoadedVaultAsync(context, cancellationToken);
        JsonObject defaults = JsonData.ParseObject(await File.ReadAllTextAsync(Path.Combine(context.Root, ".scripts/quartz-syncer.defaults.json"), cancellationToken));
        JsonObject settings = await CliAsync(context, ["quartz-syncer:config", "action=list", "format=json"], cancellationToken: cancellationToken);
        if (identity.Bool("autoPublishActive"))
        {
            if (settings.Int("autoPublishInterval", -1) != 0)
            {
                await CliAsync(context, ["quartz-syncer:config", "action=set", "key=autoPublishInterval", "value=0", "format=json"], cancellationToken: cancellationToken);
            }
            identity = await ReloadAsync(context, cancellationToken);
            settings = await CliAsync(context, ["quartz-syncer:config", "action=list", "format=json"], cancellationToken: cancellationToken);
        }
        string target = Path.Combine(context.Root, "Web");
        string[] changed = defaults.Where(item => !JsonNode.DeepEquals(settings[item.Key], item.Value)).Select(item => item.Key).ToArray();
        bool DestinationChanged() => settings.Str("publishTarget") != "local"
            || !Path.IsPathRooted(settings.Str("quartzRepoPath")) || Path.GetFullPath(settings.Str("quartzRepoPath")) != target;
        if (changed.Length != 0 || DestinationChanged())
        {
            JsonObject cleared = await CliAsync(context, ["quartz-syncer:cache", "action=clear", "format=json"], cancellationToken: cancellationToken);
            if (!cleared.Bool("cleared"))
            {
                throw new SyncException("Compiled-note cache was not cleared; local configuration blocked.");
            }
            foreach (string key in changed)
            {
                string value = defaults[key] is JsonValue scalar && scalar.TryGetValue(out string? text)
                    ? text : defaults[key]!.ToJsonString();
                await CliAsync(context, ["quartz-syncer:config", "action=set", "key=" + key, "value=" + value, "format=json"], cancellationToken: cancellationToken);
            }
            if (DestinationChanged())
            {
                await CliAsync(context, ["quartz-syncer:repo", "action=set-local", "path=" + target, "format=json"], cancellationToken: cancellationToken);
            }
            identity = await ReloadAsync(context, cancellationToken);
        }
        settings = await CliAsync(context, ["quartz-syncer:config", "action=list", "format=json"], cancellationToken: cancellationToken);
        if (DestinationChanged() || defaults.Any(item => !JsonNode.DeepEquals(settings[item.Key], item.Value)))
        {
            throw new SyncException("Quartz Syncer's local configuration does not match this checkout; commit blocked.");
        }
        return (settings, identity);
    }

    public static async Task WaitForIndexesAsync(SyncerContext context, IReadOnlyDictionary<string, byte[]> source,
        CancellationToken cancellationToken = default)
    {
        HashSet<string> expected = source.Keys.Where(path => !path.Split('/').Any(part => part.StartsWith('.')))
            .Select(path => path[6..]).ToHashSet(StringComparer.Ordinal);
        HashSet<string> markdown = expected.Where(path => path.EndsWith(".md", StringComparison.OrdinalIgnoreCase)).ToHashSet(StringComparer.Ordinal);
        HashSet<string> published = markdown.Where(path => path.StartsWith("Home/", StringComparison.Ordinal))
            .Where(path => NoteDocument.Load(Path.Combine(context.Root, "Vault", path), context.Root).Frontmatter.TryGetValue("publish", out FrontmatterValue? value)
                && value.Value is not null and not false && !Equals(value.Value, "")).ToHashSet(StringComparer.Ordinal);
        bool MatchingStats(JsonNode? value, HashSet<string> paths)
        {
            if (value is not JsonObject values || !values.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(paths))
            {
                return false;
            }
            foreach (string path in paths)
            {
                var file = new FileInfo(Path.Combine(context.Root, "Vault", path));
                JsonNode? entry = values[path];
                if (entry is not JsonObject || entry["mtime"] is not JsonValue mtime || !mtime.TryGetValue(out double milliseconds)
                    || entry["size"]?.GetValue<long>() != file.Length
                    || Math.Abs(milliseconds - new DateTimeOffset(file.LastWriteTimeUtc).ToUnixTimeMilliseconds()) >= 1)
                {
                    return false;
                }
            }
            return true;
        }
        while (true)
        {
            _ = context.Remaining;
            JsonObject state = await CliAsync(context, ["eval", "code=" + SyncerProbes.IndexState], false, cancellationToken);
            foreach (string name in new[] { "inventory", "nativePublishPaths", "extendedPublishPaths" })
            {
                if (state[name] is not JsonArray list || list.Any(item => item is not JsonValue val || !val.TryGetValue(out string? _)))
                {
                    throw new SyncException("Unexpected metadata index response; commit blocked.");
                }
            }
            if (state.Bool("extendedReady") && expected.SetEquals(state.Arr("inventory").Strings())
                && MatchingStats(state["observedStats"], expected) && MatchingStats(state["metadataStats"], markdown)
                && markdown.All(path => JsonNode.DeepEquals(state["metadataStats"]?[path], state["observedStats"]?[path]))
                && published.SetEquals(state.Arr("nativePublishPaths").Strings()) && published.SetEquals(state.Arr("extendedPublishPaths").Strings()))
            {
                return;
            }
            await Task.Delay(TimeSpan.FromMilliseconds(Math.Min(250, context.Remaining.TotalMilliseconds)), cancellationToken);
        }
    }

    public static async Task ExportAsync(SyncerContext context, bool prepareLocalDates = false,
        CancellationToken cancellationToken = default)
    {
        (JsonObject settings, JsonObject identity) = await ConfigureAsync(context, cancellationToken);
        if (settings.Bool("useDatacore") && !identity.Bool("datacoreReady"))
        {
            throw new SyncException("Datacore is not initialized. Wait for indexing to finish before committing.");
        }
        Dictionary<string, byte[]> before = Snapshot(context.Root);
        if (prepareLocalDates)
        {
            Dictionary<string, byte[]> updated = NoteDates.PrepareLocal(context.Root, expectedHashes: before);
            foreach (KeyValuePair<string, byte[]> entry in updated)
            {
                before[entry.Key] = entry.Value;
            }
            if (!SameSnapshot(before, Snapshot(context.Root)))
            {
                throw new SyncException("Vault source changed while preparing note dates; commit blocked.");
            }
        }
        GuardSource(context);
        Log(context, "Verified local export destination and settings; starting publication.");
        await WaitForIndexesAsync(context, before, cancellationToken);
        await CliAsync(context, ["quartz-syncer:cache", "action=tree-refresh", "format=json"], cancellationToken: cancellationToken);
        bool refreshAssets = StagedSource(context).Any(path => path.StartsWith("Vault/Assets/", StringComparison.Ordinal)
            || !path.EndsWith(".md", StringComparison.OrdinalIgnoreCase));
        JsonObject result = refreshAssets
            ? await CliAsync(context, ["eval", "code=" + SyncerProbes.FullPublish], cancellationToken: cancellationToken)
            : await CliAsync(context, ["quartz-syncer:publish", "format=json"], cancellationToken: cancellationToken);
        if ((result["failures"] is not null && (result["failures"] is not JsonArray failures || failures.Count != 0)) || (result["skipped"] is not null && (result["skipped"] is not JsonValue skipped || !skipped.TryGetValue(out int skippedCount) || skippedCount != 0)))
        {
            throw new SyncException("Syncer publication skipped or failed notes; " + FailureDetails(result));
        }
        if (!SameSnapshot(before, Snapshot(context.Root)))
        {
            throw new SyncException("Vault source changed during export; refusing deletion. Stage the changes and retry.");
        }
        await WaitForIndexesAsync(context, before, cancellationToken);
        await CliAsync(context, ["quartz-syncer:delete", "force", "format=json"], cancellationToken: cancellationToken);
        JsonObject cleanup = await CliAsync(context, ["eval", "code=" + SyncerProbes.CompiledMediaCleanup], cancellationToken: cancellationToken);
        if (cleanup.Str("outcome") == "unchanged-or-withheld")
        {
            Log(context, "Native media cleanup: no changes or cleanup withheld by native safeguard.");
        }
        else if (cleanup.Str("outcome") == "cleaned" && cleanup.Int("filesDeleted", -1) >= 0
            && (cleanup["failures"] is null || cleanup["failures"] is JsonArray { Count: 0 }))
        {
            Log(context, $"Native media cleanup completed: {cleanup.Int("filesDeleted")} file deletions.");
        }
        else
        {
            throw new SyncException("compiled-media-cleanup: malformed or incomplete native cleanup result; " + FailureDetails(cleanup));
        }
        await CliAsync(context, ["quartz-syncer:cache", "action=tree-refresh", "format=json"], cancellationToken: cancellationToken);
        JsonObject status = await CliAsync(context, ["quartz-syncer:status", "format=json"], cancellationToken: cancellationToken);
        if (status.Int("unpublished", -1) != 0 || status.Int("deleted", -1) != 0)
        {
            throw new SyncException("Export still has unpublished or deleted notes; commit blocked.");
        }
        string content = Path.Combine(context.Root, "Web/content");
        if (Directory.Exists(content))
        {
            foreach (string path in Directory.EnumerateFiles(content, "*.md", SearchOption.AllDirectories))
            {
                string visible = Regex.Replace(await File.ReadAllTextAsync(path, cancellationToken), @"%%[\s\S]*?%%", "");
                if (Regex.IsMatch(visible, @"(?m)^\s*(`{3,}|~{3,})(?:datacore(?:js|jsx|ts|tsx)|dataview(?:js)?)\b"))
                {
                    throw new SyncException("Unrendered query block in generated content; commit blocked.");
                }
            }
        }
        if (!SameSnapshot(before, Snapshot(context.Root)))
        {
            throw new SyncException("Vault source changed during export. Review and stage the changes, then retry.");
        }
        GuardSource(context);
        string[] existing = Outputs.Where(path => File.Exists(Path.Combine(context.Root, path)) || Directory.Exists(Path.Combine(context.Root, path))
            || context.GitText("ls-files", "--", path).Length != 0).ToArray();
        if (existing.Length != 0)
        {
            context.GitBytes(["add", "-A", "--", .. existing]);
        }
        Log(context, "Export verified; generated output staged.");
    }

    public static void Log(SyncerContext context, string message)
    {
        string path = context.GitText("rev-parse", "--git-path", "quartz-syncer-publish.log");
        path = Path.IsPathRooted(path) ? path : Path.Combine(context.Root, path);
        File.AppendAllText(path, $"{DateTimeOffset.UtcNow:O} {SafeText(message)}\n");
    }

    public static async Task<int> RunAsync(string[] args)
    {
        if (args.Contains("--help"))
        {
            Console.WriteLine("SyncQuartz.cs [--configure-only] [--hook <path>] [--repo-root <path>]");
            return 0;
        }
        string? root = null;
        string? hook = null;
        bool configureOnly = false;
        try
        {
            for (var index = 0; index < args.Length; index++)
            {
                switch (args[index])
                {
                    case "--configure-only": configureOnly = true; break;
                    case "--hook": hook = args[++index]; break;
                    case "--repo-root": root = args[++index]; break;
                    default: throw new SyncException("Unknown sync-quartz argument.");
                }
            }
            root = Repository.FindRoot(root);
            var context = new SyncerContext(root);
            if (!configureOnly && StagedSource(context).Length == 0)
            {
                return 0;
            }
            using FileStream exportLock = AcquireLock(context);
            if (configureOnly)
            {
                await ConfigureAsync(context);
                Log(context, "Local Quartz Syncer configuration verified.");
                Console.WriteLine("Quartz Syncer configured for this checkout; no export or staging performed.");
                return 0;
            }
            GuardSource(context);
            GuardOutput(context);
            if (hook is not null)
            {
                await RunMaintenanceHookAsync(context, hook);
                GuardSource(context);
            }
            await ExportAsync(context, prepareLocalDates: true);
            Console.WriteLine("[pre-commit] Quartz export completed; generated output staged.");
            return 0;
        }
        catch (Exception error) when (error is SyncException or IOException or InvalidOperationException or IndexOutOfRangeException)
        {
            Console.Error.WriteLine("[pre-commit] " + SafeText(error.Message));
            return 1;
        }
    }
}
