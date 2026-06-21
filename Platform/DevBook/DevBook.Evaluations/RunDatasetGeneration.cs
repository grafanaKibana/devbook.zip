#:project ../DevBook.Data/DevBook.Data.csproj
#:package Microsoft.Extensions.Configuration.EnvironmentVariables@10.0.8
#:package Microsoft.Extensions.Configuration.Json@10.0.8
#:package Microsoft.Extensions.Configuration.UserSecrets@10.0.8
#:property UserSecretsId=25549d38-b8d5-4e6e-b351-636ad02ea3b4
#:package MongoDB.Driver@3.9.0
#:package OpenAI@2.11.0

#pragma warning disable IL2026, IL3050

using System.ClientModel;
using System.ClientModel.Primitives;
using System.Globalization;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;
using OpenAI;
using OpenAI.Chat;

// Option 1 golden dataset generator.
//
// Ground truth is derived from raw note sections in the "documents" collection (the authoritative, chunker-independent
// copy of each note), NOT from any chunking strategy's stored chunks. Each note is split by Markdown heading into
// sections, and notes are grouped with the notes they link to via [[wikilinks]] so a single query can require evidence
// spanning multiple pages (mirroring how vector search returns chunks from several documents). An LLM writes queries
// over each group and labels each cited section primary / supporting / acceptable with a short verbatim quote. The
// result is one shared dataset keyed by source + heading + snippet, so a single question set scores every chunking
// strategy on equal footing. See SearchMetricCalculator for the chunker-neutral matching that consumes it.

var repoRoot = FindRepoRoot(AppContext.BaseDirectory);
var runOptions = RunOptions.Parse(args, repoRoot);
var appConfig = AppConfig.Load(runOptions.RepoRoot);
var database = new MongoClient(appConfig.MongoConnectionString).GetDatabase(AppConfig.MongoDatabaseName);
var chatClient = CreateChatClient(appConfig);
var generatedAt = DateTimeOffset.UtcNow;

Console.WriteLine("Golden dataset generator (Option 1: raw note sections, cross-note via wikilinks)");
Console.WriteLine($"Repo root: {runOptions.RepoRoot}");
Console.WriteLine($"Variant: {(string.IsNullOrWhiteSpace(runOptions.Label) ? "full" : runOptions.Label)}");
Console.WriteLine($"Datasets: {runOptions.DatasetsLabel}");
Console.WriteLine($"Max groups: {runOptions.MaxGroups}");
Console.WriteLine($"Minimum section characters: {runOptions.MinSectionChars}");
Console.WriteLine($"Sections per note / max per group / max linked notes: {runOptions.SectionsPerNote} / {runOptions.MaxSectionsPerGroup} / {runOptions.MaxLinkedNotes}");
Console.WriteLine($"Max OpenAI retry attempts: {appConfig.RateLimitOptions.MaxRetryAttempts}");
Console.WriteLine($"Dry run: {runOptions.DryRun}");

Directory.CreateDirectory(runOptions.DatasetOutputDirectory);

var documents = await LoadDocumentsAsync(database, runOptions.CancellationToken);
Console.WriteLine($"Loaded {documents.Count} documents.");

var sectionsByDoc = documents.ToDictionary(
    document => document.DocumentId,
    document => ExtractDocSections(document, runOptions),
    StringComparer.Ordinal);
var documentsWithSections = documents.Where(document => sectionsByDoc[document.DocumentId].Count > 0).ToArray();
Console.WriteLine($"Documents with substantive sections: {documentsWithSections.Length}.");

var titleIndex = BuildTitleIndex(documentsWithSections);
var groups = BuildGroups(documentsWithSections, sectionsByDoc, titleIndex, runOptions);
Console.WriteLine($"Prepared {groups.Count} groups.");

WriteJson(runOptions.GroupsPath, new GroupFile(1, generatedAt, groups.Select(GroupInfo.FromGroup).ToArray()));
Console.WriteLine($"Wrote groups -> {runOptions.GroupsPath}");

// The answer dataset is a superset of the search dataset (same query + evidence, plus a grounded
// reference answer). Generate the superset once per group and project it to each selected output, so
// requesting both datasets is a single LLM pass — never two over the same groups.
var includeAnswer = runOptions.WantAnswer;
var cases = new List<DatasetCase>();              // search projection (also feeds the summary)
var answerCases = new List<AnswerDatasetCase>();  // answer dataset rows
if (!runOptions.DryRun)
{
    foreach (var group in groups)
    {
        var llmResponse = await GenerateCasesForGroupWithRetryAsync(chatClient, group, includeAnswer, appConfig.RateLimitOptions, runOptions.CancellationToken);
        var acceptedCases = KeepValidCases(group, llmResponse, includeAnswer).ToArray();
        foreach (var generated in acceptedCases)
        {
            cases.Add(generated.ToSearchCase());
            if (includeAnswer && generated.ReferenceAnswer is not null)
            {
                answerCases.Add(generated.ToAnswerCase());
            }
        }

        var withAnswers = acceptedCases.Count(generated => generated.ReferenceAnswer is not null);
        Console.WriteLine($"{group.Id} ({group.SeedTitle}): LLM accepted={llmResponse.Accepted}; keptCases={acceptedCases.Length}{(includeAnswer ? $"; withAnswers={withAnswers}" : string.Empty)}");
    }

    if (runOptions.WantSearch)
    {
        WriteJson(runOptions.SharedDatasetPath, new DatasetFile(3, generatedAt, "shared", cases));
        Console.WriteLine($"Wrote search dataset cases: {cases.Count} -> {runOptions.SharedDatasetPath}");
    }

    if (runOptions.WantAnswer)
    {
        WriteJson(runOptions.AnswerDatasetPath, new AnswerDatasetFile(1, generatedAt, "shared", answerCases));
        Console.WriteLine($"Wrote answer dataset cases: {answerCases.Count} -> {runOptions.AnswerDatasetPath}");
    }
}
else
{
    foreach (var group in groups)
    {
        var sources = group.Sections.Select(section => section.Title).Distinct(StringComparer.Ordinal).Count();
        Console.WriteLine($"{group.Id} ({group.SeedTitle}): {group.Sections.Count} sections across {sources} notes (dry run).");
    }

    Console.WriteLine($"Dry run: would generate [{runOptions.DatasetsLabel}]; skipped LLM generation and dataset file write.");
}

