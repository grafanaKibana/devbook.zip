using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Vault;

public sealed record RoadmapResult(JsonObject Canvas, IReadOnlyDictionary<string, string> InvalidStatuses);

/// <summary>Generates the existing folder-derived JSON Canvas without changing authored notes.</summary>
public static class Roadmap
{
    private const int MaxDepth = 5;
    private const int NodeWidth = 340;
    private const int NodeHeight = 80;
    private const int StepY = 120;
    private static readonly Dictionary<string, string> Colors = new(StringComparer.Ordinal)
    {
        ["Not-Started"] = "1",
        ["Creation"] = "2",
        ["Repetition"] = "5",
        ["Ready to Repeat"] = "6",
        ["Done"] = "4"
    };

    private static string NodeId(string path) => "n_" + Convert.ToHexStringLower(SHA1.HashData(Encoding.UTF8.GetBytes(path)))[..10];
    private static string EdgeId(string from, string to) => "e_" + Convert.ToHexStringLower(SHA1.HashData(Encoding.UTF8.GetBytes(from + "->" + to)))[..10];
    private static string Hub(string directory) => Path.Combine(directory, Path.GetFileName(directory) + ".md");
    private static string[] Subdirectories(string directory) => Directory.Exists(directory)
        ? Directory.EnumerateDirectories(directory).Where(path => !Path.GetFileName(path).StartsWith('.')).Order(StringComparer.Ordinal).ToArray()
        : [];

    private static Dictionary<string, string[]> Tree(string directory)
    {
        var result = new Dictionary<string, string[]>(StringComparer.Ordinal);
        void Walk(string path, int depth)
        {
            if (depth > MaxDepth)
            {
                result.TryAdd(path, []);
                return;
            }
            string[] children = Subdirectories(path);
            result[path] = children;
            foreach (string child in children)
            {
                Walk(child, depth + 1);
            }
        }
        Walk(directory, 1);
        return result;
    }

    private static (string? Status, string? Invalid) ReadStatus(string path)
    {
        try
        {
            (List<string>? lines, _) = FolderRollup.SplitFrontmatter(File.ReadAllText(path, Encoding.UTF8));
            if (lines is null)
            {
                return (null, null);
            }
            string? status = FolderRollup.Scalar(lines, "status");
            return status is null || Colors.ContainsKey(status) ? (status, null) : (null, status);
        }
        catch (Exception error) when (error is IOException or DecoderFallbackException or UnauthorizedAccessException)
        {
            return (null, null);
        }
    }

    private static string? Rollup(IReadOnlyDictionary<string, int> counts)
    {
        int total = counts.Values.Sum();
        if (total == 0)
        {
            return null;
        }
        if (counts.GetValueOrDefault("Done") == total)
        {
            return "Done";
        }
        return new[] { "Not-Started", "Creation", "Repetition", "Ready To Repeat" }
            .FirstOrDefault(status => counts.GetValueOrDefault(status) > 0) ?? "Not-Started";
    }

