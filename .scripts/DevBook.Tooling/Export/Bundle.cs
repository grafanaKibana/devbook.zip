using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public static class Bundle
{
    public const int MaxFileBytes = 10 * 1024 * 1024;
    public const int MaxTotalBytes = 50 * 1024 * 1024;

    public static string ExactHead(string value) => Regex.IsMatch(value, "^[0-9a-f]{40}$", RegexOptions.CultureInvariant)
        ? value : throw new UnsafeInput("Export requires an exact GitHub commit SHA.");

    public static string BlobSha(byte[] data)
    {
        byte[] header = Encoding.ASCII.GetBytes("blob " + data.Length.ToString(CultureInfo.InvariantCulture) + "\0");
        return Convert.ToHexStringLower(SHA1.HashData([.. header, .. data]));
    }

    public static IReadOnlyDictionary<string, byte[]?> Decode(JsonObject bundle)
    {
        if (!bundle.Select(item => item.Key).ToHashSet(StringComparer.Ordinal).SetEquals(["version", "expected_head", "branch", "pr_number", "files"])
            || bundle.Int("version") != 1 || bundle.Int("pr_number") < 1
            || !Regex.IsMatch(bundle.Str("branch"), "^notes/automated-[a-z0-9-]+-g[1-9][0-9]*$", RegexOptions.CultureInvariant))
        {
            throw new UnsafeInput("Invalid export artifact schema or managed identity.");
        }
        _ = ExactHead(bundle.Str("expected_head"));
        JsonObject files = bundle.RequiredObject("files");
        if (files.Count is < 1 or > 2000)
        {
            throw new UnsafeInput("Invalid export artifact file count.");
        }
        var decoded = new Dictionary<string, byte[]?>(StringComparer.Ordinal);
        long total = 0;
        foreach (KeyValuePair<string, JsonNode?> entry in files)
        {
            if (!Receipt.IsExportPath(entry.Key))
            {
                throw new UnsafeInput("Export artifact contains a non-generated path.");
            }
            if (entry.Value is null)
            {
                decoded.Add(entry.Key, null);
                continue;
            }
            if (entry.Value is not JsonValue scalar || !scalar.TryGetValue(out string? value) || value is null
                || value.Length > 4 * ((MaxFileBytes + 2) / 3) || value.Any(char.IsWhiteSpace)
                || !Regex.IsMatch(value, @"\A(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\z", RegexOptions.CultureInvariant))
            {
                throw new UnsafeInput("Generated artifact is invalid, oversized or not strict base64.");
            }
            byte[] data;
            try
            {
                data = Convert.FromBase64String(value);
            }
            catch (FormatException)
            {
                throw new UnsafeInput("Generated artifact is not strict base64.");
            }
            total += data.Length;
            if (data.Length > MaxFileBytes || total > MaxTotalBytes)
            {
                throw new UnsafeInput("Generated artifact exceeds its export size bound.");
            }
            decoded.Add(entry.Key, data);
        }
        if (!decoded.TryGetValue(Receipt.PathName, out byte[]? receipt) || receipt is not { Length: > 0 })
        {
            throw new UnsafeInput("Export artifact requires its complete receipt.");
        }
        return decoded;
    }

    public static JsonObject FromCheckout(string root, int number, string branch, string expected)
    {
        if (Git.Text(root, "rev-parse", "HEAD") != ExactHead(expected))
        {
            throw new Conflict("Export checkout moved before artifact collection.");
        }
        var files = new JsonObject();
        foreach (string path in Git.Paths(root, "diff", "--cached", "--name-only", "--no-renames", "-z"))
        {
            if (!Receipt.IsExportPath(path))
            {
                throw new UnsafeInput("Export staged a non-generated path.");
            }
            string[] staged = Git.Paths(root, "ls-files", "--stage", "-z", "--", path);
            if (staged.Length == 0)
            {
                files[path] = null;
                continue;
            }
            if (staged.Length != 1 || !staged[0].StartsWith("100644 ", StringComparison.Ordinal)
                || !staged[0].Split('\t', 2)[0].EndsWith(" 0", StringComparison.Ordinal))
            {
                throw new UnsafeInput("Export staged an unsafe file mode or conflict.");
            }
            files[path] = Convert.ToBase64String(Git.Run(root, "show", ":" + path));
        }
        var result = new JsonObject
        {
            ["version"] = 1,
            ["expected_head"] = expected,
            ["branch"] = branch,
            ["pr_number"] = number,
            ["files"] = files
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

    public static async Task<Dictionary<string, GitTreeEntry>> PredictAsync(IGitHubApi api, string expected,
        IReadOnlyDictionary<string, byte[]?> files, CancellationToken cancellationToken = default)
    {
        Dictionary<string, GitTreeEntry> entries = await TreeAsync(api, expected, cancellationToken);
        foreach (KeyValuePair<string, byte[]?> item in files)
        {
            entries.TryGetValue(item.Key, out GitTreeEntry? prior);
            if (prior is not null && (prior.Type != "blob" || prior.Mode != "100644"))
            {
                throw new UnsafeInput("Generated output is not a regular file.");
            }
            if (item.Value is null)
            {
                if (item.Key == Receipt.PathName || prior is null)
                {
                    throw new UnsafeInput("Invalid generated deletion.");
                }
                entries.Remove(item.Key);
            }
            else
            {
                entries[item.Key] = new GitTreeEntry(item.Key, "100644", "blob", BlobSha(item.Value));
            }
        }
        try
        {
            JsonObject receipt = JsonData.ParseObject(new UTF8Encoding(false, true).GetString(files[Receipt.PathName]!));
            Receipt.Validate(receipt, entries.Values);
        }
        catch (Exception error) when (error is IOException or JsonException or DecoderFallbackException)
        {
            throw new UnsafeInput("Generated artifact does not match the exact source/output/policy tree.");
        }
        return entries;
    }

    public static bool SameLeaves(IEnumerable<GitTreeEntry> first, IEnumerable<GitTreeEntry> second)
    {
        GitTreeEntry[] left = first.Where(item => item.Type != "tree").OrderBy(item => item.Path, StringComparer.Ordinal).ToArray();
        GitTreeEntry[] right = second.Where(item => item.Type != "tree").OrderBy(item => item.Path, StringComparer.Ordinal).ToArray();
        return left.SequenceEqual(right);
    }
}
