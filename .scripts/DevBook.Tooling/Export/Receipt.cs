using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public sealed record GitTreeEntry(string Path, string Mode, string Type, string Sha);
public sealed record RemoteExportReceipt(JsonObject Receipt, bool SourcesCurrent);
public sealed class StaleExportPolicyException(string message) : IOException(message);

public static class Receipt
{
    public const string PathName = ".devbook-improvement/syncer-export.json";
    public static readonly string[] NativeEntrypoints = ["SyncExport", "SyncQuartz", "ValidateVault",
        "MigrateQuestionCalloutsToQard", "NoteDates", "GenerateRoadmap", "SyncFolderRollupFrontmatter"];
    public static readonly string[] Plugins = ["quartz-syncer", "datacore", "tabsdown", "obsidian-excalidraw-plugin"];
    private static readonly string[] RequiredPolicy = [".scripts/global.json", ".scripts/quartz-syncer.defaults.json",
        ".scripts/DevBook.Tooling/DevBook.Tooling.csproj", ".scripts/DevBook.Tooling/Program.cs", ".scripts/DevBook.Tooling/Export/Receipt.cs",
        ".scripts/DevBook.Tooling/Export/Syncer.cs", ".scripts/DevBook.Tooling/Export/Desktop.cs",
        .. NativeEntrypoints.Select(name => $".scripts/DevBook.Tooling/Scripts/{name}.cs"),
        .. Plugins.SelectMany(plugin => new[] { $"Vault/.obsidian/plugins/{plugin}/main.js", $"Vault/.obsidian/plugins/{plugin}/manifest.json" })];

    public static IReadOnlyList<string> RequiredPolicyPaths => RequiredPolicy;

    public static bool IsExportPath(string path) => Syncer.SafePath(path) && (path == PathName
        || Syncer.Outputs.Any(prefix => path == prefix || path.StartsWith(prefix + "/", StringComparison.Ordinal)));

    public static bool NeedsExport(IReadOnlyDictionary<string, string> before, IReadOnlyDictionary<string, string> candidate) =>
        candidate.Any(item => item.Key.StartsWith("Vault/Home/", StringComparison.Ordinal) && item.Key.EndsWith(".md", StringComparison.Ordinal)
            && (!before.TryGetValue(item.Key, out string? old) || old != item.Value));

    public static bool IsPolicyPath(string path)
    {
        if (!Syncer.SafePath(path))
        {
            return false;
        }
        if (RequiredPolicy.Contains(path, StringComparer.Ordinal))
        {
            return true;
        }
        if (path.StartsWith(".scripts/DevBook.Tooling/", StringComparison.Ordinal))
        {
            string[] parts = path.Split('/');
            return !parts.Contains("bin", StringComparer.Ordinal) && !parts.Contains("obj", StringComparer.Ordinal)
                && (path.EndsWith(".cs", StringComparison.Ordinal) || path.EndsWith(".csproj", StringComparison.Ordinal)
                    || path.EndsWith(".json", StringComparison.Ordinal) || path.EndsWith(".props", StringComparison.Ordinal)
                    || path.EndsWith(".targets", StringComparison.Ordinal));
        }
        return Plugins.Any(plugin => path == $"Vault/.obsidian/plugins/{plugin}/styles.css"
            || path == $"Vault/.obsidian/plugins/{plugin}/build-info.json");
    }

    public static JsonObject Make(IEnumerable<GitTreeEntry> entries)
    {
        var sources = new JsonObject();
        var outputs = new JsonObject();
        var policy = new JsonObject();
        foreach (GitTreeEntry entry in entries)
        {
            if (!Syncer.SafePath(entry.Path))
            {
                throw new InvalidDataException("Unsafe Git tree path.");
            }
            if (entry.Type == "tree")
            {
                continue;
            }
            JsonObject? group = IsPolicyPath(entry.Path) ? policy
                : Syncer.IsSource(entry.Path) ? sources : entry.Path != PathName && IsExportPath(entry.Path) ? outputs : null;
            if (group is null)
            {
                continue;
            }
            if (entry.Type != "blob" || entry.Mode is not "100644" and not "100755"
                || !Regex.IsMatch(entry.Sha, "^(?:[a-f0-9]{40}|[a-f0-9]{64})$"))
            {
                throw new InvalidDataException($"Export input/output must be a regular Git blob: {entry.Path}");
            }
            if (group.ContainsKey(entry.Path))
            {
                throw new InvalidDataException($"Duplicate Git tree path: {entry.Path}");
            }
            group[entry.Path] = new JsonObject { ["sha"] = entry.Sha, ["mode"] = entry.Mode };
        }
        if (sources.Count == 0 || outputs.Count == 0 || RequiredPolicy.Any(path => !policy.ContainsKey(path)))
        {
            throw new InvalidDataException("Incomplete source, generated output or native Syncer policy tree. Update the managed topic base before exporting.");
        }
        return new JsonObject { ["version"] = 1, ["sources"] = sources, ["outputs"] = outputs, ["policy"] = policy };
    }

