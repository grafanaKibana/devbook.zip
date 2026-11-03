using System.Globalization;
using System.Text;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Vault;

public sealed record FolderRollupChange(string Path, string Content, IReadOnlyList<string> Details);

public sealed record FolderRollupResult(int FolderNotes, IReadOnlyList<FolderRollupChange> Changes);

/// <summary>Maintains the existing descendant-derived FolderNote frontmatter.</summary>
public static class FolderRollup
{
    private static readonly string[] StatusOrder = ["Creation", "Repetition", "Ready To Repeat", "Not-Started", "Done"];
    private static readonly string[] Priorities = ["High", "Medium", "Low"];

    private sealed record RollupNote(string Path, string Content, List<string> Frontmatter, string Body,
        bool IsFolder, bool Ignored, string? Status, string? Priority, int? Level);

    public static (List<string>? Frontmatter, string Body) SplitFrontmatter(string content)
    {
        string normalized = content.Replace("\r\n", "\n", StringComparison.Ordinal);
        string[] lines = normalized.Split('\n');
        if (lines.Length == 0 || lines[0].Trim() != "---")
        {
            return (null, normalized);
        }

        int end = Array.FindIndex(lines, 1, line => line.Trim() == "---");
        return end < 0
            ? (null, normalized)
            : (lines[1..end].ToList(), string.Join('\n', lines[(end + 1)..]));
    }

    private static string Unquote(string value)
    {
        value = value.Trim();
        if (value.Length >= 2 && (value[0] == '"' && value[^1] == '"' || value[0] == '\'' && value[^1] == '\''))
        {
            value = value[1..^1];
        }
        return value.Trim();
    }

    private static int KeyIndex(IReadOnlyList<string> lines, string key)
    {
        for (var index = 0; index < lines.Count; index++)
        {
            string line = lines[index];
            if (line.Length > 0 && !char.IsWhiteSpace(line[0]) && line.Contains(':') && line.Split(':', 2)[0].Trim() == key)
            {
                return index;
            }
        }
        return -1;
    }

    private static int BlockEnd(IReadOnlyList<string> lines, int start)
    {
        int end = start + 1;
        while (end < lines.Count && !string.IsNullOrWhiteSpace(lines[end]) && char.IsWhiteSpace(lines[end][0]))
        {
            end++;
        }
        return end;
    }

    public static IReadOnlyList<string> ListValues(IReadOnlyList<string> lines, string key)
    {
        int index = KeyIndex(lines, key);
        if (index < 0)
        {
            return [];
        }
        string value = lines[index].Split(':', 2)[1].Trim();
        if (value.StartsWith('['))
        {
            return value.Trim('[', ']').Split(',').Where(part => !string.IsNullOrWhiteSpace(part)).Select(Unquote).ToList();
        }
        if (value.Length > 0)
        {
            return Unquote(value).Length > 0 ? [value] : [];
        }
        return lines.Skip(index + 1).Take(BlockEnd(lines, index) - index - 1)
            .Select(line => line.Trim()).Where(line => line.StartsWith('-'))
            .Select(line => Unquote(line[1..])).Where(item => item.Length > 0).ToList();
    }

    public static string? Scalar(IReadOnlyList<string> lines, string key)
    {
        IReadOnlyList<string> values = ListValues(lines, key);
        return values.Count == 0 ? null : Unquote(values[0]);
    }

    private static List<string> ReplaceBlock(List<string> lines, string key, params string[] replacement)
    {
        int index = KeyIndex(lines, key);
        if (index < 0)
        {
            return [.. lines, .. replacement];
        }
        return [.. lines.Take(index), .. replacement, .. lines.Skip(BlockEnd(lines, index))];
    }

