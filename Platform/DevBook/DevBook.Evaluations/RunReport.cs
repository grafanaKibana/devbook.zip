using System.Buffers;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;

// =============================================================================
// RunReport.cs — standalone "fancy" HTML report generator for the DevBook RAG
// retrieval evaluation.
//
// This tool is ADDITIVE and strictly READ-ONLY over the Microsoft.Extensions.AI
// (MEAI) on-disk results store. It does NOT touch the evaluation, the metric
// calculator, or how results are persisted, and it writes to a separate file
// (report.fancy.html by default) so `dotnet aieval report` keeps producing the
// unchanged report.html for the same run.
//
//   dotnet run Platform/DevBook/DevBook.Evaluations/RunReport.cs -- \
//       --run latest --open-browser
//
// Args:
//   --run <folder|latest>  Run folder under EvaluationReports/results (default: latest).
//                          Accepts an absolute path, a path relative to results/, or a
//                          bare run-folder name. "latest" picks the most recently written.
//   --output <path>        Output HTML path (default: <run>/report.fancy.html).
//   --open-browser         Open the generated report in the default browser.
// =============================================================================

#region Variables

const string ReportsFolderName = "EvaluationReports";
const string FancyReportFileName = "report.fancy.html";
const string DatasetFileName = "chunks-shared.json";

// Canonical ordering for stable matrix axes; unknown names are appended in
// discovery order so the tool stays robust to runs with a different config set
// (e.g. older runs that also include the "Llm" reranker).
string[] ChunkerOrder = ["FixedSize", "MarkdownSection", "Semantic"];
string[] RerankerOrder = ["NoReranking", "Bm25", "MaximalMarginalRelevance", "ReciprocalRankFusion", "Llm"];

var projectDirectory = ResolveProjectDirectory();
var resultsDir = Path.Combine(projectDirectory, ReportsFolderName, "results");
var runArg = ParseOption(args, "--run") ?? "latest";
var outputArg = ParseOption(args, "--output");
var openBrowser = ParseFlag(args, "--open-browser");

#endregion

Console.WriteLine("DevBook RAG — fancy report generator");
Console.WriteLine($"Project directory: {projectDirectory}");

var runFolder = ResolveRunFolder(resultsDir, runArg);
if (runFolder is null)
{
    Console.Error.WriteLine($"Could not resolve a run folder from '--run {runArg}'. Looked under: {resultsDir}");
    Environment.Exit(1);
    return;
}

Console.WriteLine($"Run folder: {runFolder}");

var datasetPath = Path.Combine(projectDirectory, "Datasets", DatasetFileName);
var model = BuildModel(runFolder, datasetPath);

if (model.ConfigCount == 0)
{
    Console.Error.WriteLine("No RAG.Search.<Chunker>.<Reranker> configuration folders were found in the run. Nothing to report.");
    Environment.Exit(1);
    return;
}

var outputPath = outputArg is not null
    ? Path.GetFullPath(outputArg)
    : Path.Combine(runFolder, FancyReportFileName);

// Manual Utf8JsonWriter walk (no reflection — reflection-based serialization is
// disabled by default for file-based apps). The default HTML-safe encoder escapes
// <, >, & to \u00xx so the embedded JSON cannot break out of the <script> tag.
var json = SerializeJson(model.Data);

// The report markup/CSS/JS lives in the editable sibling file
// report.fancy.template.html; `"__DC_DATA__"` is replaced with the run JSON and
// `__DC_TITLE__` with the run id. The generated report stays fully self-contained.
var templatePath = ResolveTemplatePath(projectDirectory);
var title = HtmlEscape(model.RunId);
var html = File.ReadAllText(templatePath)
    .Replace("__DC_TITLE__", title)
    .Replace("\"__DC_DATA__\"", json);

File.WriteAllText(outputPath, html);

Console.WriteLine($"Configurations: {model.ConfigCount} · cases (max per config): {model.MaxCases} · dataset join: {(model.HasDataset ? "yes" : "no")}");
Console.WriteLine($"Wrote fancy report -> {outputPath}");
Console.WriteLine($"  ({new FileInfo(outputPath).Length / 1024.0:F0} KiB, self-contained, offline)");