    public static RoadmapResult Generate(string repoRoot, DateTimeOffset? now = null)
    {
        string vault = Path.Combine(Path.GetFullPath(repoRoot), "Vault");
        string home = Path.Combine(vault, "Home");
        string[] topics = Subdirectories(home);
        var nodes = new JsonArray();
        var edges = new JsonArray();
        var statuses = new Dictionary<string, string?>(StringComparer.Ordinal);
        var invalid = new Dictionary<string, string>(StringComparer.Ordinal);
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        int y = 0;

        string? FileStatus(string path)
        {
            if (statuses.TryGetValue(path, out string? cached))
            {
                return cached;
            }
            (string? status, string? invalidStatus) = ReadStatus(path);
            if (invalidStatus is not null)
            {
                invalid[path] = invalidStatus;
            }
            statuses[path] = status;
            return status;
        }

        Dictionary<string, string?> Rollups(Dictionary<string, string[]> tree, string root)
        {
            var byDirectory = tree.Keys.ToDictionary(path => path, _ => new Dictionary<string, int>(StringComparer.Ordinal), StringComparer.Ordinal);
            IEnumerable<string> EnumerateNotes(string directory)
            {
                foreach (string file in Directory.EnumerateFiles(directory))
                {
                    if (!Path.GetFileName(file).StartsWith('.') && file.EndsWith(".md", StringComparison.Ordinal))
                    {
                        yield return file;
                    }
                }
                foreach (string child in Subdirectories(directory))
                {
                    foreach (string path in EnumerateNotes(child))
                    {
                        yield return path;
                    }
                }
            }
            foreach (string path in EnumerateNotes(root))
            {
                string directory = Path.GetDirectoryName(path)!;
                if (path == Hub(directory))
                {
                    continue;
                }
                string? status = FileStatus(path);
                if (status is null)
                {
                    continue;
                }
                string? current = directory;
                while (current is not null)
                {
                    if (byDirectory.TryGetValue(current, out Dictionary<string, int>? values))
                    {
                        values[status] = values.GetValueOrDefault(status) + 1;
                    }
                    if (current == root)
                    {
                        break;
                    }
                    current = Path.GetDirectoryName(current);
                }
            }
            return byDirectory.ToDictionary(pair => pair.Key, pair => Rollup(pair.Value), StringComparer.Ordinal);
        }

        JsonObject AddNode(string directory, int x, int top, IReadOnlyDictionary<string, string?> rollups)
        {
            string relative = Path.GetRelativePath(vault, Hub(directory)).Replace('\\', '/');
            string link = relative.EndsWith(".md", StringComparison.Ordinal) ? relative[..^3] : relative;
            var node = new JsonObject
            {
                ["id"] = NodeId(relative),
                ["type"] = "text",
                ["text"] = $"# [[{link}|{Path.GetFileNameWithoutExtension(relative)}]]",
                ["x"] = x,
                ["y"] = top,
                ["width"] = NodeWidth,
                ["height"] = NodeHeight
            };
            string? status = rollups.GetValueOrDefault(directory) ?? FileStatus(Hub(directory));
            if (status is not null)
            {
                counts[status] = counts.GetValueOrDefault(status) + 1;
                if (Colors.TryGetValue(status, out string? color))
                {
                    node["color"] = color;
                }
            }
            nodes.Add(node);
            return node;
        }

        int Count(Dictionary<string, string[]> tree, string directory, int depth) => depth > MaxDepth ? 0
            : 1 + tree.GetValueOrDefault(directory, []).Sum(child => Count(tree, child, depth + 1));

        int Place(Dictionary<string, string[]> tree, string directory, int depth, string parent, int top, int direction,
            IReadOnlyDictionary<string, string?> rollups)
        {
            JsonObject node = AddNode(directory, direction * depth * 420, top, rollups);
            string id = node["id"]!.GetValue<string>();
            edges.Add(new JsonObject
            {
                ["id"] = EdgeId(parent, id),
                ["fromNode"] = parent,
                ["fromSide"] = direction >= 0 ? "right" : "left",
                ["toNode"] = id,
                ["toSide"] = direction >= 0 ? "left" : "right"
            });
            top += StepY;
            foreach (string child in tree.GetValueOrDefault(directory, []))
            {
                if (depth + 1 <= MaxDepth)
                {
                    top = Place(tree, child, depth + 1, id, top, direction, rollups);
                }
            }
            return top;
        }

        for (var index = 0; index < topics.Length; index++)
        {
            string topic = topics[index];
            Dictionary<string, string[]> tree = Tree(topic);
            Dictionary<string, string?> rollups = Rollups(tree, topic);
            JsonObject node = AddNode(topic, 0, y, rollups);
            string id = node["id"]!.GetValue<string>();
            if (index > 0)
            {
                string previous = NodeId(Path.GetRelativePath(vault, Hub(topics[index - 1])).Replace('\\', '/'));
                edges.Add(new JsonObject { ["id"] = EdgeId(previous, id), ["fromNode"] = previous, ["fromSide"] = "bottom", ["toNode"] = id, ["toSide"] = "top" });
            }
            int left = y;
            int right = y;
            foreach (string child in tree.GetValueOrDefault(topic, []))
            {
                int height = Count(tree, child, 1) * StepY;
                if (Math.Max(right + height, left) <= Math.Max(left + height, right))
                {
                    right = Place(tree, child, 1, id, right, 1, rollups);
                }
                else
                {
                    left = Place(tree, child, 1, id, left, -1, rollups);
                }
            }
            y = Math.Max(Math.Max(left, right), y + NodeHeight) + 160;
        }

        if (nodes.Count > 0)
        {
            int x = nodes.Min(node => node!["x"]!.GetValue<int>()) - 600;
            string[] flow = ["Not-Started", "Creation", "Repetition", "Ready To Repeat", "Done"];
            nodes.Add(new JsonObject { ["id"] = NodeId("__roadmap_legend_group__"), ["type"] = "group", ["label"] = "Legend", ["x"] = x - 20, ["y"] = -20, ["width"] = 540, ["height"] = 530 });
            string timestamp = (now ?? DateTimeOffset.Now).ToLocalTime().ToString("MMM dd yyyy | hh:mmtt", CultureInfo.InvariantCulture);
            nodes.Add(new JsonObject { ["id"] = NodeId("__roadmap_legend_header__"), ["type"] = "text", ["text"] = $"#### Roadmap legend\n**Generated:** {timestamp}", ["x"] = x, ["y"] = 0, ["width"] = 500, ["height"] = 110 });
            for (var index = 0; index < flow.Length; index++)
            {
                string status = flow[index];
                string id = NodeId("__roadmap_legend__" + status);
                var card = new JsonObject { ["id"] = id, ["type"] = "text", ["text"] = $"{status}: {counts.GetValueOrDefault(status)}", ["x"] = x + 60, ["y"] = 126 + index * 76, ["width"] = 380, ["height"] = 60 };
                if (Colors.TryGetValue(status, out string? color))
                {
                    card["color"] = color;
                }
                nodes.Add(card);
                if (index > 0)
                {
                    string previousStatus = flow[index - 1];
                    string previous = NodeId("__roadmap_legend__" + previousStatus);
                    string side = index % 2 == 1 ? "right" : "left";
                    var edge = new JsonObject { ["id"] = EdgeId(previous, id), ["fromNode"] = previous, ["fromSide"] = side, ["toNode"] = id, ["toSide"] = side };
                    if (Colors.TryGetValue(previousStatus, out string? previousColor))
                    {
                        edge["color"] = previousColor;
                    }
                    edges.Add(edge);
                }
            }
        }
        return new(new JsonObject
        {
            ["nodes"] = nodes,
            ["edges"] = edges,
            ["metadata"] = new JsonObject { ["version"] = "1.0-1.0", ["frontmatter"] = new JsonObject { ["publish"] = true, ["permalink"] = "/roadmap/", ["title"] = "Roadmap" } }
        }, invalid);
    }

