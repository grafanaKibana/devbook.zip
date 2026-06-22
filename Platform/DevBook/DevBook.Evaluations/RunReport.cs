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

// Canonical ordering for stable matrix axes; unknown names are appended in
// discovery order so the tool stays robust to runs with a different config set
// (e.g. older runs that also include the "Llm" reranker).
string[] ChunkerOrder = ["FixedSize", "MarkdownSection", "Semantic"];
string[] RerankerOrder = ["NoReranking", "Bm25", "MaximalMarginalRelevance", "ReciprocalRankFusion", "Llm"];

// Single source of truth for metrics. Drives store extraction (chunk/section names),
// the per-case drill detail, the bootstrap-CI samples, and the emitted DATA.metrics
// registry the report renders from. Adding/changing a metric is one entry here — no
// code changes in the generator or the template.
//             key       label        chunk store name   section twin              kind       low    sel    detail bar    gate  table sub
MetricSpec[] Metrics =
[
    new("recall", "RecallAtR", "RecallAtR",       "SectionRecallAtR",       "ranking", false, true,  true,  true,  true,  "± 95% CI"),
    new("ndcg",   "NDCG@10",   "NDCGAt10",        "SectionNDCGAt10",        "ranking", false, true,  true,  true,  false, "± 95% CI"),
    new("hit",    "HitRate@1", "HitRateAt1",      "SectionHitRateAt1",      "ranking", false, true,  true,  false, false, ""),
    new("mrr",    "MRR@10",    "MRRAt10",         "SectionMRRAt10",         "ranking", false, true,  true,  false, false, ""),
    new("map",    "MAP@10",    "MAPAt10",         "SectionMAPAt10",         "ranking", false, true,  true,  false, false, ""),
    new("empty",  "EmptyRate", "EmptyResultRate", null,                     "rate",    true,  true,  false, false, false, "lower better"),
    new("score",  "ScoreAvg",  "ScoreAverage",    null,                     "score",   false, false, false, false, false, "diagnostic"),
    new("n",      "n",         "SampleCount",     null,                     "count",   false, false, false, false, false, ""),
];
var gateMetric = Metrics.First(m => m.Gate);

// The metric registry, shaped for the embedded DATA blob so the report is data-driven.
List<object?> MetricsForJs() => Metrics.Select(s => (object?)new Dictionary<string, object?>
{
    ["key"] = s.Key, ["label"] = s.Label, ["better"] = s.BetterLow ? "low" : "high",
    ["ci"] = s.Kind == "ranking", ["inSelector"] = s.InSelector, ["inDetail"] = s.InDetail,
    ["bar"] = s.Bar, ["gate"] = s.Gate, ["kind"] = s.Kind, ["sub"] = s.TableSub,
}).ToList();

var projectDirectory = ResolveProjectDirectory();
var resultsDir = Path.Combine(projectDirectory, ReportsFolderName, "results");
var runArg = ParseOption(args, "--run") ?? "latest";
var outputArg = ParseOption(args, "--output");
var openBrowser = ParseFlag(args, "--open-browser");
// Opt-in: also (re)generate the MEAI standard report.html via `dotnet aieval report`
// alongside the fancy report. Off by default so this tool stays read-only/additive.
var withStandard = ParseFlag(args, "--with-standard");

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

var datasetDir = Path.Combine(projectDirectory, "Datasets");
var model = BuildModel(runFolder, datasetDir);

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

if (withStandard)
{
    GenerateStandardReport(projectDirectory, runFolder, ReportsFolderName);
}

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

ReportModel BuildModel(string primaryRunFolder, string datasetDir)
{
    var dataset = LoadDataset(datasetDir);
    var hasDataset = dataset.Count > 0;
    var resultsRoot = Directory.GetParent(primaryRunFolder)?.FullName ?? primaryRunFolder;

    // Discover every run that carries aggregate summaries (needed for the cross-run
    // comparison tab), most-recent first; always include the primary run.
    var runFolders = Directory.Exists(resultsRoot)
        ? Directory.GetDirectories(resultsRoot)
            .Where(d => Directory.Exists(Path.Combine(d, "Summary.RAG.Search")))
            .OrderByDescending(Directory.GetLastWriteTimeUtc)
            .ToList()
        : new List<string>();
    if (!runFolders.Any(d => PathEquals(d, primaryRunFolder)))
    {
        runFolders.Insert(0, primaryRunFolder);
    }

    var runsList = new List<object?>();          // [{ run, configs }] for the comparison tab
    RunBuild? primary = null;

    foreach (var rf in runFolders)
    {
        var isPrimary = PathEquals(rf, primaryRunFolder);
        var rb = BuildRunData(rf, dataset, isPrimary);
        if (rb.ConfigCount == 0) continue;
        runsList.Add(new Dictionary<string, object?> { ["run"] = rb.Run, ["configs"] = rb.Configs });
        if (isPrimary) primary = rb;
    }

    primary ??= BuildRunData(primaryRunFolder, dataset, true);

    var data = new Dictionary<string, object?>
    {
        ["run"] = primary.Run,
        ["configs"] = primary.Configs,
        ["winnerId"] = primary.WinnerId,
        ["chunkers"] = primary.Chunkers,
        ["rerankers"] = primary.Rerankers,
        ["rShort"] = primary.RShort,
        ["hasDataset"] = hasDataset,
        ["cases"] = primary.Cases,
        ["perCase"] = primary.PerCase,
        ["metricDefs"] = primary.MetricDefs,
        ["metrics"] = MetricsForJs(),
        ["runs"] = runsList,
        // Every non-custom scenario in the store, rendered with the generic default view.
        // RAG.Search above is the bespoke case; everything else flows through here unchanged.
        ["judge"] = GenericStoreReader.Build(primaryRunFolder),
    };

    return new ReportModel(data, primary.RunId, primary.ConfigCount, primary.MaxCases, hasDataset);
}

