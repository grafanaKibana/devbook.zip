using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

namespace DevBook.Tooling.Export;

public static class Desktop
{
    public static readonly string[] Plugins = ["datacore", "tabsdown", "obsidian-excalidraw-plugin", "quartz-syncer"];
    private static readonly string[] BundleFiles = ["main.js", "manifest.json", "styles.css"];
    internal const string RegistrationError = "Error: Command \"eval\" not found. It may require a plugin to be enabled.";
    internal static readonly string[] AppFlags = ["--use-mock-keychain", "--disable-background-networking",
        "--host-rules=MAP * 0.0.0.0, EXCLUDE localhost", "--disable-gpu", "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"];

    public static string RealPath(string path)
    {
        string absolute = Path.GetFullPath(path);
        string current = Path.GetPathRoot(absolute)!;
        foreach (string part in absolute[current.Length..].Split(Path.DirectorySeparatorChar, StringSplitOptions.RemoveEmptyEntries))
        {
            current = Path.Combine(current, part);
            FileSystemInfo info = Directory.Exists(current) ? new DirectoryInfo(current) : new FileInfo(current);
            if (info.LinkTarget is not null)
            {
                current = info.ResolveLinkTarget(true)?.FullName ?? throw new InvalidDataException("Cannot resolve export path.");
            }
        }
        return current;
    }

    public static Dictionary<string, string> ControlledEnvironment(string profile) => new(StringComparer.Ordinal)
    {
        ["PATH"] = "/usr/bin:/bin:/usr/sbin:/sbin",
        ["HOME"] = profile,
        ["TMPDIR"] = Path.Combine(profile, "tmp"),
        ["LANG"] = "en_US.UTF-8",
        ["HTTP_PROXY"] = "http://127.0.0.1:9",
        ["HTTPS_PROXY"] = "http://127.0.0.1:9",
        ["ALL_PROXY"] = "http://127.0.0.1:9",
        ["NO_PROXY"] = "localhost,127.0.0.1"
    };

    private static Version NumericVersion(string value) => Regex.IsMatch(value, @"^\d+\.\d+\.\d+$")
        && Version.TryParse(value, out Version? version) ? version
        : throw new InvalidDataException("Desktop export requires a numeric major.minor.patch application version.");

    private static string BundleProperty(string appBundle, string key)
    {
        ProcessResult result = new SystemProcessRunner().RunAsync(new ProcessRequest("/usr/bin/plutil",
            ["-extract", key, "raw", "-o", "-", Path.Combine(appBundle, "Contents/Info.plist")], appBundle))
            .GetAwaiter().GetResult().EnsureSuccess("Read Obsidian bundle metadata");
        return result.Stdout.Trim();
    }

    public static string ValidateAppVersion(string appBundle, string settings)
    {
        string text = BundleProperty(appBundle, "CFBundleShortVersionString");
        Version version = NumericVersion(text);
        foreach (string plugin in Plugins)
        {
            string relative = $"plugins/{plugin}/manifest.json";
            Syncer.EnsureRegularPath(settings, relative);
            string path = Path.Combine(settings, relative);
            if (!File.Exists(path))
            {
                throw new InvalidDataException($"Missing regular export plugin manifest: {plugin}");
            }
            string required = JsonData.ParseObject(File.ReadAllText(path)).Str("minAppVersion");
            if (version < NumericVersion(required))
            {
                throw new InvalidDataException($"Bundled Obsidian {text} is older than {plugin} minimum {required}; isolated export cannot use personal-profile updates.");
            }
        }
        return text;
    }