WriteJson(runOptions.SummaryPath, SummaryFile.Create(generatedAt, documents.Count, documentsWithSections.Length, groups, cases));
Console.WriteLine($"Wrote summary -> {runOptions.SummaryPath}");

Console.WriteLine();
Console.WriteLine("Generation complete.");

static ChatClient CreateChatClient(AppConfig config)
{
    var clientOptions = new OpenAIClientOptions
    {
        NetworkTimeout = config.GeneratorOptions.NetworkTimeout,
    };

    if (!string.IsNullOrWhiteSpace(config.OpenAIOptions.Endpoint))
    {
        clientOptions.Endpoint = new Uri(config.OpenAIOptions.Endpoint, UriKind.Absolute);
    }

    var openAIClient = new OpenAIClient(new ApiKeyCredential(config.OpenAIOptions.ApiKey!), clientOptions);
    return openAIClient.GetChatClient(config.GeneratorOptions.ModelId);
}

static async Task<IReadOnlyList<DocRecord>> LoadDocumentsAsync(IMongoDatabase database, CancellationToken cancellationToken)
{
    var collection = database.GetCollection<BsonDocument>("documents");
    var projection = new BsonDocument
    {
        ["_id"] = 1,
        ["SourcePath"] = 1,
        ["Title"] = 1,
        ["PageContent"] = 1,
    };

    var documents = await collection
        .Find(FilterDefinition<BsonDocument>.Empty)
        .Project(projection)
        .ToListAsync(cancellationToken);

    return documents.Select(DocRecord.FromBson).Where(document => !string.IsNullOrWhiteSpace(document.PageContent)).ToArray();
}

static IReadOnlyList<DocSection> ExtractDocSections(DocRecord document, RunOptions runOptions)
{
    return SplitSections(document.PageContent)
        .Where(section => TextRules.IsSubstantive(section.Content, runOptions.MinSectionChars))
        .Select((section, index) => new DocSection(document.DocumentId, document.SourcePath, document.Title, index, section.Heading, TextRules.Clean(section.Content)))
        .ToArray();
}

static IReadOnlyDictionary<string, DocRecord> BuildTitleIndex(IReadOnlyList<DocRecord> documents)
{
    var index = new Dictionary<string, DocRecord>(StringComparer.Ordinal);
    foreach (var document in documents)
    {
        foreach (var key in new[] { TextRules.NormalizeKey(document.Title), TextRules.NormalizeKey(LastSegment(document.SourcePath)) })
        {
            if (!string.IsNullOrEmpty(key))
            {
                index.TryAdd(key, document);
            }
        }
    }

    return index;
}

// Builds cross-note groups: a seed note plus the notes it links to via [[wikilinks]], so generated queries can require
// evidence from several pages. Section reuse across groups is capped so the dataset is not dominated by popular notes.
static IReadOnlyList<NoteGroup> BuildGroups(
    IReadOnlyList<DocRecord> documents,
    IReadOnlyDictionary<string, IReadOnlyList<DocSection>> sectionsByDoc,
    IReadOnlyDictionary<string, DocRecord> titleIndex,
    RunOptions runOptions)
{
    var linksByDoc = documents.ToDictionary(
        document => document.DocumentId,
        document => ResolveLinks(document, titleIndex)
            .Where(linked => linked.DocumentId != document.DocumentId && sectionsByDoc[linked.DocumentId].Count > 0)
            .DistinctBy(linked => linked.DocumentId, StringComparer.Ordinal)
            .ToArray(),
        StringComparer.Ordinal);

    var seeds = documents
        .OrderByDescending(document => linksByDoc[document.DocumentId].Length)
        .ThenByDescending(document => sectionsByDoc[document.DocumentId].Count)
        .ToArray();

    var usage = new Dictionary<string, int>(StringComparer.Ordinal);
    var groups = new List<NoteGroup>();
    foreach (var seed in seeds)
    {
        if (groups.Count >= runOptions.MaxGroups)
        {
            break;
        }

        var members = new List<DocSection>();
        members.AddRange(PickSections(seed.DocumentId, sectionsByDoc, usage, runOptions.SectionsPerNote, runOptions.SectionReuseCap));
        foreach (var linked in linksByDoc[seed.DocumentId].Take(runOptions.MaxLinkedNotes))
        {
            if (members.Count >= runOptions.MaxSectionsPerGroup)
            {
                break;
            }

            members.AddRange(PickSections(linked.DocumentId, sectionsByDoc, usage, runOptions.SectionsPerNote, runOptions.SectionReuseCap));
        }

        var selected = members.Take(runOptions.MaxSectionsPerGroup).ToArray();
        if (selected.Length < 2)
        {
            continue;
        }

        foreach (var section in selected)
        {
            usage[SectionKey(section)] = usage.GetValueOrDefault(SectionKey(section)) + 1;
        }

        var noteSections = selected
            .Select((section, index) => new NoteSection($"S{index + 1}", section.SourcePath, section.DocumentId, section.Title, section.Heading, section.Text))
            .ToArray();
        groups.Add(new NoteGroup($"shared-group-{groups.Count + 1:0000}", seed.Title, seed.SourcePath, noteSections));
    }

    return groups;
}

