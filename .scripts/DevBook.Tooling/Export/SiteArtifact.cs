using System.Security.Cryptography;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public static class SiteArtifact
{
    public const string RepositoryName = "grafanaKibana/devbook.zip";
    public const string AuthoredStyles = "Web/quartz/styles/custom.scss";

    public static bool IsOutput(string path) => Syncer.SafePath(path)
        && Syncer.Outputs.Any(prefix => path.StartsWith(prefix + "/", StringComparison.Ordinal));

    public static JsonObject Inputs(IEnumerable<GitTreeEntry> entries)
    {
        var sources = new JsonObject();
        var policy = new JsonObject();
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (GitTreeEntry entry in entries.OrderBy(item => item.Path, StringComparer.Ordinal))
        {
            JsonObject? group = Receipt.IsPolicyPath(entry.Path) ? policy : Syncer.IsSource(entry.Path) ? sources : null;
            if (group is null || entry.Type == "tree") continue;
            if (!Syncer.SafePath(entry.Path) || !paths.Add(entry.Path.Normalize()) || entry.Type != "blob"
                || entry.Mode is not "100644" and not "100755" || !Regex.IsMatch(entry.Sha, "^[a-f0-9]{40}$", RegexOptions.CultureInvariant))
            {
                throw new UnsafeInput("Artifact inputs require unique safe regular Git blobs.");
            }
            group[entry.Path] = new JsonObject { ["sha"] = entry.Sha, ["mode"] = entry.Mode };
        }
        if (sources.Count == 0 || Receipt.RequiredPolicyPaths.Any(path => !policy.ContainsKey(path)))
        {
            throw new UnsafeInput("Artifact source or native export policy inventory is incomplete.");
        }
        return new JsonObject { ["sources"] = sources, ["policy"] = policy };
    }

    public static Dictionary<string, byte[]> OutputFiles(string root)
    {
        var files = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        var physical = new Dictionary<string, string>(StringComparer.Ordinal);
        long total = 0;
        long largest = 0;
        foreach (string output in Syncer.Outputs)
        {
            Syncer.EnsureRegularPath(root, output);
            string directory = Path.Combine(root, output);
            if (!Directory.Exists(directory)) throw new UnsafeInput("Native export did not produce every generated output root.");
            ReadDirectory(directory);
        }
        foreach (string[] batch in physical.Values.Chunk(100))
        {
            if (!OperatingSystem.IsMacOS() && !OperatingSystem.IsLinux()) continue;
            string[] arguments = OperatingSystem.IsMacOS() ? ["-f", "%HT", .. batch] : ["--printf=%F\n", "--", .. batch];
            ProcessResult types = new SystemProcessRunner().RunAsync(new ProcessRequest("/usr/bin/stat", arguments, root)).GetAwaiter().GetResult();
            types.EnsureSuccess("Inspect generated file types");
            string[] observed = types.Stdout.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (observed.Length != batch.Length || observed.Any(kind => kind is not "Regular File" and not "regular file" and not "regular empty file"))
                throw new UnsafeInput("Generated output contains a non-regular file.");
        }
        foreach ((string relative, string path) in physical) files.Add(relative, File.ReadAllBytes(path));
        ValidateFiles(files);
        return files;

        void ReadDirectory(string directory)
        {
            foreach (string path in Directory.EnumerateFileSystemEntries(directory))
            {
                string relative = Path.GetRelativePath(root, path).Replace('\\', '/');
                Syncer.EnsureRegularPath(root, relative);
                if (Directory.Exists(path)) ReadDirectory(path);
                else if (File.Exists(path))
                {
                    var info = new FileInfo(path);
                    total += info.Length;
                    largest = Math.Max(largest, info.Length);
                    if (info.Length > Bundle.MaxFileBytes || physical.Count >= 2000 || total > Bundle.MaxTotalBytes)
                        throw new UnsafeInput($"Generated artifact exceeds its file count or size bound; files={physical.Count + 1}; "
                            + $"total_bytes={total}; max_file_bytes={largest}; file_count_limit=2000; "
                            + $"file_bytes_limit={Bundle.MaxFileBytes}; total_bytes_limit={Bundle.MaxTotalBytes}.");
                    if (!OperatingSystem.IsWindows() && (File.GetUnixFileMode(path) & (UnixFileMode.UserExecute | UnixFileMode.GroupExecute | UnixFileMode.OtherExecute)) != 0)
                        throw new UnsafeInput("Generated artifact contains an executable file.");
                    physical.Add(relative, path);
                }
                else throw new UnsafeInput("Generated output contains a non-regular file.");
            }
        }
    }

    public static void ClearOutputs(string root)
    {
        foreach (string path in Syncer.Outputs)
        {
            Syncer.EnsureRegularPath(root, path);
            string target = Path.Combine(root, path);
            if (File.Exists(target)) throw new UnsafeInput("Generated root must be a regular directory.");
            if (Directory.Exists(target))
            {
                _ = OutputFilesInRoot(root, path);
                Directory.Delete(target, true);
            }
            Directory.CreateDirectory(target);
        }
    }

    private static string[] OutputFilesInRoot(string root, string output)
    {
        var paths = new List<string>();
        Visit(Path.Combine(root, output));
        return paths.ToArray();
        void Visit(string directory)
        {
            foreach (string path in Directory.EnumerateFileSystemEntries(directory))
            {
                Syncer.EnsureRegularPath(root, Path.GetRelativePath(root, path).Replace('\\', '/'));
                if (Directory.Exists(path)) Visit(path);
                else if (File.Exists(path)) paths.Add(path);
                else throw new UnsafeInput("Generated root contains a non-regular path.");
            }
        }
    }

    public static JsonObject CreateManifest(string root, string head, JsonObject runtime, bool local = false)
    {
        _ = Bundle.ExactHead(head);
        JsonObject inputs = Inputs(local ? Receipt.IndexEntries(root) : Receipt.TreeEntries(root));
        var outputs = new JsonObject();
        foreach ((string path, byte[] data) in OutputFiles(root).OrderBy(item => item.Key, StringComparer.Ordinal))
        {
            outputs[path] = new JsonObject
            {
                ["sha256"] = Digest(data), ["size"] = data.Length, ["mode"] = "100644", ["type"] = "file"
            };
        }
        return new JsonObject
        {
            ["version"] = 2, ["repository"] = RepositoryName, ["source_sha"] = head,
            ["kind"] = local ? "local" : "commit", ["sources"] = inputs["sources"]!.DeepClone(),
            ["policy"] = inputs["policy"]!.DeepClone(), ["runtime"] = runtime.DeepClone(), ["outputs"] = outputs
        };
    }

    public static void AssertWorkingInputs(string root, IEnumerable<GitTreeEntry> entries)
    {
        foreach (GitTreeEntry entry in entries.Where(item => item.Type != "tree" && (Syncer.IsSource(item.Path) || Receipt.IsPolicyPath(item.Path))))
        {
            Syncer.EnsureRegularPath(root, entry.Path);
            string path = Path.Combine(root, entry.Path);
            if (!File.Exists(path) || Bundle.BlobSha(File.ReadAllBytes(path)) != entry.Sha)
                throw new UnsafeInput("Working source or native policy differs from its bound Git input: " + entry.Path);
        }
    }

    public static string Digest(byte[] bytes) => Convert.ToHexStringLower(SHA256.HashData(bytes));

    public static void ValidateFiles(IReadOnlyDictionary<string, byte[]> files)
    {
        if (files.Count is < 1 or > 2000 || !files.Keys.Any(path => path.StartsWith("Web/content/", StringComparison.Ordinal) && path.EndsWith(".md", StringComparison.Ordinal))
            || !files.Keys.Any(path => path.StartsWith("Web/quartz/styles/syncer/", StringComparison.Ordinal)))
        {
            throw new UnsafeInput("Artifact requires complete native content and generated styles.");
        }
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        long total = 0;
        foreach ((string path, byte[] data) in files)
        {
            if (!IsOutput(path) || !paths.Add(path.Normalize()) || data.Length > Bundle.MaxFileBytes)
                throw new UnsafeInput("Artifact contains unsafe, duplicate or oversized generated paths.");
            total += data.Length;
            if (total > Bundle.MaxTotalBytes) throw new UnsafeInput($"Artifact exceeds its total size bound; files={files.Count}; "
                + $"observed_bytes={total}; total_bytes_limit={Bundle.MaxTotalBytes}.");
        }
        foreach (string path in files.Keys)
        {
            string[] parts = path.Split('/');
            for (var count = 1; count < parts.Length; count++)
            {
                if (paths.Contains(string.Join('/', parts.Take(count)))) throw new UnsafeInput("Artifact file conflicts with a directory path.");
            }
        }
    }

    public static void Extract(string root, JsonObject bundle, string expectedHead)
    {
        if (bundle.Str("expected_head") != Bundle.ExactHead(expectedHead) || Git.Text(root, "rev-parse", "HEAD") != expectedHead)
            throw new UnsafeInput("Artifact source SHA differs from the destination checkout.");
        GitTreeEntry[] inputs = Receipt.TreeEntries(root);
        Bundle.ValidateInputs(bundle, inputs);
        AssertWorkingInputs(root, inputs);
        IReadOnlyDictionary<string, byte[]?> decoded = Bundle.Decode(bundle);
        ClearOutputs(root);
        foreach ((string path, byte[]? bytes) in decoded)
        {
            Syncer.EnsureRegularPath(root, path);
            string target = Path.Combine(root, path);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.WriteAllBytes(target, bytes!);
            if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(target, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.GroupRead | UnixFileMode.OtherRead);
        }
        Dictionary<string, byte[]> written = OutputFiles(root);
        if (written.Count != decoded.Count || written.Any(item => !item.Value.AsSpan().SequenceEqual(decoded[item.Key])))
            throw new UnsafeInput("Extracted artifact differs from its complete inventory.");
    }
}
