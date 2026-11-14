using System.Text.Json;
using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public static class SiteCommand
{
    public static async Task<int> RunAsync(string[] args, Func<string, string, string, Task>? renderCheckout = null)
    {
        if (args.Length == 0 || args.Contains("--help"))
        {
            Console.WriteLine("site export --expected-head <sha> --app-bundle <Obsidian.app> --output <directory> [--repo-root <root>]\nsite verify --expected-head <sha> --bundle <bundle.json> [--extract] [--repo-root <root>]\nsite preview [--app-bundle <Obsidian.app>] [--port 8085] [--no-serve] [--repo-root <root>]");
            return args.Length == 0 ? 2 : 0;
        }
        try
        {
            var values = new Dictionary<string, string>(StringComparer.Ordinal);
            var flags = new HashSet<string>(StringComparer.Ordinal);
            string[] valid = ["--repo-root", "--expected-head", "--app-bundle", "--output", "--bundle", "--port"];
            for (var index = 1; index < args.Length; index++)
            {
                if (args[index] is "--extract" or "--no-serve")
                {
                    if (!flags.Add(args[index])) throw new UnsafeInput("Duplicate site option.");
                }
                else if (valid.Contains(args[index], StringComparer.Ordinal) && index + 1 < args.Length)
                {
                    string key = args[index];
                    if (!values.TryAdd(key, args[++index])) throw new UnsafeInput("Duplicate site option.");
                }
                else throw new UnsafeInput("Unknown or incomplete site option.");
            }
            string[] accepted = args[0] switch
            {
                "export" => ["--repo-root", "--expected-head", "--app-bundle", "--output"],
                "verify" => ["--repo-root", "--expected-head", "--bundle"],
                "preview" => ["--repo-root", "--app-bundle", "--port"],
                _ => throw new UnsafeInput("Unknown site command.")
            };
            if (values.Keys.Any(key => !accepted.Contains(key, StringComparer.Ordinal)))
                throw new UnsafeInput("Option does not apply to this site command.");
            string root = Repository.FindRoot(values.GetValueOrDefault("--repo-root"));
            if (args[0] == "export")
            {
                if (flags.Count != 0) throw new UnsafeInput("Unsupported site export flag.");
                string head = Bundle.ExactHead(values["--expected-head"]);
                ProcessResult status = await new SystemProcessRunner().RunAsync(new ProcessRequest("git",
                    ["status", "--porcelain", "--untracked-files=all"], root,
                    new Dictionary<string, string> { ["GIT_OPTIONAL_LOCKS"] = "0" }));
                status.EnsureSuccess("Inspect immutable export source");
                if (Git.Text(root, "rev-parse", "HEAD") != head || status.Stdout.Length != 0)
                    throw new UnsafeInput("Immutable site export requires a clean checkout at the expected SHA; use site preview for current working files.");
                GitTreeEntry[] inputs = Receipt.TreeEntries(root);
                SiteArtifact.AssertWorkingInputs(root, inputs);
                string index = Path.GetFullPath(Git.Text(root, "rev-parse", "--git-path", "index"), root);
                byte[] originalIndex = await File.ReadAllBytesAsync(index);
                using var owned = new OwnedExportCheckout("devbook-site-export-");
                Git.Run(root, "clone", "--no-hardlinks", "--quiet", root, owned.Root);
                Git.Run(owned.Root, "checkout", "--quiet", "--detach", head);
                if (renderCheckout is null) await Desktop.ExportCheckoutAsync(owned.Root, head, values["--app-bundle"]);
                else await renderCheckout(owned.Root, head, values["--app-bundle"]);
                JsonObject bundle = Bundle.FromCheckout(owned.Root, 0, "", head);
                Bundle.ValidateInputs(bundle, inputs);
                SiteArtifact.AssertWorkingInputs(root, inputs);
                if (Git.Text(root, "rev-parse", "HEAD") != head || !File.ReadAllBytes(index).AsSpan().SequenceEqual(originalIndex))
                    throw new UnsafeInput("Source checkout or index changed during immutable export; current edits were preserved.");
                string output = Path.GetFullPath(values["--output"]);
                Directory.CreateDirectory(output);
                string destination = Path.Combine(output, "bundle.json");
                if (new FileInfo(destination).LinkTarget is not null) throw new UnsafeInput("Artifact destination cannot be a symlink.");
                await File.WriteAllTextAsync(destination, bundle.ToJsonString(JsonData.Options) + "\n");
                Console.WriteLine(new JsonObject { ["status"] = "exported", ["source_sha"] = head, ["bundle"] = destination,
                    ["sha256"] = SiteArtifact.Digest(await File.ReadAllBytesAsync(destination)) }.ToJsonString());
            }
            else if (args[0] == "verify")
            {
                if (flags.Contains("--no-serve")) throw new UnsafeInput("Unsupported site verify flag.");
                string head = Bundle.ExactHead(values["--expected-head"]);
                string path = Path.GetFullPath(values["--bundle"]);
                if (new FileInfo(path).Length > Bundle.MaxTotalBytes * 2) throw new UnsafeInput("Artifact payload exceeds its size bound.");
                JsonObject bundle = JsonData.ParseObject(await File.ReadAllTextAsync(path));
                if (bundle.Str("expected_head") != head || bundle.Obj("manifest").Str("repository") != SiteArtifact.RepositoryName
                    || Git.Text(root, "rev-parse", "HEAD") != head)
                    throw new UnsafeInput("Artifact repository or source SHA differs from the requested checkout.");
                Bundle.ValidateInputs(bundle, Receipt.TreeEntries(root));
                SiteArtifact.AssertWorkingInputs(root, Receipt.TreeEntries(root));
                if (flags.Contains("--extract")) SiteArtifact.Extract(root, bundle, head);
                Console.WriteLine(new JsonObject { ["status"] = "verified", ["source_sha"] = head, ["file_count"] = Bundle.Decode(bundle).Count }.ToJsonString());
            }
            else if (args[0] == "preview")
            {
                if (flags.Contains("--extract")) throw new UnsafeInput("Unsupported site preview flag.");
                int port = int.Parse(values.GetValueOrDefault("--port", "8085"), System.Globalization.CultureInfo.InvariantCulture);
                if (port is < 1024 or > 65535) throw new UnsafeInput("Preview port must be between 1024 and 65535.");
                await Preview.RunAsync(root, values.GetValueOrDefault("--app-bundle", "/Applications/Obsidian.app"), port, !flags.Contains("--no-serve"));
            }
            else throw new UnsafeInput("Unknown site command.");
            return 0;
        }
        catch (Exception error) when (error is IOException or InvalidOperationException or JsonException or ArgumentException or KeyNotFoundException or FormatException)
        {
            Console.Error.WriteLine(Syncer.SafeText(error.Message, 1500));
            return 1;
        }
    }
}