// Builds one run: aggregate per-config metrics (always) plus, when wantDetail is
// set (the primary run), the rich per-query drill-down records, the case map and
// the static metric definitions. Reading per-case values is also what powers the
// bootstrap CIs, so it runs for every summarised run.
RunBuild BuildRunData(string runFolder, Dictionary<string, DatasetCase> dataset, bool wantDetail)
{
    var hasDataset = dataset.Count > 0;
    var configDirs = Directory.GetDirectories(runFolder)
        .Where(d =>
        {
            var name = Path.GetFileName(d);
            return name.StartsWith("RAG.Search.", StringComparison.Ordinal)
                   && !name.StartsWith("Summary.", StringComparison.Ordinal);
        })
        .ToArray();

    var summaryDir = Path.Combine(runFolder, "Summary.RAG.Search");

    var cases = new Dictionary<string, object?>();
    var perCase = new Dictionary<string, object?>();
    var metricDefs = new Dictionary<string, object?>();
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
        if (dot < 0) continue;

        var chunker = rest[..dot];
        var reranker = rest[(dot + 1)..];
        var configId = chunker + "::" + reranker;

        if (!seenChunkers.Contains(chunker)) seenChunkers.Add(chunker);
        if (!seenRerankers.Contains(reranker)) seenRerankers.Add(reranker);

        var chunkArrays = new MetricArrays();
        var sectionArrays = new MetricArrays();
        var perCaseRows = new List<object?>();

        foreach (var caseFile in Directory.EnumerateFiles(configDir, "*.json"))
        {
            JsonDocument doc;
            try { doc = JsonDocument.Parse(File.ReadAllText(caseFile)); }
            catch { continue; }

            using (doc)
            {
                var root = doc.RootElement;
                if (!root.TryGetProperty("iterationName", out var idEl)) continue;
                var caseId = idEl.GetString() ?? Path.GetFileNameWithoutExtension(caseFile);

                if (root.TryGetProperty("creationTime", out var ctEl) && ctEl.TryGetDateTime(out var ct))
                {
                    if (latestCaseTime is null || ct > latestCaseTime) latestCaseTime = ct;
                }

                if (!root.TryGetProperty("evaluationResult", out var evalEl)
                    || !evalEl.TryGetProperty("metrics", out var metrics))
                {
                    continue;
                }

                // Always collected — these feed the bootstrap CIs for every run.
                chunkArrays.Add(metrics, Metrics, section: false);
                sectionArrays.Add(metrics, Metrics, section: true);

                if (!wantDetail) continue;

                var query = ExtractText(root, "messages") ?? "";
                var retrievedText = ExtractModelResponseText(root) ?? "";
                var retrieved = retrievedText
                    .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(StripWikiBrackets)
                    .ToArray();
                if (retrieved.Length > topKObserved) topKObserved = retrieved.Length;

                // Per-metric detail for the expandable drill-down (registry-driven):
                // value, rating, and the authoritative per-case interpretation.reason.
                var dm = new Dictionary<string, object?>();
                foreach (var s in Metrics)
                {
                    if (!s.InDetail) continue;
                    dm[s.Key] = new Dictionary<string, object?>
                    {
                        ["v"] = GetValue(metrics, s.Chunk),
                        ["rt"] = GetRating(metrics, s.Chunk),
                        ["in"] = GetInterpReason(metrics, s.Chunk),
                    };
                }

                var credited = GetDiagnostic(metrics, "ScoreAverage", "CreditedScoreAverage");
                var uncredited = GetDiagnostic(metrics, "ScoreAverage", "UncreditedScoreAverage");

                perCaseRows.Add(new Dictionary<string, object?>
                {
                    ["id"] = caseId,
                    ["p"] = !GetFailed(metrics, gateMetric.Chunk),   // authoritative pass/fail (coverage gate)
                    ["r"] = retrieved,
                    ["dm"] = dm,
                    ["diag"] = new List<object?>
                    {
                        credited is null ? null : Round(credited),
                        uncredited is null ? null : Round(uncredited),
                    },
                });

                if (metricDefs.Count == 0)
                {
                    foreach (var s in Metrics)
                    {
                        if (s.InDetail) metricDefs[s.Key] = GetDef(metrics, s.Chunk);
                    }
                }

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
        if (wantDetail) perCase[configId] = perCaseRows;

        var summaryFile = Path.Combine(summaryDir, $"{chunker}.{reranker}.json");
        JsonElement? summaryMetrics = null;
        if (File.Exists(summaryFile))
        {
            try
            {
                using var summaryDoc = JsonDocument.Parse(File.ReadAllText(summaryFile));
                if (summaryDoc.RootElement.TryGetProperty("evaluationResult", out var er)
                    && er.TryGetProperty("metrics", out var sm))
                {
                    summaryMetrics = sm.Clone();
                }
            }
            catch { /* fall back to per-case means in BuildLevel */ }
        }

        var chunkLevel = BuildLevel(summaryMetrics, section: false, chunkArrays, configId, "chunk", Metrics);
        var sectionLevel = BuildLevel(summaryMetrics, section: true, sectionArrays, configId, "section", Metrics);

        configs.Add(new Dictionary<string, object?>
        {
            ["id"] = configId,
            ["chunker"] = chunker,
            ["reranker"] = reranker,
            ["rShort"] = RerankerShort(reranker),
            ["ci"] = IndexOfOrAppend(ChunkerOrder, chunker),
            ["ri"] = IndexOfOrAppend(RerankerOrder, reranker),
            ["levels"] = new Dictionary<string, object?> { ["chunk"] = chunkLevel, ["section"] = sectionLevel },
        });
    }

    var chunkers = OrderKnownFirst(seenChunkers, ChunkerOrder);
    var rerankers = OrderKnownFirst(seenRerankers, RerankerOrder);

    string? winnerId = null;
    var bestRecall = double.NegativeInfinity;
    foreach (var c in configs)
    {
        var v = LevelRecallValue(c);
        if (v > bestRecall) { bestRecall = v; winnerId = (string)c["id"]!; }
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
        ["note"] = $"{sampleCount} queries · {configs.Count} configs",
        ["generatedAt"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm 'UTC'", CultureInfo.InvariantCulture),
    };

    var rShort = new Dictionary<string, object?>();
    foreach (var rr in rerankers) rShort[rr] = RerankerShort(rr);

    return new RunBuild(run, configs, winnerId, chunkers, rerankers, rShort, cases, perCase, metricDefs, runId, configs.Count, maxCases);
}

// Builds one level (chunk or section) of per-config aggregates, registry-driven.
// Ranking metrics carry a 95% CI (the store's published one where available, else a
// bootstrap from this config's per-case values); EmptyResultRate / ScoreAverage /
// SampleCount have no chunk/section twin, so the section level reuses the chunk name.
static Dictionary<string, object?> BuildLevel(
    JsonElement? summary, bool section, MetricArrays arrays, string configId, string level, MetricSpec[] specs)
{
    double? Val(string name) => summary is not null ? GetValue(summary.Value, name) : null;
    string Rt(string name) => summary is not null ? GetRating(summary.Value, name) : "Unknown";

    var lvl = new Dictionary<string, object?>();
    foreach (var s in specs)
    {
        var name = section ? (s.Section ?? s.Chunk) : s.Chunk;
        var v = Val(name);

        switch (s.Kind)
        {
            case "ranking":
            {
                var samples = arrays.Get(s.Key);
                v ??= Mean(samples);
                var stored = summary is not null ? GetStoredCI(summary.Value, name) : (null, null);
                double lo, hi;
                if (stored.Item1 is double sl && stored.Item2 is double sh)
                {
                    (lo, hi) = (sl, sh);
                }
                else
                {
                    (lo, hi) = Bootstrap(samples, StableSeed(configId + "|" + level + "|" + s.Key));
                }

                lvl[s.Key] = new Dictionary<string, object?>
                {
                    ["v"] = Round(v), ["lo"] = Round(lo), ["hi"] = Round(hi), ["rating"] = Rt(name),
                };
                break;
            }
            case "rate":
                lvl[s.Key] = new Dictionary<string, object?> { ["v"] = Round(v ?? 0), ["rating"] = Rt(name) };
                break;
            case "count":
                lvl[s.Key] = (int)Math.Round(v ?? arrays.Count);
                break;
            default: // "score" — bare diagnostic number
                lvl[s.Key] = Round(v ?? 0);
                break;
        }
    }

    return lvl;
}

#endregion

#region Dataset join

// Merges every chunks-*.json under Datasets/ into one case→evidence lookup. A run only
// records which dataset variant it used via an env var at eval time (not on disk), so the
// report cannot tell a full run from a --mini run; merging full and mini files keeps the
// join correct for either. Mini files are read last so their entries win on id collision
// (a mini case is a freshly generated copy, not necessarily identical to the full one).
static Dictionary<string, DatasetCase> LoadDataset(string datasetDir)
{
    var map = new Dictionary<string, DatasetCase>(StringComparer.Ordinal);
    if (!Directory.Exists(datasetDir))
    {
        return map;
    }

    var files = Directory.GetFiles(datasetDir, "chunks-*.json")
        .OrderBy(f => f.Contains("-mini", StringComparison.OrdinalIgnoreCase) ? 1 : 0)
        .ThenBy(Path.GetFileName, StringComparer.Ordinal);

    foreach (var file in files)
    {
        MergeDatasetFile(file, map);
    }

    return map;
}

static void MergeDatasetFile(string datasetPath, Dictionary<string, DatasetCase> map)
{
    try
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(datasetPath));
        if (!doc.RootElement.TryGetProperty("cases", out var caseArray))
        {
            return;
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
        // Skip an unreadable/malformed dataset file rather than dropping the whole join.
    }
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

static string GetInterpReason(JsonElement metrics, string name)
{
    if (metrics.TryGetProperty(name, out var m)
        && m.TryGetProperty("interpretation", out var it)
        && it.TryGetProperty("reason", out var r)
        && r.ValueKind == JsonValueKind.String)
    {
        return r.GetString() ?? "";
    }

    return "";
}

static string GetDef(JsonElement metrics, string name)
{
    // The per-case `reason` is the static metric definition (summaries append an
    // "Aggregated as…" sentence; per-case files do not).
    if (metrics.TryGetProperty(name, out var m)
        && m.TryGetProperty("reason", out var r)
        && r.ValueKind == JsonValueKind.String)
    {
        return r.GetString() ?? "";
    }

    return "";
}

static double? GetDiagnostic(JsonElement metrics, string metricName, string diagnosticKey)
{
    if (metrics.TryGetProperty(metricName, out var m)
        && m.TryGetProperty("diagnostics", out var diags)
        && diags.ValueKind == JsonValueKind.Array)
    {
        var prefix = diagnosticKey + "=";
        foreach (var d in diags.EnumerateArray())
        {
            if (d.TryGetProperty("message", out var msg)
                && msg.ValueKind == JsonValueKind.String)
            {
                var s = msg.GetString() ?? "";
                if (s.StartsWith(prefix, StringComparison.Ordinal)
                    && double.TryParse(s[prefix.Length..], NumberStyles.Float, CultureInfo.InvariantCulture, out var val))
                {
                    return val;
                }
            }
        }
    }

    return null;
}

static bool PathEquals(string a, string b) => string.Equals(
    Path.GetFullPath(a).TrimEnd(Path.DirectorySeparatorChar),
    Path.GetFullPath(b).TrimEnd(Path.DirectorySeparatorChar),
    StringComparison.OrdinalIgnoreCase);

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

// Runs the official `dotnet aieval report` tool to (re)generate the MEAI standard
// report.html for this run, next to the fancy report. Non-fatal: a failure here never
// affects the already-written report.fancy.html.
static void GenerateStandardReport(string projectDirectory, string runFolder, string reportsFolderName)
{
    var standardOutput = Path.Combine(runFolder, "report.html");
    Console.WriteLine("Generating MEAI standard report (dotnet aieval report)...");
    try
    {
        var process = Process.Start(new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = $"aieval report --path {reportsFolderName} --output \"{standardOutput}\"",
            WorkingDirectory = projectDirectory,
            UseShellExecute = false,
        });
        process?.WaitForExit();
        if (process is { ExitCode: 0 })
        {
            Console.WriteLine($"Wrote standard report -> {standardOutput}");
        }
        else
        {
            Console.Error.WriteLine($"`dotnet aieval report` exited with code {process?.ExitCode ?? -1} (non-fatal; the fancy report is unaffected).");
        }
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"Could not run `dotnet aieval report`: {ex.Message} (non-fatal).");
    }
}

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