if (openBrowser)
{
    OpenInBrowser(outputPath);
}

return;

// =============================================================================
// Helpers
// =============================================================================

#region Argument parsing

static string? ParseOption(string[] arguments, string name)
{
    for (var i = 0; i < arguments.Length; i++)
    {
        if (arguments[i].Equals(name, StringComparison.OrdinalIgnoreCase))
        {
            return i + 1 < arguments.Length ? arguments[i + 1] : null;
        }

        var prefix = name + "=";
        if (arguments[i].StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return arguments[i][prefix.Length..];
        }
    }

    return null;
}

static bool ParseFlag(string[] arguments, string name)
{
    foreach (var arg in arguments)
    {
        if (arg.Equals(name, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var prefix = name + "=";
        if (arg.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return !arg[prefix.Length..].Equals("false", StringComparison.OrdinalIgnoreCase);
        }
    }

    return false;
}

#endregion

#region Directory resolution

static string ResolveProjectDirectory([CallerFilePath] string scriptPath = "")
{
    var scriptDirectory = Path.GetDirectoryName(scriptPath);
    if (!string.IsNullOrWhiteSpace(scriptDirectory) && File.Exists(Path.Combine(scriptDirectory, "DevBook.Evaluations.csproj")))
    {
        return scriptDirectory;
    }

    var fromCurrentDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Platform", "DevBook", "DevBook.Evaluations");
    if (File.Exists(Path.Combine(fromCurrentDirectory, "DevBook.Evaluations.csproj")))
    {
        return fromCurrentDirectory;
    }

    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (current is not null)
    {
        if (File.Exists(Path.Combine(current.FullName, "DevBook.Evaluations.csproj")))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    throw new DirectoryNotFoundException("Unable to locate DevBook.Evaluations.csproj.");
}

static string ResolveTemplatePath(string projectDirectory)
{
    const string TemplateFileName = "report.fancy.template.html";
    var path = Path.Combine(projectDirectory, TemplateFileName);
    if (File.Exists(path))
    {
        return path;
    }

    throw new FileNotFoundException(
        $"Report template not found at {path}. It must sit next to RunReport.cs in the DevBook.Evaluations project.");
}

static string? ResolveRunFolder(string resultsDir, string runArg)
{
    if (runArg.Equals("latest", StringComparison.OrdinalIgnoreCase))
    {
        if (!Directory.Exists(resultsDir))
        {
            return null;
        }

        return Directory.GetDirectories(resultsDir)
            .OrderByDescending(Directory.GetLastWriteTimeUtc)
            .FirstOrDefault();
    }

    if (Path.IsPathRooted(runArg) && Directory.Exists(runArg))
    {
        return Path.GetFullPath(runArg);
    }

    var asRelativeToResults = Path.Combine(resultsDir, runArg);
    if (Directory.Exists(asRelativeToResults))
    {
        return Path.GetFullPath(asRelativeToResults);
    }

    var asRelativeToCwd = Path.GetFullPath(runArg);
    return Directory.Exists(asRelativeToCwd) ? asRelativeToCwd : null;
}

#endregion

#region Model building

ReportModel BuildModel(string runFolder, string datasetPath)
{
    var dataset = LoadDataset(datasetPath);
    var hasDataset = dataset.Count > 0;

    // Discover configuration folders: RAG.Search.<Chunker>.<Reranker>, excluding
    // the Summary.* aggregate folder and any stray files.
    var configDirs = Directory.GetDirectories(runFolder)
        .Where(d =>
        {
            var name = Path.GetFileName(d);
            return name.StartsWith("RAG.Search.", StringComparison.Ordinal)
                   && !name.StartsWith("Summary.", StringComparison.Ordinal);
        })
        .ToArray();

    var summaryDir = Path.Combine(runFolder, "Summary.RAG.Search");

    var cases = new Dictionary<string, object?>();           // caseId -> { query, difficulty, expected[] }
    var perCase = new Dictionary<string, object?>();         // configId -> [ { id, rc, sr, p, r[] } ]
    var configs = new List<Dictionary<string, object?>>();
    var seenChunkers = new List<string>();
    var seenRerankers = new List<string>();
    var topKObserved = 0;
    var maxCases = 0;
    DateTime? latestCaseTime = null;

    foreach (var configDir in configDirs)
    {
        var folderName = Path.GetFileName(configDir);
        var rest = folderName["RAG.Search.".Length..]; // "<Chunker>.<Reranker>"
        var dot = rest.IndexOf('.');
        if (dot < 0)
        {
            continue;
        }

        var chunker = rest[..dot];
        var reranker = rest[(dot + 1)..];
        var configId = chunker + "::" + reranker;

        if (!seenChunkers.Contains(chunker)) seenChunkers.Add(chunker);
        if (!seenRerankers.Contains(reranker)) seenRerankers.Add(reranker);

        // ---- Per-case pass: collect bootstrap arrays + drill-down records ----
        var chunkArrays = new MetricArrays();
        var sectionArrays = new MetricArrays();
        var perCaseRows = new List<object?>();

        foreach (var caseFile in Directory.EnumerateFiles(configDir, "*.json"))
        {
            JsonDocument doc;
            try
            {
                doc = JsonDocument.Parse(File.ReadAllText(caseFile));
            }
            catch
            {
                continue;
            }

            using (doc)
            {
                var root = doc.RootElement;
                if (!root.TryGetProperty("iterationName", out var idEl)) continue;
                var caseId = idEl.GetString() ?? Path.GetFileNameWithoutExtension(caseFile);

                if (root.TryGetProperty("creationTime", out var ctEl)
                    && ctEl.TryGetDateTime(out var ct))
                {
                    if (latestCaseTime is null || ct > latestCaseTime) latestCaseTime = ct;
                }

                var query = ExtractText(root, "messages") ?? "";
                var retrievedText = ExtractModelResponseText(root) ?? "";
                var retrieved = retrievedText
                    .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(StripWikiBrackets)
                    .ToArray();
                if (retrieved.Length > topKObserved) topKObserved = retrieved.Length;

                if (!root.TryGetProperty("evaluationResult", out var evalEl)
                    || !evalEl.TryGetProperty("metrics", out var metrics))
                {
                    continue;
                }

                chunkArrays.Add(metrics, MetricNames.Chunk);
                sectionArrays.Add(metrics, MetricNames.Section);

                var recall = GetValue(metrics, "RecallAtR");
                var sectionRecall = GetValue(metrics, "SectionRecallAtR");
                var failed = GetFailed(metrics, "RecallAtR");

                perCaseRows.Add(new Dictionary<string, object?>
                {
                    ["id"] = caseId,
                    ["rc"] = recall,
                    ["sr"] = sectionRecall,
                    ["p"] = !failed,            // pass = RecallAtR not flagged failed (authoritative)
                    ["r"] = retrieved,
                });

                // Register the case once (query is identical across configs).
                if (!cases.ContainsKey(caseId))
                {
                    dataset.TryGetValue(caseId, out var dsCase);
                    cases[caseId] = new Dictionary<string, object?>
                    {
                        ["query"] = query,
                        ["difficulty"] = dsCase?.Difficulty,
                        ["expected"] = dsCase?.Expected ?? new List<object?>(),
                    };
                }
            }
        }

        if (perCaseRows.Count > maxCases) maxCases = perCaseRows.Count;
        perCase[configId] = perCaseRows;

        // ---- Summary aggregate: authoritative point estimates + ratings + CIs ----
        var summaryFile = Path.Combine(summaryDir, $"{chunker}.{reranker}.json");
        JsonElement? summaryMetrics = null;
        JsonDocument? summaryDoc = null;
        if (File.Exists(summaryFile))
        {
            try
            {
                summaryDoc = JsonDocument.Parse(File.ReadAllText(summaryFile));
                if (summaryDoc.RootElement.TryGetProperty("evaluationResult", out var er)
                    && er.TryGetProperty("metrics", out var sm))
                {
                    summaryMetrics = sm.Clone();
                }
            }
            catch { /* fall back to per-case means below */ }
            finally { summaryDoc?.Dispose(); }
        }

        var chunkLevel = BuildLevel(summaryMetrics, MetricNames.Chunk, chunkArrays, configId, "chunk");
        var sectionLevel = BuildLevel(summaryMetrics, MetricNames.Section, sectionArrays, configId, "section");

        var ci = IndexOfOrAppend(ChunkerOrder, chunker);
        var ri = IndexOfOrAppend(RerankerOrder, reranker);

        configs.Add(new Dictionary<string, object?>
        {
            ["id"] = configId,
            ["chunker"] = chunker,
            ["reranker"] = reranker,
            ["rShort"] = RerankerShort(reranker),
            ["ci"] = ci,
            ["ri"] = ri,
            ["levels"] = new Dictionary<string, object?>
            {
                ["chunk"] = chunkLevel,
                ["section"] = sectionLevel,
            },
        });
    }

    // Order axes canonically (known names first in canonical order, unknowns appended).
    var chunkers = OrderKnownFirst(seenChunkers, ChunkerOrder);
    var rerankers = OrderKnownFirst(seenRerankers, RerankerOrder);

    // Winner: highest chunk-level RecallAtR.
    string? winnerId = null;
    var bestRecall = double.NegativeInfinity;
    foreach (var c in configs)
    {
        var v = LevelRecallValue(c);
        if (v > bestRecall)
        {
            bestRecall = v;
            winnerId = (string)c["id"]!;
        }
    }

    var runId = Path.GetFileName(runFolder);
    var sampleCount = configs.Count > 0 ? LevelN(configs[0]) : maxCases;

    var run = new Dictionary<string, object?>
    {
        ["id"] = runId,
        ["finished"] = (latestCaseTime ?? Directory.GetLastWriteTimeUtc(runFolder))
            .ToString("yyyy-MM-dd HH:mm 'UTC'", CultureInfo.InvariantCulture),
        ["cases"] = sampleCount,
        ["configs"] = configs.Count,
        ["chunkersN"] = chunkers.Count,
        ["rerankersN"] = rerankers.Count,
        ["topK"] = topKObserved,
        ["dataset"] = hasDataset ? $"shared ({cases.Count})" : "—",
        ["generatedAt"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm 'UTC'", CultureInfo.InvariantCulture),
    };

    var rShort = new Dictionary<string, object?>();
    foreach (var r in rerankers) rShort[r] = RerankerShort(r);

    var data = new Dictionary<string, object?>
    {
        ["run"] = run,
        ["configs"] = configs,
        ["winnerId"] = winnerId,
        ["chunkers"] = chunkers,
        ["rerankers"] = rerankers,
        ["rShort"] = rShort,
        ["hasDataset"] = hasDataset,
        ["cases"] = cases,
        ["perCase"] = perCase,
    };

    return new ReportModel(data, runId, configs.Count, maxCases, hasDataset);
}

static Dictionary<string, object?> BuildLevel(
    JsonElement? summary, MetricNames names, MetricArrays arrays, string configId, string level)
{
    Dictionary<string, object?> Metric(string canonicalName, string ciFieldName, double[] samples)
    {
        var v = summary is not null ? GetValue(summary.Value, canonicalName) : null;
        v ??= Mean(samples);
        var rating = summary is not null ? GetRating(summary.Value, canonicalName) : "Unknown";

        // Prefer the store's published bootstrap CI (only present for the four
        // chunk-level ranking metrics) so numbers match report.html exactly.
        // Otherwise bootstrap a 95% CI from this config's per-case values.
        var stored = summary is not null ? GetStoredCI(summary.Value, canonicalName) : (null, null);
        double lo, hi;
        if (stored.Item1 is double sl && stored.Item2 is double sh)
        {
            (lo, hi) = (sl, sh);
        }
        else
        {
            (lo, hi) = Bootstrap(samples, StableSeed(configId + "|" + level + "|" + ciFieldName));
        }

        return new Dictionary<string, object?>
        {
            ["v"] = Round(v),
            ["lo"] = Round(lo),
            ["hi"] = Round(hi),
            ["rating"] = rating,
        };
    }

    var emptyV = summary is not null ? GetValue(summary.Value, "EmptyResultRate") : null;
    var emptyRating = summary is not null ? GetRating(summary.Value, "EmptyResultRate") : "Unknown";
    var scoreV = summary is not null ? GetValue(summary.Value, "ScoreAverage") : null;
    var n = summary is not null ? GetValue(summary.Value, "SampleCount") : null;

    return new Dictionary<string, object?>
    {
        ["recall"] = Metric(names.Recall, "recall", arrays.Recall.ToArray()),
        ["ndcg"] = Metric(names.Ndcg, "ndcg", arrays.Ndcg.ToArray()),
        ["hit"] = Metric(names.Hit, "hit", arrays.Hit.ToArray()),
        ["mrr"] = Metric(names.Mrr, "mrr", arrays.Mrr.ToArray()),
        ["map"] = Metric(names.Map, "map", arrays.Map.ToArray()),
        // EmptyResultRate, ScoreAverage and SampleCount have no chunk/section twin
        // in the store, so both levels reuse the single aggregate value.
        ["empty"] = new Dictionary<string, object?> { ["v"] = Round(emptyV ?? 0), ["rating"] = emptyRating },
        ["score"] = Round(scoreV ?? 0),
        ["n"] = (int)Math.Round(n ?? arrays.Recall.Count),
    };
}

#endregion

#region Dataset join

static Dictionary<string, DatasetCase> LoadDataset(string datasetPath)
{
    var map = new Dictionary<string, DatasetCase>(StringComparer.Ordinal);
    if (!File.Exists(datasetPath))
    {
        return map;
    }

    try
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(datasetPath));
        if (!doc.RootElement.TryGetProperty("cases", out var caseArray))
        {
            return map;
        }

        foreach (var c in caseArray.EnumerateArray())
        {
            if (!c.TryGetProperty("id", out var idEl)) continue;
            var id = idEl.GetString();
            if (string.IsNullOrEmpty(id)) continue;

            var difficulty = c.TryGetProperty("difficulty", out var dEl) ? dEl.GetString() : null;
            var expected = new List<object?>();
            if (c.TryGetProperty("expected", out var expArr) && expArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var e in expArr.EnumerateArray())
                {
                    var citationLabel = e.TryGetProperty("citationLabel", out var clEl) ? clEl.GetString() ?? "" : "";
                    var heading = e.TryGetProperty("heading", out var hEl) && hEl.ValueKind == JsonValueKind.String
                        ? hEl.GetString() ?? ""
                        : "";
                    expected.Add(new Dictionary<string, object?>
                    {
                        ["note"] = NoteBasename(citationLabel),
                        ["heading"] = heading,
                    });
                }
            }

            map[id] = new DatasetCase(difficulty, expected);
        }
    }
    catch
    {
        return new Dictionary<string, DatasetCase>(StringComparer.Ordinal);
    }

    return map;
}

#endregion

#region JSON extraction

static string? ExtractText(JsonElement root, string messagesProp)
{
    if (root.TryGetProperty(messagesProp, out var messages)
        && messages.ValueKind == JsonValueKind.Array
        && messages.GetArrayLength() > 0)
    {
        return FirstContentText(messages[0]);
    }

    return null;
}

static string? ExtractModelResponseText(JsonElement root)
{
    if (root.TryGetProperty("modelResponse", out var mr)
        && mr.TryGetProperty("messages", out var messages)
        && messages.ValueKind == JsonValueKind.Array
        && messages.GetArrayLength() > 0)
    {
        return FirstContentText(messages[0]);
    }

    return null;
}

static string? FirstContentText(JsonElement message)
{
    if (message.TryGetProperty("contents", out var contents)
        && contents.ValueKind == JsonValueKind.Array
        && contents.GetArrayLength() > 0
        && contents[0].TryGetProperty("text", out var textEl))
    {
        return textEl.GetString();
    }

    return null;
}

static double? GetValue(JsonElement metrics, string name)
{
    if (metrics.TryGetProperty(name, out var m)
        && m.TryGetProperty("value", out var v)
        && v.ValueKind == JsonValueKind.Number)
    {
        return v.GetDouble();
    }

    return null;
}

static bool GetFailed(JsonElement metrics, string name)
{
    return metrics.TryGetProperty(name, out var m)
           && m.TryGetProperty("interpretation", out var it)
           && it.TryGetProperty("failed", out var f)
           && f.ValueKind == JsonValueKind.True;
}

static string GetRating(JsonElement metrics, string name)
{
    if (metrics.TryGetProperty(name, out var m)
        && m.TryGetProperty("interpretation", out var it)
        && it.TryGetProperty("rating", out var r)
        && r.ValueKind == JsonValueKind.String)
    {
        return Capitalize(r.GetString());
    }

    return "Unknown";
}

static (double?, double?) GetStoredCI(JsonElement metrics, string name)
{
    if (metrics.TryGetProperty(name, out var m)
        && m.TryGetProperty("reason", out var reasonEl)
        && reasonEl.ValueKind == JsonValueKind.String)
    {
        var match = Regex.Match(reasonEl.GetString() ?? "",
            @"Bootstrap 95% CI: \[([0-9.]+), ([0-9.]+)\]");
        if (match.Success)
        {
            return (
                double.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture),
                double.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture));
        }
    }

    return (null, null);
}

