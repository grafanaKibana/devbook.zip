using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public sealed record GitTreeEntry(string Path, string Mode, string Type, string Sha);

public static class Receipt
{
    public const string PathName = ".devbook-improvement/syncer-export.json";
    public static readonly string[] NativeEntrypoints = ["SyncExport", "SyncQuartz", "ValidateVault",
        "MigrateQuestionCalloutsToQard", "NoteDates", "GenerateRoadmap", "SyncFolderRollupFrontmatter"];
    public static readonly string[] Plugins = ["quartz-syncer", "datacore", "tabsdown", "obsidian-excalidraw-plugin"];
    private static readonly string[] RequiredPolicy = [".scripts/global.json", ".scripts/quartz-syncer.defaults.json",
        ".scripts/DevBook.Tooling/DevBook.Tooling.csproj", ".scripts/DevBook.Tooling/Program.cs", ".scripts/DevBook.Tooling/Export/Receipt.cs",
        ".scripts/DevBook.Tooling/Export/Syncer.cs", ".scripts/DevBook.Tooling/Export/Desktop.cs", "Web/quartz/styles/custom.scss", "Web/quartz.config.yaml",
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

    public static Task<int> RunAsync(string[] args)
    {
        const string guidance = "SyncExport.cs is retired. Use DevBook.Tooling site export or site verify for complete version 2 artifacts; committed receipts no longer authorize publication.";
        bool help = args.Contains("--help") || args.Contains("-h");
        if (help)
        {
            Console.WriteLine(guidance);
        }
        else
        {
            Console.Error.WriteLine(guidance);
        }
        return Task.FromResult(help ? 0 : 1);
    }
}