static IEnumerable<DocSection> PickSections(
    string documentId,
    IReadOnlyDictionary<string, IReadOnlyList<DocSection>> sectionsByDoc,
    IReadOnlyDictionary<string, int> usage,
    int take,
    int reuseCap)
{
    return sectionsByDoc[documentId]
        .Where(section => usage.GetValueOrDefault(SectionKey(section)) < reuseCap)
        .OrderBy(section => usage.GetValueOrDefault(SectionKey(section)))
        .Take(take);
}

static string SectionKey(DocSection section) => $"{section.DocumentId}:{section.Index}";

static IEnumerable<DocRecord> ResolveLinks(DocRecord document, IReadOnlyDictionary<string, DocRecord> titleIndex)
{
    foreach (Match match in TextRules.WikiLinkPattern.Matches(document.PageContent))
    {
        var inner = match.Groups[1].Value;
        var target = inner.Split('|')[0].Split('#')[0].Trim();
        if (target.Length == 0)
        {
            continue;
        }

        if (titleIndex.TryGetValue(TextRules.NormalizeKey(LastSegment(target)), out var resolved))
        {
            yield return resolved;
        }
    }
}

static string LastSegment(string value)
{
    var trimmed = value.Replace('\\', '/').Trim().TrimEnd('/');
    var index = trimmed.LastIndexOf('/');
    return index >= 0 ? trimmed[(index + 1)..] : trimmed;
}

// Splits raw Markdown into heading sections, mirroring MarkdownSectionChunkingStrategy: content before the first
// heading becomes a headingless section, and each heading owns the lines until the next heading. Code fences are
// skipped so a "#comment" inside a code block is not mistaken for a heading.
static IReadOnlyList<RawSection> SplitSections(string markdown)
{
    var lines = markdown.Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n');
    var sections = new List<RawSection>();
    string? currentHeading = null;
    var builder = new StringBuilder();
    var inFence = false;

    void Flush()
    {
        var content = builder.ToString().Trim();
        if (!string.IsNullOrWhiteSpace(content))
        {
            sections.Add(new RawSection(currentHeading, content));
        }

        builder.Clear();
    }

    foreach (var line in lines)
    {
        var trimmed = line.TrimStart();
        if (trimmed.StartsWith("```", StringComparison.Ordinal) || trimmed.StartsWith("~~~", StringComparison.Ordinal))
        {
            inFence = !inFence;
        }

        if (!inFence && TryParseHeading(line, out var headingText))
        {
            Flush();
            currentHeading = headingText;
            continue;
        }

        builder.Append(line).Append('\n');
    }

    Flush();
    return sections;
}

static bool TryParseHeading(string line, out string headingText)
{
    headingText = string.Empty;
    var trimmed = line.TrimStart();
    var hashes = 0;
    while (hashes < trimmed.Length && trimmed[hashes] == '#')
    {
        hashes++;
    }

    if (hashes is < 1 or > 6 || hashes >= trimmed.Length || trimmed[hashes] != ' ')
    {
        return false;
    }

    headingText = trimmed[(hashes + 1)..].Trim().TrimEnd('#').Trim();
    return !string.IsNullOrWhiteSpace(headingText);
}

static async Task<GroupLlmResponse> GenerateCasesForGroupAsync(ChatClient chatClient, NoteGroup group, bool includeAnswer, CancellationToken cancellationToken)
{
    var messages = new ChatMessage[]
    {
        new SystemChatMessage("You create retrieval golden datasets from note sections. Use only the supplied sections. Reference sections only by their sectionId. Quotes must be copied verbatim from the section text, plain prose without Markdown symbols. Return strict JSON only."),
        new UserChatMessage(PromptBuilder.ForGroup(group, includeAnswer)),
    };
    var options = new ChatCompletionOptions
    {
        Temperature = 0.2f,
        ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat(),
    };

    var completion = await chatClient.CompleteChatAsync(messages, options, cancellationToken);
    var json = completion.Value.Content.FirstOrDefault()?.Text;
    if (string.IsNullOrWhiteSpace(json))
    {
        return new GroupLlmResponse(false, "Empty LLM response.", []);
    }

    try
    {
        return JsonSerializer.Deserialize<GroupLlmResponse>(json, JsonDefaults.Options) ?? new GroupLlmResponse(false, "Could not deserialize LLM response.", []);
    }
    catch (JsonException exception)
    {
        return new GroupLlmResponse(false, $"Invalid JSON from LLM: {exception.Message}", []);
    }
}