#endregion

#region Numeric helpers

static (double lo, double hi) Bootstrap(double[] xs, int seed, int iterations = 2000)
{
    if (xs.Length == 0) return (0, 0);
    if (xs.Length == 1) return (xs[0], xs[0]);

    var rng = new Random(seed);
    var means = new double[iterations];
    var n = xs.Length;
    for (var b = 0; b < iterations; b++)
    {
        double sum = 0;
        for (var i = 0; i < n; i++)
        {
            sum += xs[rng.Next(n)];
        }
        means[b] = sum / n;
    }

    Array.Sort(means);
    var lo = means[(int)(0.025 * iterations)];
    var hi = means[(int)Math.Min(iterations - 1, 0.975 * iterations)];
    return (lo, hi);
}

static double? Mean(double[] xs) => xs.Length == 0 ? null : xs.Average();

static string SerializeJson(object? data)
{
    var buffer = new ArrayBufferWriter<byte>();
    using (var writer = new Utf8JsonWriter(buffer, new JsonWriterOptions { Encoder = JavaScriptEncoder.Default }))
    {
        WriteJsonValue(writer, data);
    }

    return Encoding.UTF8.GetString(buffer.WrittenSpan);
}

static void WriteJsonValue(Utf8JsonWriter w, object? v)
{
    switch (v)
    {
        case null:
            w.WriteNullValue();
            break;
        case string s:
            w.WriteStringValue(s);
            break;
        case bool b:
            w.WriteBooleanValue(b);
            break;
        case int i:
            w.WriteNumberValue(i);
            break;
        case long l:
            w.WriteNumberValue(l);
            break;
        case double d:
            w.WriteNumberValue(double.IsFinite(d) ? d : 0);
            break;
        case IDictionary<string, object?> dict:
            w.WriteStartObject();
            foreach (var kv in dict)
            {
                w.WritePropertyName(kv.Key);
                WriteJsonValue(w, kv.Value);
            }
            w.WriteEndObject();
            break;
        case System.Collections.IEnumerable seq:
            w.WriteStartArray();
            foreach (var item in seq)
            {
                WriteJsonValue(w, item);
            }
            w.WriteEndArray();
            break;
        default:
            w.WriteStringValue(v.ToString());
            break;
    }
}