    public static JsonNode NormalizeForComparison(JsonNode canvas)
    {
        JsonNode normalized = canvas.DeepClone();
        if (normalized["nodes"] is JsonArray nodes)
        {
            foreach (JsonNode? node in nodes)
            {
                if (node?["id"]?.GetValue<string>() == NodeId("__roadmap_legend_header__"))
                {
                    node["text"] = string.Join('\n', (node["text"]?.GetValue<string>() ?? "").Split('\n').Where(line => !line.StartsWith("**Generated:**", StringComparison.Ordinal)));
                    break;
                }
            }
        }
        return normalized;
    }

    public static JsonNode NormalizeCanvasForComparison(string canvas) => NormalizeForComparison(JsonNode.Parse(canvas) ?? throw new JsonException("Missing canvas"));

    public static JsonNode NormalizeCanvasForComparison(JsonNode canvas) => NormalizeForComparison(canvas);

    public static bool WriteIfChanged(JsonObject canvas, string path)
    {
        if (File.Exists(path))
        {
            try
            {
                JsonNode? old = JsonNode.Parse(File.ReadAllText(path));
                if (old is not null && JsonNode.DeepEquals(NormalizeForComparison(old), NormalizeForComparison(canvas)))
                {
                    return false;
                }
            }
            catch (Exception error) when (error is IOException or JsonException)
            {
                // An unreadable generated canvas is replaced by the current deterministic result.
            }
        }
        File.WriteAllText(path, canvas.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) + "\n", new UTF8Encoding(false));
        return true;
    }

    public static Task<int> RunAsync(string[] args)
    {
        if (args.Contains("--help") || args.Contains("-h"))
        {
            Console.WriteLine("Regenerate Vault/Home/Roadmap.canvas. --repo-root <checkout>");
            return Task.FromResult(0);
        }
        try
        {
            string root = args.Length == 2 && args[0] == "--repo-root" ? Path.GetFullPath(args[1]) : Repository.FindRoot();
            if (args.Length != 0 && !(args.Length == 2 && args[0] == "--repo-root"))
            {
                throw new ArgumentException("Expected --repo-root <checkout>");
            }
            RoadmapResult result = Generate(root);
            bool changed = WriteIfChanged(result.Canvas, Path.Combine(root, "Vault", "Home", "Roadmap.canvas"));
            foreach ((string path, string status) in result.InvalidStatuses.OrderBy(pair => pair.Key, StringComparer.Ordinal))
            {
                Console.Error.WriteLine($"[WARN] invalid status '{status}' in {Path.GetRelativePath(root, path).Replace('\\', '/')}");
            }
            Console.WriteLine($"Roadmap.canvas: {result.Canvas["nodes"]!.AsArray().Count} nodes, {result.Canvas["edges"]!.AsArray().Count} edges ({(changed ? "updated" : "no changes")})");
            return Task.FromResult(0);
        }
        catch (Exception error) when (error is IOException or ArgumentException or JsonException)
        {
            Console.Error.WriteLine(error.Message);
            return Task.FromResult(1);
        }
    }
}