    private static IEnumerable<string> NotePaths(string directory)
    {
        foreach (string path in Directory.EnumerateFiles(directory).Order(StringComparer.Ordinal))
        {
            if (!Path.GetFileName(path).StartsWith('.') && path.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            {
                yield return path;
            }
        }
        foreach (string child in Directory.EnumerateDirectories(directory).Where(path => !Path.GetFileName(path).StartsWith('.')))
        {
            foreach (string path in NotePaths(child))
            {
                yield return path;
            }
        }
    }

    public static FolderRollupResult Plan(string rootHome, string? repoRoot = null, bool force = false)
    {
        rootHome = Path.GetFullPath(rootHome);
        repoRoot ??= Repository.FindRoot();
        var notes = new List<RollupNote>();
        foreach (string path in NotePaths(rootHome))
        {
            string content;
            try
            {
                content = File.ReadAllText(path, Encoding.UTF8).Replace("\r\n", "\n", StringComparison.Ordinal);
            }
            catch (IOException)
            {
                continue;
            }
            (List<string>? frontmatter, string body) = SplitFrontmatter(content);
            if (frontmatter is null)
            {
                continue;
            }
            var tags = ListValues(frontmatter, "tags").Select(value => Unquote(value).TrimStart('#')).ToHashSet(StringComparer.Ordinal);
            int? level = int.TryParse(Scalar(frontmatter, "level"), CultureInfo.InvariantCulture, out int number) ? number : null;
            notes.Add(new(path, content, frontmatter, body, tags.Contains("FolderNote"), tags.Contains("MetricsIgnore"),
                Scalar(frontmatter, "status"), Scalar(frontmatter, "priority"), level));
        }

        List<RollupNote> folders = notes.Where(note => note.IsFolder).ToList();
        List<RollupNote> leaves = notes.Where(note => !note.IsFolder).ToList();
        var changes = new List<FolderRollupChange>();
        foreach (RollupNote folder in folders.Where(note => !note.Ignored))
        {
            string parent = Path.GetDirectoryName(folder.Path)!;
            string prefix = parent + Path.DirectorySeparatorChar;
            List<RollupNote> children = leaves.Where(note => !note.Ignored && (Path.GetDirectoryName(note.Path) == parent || note.Path.StartsWith(prefix, StringComparison.Ordinal))).ToList();
            if (children.Count == 0)
            {
                continue;
            }
            string? status = StatusOrder.FirstOrDefault(value => children.Any(note => note.Status == value));
            string? priority = Priorities.FirstOrDefault(value => children.Any(note => note.Priority == value));
            int? level = children.Select(note => note.Level).Max();
            List<string> lines = [.. folder.Frontmatter];
            var details = new List<string>();
            if (status is not null && (force ? folder.Status != status : !StatusOrder.Contains(folder.Status)))
            {
                lines = ReplaceBlock(lines, "status", $"status: {status}");
                details.Add($"status: {folder.Status ?? "∅"} -> {status}");
            }
            if (priority is not null && (force ? folder.Priority != priority : !Priorities.Contains(folder.Priority)))
            {
                lines = ReplaceBlock(lines, "priority", $"priority: {priority}");
                details.Add($"priority: {folder.Priority ?? "∅"} -> {priority}");
            }
            if (level is not null && (force ? folder.Level != level : folder.Level is null))
            {
                lines = ReplaceBlock(lines, "level", "level:", $"  - \"{level}\"");
                details.Add($"level: {folder.Level?.ToString(CultureInfo.InvariantCulture) ?? "∅"} -> {level}");
            }
            if (details.Count == 0)
            {
                continue;
            }
            string candidate = "---\n" + string.Join('\n', lines) + "\n---\n" + folder.Body;
            if (candidate != folder.Content)
            {
                changes.Add(new(Path.GetRelativePath(repoRoot, folder.Path).Replace('\\', '/'), candidate, details));
            }
        }
        return new(folders.Count, changes);
    }

    public static FolderRollupResult Sync(string rootHome, bool write = false, bool force = false, string? repoRoot = null)
    {
        repoRoot ??= Repository.FindRoot();
        FolderRollupResult result = Plan(rootHome, repoRoot, force);
        if (write)
        {
            foreach (FolderRollupChange change in result.Changes)
            {
                File.WriteAllText(Path.Combine(repoRoot, change.Path), change.Content, new UTF8Encoding(false));
            }
        }
        return result;
    }

    public static Task<int> RunAsync(string[] args)
    {
        if (args.Contains("--help") || args.Contains("-h"))
        {
            Console.WriteLine("Sync descendant-derived FolderNote fields. --root <Vault/Home> --write --force --print-changed");
            return Task.FromResult(0);
        }
        try
        {
            string? repoRoot = null;
            string? home = null;
            for (var index = 0; index < args.Length; index++)
            {
                if (args[index] == "--root" && index + 1 < args.Length)
                {
                    home = Path.GetFullPath(args[++index]);
                }
                else if (args[index] == "--repo-root" && index + 1 < args.Length)
                {
                    repoRoot = Path.GetFullPath(args[++index]);
                }
                else if (args[index] is not ("--write" or "--force" or "--print-changed"))
                {
                    throw new ArgumentException($"Unknown or incomplete argument: {args[index]}");
                }
            }
            repoRoot ??= Repository.FindRoot(home);
            home ??= Path.Combine(repoRoot, "Vault", "Home");
            FolderRollupResult result = Sync(home, args.Contains("--write"), args.Contains("--force"), repoRoot);
            if (args.Contains("--print-changed"))
            {
                foreach (FolderRollupChange change in result.Changes.OrderBy(change => change.Path, StringComparer.Ordinal))
                {
                    Console.WriteLine(change.Path);
                }
            }
            else
            {
                Console.WriteLine($"[{(args.Contains("--write") ? "WRITE" : "DRY-RUN")}] root={Path.GetRelativePath(repoRoot, home)} folderNotes={result.FolderNotes} changed={result.Changes.Count}");
                foreach (FolderRollupChange change in result.Changes.OrderBy(change => change.Path, StringComparer.Ordinal))
                {
                    Console.WriteLine($"- {change.Path} ({string.Join("; ", change.Details)})");
                }
            }
            return Task.FromResult(0);
        }
        catch (Exception error) when (error is ArgumentException or IOException or InvalidOperationException)
        {
            Console.Error.WriteLine(error.Message);
            return Task.FromResult(2);
        }
    }
}