    public static bool IsLegacyPolicy(JsonObject receipt) => receipt["policy"] is JsonObject policy
        && policy.Keys().Any(path => path.EndsWith(".py", StringComparison.Ordinal));

    public static bool Validate(JsonObject receipt, IEnumerable<GitTreeEntry> entries)
    {
        if (IsLegacyPolicy(receipt))
        {
            throw new StaleExportPolicyException("The historical Python export receipt is preserved but requires a new genuine native export.");
        }
        if (!JsonNode.DeepEquals(receipt, Make(entries)))
        {
            throw new InvalidDataException("Syncer export receipt is missing or stale for this source/output/policy tree.");
        }
        return true;
    }

    public static GitTreeEntry[] Entries(JsonArray entries) => entries.Select(item => item is JsonObject entry
        ? new GitTreeEntry(entry.Str("path"), entry.Str("mode"), entry.Str("type"), entry.Str("sha"))
        : throw new InvalidDataException("Git tree entry must be an object.")).ToArray();

    public static GitTreeEntry[] TreeEntries(string root, string reference = "HEAD") => TreeEntries(new SyncerContext(root), reference);

    public static GitTreeEntry[] TreeEntries(SyncerContext context, string reference = "HEAD") =>
        Encoding.UTF8.GetString(context.GitBytes("ls-tree", "-rz", "--full-tree", reference))
            .Split('\0', StringSplitOptions.RemoveEmptyEntries).Select(record =>
            {
                string[] parts = record.Split('\t', 2);
                string[] header = parts[0].Split(' ');
                if (parts.Length != 2 || header.Length != 3)
                {
                    throw new InvalidDataException("Malformed Git tree.");
                }
                return new GitTreeEntry(parts[1], header[0], header[1], header[2]);
            }).ToArray();

    public static GitTreeEntry[] IndexEntries(string root) => IndexEntries(new SyncerContext(root));

    public static GitTreeEntry[] IndexEntries(SyncerContext context) =>
        Encoding.UTF8.GetString(context.GitBytes("ls-files", "--stage", "-z"))
            .Split('\0', StringSplitOptions.RemoveEmptyEntries).Select(record =>
            {
                string[] parts = record.Split('\t', 2);
                string[] header = parts[0].Split(' ');
                if (parts.Length != 2 || header.Length != 3 || header[2] != "0")
                {
                    throw new InvalidDataException("Unresolved index conflicts or malformed Git index.");
                }
                return new GitTreeEntry(parts[1], header[0], "blob", header[1]);
            }).ToArray();

    public static async Task<RemoteExportReceipt> RemoteAsync(IGitHubApi api, string headSha, CancellationToken cancellationToken = default)
    {
        if (!Regex.IsMatch(headSha, "^(?:[a-f0-9]{40}|[a-f0-9]{64})$"))
        {
            throw new InvalidDataException("Invalid export source head.");
        }
        JsonNode? response = await api.RequestAsync("GET", $"/git/trees/{headSha}?recursive=1", cancellationToken: cancellationToken);
        if (response is not JsonObject tree || tree["truncated"] is not JsonValue value || !value.TryGetValue(out bool truncated)
            || truncated || tree["tree"] is not JsonArray items)
        {
            throw new InvalidDataException("Complete remote Git tree is required to verify the Syncer receipt.");
        }
        GitTreeEntry[] entries = Entries(items);
        GitTreeEntry[] receipts = entries.Where(entry => entry.Path == PathName).ToArray();
        if (receipts.Length != 1 || receipts[0].Mode != "100644" || receipts[0].Type != "blob")
        {
            throw new InvalidDataException("Official Syncer export receipt is missing.");
        }
        JsonNode? blob = await api.RequestAsync("GET", $"/git/blobs/{receipts[0].Sha}", cancellationToken: cancellationToken);
        if (blob.Str("encoding") != "base64" || blob.Str("content").Length > 8_000_000)
        {
            throw new InvalidDataException("Invalid or oversized receipt blob.");
        }
        JsonObject receipt = JsonData.ParseObject(Encoding.UTF8.GetString(Convert.FromBase64String(blob.Str("content"))));
        if (IsLegacyPolicy(receipt))
        {
            throw new StaleExportPolicyException("Historical export policy requires a new genuine native export; its receipt remains preserved.");
        }
        JsonObject current = Make(entries);
        JsonObject oldSources = receipt.RequiredObject("sources");
        if (oldSources.Count == 0)
        {
            throw new InvalidDataException("Invalid historical source binding.");
        }
        var historical = entries.Where(entry => !current.Obj("sources").ContainsKey(entry.Path)).ToList();
        foreach (KeyValuePair<string, JsonNode?> item in oldSources)
        {
            if (!Syncer.IsSource(item.Key) || !Syncer.SafePath(item.Key) || item.Value is not JsonObject source
                || source.Count != 2 || !source.ContainsKey("sha") || !source.ContainsKey("mode"))
            {
                throw new InvalidDataException("Invalid historical source entry.");
            }
            historical.Add(new GitTreeEntry(item.Key, source.Str("mode"), "blob", source.Str("sha")));
        }
        Validate(receipt, historical);
        return new RemoteExportReceipt(receipt, JsonNode.DeepEquals(oldSources, current["sources"]));
    }