// =============================================================================
// GenericStoreReader — renders ANY non-custom scenario in the MEAI store with the
// default ("judge") view. This is the reusable core of the report: copy this file
// plus the template into another project and every scenario it writes renders here
// with no changes — only genuinely bespoke scenarios (here, RAG.Search) get the
// custom handling above. Everything comes straight from the on-disk results: the
// chat transcript, each metric's value/interpretation/diagnostics, and the
// presentation hints the evaluator left on metric metadata (kind/group/short,
// "ctx:<label>" judge-context blocks, "meta:<label>" evaluator rows).
// =============================================================================
static class GenericStoreReader
{
    // Scenario-name prefixes rendered by a bespoke handler elsewhere (skipped here). Matched as a
    // dotted prefix, so "RAG.Search" skips the 12 "RAG.Search.<Chunker>.<Reranker>" folders but NOT
    // sibling scenarios like "RAG.Answer", which flow through the generic default view.
    // The one project-specific knob: change this when copying to another codebase.
    static readonly string[] CustomPrefixes = ["RAG.Search"];

    static readonly JsonDocumentOptions DocOptions = new() { AllowTrailingCommas = true };

    public static List<object?> Build(string primaryRunFolder)
    {
        var resultsRoot = Directory.GetParent(primaryRunFolder)?.FullName ?? primaryRunFolder;
        var categories = new List<object?>();
        foreach (var folder in DiscoverScenarioFolders(primaryRunFolder))
        {
            var category = BuildCategory(folder, primaryRunFolder, resultsRoot);
            if (category is not null)
            {
                categories.Add(category);
            }
        }

        return categories;
    }