static async Task<GroupLlmResponse> GenerateCasesForGroupWithRetryAsync(ChatClient chatClient, NoteGroup group, bool includeAnswer, EvaluationRateLimitOptions rateLimitOptions, CancellationToken cancellationToken)
{
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            return await GenerateCasesForGroupAsync(chatClient, group, includeAnswer, cancellationToken);
        }
        catch (Exception exception) when (ShouldRetryOpenAI(exception, attempt, rateLimitOptions.MaxRetryAttempts, out var retryDelay, out var reason))
        {
            Console.WriteLine($"{group.Id}: OpenAI {reason}. Retry {attempt}/{rateLimitOptions.MaxRetryAttempts} in {retryDelay.TotalSeconds:F1}s.");
            await Task.Delay(retryDelay, cancellationToken);
        }
    }
}

static bool ShouldRetryOpenAI(Exception exception, int attempt, int maxRetryAttempts, out TimeSpan retryDelay, out string reason)
{
    retryDelay = TimeSpan.Zero;
    reason = exception.GetType().Name;

    if (attempt > maxRetryAttempts)
    {
        return false;
    }

    if (FindException<ClientResultException>(exception) is { Status: 429 } rateLimitException)
    {
        retryDelay = GetRateLimitDelay(rateLimitException, out var requestResetDelay, out var tokenResetDelay);
        reason = $"rate limit hit; x-ratelimit-reset-requests={FormatDelay(requestResetDelay)}; x-ratelimit-reset-tokens={FormatDelay(tokenResetDelay)}";
        return true;
    }

    if (FindException<TaskCanceledException>(exception) is not null || FindException<HttpRequestException>(exception) is not null)
    {
        retryDelay = GetTransientFailureDelay(attempt);
        reason = $"transient network failure ({exception.GetBaseException().Message})";
        return true;
    }

    return false;
}

static TimeSpan GetRateLimitDelay(ClientResultException exception, out TimeSpan? requestResetDelay, out TimeSpan? tokenResetDelay)
{
    var response = exception.GetRawResponse();
    requestResetDelay = TryGetHeaderDelay(response, "x-ratelimit-reset-requests");
    tokenResetDelay = TryGetHeaderDelay(response, "x-ratelimit-reset-tokens");

    return (Max(requestResetDelay, tokenResetDelay) ?? TimeSpan.Zero) + TimeSpan.FromSeconds(5);
}

static TimeSpan GetTransientFailureDelay(int attempt)
{
    var seconds = Math.Min(60, Math.Pow(2, attempt) * 5);
    return TimeSpan.FromSeconds(seconds);
}

static TimeSpan? TryGetHeaderDelay(PipelineResponse? response, string header)
{
    if (response?.Headers.TryGetValue(header, out var value) == true
        && value is not null
        && TryParseResetDelay(value, out var parsedDelay))
    {
        return parsedDelay;
    }

    return null;
}

static TimeSpan? Max(TimeSpan? first, TimeSpan? second) => first > second ? first : second ?? first;

static string FormatDelay(TimeSpan? delay) => delay is null ? "missing" : $"{delay.Value.TotalSeconds:F1}s";

static bool TryParseResetDelay(string value, out TimeSpan delay)
{
    delay = TimeSpan.Zero;

    if (string.IsNullOrWhiteSpace(value))
    {
        return false;
    }

    var remaining = value.AsSpan().Trim();
    var parsedAny = false;

    while (!remaining.IsEmpty)
    {
        var numberLength = 0;
        while (numberLength < remaining.Length && (char.IsDigit(remaining[numberLength]) || remaining[numberLength] == '.'))
        {
            numberLength++;
        }

        if (numberLength == 0 || !double.TryParse(remaining[..numberLength], NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount))
        {
            return false;
        }

        remaining = remaining[numberLength..];

        if (remaining.StartsWith("ms", StringComparison.OrdinalIgnoreCase))
        {
            delay += TimeSpan.FromMilliseconds(amount);
            remaining = remaining[2..];
        }
        else if (remaining.StartsWith("s", StringComparison.OrdinalIgnoreCase))
        {
            delay += TimeSpan.FromSeconds(amount);
            remaining = remaining[1..];
        }
        else if (remaining.StartsWith("m", StringComparison.OrdinalIgnoreCase))
        {
            delay += TimeSpan.FromMinutes(amount);
            remaining = remaining[1..];
        }
        else
        {
            return false;
        }

        parsedAny = true;
        remaining = remaining.TrimStart();
    }

    return parsedAny;
}

static TException? FindException<TException>(Exception exception)
    where TException : Exception
{
    if (exception is TException match)
    {
        return match;
    }

    if (exception is AggregateException aggregateException)
    {
        foreach (var innerException in aggregateException.InnerExceptions)
        {
            var aggregateMatch = FindException<TException>(innerException);
            if (aggregateMatch is not null)
            {
                return aggregateMatch;
            }
        }
    }

    return exception.InnerException is null ? null : FindException<TException>(exception.InnerException);
}