static double Round(double? v) => v is null ? 0 : Math.Round(v.Value, 5);

static int StableSeed(string s)
{
    unchecked
    {
        var h = 2166136261;
        foreach (var ch in s)
        {
            h ^= ch;
            h *= 16777619;
        }
        return (int)h;
    }
}

#endregion

#region String helpers

static string Capitalize(string? s)
    => string.IsNullOrEmpty(s) ? "Unknown" : char.ToUpperInvariant(s[0]) + s[1..];

static string StripWikiBrackets(string s)
{
    s = s.Trim();
    if (s.StartsWith("[[", StringComparison.Ordinal)) s = s[2..];
    if (s.EndsWith("]]", StringComparison.Ordinal)) s = s[..^2];
    return s.Trim();
}

static string NoteBasename(string citationLabel)
{
    if (string.IsNullOrEmpty(citationLabel)) return "";
    var name = citationLabel.Replace('\\', '/');
    var slash = name.LastIndexOf('/');
    if (slash >= 0) name = name[(slash + 1)..];
    if (name.EndsWith(".md", StringComparison.OrdinalIgnoreCase)) name = name[..^3];
    return name.Trim();
}

static string RerankerShort(string reranker) => reranker switch
{
    "NoReranking" => "None",
    "Bm25" => "BM25",
    "MaximalMarginalRelevance" => "MMR",
    "ReciprocalRankFusion" => "RRF",
    "Llm" => "LLM",
    _ => reranker,
};