    static IEnumerable<string> DiscoverScenarioFolders(string runFolder)
    {
        foreach (var dir in Directory.GetDirectories(runFolder).OrderBy(Path.GetFileName, StringComparer.Ordinal))
        {
            var name = Path.GetFileName(dir);
            if (name.StartsWith("Summary.", StringComparison.Ordinal))
            {
                continue;
            }

            if (CustomPrefixes.Any(prefix => name.Equals(prefix, StringComparison.Ordinal) || name.StartsWith(prefix + ".", StringComparison.Ordinal)))
            {
                continue;
            }

            if (Directory.GetFiles(dir, "*.json").Length > 0)
            {
                yield return name;
            }
        }
    }

    static Dictionary<string, object?>? BuildCategory(string folder, string primaryRunFolder, string resultsRoot)
    {
        var iterations = ReadIterations(Path.Combine(primaryRunFolder, folder));
        if (iterations.Count == 0)
        {
            return null;
        }

        var metricDefs = BuildMetricDefs(iterations);
        var defByName = metricDefs.ToDictionary(def => def.Name, StringComparer.Ordinal);
        var scenarios = iterations.Select(iteration => BuildScenario(iteration, defByName)).ToList();
        var runs = BuildRuns(folder, resultsRoot, defByName);
        var latest = runs.Count > 0 ? ((Dictionary<string, object?>)((Dictionary<string, object?>)runs[^1]!)["run"]!) : RunMeta(folder, iterations);

        var hasTools = iterations.Any(iteration => iteration.Messages.Any(message => message.IsTool));
        var hasAgentGroup = metricDefs.Any(def => def.Group == "Agent");
        var label = folder;

        return new Dictionary<string, object?>
        {
            ["id"] = Slug(folder).ToLowerInvariant(),
            ["label"] = label,
            ["scenarioName"] = folder,
            ["kind"] = hasAgentGroup ? "AgentQuality" : "EvaluationQuality",
            ["sub"] = hasTools ? "tool-using task agent" : "LLM-as-judge eval",
            ["unit"] = "scenarios",
            ["dataset"] = label,
            ["msg"] = hasTools ? "agent" : "qa",
            ["metricDefs"] = metricDefs.Select(MetricDefJson).ToList(),
            ["runs"] = runs,
            ["run"] = latest,
            ["scenarios"] = scenarios,
            ["pool"] = scenarios.Select(scenario => (object?)((Dictionary<string, object?>)scenario!)["id"]).ToList(),
        };
    }

