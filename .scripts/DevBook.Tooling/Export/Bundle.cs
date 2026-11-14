using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public static class Bundle
{
    public const int MaxFileBytes = 10 * 1024 * 1024;
    public const int MaxTotalBytes = 128 * 1024 * 1024;

    public static string ExactHead(string value) => Regex.IsMatch(value, "^[0-9a-f]{40}$", RegexOptions.CultureInvariant)
        ? value : throw new UnsafeInput("Export requires an exact GitHub commit SHA.");

    public static string BlobSha(byte[] data)
    {
        byte[] header = Encoding.ASCII.GetBytes("blob " + data.Length.ToString(CultureInfo.InvariantCulture) + "\0");
        return Convert.ToHexStringLower(SHA1.HashData([.. header, .. data]));
    }

    public static IReadOnlyDictionary<string, byte[]?> Decode(JsonObject bundle)
    {
        if (!bundle.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(["version", "expected_head", "branch", "pr_number", "manifest", "files"])
            || bundle.Int("version") != 2 || bundle.Int("pr_number") < 0
            || (bundle.Int("pr_number") == 0 ? bundle.Str("branch").Length != 0
                : !Regex.IsMatch(bundle.Str("branch"), "^notes/automated-[a-z0-9-]+-g[1-9][0-9]*$", RegexOptions.CultureInvariant)))
        {
            throw new UnsafeInput("Unsupported export artifact schema or managed identity; legacy generated-commit artifacts require fresh rendering.");
        }
        string head = ExactHead(bundle.Str("expected_head"));
        JsonObject manifest = bundle.RequiredObject("manifest");
        if (!manifest.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(["version", "repository", "source_sha", "kind", "sources", "policy", "runtime", "outputs"])
            || manifest.Int("version") != 2 || !Regex.IsMatch(manifest.Str("repository"), "^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", RegexOptions.CultureInvariant)
            || manifest.Str("source_sha") != head || manifest.Str("kind") is not "commit" and not "local")
            throw new UnsafeInput("Artifact manifest identity is invalid.");
        var inputEntries = new List<GitTreeEntry>();
        foreach (string group in new[] { "sources", "policy" })
        {
            foreach ((string path, JsonNode? node) in manifest.RequiredObject(group))
            {
                if (node is not JsonObject entry || !entry.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(["sha", "mode"]))
                    throw new UnsafeInput("Artifact input entry is invalid.");
                if (group == "sources" ? !Syncer.IsSource(path) || Receipt.IsPolicyPath(path) : !Receipt.IsPolicyPath(path))
                    throw new UnsafeInput("Artifact input is in the wrong ownership group.");
                inputEntries.Add(new GitTreeEntry(path, entry.Str("mode"), "blob", entry.Str("sha")));
            }
        }
        _ = SiteArtifact.Inputs(inputEntries);
        JsonObject runtime = manifest.RequiredObject("runtime");
        if (!runtime.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(["obsidian", "plugins"])
            || !Regex.IsMatch(runtime.Str("obsidian"), @"^\d+\.\d+\.\d+$", RegexOptions.CultureInvariant))
            throw new UnsafeInput("Artifact lacks an actual Obsidian runtime version.");
        JsonObject plugins = runtime.RequiredObject("plugins");
        if (!plugins.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(Receipt.Plugins)
            || plugins.Any(item => item.Value is not JsonValue value || !value.TryGetValue(out string? version)
                || string.IsNullOrWhiteSpace(version) || version.Length > 80
                || !Regex.IsMatch(version, @"^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$", RegexOptions.CultureInvariant)))
            throw new UnsafeInput("Artifact lacks complete actual plugin versions.");
        JsonObject files = bundle.RequiredObject("files");
        JsonObject inventory = manifest.RequiredObject("outputs");
        if (files.Count is < 1 or > 2000 || !files.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(inventory.Select(item => item.Key)))
            throw new UnsafeInput("Artifact output inventory is incomplete.");
        var decoded = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach ((string path, JsonNode? node) in files)
        {
            if (node is not JsonValue scalar || !scalar.TryGetValue(out string? value) || value is null
                || value.Length > 4 * ((MaxFileBytes + 2) / 3) || value.Any(char.IsWhiteSpace)
                || !Regex.IsMatch(value, @"\A(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\z", RegexOptions.CultureInvariant))
                throw new UnsafeInput("Generated artifact is invalid, oversized or not strict base64.");
            byte[] data;
            try { data = Convert.FromBase64String(value); }
            catch (FormatException) { throw new UnsafeInput("Generated artifact is not strict base64."); }
            if (inventory[path] is not JsonObject entry
                || !entry.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(["sha256", "size", "mode", "type"])
                || entry.Str("sha256") != SiteArtifact.Digest(data) || entry.Int("size", -1) != data.Length
                || entry.Str("mode") != "100644" || entry.Str("type") != "file")
                throw new UnsafeInput("Artifact output bytes differ from their manifest.");
            decoded.Add(path, data);
        }
        SiteArtifact.ValidateFiles(decoded);
        return decoded.ToDictionary(item => item.Key, item => (byte[]?)item.Value, StringComparer.Ordinal);
    }

    public static bool ValidateInputs(JsonObject bundle, IEnumerable<GitTreeEntry> entries)
    {
        _ = Decode(bundle);
        JsonObject manifest = bundle.RequiredObject("manifest");
        JsonObject expected = SiteArtifact.Inputs(entries);
        if (manifest.Str("kind") != "commit" || !JsonNode.DeepEquals(manifest["sources"], expected["sources"])
            || !JsonNode.DeepEquals(manifest["policy"], expected["policy"]))
            throw new UnsafeInput("Artifact does not match the complete committed source and native policy tree.");
        return true;
    }

    public static JsonObject FromCheckout(string root, int number, string branch, string expected)
    {
        if (Git.Text(root, "rev-parse", "HEAD") != ExactHead(expected))
            throw new Conflict("Export checkout moved before artifact collection.");
        Syncer.EnsureRegularPath(root, Receipt.PathName);
        JsonObject manifest = JsonData.ParseObject(File.ReadAllText(Path.Combine(root, Receipt.PathName)));
        var files = new JsonObject();
        foreach ((string path, byte[] data) in SiteArtifact.OutputFiles(root).OrderBy(item => item.Key, StringComparer.Ordinal))
            files[path] = Convert.ToBase64String(data);
        var result = new JsonObject
        {
            ["version"] = 2, ["expected_head"] = expected, ["branch"] = branch,
            ["pr_number"] = number, ["manifest"] = manifest, ["files"] = files
        };
        _ = Decode(result);
        return result;
    }

    public static async Task<Dictionary<string, GitTreeEntry>> TreeAsync(IGitHubApi api, string head, CancellationToken cancellationToken = default)
    {
        _ = ExactHead(head);
        JsonObject tree = await Runtime.ObjectAsync(api, "GET", $"/git/trees/{head}?recursive=1", cancellationToken: cancellationToken);
        if (tree["truncated"] is not JsonValue scalar || !scalar.TryGetValue(out bool truncated) || truncated || tree["tree"] is not JsonArray values)
        {
            throw new Conflict("Complete remote tree is required before export publication.");
        }
        GitTreeEntry[] entries = Receipt.Entries(values);
        if (entries.Select(item => item.Path).Distinct(StringComparer.Ordinal).Count() != entries.Length
            || entries.Any(item => !Syncer.SafePath(item.Path)))
        {
            throw new UnsafeInput("Duplicate or unsafe remote Git tree paths.");
        }
        return entries.ToDictionary(item => item.Path, StringComparer.Ordinal);
    }

    public static bool SameLeaves(IEnumerable<GitTreeEntry> first, IEnumerable<GitTreeEntry> second)
    {
        GitTreeEntry[] left = first.Where(item => item.Type != "tree").OrderBy(item => item.Path, StringComparer.Ordinal).ToArray();
        GitTreeEntry[] right = second.Where(item => item.Type != "tree").OrderBy(item => item.Path, StringComparer.Ordinal).ToArray();
        return left.SequenceEqual(right);
    }
}