static IEnumerable<GeneratedCase> KeepValidCases(NoteGroup group, GroupLlmResponse response, bool includeAnswer)
{
    if (!response.Accepted)
    {
        yield break;
    }

    var sectionsById = group.Sections.ToDictionary(section => section.LocalId, StringComparer.OrdinalIgnoreCase);
    var index = 1;
    foreach (var query in response.Queries ?? [])
    {
        if (string.IsNullOrWhiteSpace(query.Query) || query.Evidence is null)
        {
            continue;
        }

        var expected = new List<ExpectedChunk>();
        var usedSections = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var evidence in query.Evidence)
        {
            if (evidence.SectionId is null
                || !sectionsById.TryGetValue(evidence.SectionId.Trim(), out var section)
                || !usedSections.Add(section.LocalId))
            {
                continue;
            }

            expected.Add(CreateExpectedChunk(section, evidence.Quote));
        }

        if (expected.Count == 0)
        {
            continue;
        }

        // The reference answer is optional: when requested but missing/invalid for a case, that case
        // still contributes to the search dataset, just not the answer dataset.
        string? referenceAnswer = null;
        IReadOnlyList<string> expectedCitations = [];
        if (includeAnswer && IsValidReferenceAnswer(query.Answer, out var cleanedAnswer))
        {
            referenceAnswer = cleanedAnswer;
            expectedCitations = expected.Select(chunk => chunk.CitationLabel).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        }

        yield return new GeneratedCase(
            $"shared-{TextRules.Slug(query.Query)}-{index:000}",
            query.Query.Trim(),
            NormalizeDifficulty(query.Difficulty),
            expected,
            referenceAnswer,
            expectedCitations);
        index++;
    }
}

// A usable gold answer is non-trivial prose that carries at least one inline [[wikilink]] citation, so
// the downstream Citation/Correctness judge has something to score against. Loose by design — the LLM
// judge does the real grading; this only rejects obviously-degenerate generations.
static bool IsValidReferenceAnswer(string? answer, out string cleaned)
{
    cleaned = answer?.Trim() ?? string.Empty;
    return cleaned.Length is >= 40 and <= 1500 && cleaned.Contains("[[", StringComparison.Ordinal);
}

static ExpectedChunk CreateExpectedChunk(NoteSection section, string? quote)
{
    // Snippet must be a verbatim, whitespace-normalized substring of the section so any chunking strategy that returns
    // the relevant chunk will contain it. Fall back to the section's leading sentence when the LLM quote does not match.
    var snippet = TextRules.SelectSnippet(section.Text, quote);

    // CitationLabel carries the source path because SearchEvaluation maps it onto SearchDocument.SourcePath; each cited
    // section keeps its own source so cross-note evidence is preserved. No chunk id is stored: the gold is matched
    // chunker-neutrally by source + heading + snippet and must not be bound to one chunking strategy's ids.
    return new ExpectedChunk(section.DocumentId, section.Heading, section.SourcePath, snippet);
}

static string NormalizeDifficulty(string? difficulty)
{
    return difficulty?.Trim().ToLowerInvariant() switch
    {
        "easy" => "easy",
        "hard" => "hard",
        _ => "medium",
    };
}