static int IndexOfOrAppend(string[] order, string value)
{
    var idx = Array.IndexOf(order, value);
    return idx >= 0 ? idx : order.Length + value.GetHashCode() % 100;
}

static List<string> OrderKnownFirst(List<string> seen, string[] order)
{
    var result = order.Where(seen.Contains).ToList();
    result.AddRange(seen.Where(s => !order.Contains(s)));
    return result;
}

static double LevelRecallValue(Dictionary<string, object?> config)
{
    var levels = (Dictionary<string, object?>)config["levels"]!;
    var chunk = (Dictionary<string, object?>)levels["chunk"]!;
    var recall = (Dictionary<string, object?>)chunk["recall"]!;
    return Convert.ToDouble(recall["v"]);
}

static int LevelN(Dictionary<string, object?> config)
{
    var levels = (Dictionary<string, object?>)config["levels"]!;
    var chunk = (Dictionary<string, object?>)levels["chunk"]!;
    return Convert.ToInt32(chunk["n"]);
}

static string HtmlEscape(string s) => s
    .Replace("&", "&amp;")
    .Replace("<", "&lt;")
    .Replace(">", "&gt;");

static void OpenInBrowser(string path)
{
    try
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            Process.Start(new ProcessStartInfo { FileName = path, UseShellExecute = true });
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            Process.Start("open", path);
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            Process.Start("xdg-open", path);
        }

        Console.WriteLine("Report opened in default browser.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Could not open report automatically: {ex.Message}");
        Console.WriteLine($"Please open manually: {path}");
    }
}