    public static Dictionary<string, byte[]> SourceHashes(string root)
    {
        var result = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (string name in Git.Paths(root, "ls-files", "-z", "--", "Vault").Where(Syncer.IsSource))
        {
            Syncer.EnsureRegularPath(root, name);
            string path = Path.Combine(root, name);
            if (!File.Exists(path))
            {
                throw new InvalidDataException($"Export source must be a regular file: {name}");
            }
            result[name] = System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(path));
        }
        return result;
    }

    private static Dictionary<string, DateTimeOffset> BaselineDates(string path)
    {
        if (!File.Exists(path))
        {
            return [];
        }
        if ((File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
        {
            throw new InvalidDataException("Generated timestamp baseline cannot be a symlink.");
        }
        string text = File.ReadAllText(path);
        Match frontmatter = Regex.Match(text, @"\A---\r?\n(.*?)\r?\n---(?:\r?\n|\z)", RegexOptions.Singleline);
        var result = new Dictionary<string, DateTimeOffset>(StringComparer.Ordinal);
        if (!frontmatter.Success)
        {
            return result;
        }
        foreach (Match match in Regex.Matches(frontmatter.Groups[1].Value, @"(?m)^(created|modified):[ \t]*(.+?)\s*$"))
        {
            if (!result.TryAdd(match.Groups[1].Value, DateTimeOffset.Parse(NoteDates.Timestamp(match.Groups[2].Value), CultureInfo.InvariantCulture)))
            {
                throw new InvalidDataException("Duplicate generated timestamp.");
            }
        }
        return result;
    }

    private static (string Sha, DateTimeOffset Timestamp) Commit(string root, string path, bool first = false)
    {
        string[] rows = Git.Text(root, "log", "--format=%H %ct", "--follow", "--", path)
            .Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (rows.Length == 0)
        {
            throw new InvalidDataException($"Tracked export source has no Git history: {path}");
        }
        string[] values = rows[first ? ^1 : 0].Split(' ');
        return (values[0], DateTimeOffset.FromUnixTimeSeconds(long.Parse(values[1], CultureInfo.InvariantCulture)));
    }

    public static void SetFileTimes(string path, DateTimeOffset created, DateTimeOffset modified)
    {
        if (!OperatingSystem.IsMacOS())
        {
            throw new PlatformNotSupportedException("Desktop export timestamp materialization requires macOS.");
        }
        if (!File.Exists(path) || (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
        {
            throw new InvalidDataException("Timestamp target must be a regular file.");
        }
        File.SetLastWriteTimeUtc(path, modified.UtcDateTime);
        File.SetCreationTimeUtc(path, created.UtcDateTime);
        var observed = new FileInfo(path);
        if (new DateTimeOffset(observed.CreationTimeUtc).ToUnixTimeMilliseconds() != created.ToUnixTimeMilliseconds()
            || new DateTimeOffset(observed.LastWriteTimeUtc).ToUnixTimeMilliseconds() != modified.ToUnixTimeMilliseconds())
        {
            throw new InvalidDataException($"Filesystem cannot preserve export timestamps: {Path.GetFileName(path)}");
        }
    }

    public static void MaterializeTimestamps(string root)
    {
        foreach (string name in SourceHashes(root).Keys)
        {
            (string sha, DateTimeOffset modified) = Commit(root, name);
            DateTimeOffset created = Commit(root, name, first: true).Timestamp;
            if (name.StartsWith("Vault/Home/", StringComparison.Ordinal) && name.EndsWith(".md", StringComparison.Ordinal))
            {
                string outputName = "Web/content/" + name["Vault/Home/".Length..];
                Dictionary<string, DateTimeOffset> dates = BaselineDates(Path.Combine(root, outputName));
                created = dates.GetValueOrDefault("created", created);
                if (dates.TryGetValue("modified", out DateTimeOffset oldModified))
                {
                    string history = Git.Text(root, "log", "-1", "--format=%H", "--", outputName);
                    if (history.Length != 0)
                    {
                        ProcessResult relation = new SystemProcessRunner().RunAsync(new ProcessRequest("git",
                            ["merge-base", "--is-ancestor", sha, history], root)).GetAwaiter().GetResult();
                        if (relation.ExitCode is not 0 and not 1)
                        {
                            throw new InvalidDataException("Cannot establish source/export timestamp ancestry.");
                        }
                        if (relation.ExitCode == 0)
                        {
                            modified = oldModified;
                        }
                    }
                }
            }
            SetFileTimes(Path.Combine(root, name), created, modified);
        }
    }

    public static void PrepareSettings(string original, string destination)
    {
        Directory.CreateDirectory(Path.Combine(destination, "plugins"));
        foreach (string plugin in Plugins)
        {
            string target = Path.Combine(destination, "plugins", plugin);
            Directory.CreateDirectory(target);
            foreach (string name in BundleFiles)
            {
                string relative = $"plugins/{plugin}/{name}";
                Syncer.EnsureRegularPath(original, relative);
                string source = Path.Combine(original, relative);
                if (!File.Exists(source))
                {
                    if (name == "styles.css")
                    {
                        continue;
                    }
                    throw new InvalidDataException($"Missing required export plugin bundle: {plugin}/{name}");
                }
                File.Copy(source, Path.Combine(target, name));
            }
        }
        File.WriteAllText(Path.Combine(destination, "community-plugins.json"), "[]");
        File.WriteAllText(Path.Combine(destination, "core-plugins.json"), "[\"canvas\",\"bases\"]");
        File.WriteAllText(Path.Combine(destination, "app.json"), "{\"alwaysUpdateLinks\":false,\"showUnsupportedFiles\":true,\"defaultViewMode\":\"preview\"}");
    }

    public static async Task<JsonObject> ExportCheckoutAsync(string root, string expectedHead, string appBundle,
        int timeoutSeconds = 600, CancellationToken cancellationToken = default)
    {
        if (!OperatingSystem.IsMacOS())
        {
            throw new PlatformNotSupportedException("The isolated desktop exporter requires macOS.");
        }
        if (timeoutSeconds is < 1 or > 1800)
        {
            throw new ArgumentOutOfRangeException(nameof(timeoutSeconds));
        }
        root = RealPath(root);
        appBundle = RealPath(appBundle);
        if (Git.Text(root, "rev-parse", "HEAD") != expectedHead
            || !Git.Text(root, "symbolic-ref", "--short", "HEAD").StartsWith("notes/automated-", StringComparison.Ordinal)
            || Git.Text(root, "status", "--porcelain", "--untracked-files=all").Length != 0)
        {
            throw new InvalidDataException("Desktop export requires the expected head of a clean dedicated managed notes/automated-* checkout.");
        }
        Dictionary<string, byte[]> sourceHashes = SourceHashes(root);
        string settings = Path.Combine(root, "Vault/.obsidian");
        Syncer.EnsureRegularPath(root, "Vault/.obsidian");
        if (!Directory.Exists(settings))
        {
            throw new InvalidDataException("Dedicated checkout must have a regular .obsidian directory.");
        }
        ValidateAppVersion(appBundle, settings);
        string index = Git.Text(root, "rev-parse", "--git-path", "index");
        index = Path.IsPathRooted(index) ? index : Path.Combine(root, index);
        string temporary = Path.Combine(root, ".desktop-export-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(temporary);
        string backup = Path.Combine(temporary, "settings");
        string profile = "/private/tmp/db-export-" + Guid.NewGuid().ToString("N")[..12];
        Directory.CreateDirectory(profile);
        try
        {
            if (Encoding.UTF8.GetByteCount(Path.Combine(profile, ".obsidian-cli.sock")) >= 104)
            {
                throw new InvalidDataException("Disposable Obsidian CLI socket path is too long.");
            }
            await File.WriteAllTextAsync(Path.Combine(temporary, "recovery.json"), new JsonObject
            {
                ["profile"] = profile,
                ["settings"] = backup
            }.ToJsonString(JsonData.Options), cancellationToken);
            string privateIndex = Path.Combine(temporary, "index");
            File.Copy(index, privateIndex);
            string ignore = Path.Combine(temporary, "ignore");
            await File.WriteAllTextAsync(ignore, "/Vault/.obsidian/**\n/.desktop-export-*/\n", cancellationToken);
            Dictionary<string, string> gitEnvironment = ControlledEnvironment(profile);
            gitEnvironment["GIT_INDEX_FILE"] = privateIndex;
            gitEnvironment["GIT_CONFIG_COUNT"] = "1";
            gitEnvironment["GIT_CONFIG_KEY_0"] = "core.excludesFile";
            gitEnvironment["GIT_CONFIG_VALUE_0"] = ignore;
            var context = new SyncerContext(root, gitEnvironment: gitEnvironment, timeout: TimeSpan.FromSeconds(timeoutSeconds));
            byte[] tracked = context.GitBytes("ls-files", "-z", "--", "Vault/.obsidian");
            if (tracked.Length != 0)
            {
                (await new SystemProcessRunner().RunAsync(new ProcessRequest("git", ["update-index", "--skip-worktree", "-z", "--stdin"],
                    root, gitEnvironment, tracked, context.Remaining, true), cancellationToken)).EnsureSuccess("Hide disposable settings from private index");
            }
            MaterializeTimestamps(root);
            var session = new DesktopSession(appBundle, profile, Path.Combine(root, "Vault"), context.Deadline);
            Directory.Move(settings, backup);
            JsonObject receipt;
            try
            {
                PrepareSettings(backup, settings);
                await session.StartAsync(cancellationToken);
                var scoped = new SyncerContext(root, session.CommandAsync, gitEnvironment, context.Remaining);
                receipt = await Receipt.ExportAsync(scoped, expectedHead, cancellationToken);
                if (!Syncer.SameSnapshot(sourceHashes, SourceHashes(root)))
                {
                    throw new InvalidDataException("Source changed during desktop export.");
                }
            }
            finally
            {
                try
                {
                    await session.CloseAsync();
                }
                catch (Exception error) when (error is IOException or InvalidOperationException or TimeoutException or OperationCanceledException)
                {
                    throw new InvalidDataException($"{error.Message}; original settings retained at {backup}; isolated profile retained at {profile}", error);
                }
                if (Directory.Exists(settings))
                {
                    Directory.Delete(settings, true);
                }
                Directory.Move(backup, settings);
            }
            if (!Syncer.SameSnapshot(sourceHashes, SourceHashes(root)))
            {
                throw new InvalidDataException("Source changed during desktop export.");
            }
            if (Git.Text(root, "diff", "--name-only", "--", "Vault/.obsidian").Length != 0)
            {
                throw new InvalidDataException("Original Obsidian settings were not restored exactly.");
            }
            Syncer.GuardSource(new SyncerContext(root));
            string[] outputs = [.. Syncer.Outputs, Receipt.PathName];
            outputs = outputs.Where(path => File.Exists(Path.Combine(root, path)) || Directory.Exists(Path.Combine(root, path))
                || Git.Text(root, "ls-files", "--", path).Length != 0).ToArray();
            Git.Run(root, ["add", "-A", "--", .. outputs]);
            Receipt.Validate(receipt, Receipt.IndexEntries(root));
            return receipt;
        }
        finally
        {
            if (!Directory.Exists(backup))
            {
                Directory.Delete(profile, true);
                Directory.Delete(temporary, true);
            }
        }
    }
}

internal sealed class DesktopSession
{
    private readonly string appBundle;
    private readonly string profile;
    private readonly string vault;
    private readonly string gui;
    private readonly string cli;
    private readonly string version;
    private readonly DateTimeOffset deadline;
    private int? pid;
    private bool launched;

    public DesktopSession(string appBundle, string profile, string vault, DateTimeOffset deadline)
    {
        this.appBundle = appBundle;
        this.profile = profile;
        this.vault = vault;
        this.deadline = deadline;
        ProcessResult metadata = new SystemProcessRunner().RunAsync(new ProcessRequest("/usr/bin/plutil",
            ["-convert", "json", "-o", "-", Path.Combine(appBundle, "Contents/Info.plist")], appBundle))
            .GetAwaiter().GetResult().EnsureSuccess("Read Obsidian executable identity");
        JsonObject info = JsonData.ParseObject(metadata.Stdout);
        string executable = info.Str("CFBundleExecutable");
        version = info.Str("CFBundleShortVersionString");
        if (executable.Length == 0 || Path.GetFileName(executable) != executable || !Regex.IsMatch(version, @"^\d+\.\d+\.\d+$"))
        {
            throw new InvalidDataException("Invalid Obsidian bundle executable/version.");
        }
        gui = Path.Combine(appBundle, "Contents/MacOS", executable);
        cli = Path.Combine(appBundle, "Contents/MacOS/obsidian-cli");
        if (!File.Exists(gui) || !File.Exists(cli))
        {
            throw new InvalidDataException("Obsidian bundle lacks the desktop or CLI executable.");
        }
    }

    private TimeSpan Remaining => deadline > DateTimeOffset.UtcNow ? deadline - DateTimeOffset.UtcNow
        : throw new SyncException("Desktop export deadline reached.");

    private async Task<int> IdentityAsync(CancellationToken cancellationToken = default)
    {
        string? target = new FileInfo(Path.Combine(profile, "SingletonLock")).LinkTarget;
        Match match = Regex.Match(target ?? "", @"-(\d+)$");
        if (!match.Success || !int.TryParse(match.Groups[1].Value, out int value) || value <= 1)
        {
            throw new IOException("Invalid disposable Obsidian process lock.");
        }
        ProcessResult result = await new SystemProcessRunner().RunAsync(new ProcessRequest("/bin/ps",
            ["-ww", "-p", value.ToString(CultureInfo.InvariantCulture), "-o", "command="], profile,
            Desktop.ControlledEnvironment(profile), Timeout: TimeSpan.FromSeconds(5), ClearEnvironment: true), cancellationToken);
        result.EnsureSuccess("Inspect disposable Obsidian process");
        string[] arguments = SplitArguments(result.Stdout.Trim());
        if (arguments.Length == 0 || Desktop.RealPath(arguments[0]) != Desktop.RealPath(gui)
            || !arguments.Contains("--user-data-dir=" + profile, StringComparer.Ordinal)
            || !arguments.Contains("vault=" + Path.GetFileName(vault), StringComparer.Ordinal))
        {
            throw new InvalidDataException("Obsidian process does not own the disposable profile and vault.");
        }
        return value;
    }

    private static string[] SplitArguments(string command)
    {
        var values = new List<string>();
        var current = new StringBuilder();
        char quote = '\0';
        bool escaped = false;
        foreach (char character in command)
        {
            if (escaped)
            {
                current.Append(character);
                escaped = false;
            }
            else if (character == '\\' && quote != '\'')
            {
                escaped = true;
            }
            else if (character == quote)
            {
                quote = '\0';
            }
            else if (quote == '\0' && character is '\'' or '"')
            {
                quote = character;
            }
            else if (quote == '\0' && char.IsWhiteSpace(character))
            {
                if (current.Length != 0)
                {
                    values.Add(current.ToString());
                    current.Clear();
                }
            }
            else
            {
                current.Append(character);
            }
        }
        if (quote != '\0' || escaped)
        {
            throw new InvalidDataException("Malformed disposable process command line.");
        }
        if (current.Length != 0)
        {
            values.Add(current.ToString());
        }
        return values.ToArray();
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.Combine(profile, "tmp"));
        var registry = new JsonObject
        {
            ["cli"] = true,
            ["frame"] = "hidden",
            ["insider"] = false,
            ["updateDisabled"] = true,
            ["vaults"] = new JsonObject
            {
                ["devbookexport"] = new JsonObject { ["path"] = vault, ["ts"] = 1760000000000L, ["open"] = true }
            }
        };
        await File.WriteAllTextAsync(Path.Combine(profile, "obsidian.json"), registry.ToJsonString(JsonData.Options), cancellationToken);
        await File.WriteAllTextAsync(Path.Combine(profile, "devbookexport.json"),
            "{\"x\":120,\"y\":120,\"width\":1200,\"height\":850,\"isMaximized\":false,\"devTools\":false,\"zoom\":0}", cancellationToken);
        Dictionary<string, string> environment = Desktop.ControlledEnvironment(profile);
        var arguments = new List<string> { "-na", appBundle };
        foreach (KeyValuePair<string, string> item in environment)
        {
            arguments.AddRange(["--env", item.Key + "=" + item.Value]);
        }
        arguments.AddRange(["--args", "--user-data-dir=" + profile, "vault=" + Path.GetFileName(vault), .. Desktop.AppFlags]);
        launched = true;
        (await new SystemProcessRunner().RunAsync(new ProcessRequest("/usr/bin/open", arguments, profile, environment,
            Timeout: TimeSpan.FromSeconds(Math.Min(15, Remaining.TotalSeconds)), ClearEnvironment: true), cancellationToken)).EnsureSuccess("Launch isolated Obsidian");
        while (true)
        {
            _ = Remaining;
            try
            {
                pid = await IdentityAsync(cancellationToken);
                if (File.Exists(Path.Combine(profile, ".obsidian-cli.sock")))
                {
                    await VerifyVaultAsync(cancellationToken);
                    await CommandAsync(["plugins:restrict", "off"], cancellationToken);
                    await VerifyVaultAsync(cancellationToken);
                    await WaitNativeIndexAsync(cancellationToken);
                    foreach (string plugin in Desktop.Plugins)
                    {
                        await CommandAsync(["plugin:enable", "id=" + plugin], cancellationToken);
                    }
                    await WaitPluginsAsync(cancellationToken);
                    return;
                }
            }
            catch (IOException)
            {
                // A missing process lock during startup is expected until the owned app registers.
            }
            await Task.Delay(TimeSpan.FromMilliseconds(Math.Min(250, Remaining.TotalMilliseconds)), cancellationToken);
        }
    }

    public async Task<string> CommandAsync(IReadOnlyList<string> arguments, CancellationToken cancellationToken)
    {
        if (pid is null || await IdentityAsync(cancellationToken) != pid)
        {
            throw new InvalidDataException("Disposable Obsidian process identity changed.");
        }
        return await Syncer.RunCliAsync(cli, ["vault=" + Path.GetFileName(vault), .. arguments], profile,
            Desktop.ControlledEnvironment(profile), Remaining, cancellationToken);
    }

    private static string Value(string response) => response.Trim().StartsWith("=> ", StringComparison.Ordinal) ? response.Trim()[3..] : response.Trim();

    private async Task VerifyVaultAsync(CancellationToken cancellationToken)
    {
        JsonObject registry = JsonData.ParseObject(await File.ReadAllTextAsync(Path.Combine(profile, "obsidian.json"), cancellationToken));
        string[] paths = registry.Obj("vaults").Select(item => Desktop.RealPath(item.Value.Str("path"))).ToArray();
        if (paths.Length != 1 || paths[0] != Desktop.RealPath(vault))
        {
            throw new InvalidDataException("Obsidian registry includes a vault outside the disposable export.");
        }
        while (true)
        {
            _ = Remaining;
            string response = Value(await CommandAsync(["eval", "code=JSON.stringify({vaultPath:app.vault.adapter.getBasePath()})"], cancellationToken));
            if (response == Desktop.RegistrationError)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(Math.Min(250, Remaining.TotalMilliseconds)), cancellationToken);
                continue;
            }
            JsonObject value;
            try
            {
                value = JsonData.ParseObject(response);
            }
            catch (JsonException error)
            {
                throw new InvalidDataException("Obsidian runtime vault identity response is invalid: " + Syncer.SafeText(response, 240), error);
            }
            if (Desktop.RealPath(value.Str("vaultPath")) != Desktop.RealPath(vault))
            {
                throw new InvalidDataException("Obsidian runtime vault differs from the disposable export.");
            }
            return;
        }
    }

    private async Task WaitNativeIndexAsync(CancellationToken cancellationToken)
    {
        const string probe = """
            JSON.stringify((()=>{
            const files=app.vault.getMarkdownFiles().filter(f=>!f.path.split('/').some(p=>p.startsWith('.')));
            return files.length>0&&files.every(f=>{
             const entry=app.metadataCache.fileCache[f.path];
             return entry?.size===f.stat.size&&entry?.mtime===f.stat.mtime&&
             Object.prototype.hasOwnProperty.call(app.metadataCache.resolvedLinks,f.path);
            });})())
            """;
        while (true)
        {
            _ = Remaining;
            string response = Value(await CommandAsync(["eval", "code=" + probe], cancellationToken));
            if (response == "true")
            {
                return;
            }
            if (response != "false" && response != Desktop.RegistrationError)
            {
                throw new InvalidDataException("Native metadata probe returned an invalid response: " + Syncer.SafeText(response, 240));
            }
            await Task.Delay(TimeSpan.FromMilliseconds(Math.Min(250, Remaining.TotalMilliseconds)), cancellationToken);
        }
    }

    private async Task WaitPluginsAsync(CancellationToken cancellationToken)
    {
        const string probe = """
            JSON.stringify({vaultPath:app.vault.adapter.getBasePath(),
            plugins:Object.keys(app.plugins.plugins).sort(),
            datacoreReady:app.plugins.plugins.datacore?.core?.initialized===true,
            syncerLoaded:!!app.plugins.plugins['quartz-syncer'],
            preserveSupported:JSON.stringify(app.setting.pluginTabs.find(t=>t.id==='quartz-syncer')?.getSettingDefinitions?.()??[]).includes('obsidianCommentMode')})
            """;
        string last = "not queried";
        while (true)
        {
            _ = Remaining;
            string response = Value(await CommandAsync(["eval", "code=" + probe], cancellationToken));
            try
            {
                JsonObject state = JsonData.ParseObject(response);
                if (state.Str("vaultPath") != vault)
                {
                    throw new InvalidDataException("Plugin readiness probe returned a different vault.");
                }
                bool exactPlugins = state["plugins"] is JsonArray plugins
                    && plugins.Strings().SequenceEqual(Desktop.Plugins.Order(StringComparer.Ordinal));
                if (state.Bool("syncerLoaded") && state.Bool("preserveSupported") && state.Bool("datacoreReady") && exactPlugins)
                {
                    return;
                }
                last = new JsonObject
                {
                    ["syncerLoaded"] = state.Bool("syncerLoaded"),
                    ["preserveSupported"] = state.Bool("preserveSupported"),
                    ["datacoreReady"] = state.Bool("datacoreReady"),
                    ["exactPlugins"] = exactPlugins
                }.ToJsonString();
            }
            catch (JsonException)
            {
                last = "invalid response";
            }
            if (Remaining <= TimeSpan.FromMilliseconds(1))
            {
                throw new InvalidDataException("Obsidian plugins did not become ready; last status: " + last);
            }
            await Task.Delay(TimeSpan.FromMilliseconds(Math.Min(500, Remaining.TotalMilliseconds)), cancellationToken);
        }
    }

    private static bool Alive(int value)
    {
        try
        {
            return !Process.GetProcessById(value).HasExited;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    public async Task CloseAsync()
    {
        using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(12));
        if (pid is null)
        {
            if (!launched)
            {
                return;
            }
            pid = await IdentityAsync(cleanup.Token);
        }
        if (!Alive(pid.Value))
        {
            return;
        }
        if (await IdentityAsync(cleanup.Token) != pid)
        {
            throw new InvalidDataException("Refusing to stop an unowned Obsidian process.");
        }
        foreach (string signal in new[] { "-TERM", "-KILL" })
        {
            if (await IdentityAsync(cleanup.Token) != pid)
            {
                throw new InvalidDataException("Refusing to stop an unowned Obsidian process.");
            }
            (await new SystemProcessRunner().RunAsync(new ProcessRequest("/bin/kill", [signal, pid.Value.ToString(CultureInfo.InvariantCulture)],
                profile, Desktop.ControlledEnvironment(profile), Timeout: TimeSpan.FromSeconds(2), ClearEnvironment: true), cleanup.Token)).EnsureSuccess("Stop owned Obsidian");
            DateTimeOffset until = DateTimeOffset.UtcNow + TimeSpan.FromSeconds(5);
            while (DateTimeOffset.UtcNow < until && !cleanup.IsCancellationRequested)
            {
                if (!Alive(pid.Value))
                {
                    return;
                }
                await Task.Delay(100, cleanup.Token);
            }
        }
        throw new InvalidDataException("Owned Obsidian process did not stop before cleanup.");
    }
}