static string FindRepoRoot(string startDirectory)
{
    var current = new DirectoryInfo(startDirectory);
    while (current is not null)
    {
        if (File.Exists(Path.Combine(current.FullName, "AGENTS.md")) && Directory.Exists(Path.Combine(current.FullName, "Platform")))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    return Directory.GetCurrentDirectory();
}

static void WriteJson<T>(string path, T value)
{
    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
    File.WriteAllText(path, JsonSerializer.Serialize(value, JsonDefaults.Options));
}

sealed record RunOptions(
    string RepoRoot,
    string Label,
    DatasetKinds Datasets,
    int MaxGroups,
    int MinSectionChars,
    int SectionsPerNote,
    int MaxSectionsPerGroup,
    int MaxLinkedNotes,
    int SectionReuseCap,
    bool DryRun,
    CancellationToken CancellationToken)
{
    public string DatasetOutputDirectory => Path.Combine(this.RepoRoot, "Platform/DevBook/DevBook.Evaluations/Datasets");
    public string GroupOutputDirectory => Path.Combine(this.DatasetOutputDirectory, "Groups");

    // Optional variant suffix so independent dataset sizes (e.g. mini and the default full) coexist without
    // overwriting each other. An empty label keeps the default full file names unchanged.
    private string Suffix => string.IsNullOrWhiteSpace(this.Label) ? string.Empty : $"-{this.Label.Trim()}";

    // The shared, chunker-neutral golden dataset consumed by SearchEvaluation.
    public string SharedDatasetPath => Path.Combine(this.DatasetOutputDirectory, $"chunks-shared{this.Suffix}.json");
    // The answer golden dataset (search superset + reference answer) consumed by AnswerEvaluation.
    public string AnswerDatasetPath => Path.Combine(this.DatasetOutputDirectory, $"answers-shared{this.Suffix}.json");
    public string GroupsPath => Path.Combine(this.GroupOutputDirectory, $"shared{this.Suffix}.groups.json");
    public string SummaryPath => Path.Combine(this.GroupOutputDirectory, $"summary{this.Suffix}.json");

    public bool WantSearch => this.Datasets.HasFlag(DatasetKinds.Search);
    public bool WantAnswer => this.Datasets.HasFlag(DatasetKinds.Answer);
    public string DatasetsLabel => string.Join(", ", new[] { (this.WantSearch, "search"), (this.WantAnswer, "answer") }.Where(item => item.Item1).Select(item => item.Item2));

    public static RunOptions Parse(string[] args, string repoRoot)
    {
        return new RunOptions(
            GetString(args, "--repo-root") ?? repoRoot,
            GetString(args, "--label") ?? string.Empty,
            ParseDatasets(args),
            GetInt(args, "--max-groups", 120),
            GetInt(args, "--min-section-chars", 200),
            GetInt(args, "--sections-per-note", 3),
            GetInt(args, "--max-sections-per-group", 10),
            GetInt(args, "--max-linked-notes", 4),
            GetInt(args, "--section-reuse-cap", 2),
            args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase),
            CancellationToken.None);
    }

    // --dataset selects which golden datasets to produce: search, answer, or all (default: all).
    // Accepts repeated flags and comma-separated values, e.g. --dataset answer, --dataset search,answer.
    private static DatasetKinds ParseDatasets(string[] args)
    {
        var kinds = DatasetKinds.None;
        for (var i = 0; i < args.Length; i++)
        {
            if (!args[i].Equals("--dataset", StringComparison.OrdinalIgnoreCase) || i + 1 >= args.Length)
            {
                continue;
            }

            foreach (var token in args[i + 1].Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                kinds |= token.ToLowerInvariant() switch
                {
                    "search" => DatasetKinds.Search,
                    "answer" => DatasetKinds.Answer,
                    "all" => DatasetKinds.All,
                    _ => DatasetKinds.None,
                };
            }
        }

        return kinds == DatasetKinds.None ? DatasetKinds.All : kinds;
    }

    private static int GetInt(string[] args, string name, int fallback) => TryGetInt(args, name) ?? fallback;
    private static int? TryGetInt(string[] args, string name) => int.TryParse(GetString(args, name), out var value) ? value : null;
    private static string? GetString(string[] args, string name)
    {
        var index = Array.FindIndex(args, arg => arg.Equals(name, StringComparison.OrdinalIgnoreCase));
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }
}

// Which golden datasets a run should produce. Default is All; --dataset narrows it.
[Flags]
enum DatasetKinds
{
    None = 0,
    Search = 1,
    Answer = 2,
    All = Search | Answer,
}

sealed record AppConfig(string MongoConnectionString, OpenAIConfig OpenAIOptions, GoldenDatasetGeneratorOptions GeneratorOptions, EvaluationRateLimitOptions RateLimitOptions)
{
    public const string MongoDatabaseName = "DevBook";
    private const string MongoConnectionName = "MongoDb";

    public static AppConfig Load(string repoRoot)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(repoRoot)
            .AddJsonFile("Platform/DevBook/DevBook.API/appsettings.Development.json", optional: true)
            .AddJsonFile("Platform/DevBook/DevBook.Evaluations/appsettings.Evaluations.json", optional: true)
            .AddUserSecrets(System.Reflection.Assembly.GetExecutingAssembly(), optional: true)
            .AddEnvironmentVariables()
            .Build();
        var connectionString = configuration.GetConnectionString(MongoConnectionName);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException($"Missing required connection string: {MongoConnectionName}.");
        }

        var openAISection = configuration.GetSection("OpenAIOptions");
        var openAIOptions = new OpenAIConfig { ApiKey = openAISection["ApiKey"], Endpoint = openAISection["Endpoint"] };
        if (string.IsNullOrWhiteSpace(openAIOptions.ApiKey))
        {
            throw new InvalidOperationException("Missing required configuration: OpenAIOptions:ApiKey.");
        }

        var generatorSection = configuration.GetSection(nameof(GoldenDatasetGeneratorOptions));
        var modelId = Environment.GetEnvironmentVariable("GOLDEN_DATASET_MODEL") ?? generatorSection[nameof(GoldenDatasetGeneratorOptions.ModelId)] ?? new GoldenDatasetGeneratorOptions().ModelId;
        var networkTimeoutSeconds = int.TryParse(generatorSection[nameof(GoldenDatasetGeneratorOptions.NetworkTimeoutSeconds)], out var parsedNetworkTimeoutSeconds)
            ? parsedNetworkTimeoutSeconds
            : new GoldenDatasetGeneratorOptions().NetworkTimeoutSeconds;
        var maxRetryAttempts = int.TryParse(configuration.GetSection(nameof(EvaluationRateLimitOptions))[nameof(EvaluationRateLimitOptions.MaxRetryAttempts)], out var parsedMaxRetryAttempts)
            ? parsedMaxRetryAttempts
            : new EvaluationRateLimitOptions().MaxRetryAttempts;

        return new AppConfig(
            connectionString,
            openAIOptions,
            new GoldenDatasetGeneratorOptions { ModelId = modelId, NetworkTimeoutSeconds = networkTimeoutSeconds },
            new EvaluationRateLimitOptions { MaxRetryAttempts = maxRetryAttempts });
    }
}

sealed record OpenAIConfig
{
    public string? ApiKey { get; init; }
    public string? Endpoint { get; init; }
}