    // -------- metric definitions (union across iterations, first-seen order) --------

    sealed record MetricDef(string Name, string Group, string Kind, string Better, bool Info, string Desc);

    static List<MetricDef> BuildMetricDefs(List<Iteration> iterations)
    {
        var defs = new List<MetricDef>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var iteration in iterations)
        {
            foreach (var metric in iteration.Metrics)
            {
                if (!seen.Add(metric.Name))
                {
                    continue;
                }

                var meta = metric.Metadata;
                var kind = MetaValue(meta, "kind") ?? InferKind(metric);
                var info = (MetaValue(meta, "info") == "true") || kind == "count";
                defs.Add(new MetricDef(
                    metric.Name,
                    MetaValue(meta, "group") ?? "Quality",
                    kind,
                    MetaValue(meta, "better") ?? (kind == "severity" ? "low" : info ? "none" : "high"),
                    info,
                    metric.Desc));
            }
        }

        return defs;
    }

    static Dictionary<string, object?> MetricDefJson(MetricDef def) => new()
    {
        ["key"] = Slug(def.Name),
        ["name"] = def.Name,
        ["group"] = def.Group,
        ["kind"] = def.Kind,
        ["better"] = def.Better,
        ["info"] = def.Info,
        ["desc"] = def.Desc,
        ["scaleLabel"] = ScaleLabel(def.Kind),
        ["kindLabel"] = KindLabel(def.Kind),
    };

    // -------- per-scenario (full) --------

    static Dictionary<string, object?> BuildScenario(Iteration iteration, Dictionary<string, MetricDef> defByName)
    {
        var metrics = new Dictionary<string, object?>();
        var failCount = 0;
        foreach (var metric in iteration.Metrics)
        {
            if (!defByName.TryGetValue(metric.Name, out var def))
            {
                continue;
            }

            var info = def.Info;
            var rating = info ? "—" : RatingDisplay(metric.RatingRaw);
            var failed = !info && metric.Failed;
            if (failed)
            {
                failCount++;
            }

            metrics[Slug(metric.Name)] = new Dictionary<string, object?>
            {
                ["key"] = Slug(metric.Name),
                ["name"] = metric.Name,
                ["group"] = def.Group,
                ["kind"] = def.Kind,
                ["desc"] = def.Desc,
                ["info"] = info,
                ["value"] = metric.Value,
                ["valStr"] = ValueText(def.Kind, metric.Value),
                ["rating"] = rating,
                ["good"] = info ? null : Goodness(def.Kind, metric.Value),
                ["failed"] = failed,
                ["kindLabel"] = KindLabel(def.Kind),
                ["reason"] = metric.InterpReason,
                ["context"] = ContextBlocks(metric.Metadata),
                ["diagnostics"] = metric.Diagnostics.Select(d => (object?)new Dictionary<string, object?> { ["severity"] = d.Severity, ["message"] = d.Message }).ToList(),
                ["metadata"] = MetaRows(metric.Metadata),
            };
        }

        return new Dictionary<string, object?>
        {
            ["id"] = iteration.Id,
            ["name"] = DisplayName(iteration),
            ["task"] = iteration.Task,
            ["diff"] = iteration.Difficulty,
            ["metrics"] = metrics,
            ["pass"] = failCount == 0,
            ["failCount"] = failCount,
            ["messages"] = iteration.Messages.Select(MessageJson).ToList(),
        };
    }

    static object MessageJson(Message message) => new Dictionary<string, object?>
    {
        ["role"] = message.Role,
        ["isTool"] = message.IsTool,
        ["tool"] = message.Tool,
        ["text"] = message.Text,
    };

    // -------- runs (lite, for history + comparison) --------

    static List<object?> BuildRuns(string folder, string resultsRoot, Dictionary<string, MetricDef> defByName)
    {
        var runs = new List<(DateTime Finished, Dictionary<string, object?> Entry)>();
        if (!Directory.Exists(resultsRoot))
        {
            return new List<object?>();
        }

        foreach (var runDir in Directory.GetDirectories(resultsRoot))
        {
            var scenarioDir = Path.Combine(runDir, folder);
            if (!Directory.Exists(scenarioDir) || Directory.GetFiles(scenarioDir, "*.json").Length == 0)
            {
                continue;
            }

            var iterations = ReadIterations(scenarioDir);
            if (iterations.Count == 0)
            {
                continue;
            }

            var lite = iterations.Select(iteration =>
            {
                var values = new Dictionary<string, object?>();
                var failCount = 0;
                foreach (var metric in iteration.Metrics)
                {
                    if (!defByName.TryGetValue(metric.Name, out var def))
                    {
                        continue;
                    }

                    values[Slug(metric.Name)] = metric.Value;
                    if (!def.Info && metric.Failed)
                    {
                        failCount++;
                    }
                }

                return (object?)new Dictionary<string, object?>
                {
                    ["id"] = iteration.Id,
                    ["name"] = DisplayName(iteration),
                    ["diff"] = iteration.Difficulty,
                    ["vals"] = values,
                    ["pass"] = failCount == 0,
                    ["failCount"] = failCount,
                };
            }).ToList();

            var finished = iterations.Max(iteration => iteration.Created);
            runs.Add((finished, new Dictionary<string, object?> { ["run"] = RunMeta(folder, iterations), ["lite"] = lite }));
        }

        return runs.OrderBy(run => run.Finished).Select(run => (object?)run.Entry).ToList();
    }

    static Dictionary<string, object?> RunMeta(string folder, List<Iteration> iterations)
    {
        var runId = Path.GetFileName(Path.GetDirectoryName(iterations[0].FilePath)?.TrimEnd(Path.DirectorySeparatorChar) ?? folder)!;
        var parentRun = Path.GetFileName(Directory.GetParent(Path.GetDirectoryName(iterations[0].FilePath)!)?.FullName ?? string.Empty);
        var name = string.IsNullOrEmpty(parentRun) ? folder : parentRun;
        var judge = iterations.SelectMany(i => i.Metrics).Select(m => MetaValue(m.Metadata, "meta:judge")).FirstOrDefault(v => v is not null) ?? "—";
        var finished = iterations.Max(i => i.Created);
        return new Dictionary<string, object?>
        {
            ["id"] = name,
            ["sha"] = name.Length > 6 ? name[^6..] : name,
            ["model"] = judge,
            ["finished"] = finished.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
            ["note"] = string.Empty,
            ["scenarios"] = iterations.Count,
            ["dataset"] = folder,
            ["judge"] = judge,
            ["duration"] = string.Empty,
        };
    }

    // -------- iteration parsing --------

    sealed record Iteration(string Id, string Name, string Task, string? Difficulty, DateTime Created, string FilePath, List<MetricRec> Metrics, List<Message> Messages);

    sealed record MetricRec(string Name, double Value, string Desc, string RatingRaw, bool Failed, string InterpReason, List<(string Severity, string Message)> Diagnostics, List<(string Key, string Value)> Metadata);

    sealed record Message(string Role, bool IsTool, string Tool, string Text);

    static List<Iteration> ReadIterations(string scenarioDir)
    {
        var result = new List<Iteration>();
        foreach (var file in Directory.GetFiles(scenarioDir, "*.json").OrderBy(f => f, StringComparer.Ordinal))
        {
            try
            {
                result.Add(ParseIteration(file));
            }
            catch
            {
                // Skip unreadable iteration files rather than failing the whole report.
            }
        }

        return result;
    }

    static Iteration ParseIteration(string file)
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(file), DocOptions);
        var root = doc.RootElement;

        var id = StringProp(root, "iterationName") ?? Path.GetFileNameWithoutExtension(file);
        var created = root.TryGetProperty("creationTime", out var ct) && ct.TryGetDateTime(out var dt) ? dt : DateTime.MinValue;

        string name = string.Empty;
        string? difficulty = null;
        if (root.TryGetProperty("tags", out var tags) && tags.ValueKind == JsonValueKind.Array)
        {
            foreach (var tag in tags.EnumerateArray())
            {
                var text = tag.GetString() ?? string.Empty;
                if (text.StartsWith("name:", StringComparison.Ordinal))
                {
                    name = text["name:".Length..];
                }
                else if (text.StartsWith("difficulty:", StringComparison.Ordinal))
                {
                    difficulty = text["difficulty:".Length..];
                }
            }
        }

        var messages = ParseMessages(root, out var task);
        var metrics = ParseMetrics(root);
        return new Iteration(id, name, task, difficulty, created, file, metrics, messages);
    }

    static List<Message> ParseMessages(JsonElement root, out string task)
    {
        var messages = new List<Message>();
        task = string.Empty;

        if (root.TryGetProperty("messages", out var input) && input.ValueKind == JsonValueKind.Array)
        {
            foreach (var message in input.EnumerateArray())
            {
                AppendMessage(message, messages, ref task);
            }
        }

        if (root.TryGetProperty("modelResponse", out var response) && response.TryGetProperty("messages", out var responseMessages) && responseMessages.ValueKind == JsonValueKind.Array)
        {
            foreach (var message in responseMessages.EnumerateArray())
            {
                AppendMessage(message, messages, ref task);
            }
        }

        return messages;
    }

    static void AppendMessage(JsonElement message, List<Message> messages, ref string task)
    {
        var role = StringProp(message, "role") ?? "assistant";
        if (!message.TryGetProperty("contents", out var contents) || contents.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        var text = new StringBuilder();
        foreach (var content in contents.EnumerateArray())
        {
            var type = StringProp(content, "$type");
            if (type == "functionCall")
            {
                var callName = StringProp(content, "name") ?? "tool";
                var arguments = JoinArguments(content);
                messages.Add(new Message("tool call", true, $"{callName}({arguments})", $"→ called {callName} with {arguments}"));
            }
            else if (type == "text")
            {
                if (text.Length > 0)
                {
                    text.Append(' ');
                }

                text.Append(StringProp(content, "text"));
            }
        }

        if (text.Length > 0)
        {
            var body = text.ToString();
            messages.Add(new Message(role, false, string.Empty, body));
            if (role == "user" && task.Length == 0)
            {
                task = body;
            }
        }
    }

    static string JoinArguments(JsonElement content)
    {
        if (!content.TryGetProperty("arguments", out var args) || args.ValueKind != JsonValueKind.Object)
        {
            return string.Empty;
        }

        var values = new List<string>();
        foreach (var property in args.EnumerateObject())
        {
            values.Add(property.Value.ValueKind == JsonValueKind.String ? property.Value.GetString() ?? string.Empty : property.Value.ToString());
        }

        return string.Join(", ", values);
    }

    static List<MetricRec> ParseMetrics(JsonElement root)
    {
        var metrics = new List<MetricRec>();
        if (!root.TryGetProperty("evaluationResult", out var evalResult) || !evalResult.TryGetProperty("metrics", out var metricObj) || metricObj.ValueKind != JsonValueKind.Object)
        {
            return metrics;
        }

        foreach (var property in metricObj.EnumerateObject())
        {
            var metric = property.Value;
            var name = StringProp(metric, "name") ?? property.Name;
            var value = metric.TryGetProperty("value", out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDouble() : 0;
            var desc = StringProp(metric, "reason") ?? string.Empty;

            var ratingRaw = "unknown";
            var failed = false;
            var interpReason = string.Empty;
            if (metric.TryGetProperty("interpretation", out var interp) && interp.ValueKind == JsonValueKind.Object)
            {
                ratingRaw = StringProp(interp, "rating") ?? "unknown";
                failed = interp.TryGetProperty("failed", out var f) && f.ValueKind == JsonValueKind.True;
                interpReason = StringProp(interp, "reason") ?? string.Empty;
            }

            var diagnostics = new List<(string, string)>();
            if (metric.TryGetProperty("diagnostics", out var diags) && diags.ValueKind == JsonValueKind.Array)
            {
                foreach (var diag in diags.EnumerateArray())
                {
                    diagnostics.Add((StringProp(diag, "severity")?.ToLowerInvariant() ?? "informational", StringProp(diag, "message") ?? string.Empty));
                }
            }

            var metadata = new List<(string, string)>();
            if (metric.TryGetProperty("metadata", out var meta) && meta.ValueKind == JsonValueKind.Object)
            {
                foreach (var property2 in meta.EnumerateObject())
                {
                    metadata.Add((property2.Name, property2.Value.GetString() ?? string.Empty));
                }
            }

            metrics.Add(new MetricRec(name, value, desc, ratingRaw, failed, string.IsNullOrEmpty(interpReason) ? desc : interpReason, diagnostics, metadata));
        }

        return metrics;
    }

    // -------- presentation helpers --------

    static List<object?> ContextBlocks(List<(string Key, string Value)> metadata)
    {
        var order = new[] { "context", "reference", "expected", "actual", "source", "summary" };
        var blocks = metadata
            .Where(entry => entry.Key.StartsWith("ctx:", StringComparison.Ordinal))
            .Select(entry => (Label: entry.Key["ctx:".Length..], entry.Value))
            .OrderBy(entry => Array.IndexOf(order, entry.Label) is var index && index >= 0 ? index : int.MaxValue);
        return blocks.Select(entry => (object?)new Dictionary<string, object?> { ["label"] = entry.Label + ":", ["text"] = entry.Value }).ToList();
    }

    static List<object?> MetaRows(List<(string Key, string Value)> metadata)
        => metadata
            .Where(entry => entry.Key.StartsWith("meta:", StringComparison.Ordinal))
            .Select(entry => (object?)new Dictionary<string, object?> { ["k"] = entry.Key["meta:".Length..], ["v"] = entry.Value })
            .ToList();

    static string? MetaValue(List<(string Key, string Value)> metadata, string key)
    {
        foreach (var entry in metadata)
        {
            if (entry.Key == key)
            {
                return entry.Value;
            }
        }

        return null;
    }

    // Drill title: the friendly "name:" tag when present, else the user prompt/question (e.g. RAG.Answer,
    // which only tags difficulty), else the raw iteration id as a last resort.
    static string DisplayName(Iteration iteration)
    {
        if (!string.IsNullOrEmpty(iteration.Name))
        {
            return iteration.Name;
        }

        if (!string.IsNullOrWhiteSpace(iteration.Task))
        {
            return iteration.Task.Length <= 100 ? iteration.Task : iteration.Task[..100].TrimEnd() + "…";
        }

        return iteration.Id;
    }

    static string Slug(string name) => name.Replace(" ", string.Empty);

    static string InferKind(MetricRec metric)
    {
        if (metric.Name.Contains("Token", StringComparison.OrdinalIgnoreCase))
        {
            return "count";
        }

        return metric.Value is >= 0 and <= 1 ? "fraction" : metric.Value <= 5 ? "score" : "count";
    }

    static string ValueText(string kind, double value) => kind switch
    {
        "severity" => $"{SeverityLabel((int)value)} ({(int)value})",
        "fraction" => value.ToString("0.00", CultureInfo.InvariantCulture),
        "count" => $"{(int)Math.Round(value)} tok",
        _ => $"{value.ToString("0.0", CultureInfo.InvariantCulture)} / 5",
    };

    static double Goodness(string kind, double value) => kind switch
    {
        "severity" => 1 - value / 7,
        "fraction" => value,
        "count" => 0.5,
        _ => (value - 1) / 4,
    };

    static string SeverityLabel(int value) => value <= 1 ? "Very low" : value <= 3 ? "Low" : value <= 5 ? "Medium" : "High";

    static string KindLabel(string kind) => kind switch
    {
        "fraction" => "numeric 0–1",
        "severity" => "severity 0–7",
        "count" => "count",
        _ => "numeric 1–5",
    };

    static string ScaleLabel(string kind) => kind switch
    {
        "fraction" => "LLM judge · 0–1",
        "severity" => "Content safety · 0–7 (lower better)",
        "count" => "informational · count",
        _ => "LLM judge · 1–5",
    };

    static string RatingDisplay(string ratingRaw) => ratingRaw.ToLowerInvariant() switch
    {
        "exceptional" => "Exceptional",
        "good" => "Good",
        "average" => "Average",
        "poor" => "Poor",
        "unacceptable" => "Unacceptable",
        "inconclusive" => "Inconclusive",
        _ => "Average",
    };

    static string? StringProp(JsonElement element, string name)
        => element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}

record ReportModel(Dictionary<string, object?> Data, string RunId, int ConfigCount, int MaxCases, bool HasDataset);

record RunBuild(
    Dictionary<string, object?> Run,
    List<Dictionary<string, object?>> Configs,
    string? WinnerId,
    List<string> Chunkers,
    List<string> Rerankers,
    Dictionary<string, object?> RShort,
    Dictionary<string, object?> Cases,
    Dictionary<string, object?> PerCase,
    Dictionary<string, object?> MetricDefs,
    string RunId,
    int ConfigCount,
    int MaxCases);

record DatasetCase(string? Difficulty, List<object?> Expected);

// One metric's full specification — the single source of truth (see the `Metrics`
// registry at the top of the script).
//   Kind: "ranking" (value + 95% CI + rating) | "rate" (value + rating, no CI)
//       | "score" (bare diagnostic number) | "count"
//   Gate: the coverage-gate metric whose `failed` flag drives per-case pass/fail.
sealed record MetricSpec(
    string Key, string Label, string Chunk, string? Section, string Kind,
    bool BetterLow, bool InSelector, bool InDetail, bool Bar, bool Gate, string TableSub);

// Per-config, per-level collector of per-case values, used to bootstrap CIs.
// Only ranking metrics are sampled; keyed by metric key so it stays registry-driven.
sealed class MetricArrays
{
    readonly Dictionary<string, List<double>> _byKey = new();
    public int Count { get; private set; }

    public void Add(JsonElement metrics, MetricSpec[] specs, bool section)
    {
        this.Count++;
        foreach (var s in specs)
        {
            if (s.Kind != "ranking") continue;
            var name = section ? (s.Section ?? s.Chunk) : s.Chunk;
            if (metrics.TryGetProperty(name, out var m)
                && m.TryGetProperty("value", out var v)
                && v.ValueKind == JsonValueKind.Number)
            {
                if (!_byKey.TryGetValue(s.Key, out var list)) _byKey[s.Key] = list = new List<double>();
                list.Add(v.GetDouble());
            }
        }
    }

    public double[] Get(string key) => _byKey.TryGetValue(key, out var l) ? l.ToArray() : [];
}