#endregion

// =============================================================================
// Types
// =============================================================================

record ReportModel(Dictionary<string, object?> Data, string RunId, int ConfigCount, int MaxCases, bool HasDataset);

record DatasetCase(string? Difficulty, List<object?> Expected);

readonly record struct MetricNames(string Recall, string Ndcg, string Hit, string Mrr, string Map)
{
    public static readonly MetricNames Chunk = new("RecallAtR", "NDCGAt10", "HitRateAt1", "MRRAt10", "MAPAt10");
    public static readonly MetricNames Section = new("SectionRecallAtR", "SectionNDCGAt10", "SectionHitRateAt1", "SectionMRRAt10", "SectionMAPAt10");
}

sealed class MetricArrays
{
    public List<double> Recall { get; } = new();
    public List<double> Ndcg { get; } = new();
    public List<double> Hit { get; } = new();
    public List<double> Mrr { get; } = new();
    public List<double> Map { get; } = new();

    public void Add(JsonElement metrics, MetricNames names)
    {
        AddOne(metrics, names.Recall, Recall);
        AddOne(metrics, names.Ndcg, Ndcg);
        AddOne(metrics, names.Hit, Hit);
        AddOne(metrics, names.Mrr, Mrr);
        AddOne(metrics, names.Map, Map);
    }

    static void AddOne(JsonElement metrics, string name, List<double> target)
    {
        if (metrics.TryGetProperty(name, out var m)
            && m.TryGetProperty("value", out var v)
            && v.ValueKind == JsonValueKind.Number)
        {
            target.Add(v.GetDouble());
        }
    }
}