    public static bool Verify(string root, string baseRef, string headRef)
    {
        if (!headRef.StartsWith("notes/automated-", StringComparison.Ordinal))
        {
            return false;
        }
        var context = new SyncerContext(root);
        if (!context.GitPaths("diff", "--name-only", "-z", baseRef, "HEAD", "--", "Vault/Home").Any(path => path.EndsWith(".md", StringComparison.Ordinal)))
        {
            return false;
        }
        JsonObject receipt;
        try
        {
            receipt = JsonData.ParseObject(Encoding.UTF8.GetString(context.GitBytes("show", "HEAD:" + PathName)));
            Validate(receipt, TreeEntries(context));
        }
        catch (Exception error) when (error is IOException or InvalidOperationException or JsonException)
        {
            throw new InvalidDataException("Official Quartz export required before merge. Resume the normal improvement workflow or run SyncExport.cs export --expected-head "
                + context.GitText("rev-parse", "HEAD") + " in a clean dedicated checkout with its Vault open in Obsidian.", error);
        }
        return true;
    }

    public static async Task<JsonObject> ExportAsync(SyncerContext context, string expectedHead,
        CancellationToken cancellationToken = default)
    {
        if (context.GitText("rev-parse", "HEAD") != expectedHead)
        {
            throw new InvalidDataException("Checkout HEAD differs from expected PR head.");
        }
        if (!context.GitText("symbolic-ref", "--short", "HEAD").StartsWith("notes/automated-", StringComparison.Ordinal)
            || context.GitText("status", "--porcelain", "--untracked-files=all").Length != 0)
        {
            throw new InvalidDataException("Official export requires a clean dedicated managed notes/automated-* checkout.");
        }
        JsonObject original = Make(TreeEntries(context));
        using FileStream exportLock = Syncer.AcquireLock(context);
        Syncer.GuardSource(context);
        Syncer.GuardOutput(context);
        await Syncer.ExportAsync(context, prepareLocalDates: false, cancellationToken);
        JsonObject current = Make(IndexEntries(context));
        if (!JsonNode.DeepEquals(current["sources"], original["sources"]) || !JsonNode.DeepEquals(current["policy"], original["policy"]))
        {
            throw new InvalidDataException("Source or export policy changed during official export.");
        }
        if (context.GitText("rev-parse", "HEAD") != expectedHead)
        {
            throw new InvalidDataException("Checkout HEAD changed during official export.");
        }
        if (context.GitPaths("diff", "--name-only", "-z", "--cached", "HEAD").Any(path => !IsExportPath(path))
            || context.GitPaths("diff", "--name-only", "-z").Length != 0)
        {
            throw new InvalidDataException("Export changed files outside generated output boundaries or left unstaged tracked changes.");
        }
        Syncer.GuardSource(context);
        Syncer.EnsureRegularPath(context.Root, PathName);
        string destination = Path.Combine(context.Root, PathName);
        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        await File.WriteAllTextAsync(destination, current.ToJsonString(JsonData.Options) + "\n", cancellationToken);
        context.GitBytes("add", "--", PathName);
        Validate(current, IndexEntries(context));
        return current;
    }

    public static async Task<int> RunAsync(string[] args)
    {
        if (args.Length == 0 || args.Contains("--help"))
        {
            Console.WriteLine("SyncExport.cs verify --base-ref <ref> [--head-ref <branch>] | export --expected-head <sha> [--repo-root <path>]");
            return args.Length == 0 ? 2 : 0;
        }
        try
        {
            var values = new Dictionary<string, string>(StringComparer.Ordinal);
            for (var index = 1; index < args.Length; index += 2)
            {
                values.Add(args[index], args[index + 1]);
            }
            string root = Repository.FindRoot(values.GetValueOrDefault("--repo-root"));
            if (args[0] == "verify")
            {
                bool required = Verify(root, values["--base-ref"], values.GetValueOrDefault("--head-ref")
                    ?? Environment.GetEnvironmentVariable("DEVBOOK_EXPORT_HEAD_REF") ?? "");
                Console.WriteLine(required ? "Syncer export receipt verified." : "No managed-note export handoff required.");
            }
            else if (args[0] == "export")
            {
                await ExportAsync(new SyncerContext(root), values["--expected-head"]);
                Console.WriteLine("Official export and receipt staged. Review, then commit and push explicitly.");
            }
            else
            {
                throw new InvalidDataException("Unknown sync-export mode.");
            }
            return 0;
        }
        catch (Exception error) when (error is InvalidDataException or InvalidOperationException or IOException or JsonException or KeyNotFoundException or IndexOutOfRangeException or ArgumentException)
        {
            Console.Error.WriteLine(Syncer.SafeText(error.Message));
            return 1;
        }
    }

    private static IEnumerable<string> Keys(this JsonObject value) => value.Select(item => item.Key);
}
