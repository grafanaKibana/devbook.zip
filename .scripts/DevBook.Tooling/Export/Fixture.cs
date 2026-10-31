using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public static class Fixture
{
    public const string Branch = "notes/automated-fixture-g1";
    private const string Pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";

    public static string PrepareCheckout(string trusted, string root)
    {
        if (Directory.Exists(root) && Directory.EnumerateFileSystemEntries(root).Any())
        {
            throw new UnsafeInput("Fixture destination must be empty.");
        }
        Directory.CreateDirectory(root);
        var paths = Receipt.RequiredPolicyPaths.ToHashSet(StringComparer.Ordinal);
        foreach (string source in Directory.EnumerateFiles(Path.Combine(trusted, ".scripts/DevBook.Tooling"), "*", SearchOption.AllDirectories))
        {
            string relative = Path.GetRelativePath(trusted, source).Replace('\\', '/');
            if (Receipt.IsPolicyPath(relative))
            {
                paths.Add(relative);
            }
        }
        foreach (string plugin in Receipt.Plugins)
        {
            foreach (string file in new[] { "styles.css", "build-info.json" })
            {
                string relative = $"Vault/.obsidian/plugins/{plugin}/{file}";
                if (File.Exists(Path.Combine(trusted, relative)))
                {
                    paths.Add(relative);
                }
            }
        }
        paths.Add("Web/quartz.config.yaml");
        foreach (string relative in paths)
        {
            Syncer.EnsureRegularPath(trusted, relative);
            string source = Path.Combine(trusted, relative);
            if (!File.Exists(source))
            {
                throw new UnsafeInput($"Fixture lacks a regular publishing dependency: {relative}");
            }
            string destination = Path.Combine(root, relative);
            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            File.Copy(source, destination);
        }
        Write(root, "Vault/Home/Topic/Example.md", """
            ---
            topic: [Programming]
            subtopic: [NET]
            level: ["1"]
            priority: Medium
            status: Creation
            publish: true
            created: 2026-10-01T00:00:00.000Z
            modified: 2026-10-01T00:00:00.000Z
            qard-deck: "Topic"
            qard-topic: "Example"
            ---

            %% tabs %%
            %% tab: Example %%
            An isolated fixture.
            %% endtabs %%

            # Questions

            > [!qard]- What does this fixture prove?
            > Genuine isolated export preserves the card.

            ![[Assets/pixel.png]]
            """ + "\n");
        Write(root, "Vault/Home/Questions.md", """
            ---
            publish: true
            created: 2026-10-01T00:00:00.000Z
            modified: 2026-10-01T00:00:00.000Z
            ---

            ```datacorejsx
            return <div className="dc-questions-index">FIXTURE_DATACORE_RENDERED</div>;
            ```
            """ + "\n");
        Write(root, "Vault/Home/Topic/Undated.md", """
            ---
            topic: [Programming]
            subtopic: [NET]
            level: ["1"]
            priority: Medium
            status: Creation
            publish: false
            ---

            This unrelated, unpublished note deliberately has no source dates.
            """ + "\n");
        string asset = Path.Combine(root, "Vault/Assets/pixel.png");
        Directory.CreateDirectory(Path.GetDirectoryName(asset)!);
        File.WriteAllBytes(asset, Convert.FromBase64String(Pixel));
        Write(root, "Web/content/Topic/Example.md", "---\ncreated: 2026-10-01T00:00:00.000Z\nmodified: 2026-10-01T00:00:00.000Z\npublished: 2026-10-01T00:00:00.000Z\n---\nOld fixture output.\n");
        Git.Run(root, "init", "-q", "-b", Branch);
        Git.Run(root, "config", "user.name", "Fixture");
        Git.Run(root, "config", "user.email", "fixture@example.invalid");
        Git.Run(root, "add", ".");
        Git.Run(root, "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-qm", "notes: seed export fixture");
        return Git.Text(root, "rev-parse", "HEAD");
    }

    private static void Write(string root, string relative, string text)
    {
        string destination = Path.Combine(root, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        File.WriteAllText(destination, text, new UTF8Encoding(false));
    }

    public static async Task<JsonObject> ExportAsync(string trusted, string appBundle, int timeoutSeconds = 600,
        CancellationToken cancellationToken = default)
    {
        using var owned = new OwnedExportCheckout("devbook-export-fixture-");
        string expected = PrepareCheckout(trusted, owned.Root);
        Dictionary<string, byte[]> source = Desktop.SourceHashes(owned.Root);
        await Desktop.ExportCheckoutAsync(owned.Root, expected, appBundle, timeoutSeconds, cancellationToken);
        JsonObject bundle = Bundle.FromCheckout(owned.Root, 1, Branch, expected);
        IReadOnlyDictionary<string, byte[]?> files = Bundle.Decode(bundle);
        string exported = Encoding.UTF8.GetString(files["Web/content/Topic/Example.md"]!);
        string dashboard = Encoding.UTF8.GetString(files["Web/content/Questions.md"]!);
        if (!exported.Contains("%% tabs %%", StringComparison.Ordinal) || !exported.Contains("%% endtabs %%", StringComparison.Ordinal)
            || !exported.Contains("Genuine isolated export preserves the card.", StringComparison.Ordinal)
            || !dashboard.Contains("FIXTURE_DATACORE_RENDERED", StringComparison.Ordinal) || !dashboard.Contains("dc-questions-index", StringComparison.Ordinal)
            || Regex.IsMatch(dashboard, @"(?m)^\s*```datacore"))
        {
            throw new RuntimeFailure("Genuine export did not preserve markers/cards or render Datacore.");
        }
        if (!files["Web/content/Assets/pixel.png"]!.AsSpan().SequenceEqual(Convert.FromBase64String(Pixel)))
        {
            throw new RuntimeFailure("Genuine export changed fixture media bytes.");
        }
        if (!Syncer.SameSnapshot(source, Desktop.SourceHashes(owned.Root)))
        {
            throw new RuntimeFailure("Genuine exporter changed fixture source, including the unrelated undated note.");
        }
        Receipt.Validate(JsonData.ParseObject(Encoding.UTF8.GetString(files[Receipt.PathName]!)), Receipt.IndexEntries(owned.Root));
        string diff = Encoding.UTF8.GetString(Git.Run(owned.Root, "diff", "--cached", "--no-ext-diff", "--binary"));
        return new JsonObject
        {
            ["status"] = "fixture_exported",
            ["source_unchanged"] = true,
            ["unrelated_undated_unchanged"] = true,
            ["rendered_datacore"] = true,
            ["preserved_markers"] = true,
            ["media_unchanged"] = true,
            ["file_count"] = files.Count,
            ["source_head"] = expected,
            ["bundle"] = bundle,
            ["diff"] = diff
        };
    }
}