sealed record GoldenDatasetGeneratorOptions
{
    public string ModelId { get; init; } = "gpt-5.4-mini";
    public int NetworkTimeoutSeconds { get; init; } = 300;
    public TimeSpan NetworkTimeout => TimeSpan.FromSeconds(this.NetworkTimeoutSeconds);
}

sealed record EvaluationRateLimitOptions
{
    public int MaxRetryAttempts { get; init; } = 5;
}

sealed record DocRecord(string DocumentId, string SourcePath, string Title, string PageContent)
{
    public static DocRecord FromBson(BsonDocument document) => new(
        document.GetValue("_id", string.Empty).AsString,
        document.GetValue("SourcePath", string.Empty).AsString,
        document.GetValue("Title", string.Empty).AsString,
        document.GetValue("PageContent", string.Empty).AsString);
}

sealed record RawSection(string? Heading, string Content);
sealed record DocSection(string DocumentId, string SourcePath, string Title, int Index, string? Heading, string Text);
sealed record NoteSection(string LocalId, string SourcePath, string DocumentId, string Title, string? Heading, string Text);
sealed record NoteGroup(string Id, string SeedTitle, string SeedSourcePath, IReadOnlyList<NoteSection> Sections);

sealed record GroupLlmResponse(bool Accepted, string? RejectionReason, IReadOnlyList<QueryCase>? Queries);
sealed record QueryCase(string Query, string? Difficulty, IReadOnlyList<QueryEvidence>? Evidence, string? Answer = null);
sealed record QueryEvidence(string? SectionId, string? Quote);

sealed record DatasetFile(int Version, DateTimeOffset GeneratedAt, string Collection, IReadOnlyList<DatasetCase> Cases);
sealed record DatasetCase(string Id, string Query, string Difficulty, IReadOnlyList<ExpectedChunk> Expected);
sealed record ExpectedChunk(string DocumentId, string? Heading, string CitationLabel, string Text);

// One generated case in superset form: the search fields plus an optional grounded reference answer.
// Projected to the search and/or answer dataset rows depending on which datasets were requested.
sealed record GeneratedCase(string Id, string Query, string Difficulty, IReadOnlyList<ExpectedChunk> Expected, string? ReferenceAnswer, IReadOnlyList<string> ExpectedCitations)
{
    public DatasetCase ToSearchCase() => new(this.Id, this.Query, this.Difficulty, this.Expected);
    public AnswerDatasetCase ToAnswerCase() => new(this.Id, this.Query, this.Difficulty, this.Expected, this.ReferenceAnswer!, this.ExpectedCitations);
}

// answers-shared.json: the search case plus a grounded reference answer and the notes a correct answer
// should cite. Consumed by RAG.Answer to unlock the correctness/equivalence metric.
sealed record AnswerDatasetFile(int Version, DateTimeOffset GeneratedAt, string Collection, IReadOnlyList<AnswerDatasetCase> Cases);
sealed record AnswerDatasetCase(string Id, string Query, string Difficulty, IReadOnlyList<ExpectedChunk> Expected, string ReferenceAnswer, IReadOnlyList<string> ExpectedCitations);

sealed record GroupFile(int Version, DateTimeOffset GeneratedAt, IReadOnlyList<GroupInfo> Groups);
sealed record GroupInfo(string Id, string SeedTitle, string SeedSourcePath, int NoteCount, IReadOnlyList<GroupSection> Sections)
{
    public static GroupInfo FromGroup(NoteGroup group) => new(
        group.Id,
        group.SeedTitle,
        group.SeedSourcePath,
        group.Sections.Select(section => section.SourcePath).Distinct(StringComparer.Ordinal).Count(),
        group.Sections.Select(section => new GroupSection(section.LocalId, section.Title, section.SourcePath, section.Heading, section.Text.Length)).ToArray());
}
sealed record GroupSection(string LocalId, string Title, string SourcePath, string? Heading, int CharCount);

sealed record SummaryFile(
    int Version,
    DateTimeOffset GeneratedAt,
    int DocumentsLoaded,
    int DocumentsWithSections,
    int Groups,
    int CrossNoteGroups,
    int Cases,
    int SingleEvidenceCases,
    int MultiEvidenceCases,
    int SourcesCovered)
{
    public static SummaryFile Create(DateTimeOffset generatedAt, int documentsLoaded, int documentsWithSections, IReadOnlyList<NoteGroup> groups, IReadOnlyList<DatasetCase> cases)
    {
        var evidenceCounts = cases
            .Select(item => item.Expected.Count)
            .ToArray();
        var sourcesCovered = cases
            .SelectMany(item => item.Expected)
            .Select(expected => expected.CitationLabel)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Count();

        return new SummaryFile(
            1,
            generatedAt,
            documentsLoaded,
            documentsWithSections,
            groups.Count,
            groups.Count(group => group.Sections.Select(section => section.SourcePath).Distinct(StringComparer.Ordinal).Count() > 1),
            cases.Count,
            evidenceCounts.Count(count => count <= 1),
            evidenceCounts.Count(count => count > 1),
            sourcesCovered);
    }
}

static class PromptBuilder
{
    public static string ForGroup(NoteGroup group, bool includeAnswer)
    {
        var builder = new StringBuilder();
        builder.AppendLine("These sections come from a seed note and notes it links to. Decide whether they can answer coherent user queries.");
        builder.AppendLine("If yes, generate 2-4 realistic retrieval queries. Strongly prefer queries whose evidence spans multiple sections, ideally across different notes; only fall back to a single section when the question genuinely needs just one.");
        builder.AppendLine("For each query, list every section whose content is needed to answer it, and omit unrelated sections. quote must be a short verbatim sentence copied from that section's text, plain prose without Markdown.");
        if (includeAnswer)
        {
            builder.AppendLine("Also produce \"answer\": a correct, self-contained reference answer (2-5 sentences) using ONLY the listed sections. Cite each note inline as [[note title]] or [[note title#heading]] using the note and heading shown in the section header. Do not state any fact that the cited sections do not support.");
            builder.AppendLine("Return JSON: {\"accepted\":true|false,\"rejectionReason\":\"...\",\"queries\":[{\"query\":\"...\",\"difficulty\":\"easy|medium|hard\",\"evidence\":[{\"sectionId\":\"S1\",\"quote\":\"...\"}],\"answer\":\"... [[Note#Heading]] ...\"}]}");
        }
        else
        {
            builder.AppendLine("Return JSON: {\"accepted\":true|false,\"rejectionReason\":\"...\",\"queries\":[{\"query\":\"...\",\"difficulty\":\"easy|medium|hard\",\"evidence\":[{\"sectionId\":\"S1\",\"quote\":\"...\"}]}]}");
        }

        builder.AppendLine($"Seed note: {group.SeedTitle}");
        foreach (var section in group.Sections)
        {
            builder.AppendLine($"--- {section.LocalId} (note: {section.Title}; heading: {section.Heading ?? "(none)"}) ---");
            builder.AppendLine(TextRules.Preview(section.Text, 900));
        }

        return builder.ToString();
    }
}

static class TextRules
{
    public static readonly Regex WikiLinkPattern = new(@"\[\[([^\]\r\n]+)\]\]", RegexOptions.Compiled);
    private static readonly Regex WordPattern = new("[A-Za-z][A-Za-z0-9_+.#-]{2,}", RegexOptions.Compiled);
    private static readonly Regex WhatsNextPattern = new("<!-- whats-next:start -->[\\s\\S]*?(<!-- whats-next:end -->|$)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex SlugPattern = new("[^a-z0-9]+", RegexOptions.Compiled);
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase) { "the", "and", "for", "with", "that", "this", "from", "into", "when", "then", "than", "they", "them", "their", "there", "where", "what", "why", "how", "you", "your", "are", "was", "were", "been", "being", "can", "could", "should", "would", "will", "may", "might", "must", "not", "but", "use", "using", "used", "same", "each", "more", "less", "most", "least", "also", "only", "between", "within", "without", "before", "after" };

    public static bool IsSubstantive(string text, int minCharacters) => Clean(text).Length >= minCharacters && TokenSet(text).Count >= 12;
    public static string Clean(string text) => WhatsNextPattern.Replace(text, " ").ReplaceLineEndings(" ").Trim();
    public static string Preview(string text, int limit = 320) => Clean(text).Length <= limit ? Clean(text) : Clean(text)[..limit].TrimEnd() + "…";
    public static string Slug(string value) { var slug = SlugPattern.Replace(value.ToLowerInvariant(), "-").Trim('-'); return slug.Length <= 48 ? slug : slug[..48].Trim('-'); }
    public static string NormalizeKey(string? value) => string.IsNullOrWhiteSpace(value) ? string.Empty : Normalize(value.EndsWith(".md", StringComparison.OrdinalIgnoreCase) ? value[..^3] : value).ToUpperInvariant();

    // Returns a verbatim, whitespace-normalized snippet that is guaranteed to appear in the section text. Prefers the
    // LLM's quote when it normalizes to a substring of the section; otherwise falls back to the leading sentence.
    public static string SelectSnippet(string sectionText, string? quote)
    {
        var normalizedSection = Normalize(sectionText);
        var candidate = Normalize(quote ?? string.Empty);
        if (candidate.Length >= 12 && normalizedSection.Contains(candidate, StringComparison.OrdinalIgnoreCase))
        {
            return Cap(candidate);
        }

        return Cap(LeadingSentence(normalizedSection));
    }

    private static string LeadingSentence(string text)
    {
        var end = text.IndexOf(". ", StringComparison.Ordinal);
        return end > 0 ? text[..(end + 1)] : text;
    }

    private static string Cap(string text, int limit = 200) => text.Length <= limit ? text : text[..limit].TrimEnd();
    private static string Normalize(string text) => string.Join(' ', Clean(text).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).Trim();
    private static HashSet<string> TokenSet(string text) => Tokens(text).ToHashSet(StringComparer.OrdinalIgnoreCase);
    private static IEnumerable<string> Tokens(string text) => WordPattern.Matches(Clean(text)).Select(match => match.Value.ToLowerInvariant().Trim('-', '_', '.', '#')).Where(term => term.Length >= 3 && !StopWords.Contains(term) && !term.All(char.IsDigit));
}

static class JsonDefaults
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull, TypeInfoResolver = new DefaultJsonTypeInfoResolver() };
}
