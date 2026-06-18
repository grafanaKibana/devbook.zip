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
using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;
using OpenAI;
using OpenAI.Chat;

var repoRoot = FindRepoRoot(AppContext.BaseDirectory);
var runOptions = RunOptions.Parse(args, repoRoot);
var appConfig = AppConfig.Load(runOptions.RepoRoot);
var database = new MongoClient(appConfig.MongoConnectionString).GetDatabase(AppConfig.MongoDatabaseName);
var chatClient = CreateChatClient(appConfig);
var generatedAt = DateTimeOffset.UtcNow;

Console.WriteLine("Golden dataset generator");
Console.WriteLine($"Repo root: {runOptions.RepoRoot}");
Console.WriteLine($"Base sample size: {runOptions.SampleSize}");
Console.WriteLine($"Max groups per collection: {runOptions.MaxGroupsPerCollection}");
Console.WriteLine($"Max LLM groups per collection: {(runOptions.MaxLlmGroupsPerCollection is null ? "all" : runOptions.MaxLlmGroupsPerCollection)}");
Console.WriteLine($"Max OpenAI retry attempts: {appConfig.RateLimitOptions.MaxRetryAttempts}");
Console.WriteLine($"Dry run: {runOptions.DryRun}");

Directory.CreateDirectory(runOptions.DatasetOutputDirectory);
Directory.CreateDirectory(runOptions.GroupOutputDirectory);

var collectionCounts = await CountCollectionChunksAsync(database, CollectionConfig.All, runOptions.CancellationToken);
var minimumCollectionCount = collectionCounts.Values.Where(count => count > 0).DefaultIfEmpty(runOptions.SampleSize).Min();
var summaries = new List<CollectionSummary>();
foreach (var collectionConfig in CollectionConfig.All)
{
    Console.WriteLine();
    Console.WriteLine($"== {collectionConfig.CollectionName} ==");

    var collectionCount = collectionCounts[collectionConfig.CollectionName];
    var proportionalSampleSize = GetProportionalSampleSize(collectionCount, minimumCollectionCount, runOptions.SampleSize);
    Console.WriteLine($"Collection chunks: {collectionCount}; target sample size: {proportionalSampleSize}.");

    var chunks = await SampleChunksAsync(database, collectionConfig.CollectionName, proportionalSampleSize, runOptions.CancellationToken);
    Console.WriteLine($"Sampled {chunks.Count} chunks with embeddings.");

    var groupFile = CreateGroups(collectionConfig, chunks, runOptions.MaxGroupsPerCollection, generatedAt);
    WriteJson(runOptions.GroupPath(collectionConfig), groupFile);
    Console.WriteLine($"Created {groupFile.AcceptedGroups.Count} accepted groups, {groupFile.RejectedGroups.Count} rejected candidates, {groupFile.AuditGroups.Count} audit-only chunks.");

    var cases = new List<DatasetCase>();
    if (!runOptions.DryRun)
    {
        var groupsForLlm = runOptions.MaxLlmGroupsPerCollection is null
            ? groupFile.AcceptedGroups
            : groupFile.AcceptedGroups.Take(runOptions.MaxLlmGroupsPerCollection.Value).ToArray();

        foreach (var group in groupsForLlm)
        {
            var llmResponse = await GenerateCasesForGroupWithRetryAsync(chatClient, group, appConfig.RateLimitOptions, runOptions.CancellationToken);
            var acceptedCases = KeepValidCases(collectionConfig, group, llmResponse).ToArray();
            cases.AddRange(acceptedCases);
            Console.WriteLine($"{group.Id}: LLM accepted={llmResponse.Accepted}; keptCases={acceptedCases.Length}");
        }

        WriteJson(runOptions.DatasetPath(collectionConfig), new DatasetFile(2, generatedAt, collectionConfig.CollectionName, cases));
        Console.WriteLine($"Wrote dataset cases: {cases.Count}");

        // MarkdownSection chunks are the natural chunker-neutral unit (chunk ≈ note section), so its cases double
        // as the shared golden dataset. SearchEvaluation matches these by source + heading + snippet, ignoring ids.
        if (collectionConfig.Strategy == ChunkingStrategyKind.MarkdownSection)
        {
            WriteJson(runOptions.SharedDatasetPath, new DatasetFile(2, generatedAt, "shared", cases));
            Console.WriteLine($"Wrote shared dataset cases: {cases.Count}");
        }
    }
    else
    {
        Console.WriteLine("Dry run: skipped final dataset file write.");
    }

    summaries.Add(new CollectionSummary(collectionConfig.CollectionName, chunks.Count, groupFile.AcceptedGroups.Count, groupFile.RejectedGroups.Count, groupFile.AuditGroups.Count, cases.Count));
}

WriteJson(Path.Combine(runOptions.GroupOutputDirectory, "summary.json"), new SummaryFile(1, generatedAt, summaries));

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

static async Task<IReadOnlyList<ChunkRecord>> SampleChunksAsync(IMongoDatabase database, string collectionName, int sampleSize, CancellationToken cancellationToken)
{
    var collection = database.GetCollection<BsonDocument>(collectionName);
    var pipeline = new[]
    {
        new BsonDocument("$sample", new BsonDocument("size", sampleSize)),
        new BsonDocument("$project", new BsonDocument
        {
            ["_id"] = 1,
            ["DocumentId"] = 1,
            ["Heading"] = 1,
            ["ChunkText"] = 1,
            ["ChunkOrder"] = 1,
            ["Embedding"] = 1,
            ["CitationLabel"] = 1,
        }),
    };

    var documents = await collection.Aggregate<BsonDocument>(pipeline, cancellationToken: cancellationToken).ToListAsync(cancellationToken);
    return documents.Select(ChunkRecord.FromBson).Where(chunk => chunk.Embedding.Length > 0).ToArray();
}

static async Task<IReadOnlyDictionary<string, long>> CountCollectionChunksAsync(IMongoDatabase database, IReadOnlyList<CollectionConfig> configs, CancellationToken cancellationToken)
{
    var counts = new Dictionary<string, long>(StringComparer.Ordinal);
    foreach (var config in configs)
    {
        counts[config.CollectionName] = await database.GetCollection<BsonDocument>(config.CollectionName).CountDocumentsAsync(FilterDefinition<BsonDocument>.Empty, cancellationToken: cancellationToken);
    }

    return counts;
}

static int GetProportionalSampleSize(long collectionCount, long minimumCollectionCount, int baseSampleSize)
{
    if (collectionCount <= 0 || minimumCollectionCount <= 0)
    {
        return baseSampleSize;
    }

    var scaled = (int)Math.Ceiling(baseSampleSize * (collectionCount / (double)minimumCollectionCount));
    return (int)Math.Min(collectionCount, Math.Max(baseSampleSize, scaled));
}

static GroupFile CreateGroups(CollectionConfig config, IReadOnlyList<ChunkRecord> chunks, int maxGroups, DateTimeOffset generatedAt)
{
    var eligible = chunks.Where(TextRules.IsSubstantive).ToArray();
    var neighborMap = BuildNeighborMap(eligible, config.MinimumCosineSimilarity);
    var seeds = eligible
        .Select(chunk => new { Chunk = chunk, Score = Average(neighborMap[chunk.ChunkId].Take(5).Select(item => item.Similarity)) + Math.Min(TextRules.Clean(chunk.ChunkText).Length, 1200) / 12000d })
        .OrderByDescending(item => item.Score)
        .ToArray();

    var usage = new Dictionary<string, int>(StringComparer.Ordinal);
    var accepted = new List<ChunkGroup>();
    var rejected = new List<ChunkGroup>();

    foreach (var seed in seeds)
    {
        if (accepted.Count >= maxGroups)
        {
            break;
        }

        if (usage.GetValueOrDefault(seed.Chunk.ChunkId) >= 1)
        {
            continue;
        }

        var neighbors = neighborMap[seed.Chunk.ChunkId]
            .Where(item => usage.GetValueOrDefault(item.Chunk.ChunkId) < 2)
            .Take(5)
            .ToArray();
        if (neighbors.Length < 2)
        {
            continue;
        }

        var validation = ValidateCoherence([seed.Chunk, .. neighbors.Select(item => item.Chunk)], neighbors.Select(item => item.Similarity).ToArray());
        var group = CreateGroup(config, validation.Accepted ? accepted.Count + 1 : rejected.Count + 1, validation.Accepted, seed.Chunk, neighbors, validation);
        if (!validation.Accepted)
        {
            rejected.Add(group);
            continue;
        }

        foreach (var chunk in group.ChunkIds)
        {
            usage[chunk] = usage.GetValueOrDefault(chunk) + 1;
        }

        accepted.Add(group);
    }

    var acceptedIds = accepted.SelectMany(group => group.ChunkIds).ToHashSet(StringComparer.Ordinal);
    var audit = chunks
        .Where(chunk => !acceptedIds.Contains(chunk.ChunkId))
        .Select((chunk, index) => CreateAuditGroup(config, chunk, index + 1))
        .ToArray();

    return new GroupFile(1, generatedAt, config.CollectionName, config.MinimumCosineSimilarity, new MinimumQueryReadyContent(220, 22), accepted, rejected, audit);
}

static Dictionary<string, IReadOnlyList<Neighbor>> BuildNeighborMap(IReadOnlyList<ChunkRecord> chunks, double threshold)
{
    var result = new Dictionary<string, IReadOnlyList<Neighbor>>(StringComparer.Ordinal);
    foreach (var seed in chunks)
    {
        result[seed.ChunkId] = chunks
            .Where(candidate => candidate.ChunkId != seed.ChunkId)
            .Select(candidate => new Neighbor(candidate, Cosine(seed, candidate)))
            .Where(neighbor => neighbor.Similarity >= threshold)
            .OrderByDescending(neighbor => neighbor.Similarity)
            .ToArray();
    }

    return result;
}

static ChunkGroup CreateGroup(CollectionConfig config, int index, bool accepted, ChunkRecord seed, IReadOnlyList<Neighbor> neighbors, GroupValidation validation)
{
    var members = new[] { seed }.Concat(neighbors.Select(item => item.Chunk)).ToArray();
    var similarities = neighbors.ToDictionary(item => item.Chunk.ChunkId, item => item.Similarity, StringComparer.Ordinal);
    var sourceTitles = members.Select(chunk => chunk.SourceTitle).Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value!).Distinct(StringComparer.Ordinal).Order().ToArray();
    var topic = string.Join(" — ", new[] { string.Join(" + ", sourceTitles.Take(2)), string.Join(", ", validation.SharedTerms.Take(4)) }.Where(value => !string.IsNullOrWhiteSpace(value)));
    return new ChunkGroup(
        $"{config.FilePrefix}-{(accepted ? "group" : "rejected")}-{index:0000}",
        config.CollectionName,
        string.IsNullOrWhiteSpace(topic) ? "Embedding neighborhood" : topic,
        accepted ? "validated-embedding-cosine-neighborhood" : "rejected-embedding-cosine-neighborhood",
        accepted,
        seed.ChunkId,
        members.Select(chunk => chunk.ChunkId).ToArray(),
        members.Select(chunk => chunk.DocumentId).Distinct(StringComparer.Ordinal).Order().ToArray(),
        sourceTitles,
        members.Select(chunk => chunk.Heading).Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value!).Distinct(StringComparer.Ordinal).Order().ToArray(),
        TextRules.TopTerms(members, 10),
        validation,
        members.Select(chunk => ChunkForPrompt.FromChunk(chunk, similarities.GetValueOrDefault(chunk.ChunkId))).ToArray());
}

static ChunkGroup CreateAuditGroup(CollectionConfig config, ChunkRecord chunk, int index)
{
    return new ChunkGroup(
        $"{config.FilePrefix}-audit-{index:0000}",
        config.CollectionName,
        string.Join(" — ", new[] { chunk.SourceTitle, chunk.Heading }.Where(value => !string.IsNullOrWhiteSpace(value))),
        TextRules.IsSubstantive(chunk) ? "substantive-unselected-audit-only" : "low-information-audit-only",
        false,
        chunk.ChunkId,
        [chunk.ChunkId],
        [chunk.DocumentId],
        string.IsNullOrWhiteSpace(chunk.SourceTitle) ? [] : [chunk.SourceTitle],
        string.IsNullOrWhiteSpace(chunk.Heading) ? [] : [chunk.Heading],
        TextRules.TopTerms([chunk], 10),
        new GroupValidation(false, [], 1, string.IsNullOrWhiteSpace(chunk.Heading) ? 0 : 1, 1, 0, 0),
        [ChunkForPrompt.FromChunk(chunk, null)]);
}

static async Task<GroupLlmResponse> GenerateCasesForGroupAsync(ChatClient chatClient, ChunkGroup group, CancellationToken cancellationToken)
{
    var messages = new ChatMessage[]
    {
        new SystemChatMessage("You create retrieval golden datasets. Use only the supplied chunks. Return strict JSON only. Do not invent chunk IDs."),
        new UserChatMessage(PromptBuilder.ForGroup(group)),
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

static async Task<GroupLlmResponse> GenerateCasesForGroupWithRetryAsync(ChatClient chatClient, ChunkGroup group, EvaluationRateLimitOptions rateLimitOptions, CancellationToken cancellationToken)
{
    for (var attempt = 1; ; attempt++)
    {
        try
        {
            return await GenerateCasesForGroupAsync(chatClient, group, cancellationToken);
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

static IEnumerable<DatasetCase> KeepValidCases(CollectionConfig config, ChunkGroup group, GroupLlmResponse response)
{
    if (!response.Accepted)
    {
        yield break;
    }

    var chunksById = group.Chunks.ToDictionary(chunk => chunk.ChunkId, StringComparer.Ordinal);
    var allowedIds = chunksById.Keys.ToHashSet(StringComparer.Ordinal);
    var index = 1;
    foreach (var query in response.Queries)
    {
        var primary = ValidIds(query.PrimaryChunkIds, allowedIds).ToArray();
        var supporting = ValidIds(query.SupportingChunkIds, allowedIds).Except(primary, StringComparer.Ordinal).ToArray();
        var acceptable = ValidIds(query.AcceptableChunkIds, allowedIds).Except(primary, StringComparer.Ordinal).Except(supporting, StringComparer.Ordinal).ToArray();

        if (string.IsNullOrWhiteSpace(query.Query) || primary.Length == 0 || supporting.Length + acceptable.Length == 0)
        {
            continue;
        }

        yield return new DatasetCase(
            $"{config.FilePrefix}-{TextRules.Slug(query.Query)}-{index:000}",
            query.Query.Trim(),
            NormalizeDifficulty(query.Difficulty),
            new GradedExpectations(
                ToExpectedChunks(primary, chunksById),
                ToExpectedChunks(supporting, chunksById),
                ToExpectedChunks(acceptable, chunksById)));
        index++;
    }
}

static IReadOnlyList<ExpectedChunk> ToExpectedChunks(IEnumerable<string> chunkIds, IReadOnlyDictionary<string, ChunkForPrompt> chunksById)
{
    return chunkIds.Select(chunkId => ExpectedChunk.FromChunk(chunksById[chunkId])).ToArray();
}

static IEnumerable<string> ValidIds(IEnumerable<string>? ids, HashSet<string> allowedIds)
{
    return (ids ?? []).Where(id => !string.IsNullOrWhiteSpace(id)).Select(id => id.Trim()).Where(allowedIds.Contains).Distinct(StringComparer.Ordinal);
}

static GroupValidation ValidateCoherence(IReadOnlyList<ChunkRecord> group, IReadOnlyList<double> similarities)
{
    var sharedTerms = TextRules.CommonTerms(group).Take(10).ToArray();
    var rootCount = group.Select(chunk => TextRules.PathRoot(chunk.SourceTitle)).Where(value => value is not null).Distinct(StringComparer.Ordinal).Count();
    var headingCount = group.Select(chunk => chunk.Heading).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.Ordinal).Count();
    var documentCount = group.Select(chunk => chunk.DocumentId).Distinct(StringComparer.Ordinal).Count();
    var averageSimilarity = Average(similarities);
    var minimumSimilarity = similarities.Count == 0 ? 0 : similarities.Min();
    var accepted = group.Count >= 3 && sharedTerms.Length >= 3 && (averageSimilarity >= 0.74 || sharedTerms.Length >= 5 || rootCount <= 2 || headingCount == 1);
    return new GroupValidation(accepted, sharedTerms, rootCount, headingCount, documentCount, Math.Round(averageSimilarity, 6), Math.Round(minimumSimilarity, 6));
}

static double Cosine(ChunkRecord first, ChunkRecord second)
{
    var dot = 0d;
    for (var index = 0; index < first.Embedding.Length; index++)
    {
        dot += first.Embedding[index] * second.Embedding[index];
    }

    return dot / (first.Norm * second.Norm);
}

static double Average(IEnumerable<double> values)
{
    var array = values.ToArray();
    return array.Length == 0 ? 0 : array.Average();
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

sealed record RunOptions(string RepoRoot, int SampleSize, int MaxGroupsPerCollection, int? MaxLlmGroupsPerCollection, bool DryRun, CancellationToken CancellationToken)
{
    public string DatasetOutputDirectory => Path.Combine(this.RepoRoot, "Platform/DevBook/DevBook.Evaluations/Datasets");
    public string GroupOutputDirectory => Path.Combine(this.DatasetOutputDirectory, "Groups");
    public string GroupPath(CollectionConfig config) => Path.Combine(this.GroupOutputDirectory, $"{config.FilePrefix}.groups.json");
    public string DatasetPath(CollectionConfig config) => Path.Combine(this.DatasetOutputDirectory, $"{config.FilePrefix}.json");

    // The shared, chunker-neutral golden dataset consumed by SearchEvaluation. Ground truth is keyed by
    // source + heading + snippet, so one question set scores every chunking strategy on equal footing.
    public string SharedDatasetPath => Path.Combine(this.DatasetOutputDirectory, "chunks-shared.json");

    public static RunOptions Parse(string[] args, string repoRoot)
    {
        return new RunOptions(GetString(args, "--repo-root") ?? repoRoot, GetInt(args, "--sample-size", 1000), GetInt(args, "--max-groups", 120), TryGetInt(args, "--max-llm-groups"), args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase), CancellationToken.None);
    }

    private static int GetInt(string[] args, string name, int fallback) => TryGetInt(args, name) ?? fallback;
    private static int? TryGetInt(string[] args, string name) => int.TryParse(GetString(args, name), out var value) ? value : null;
    private static string? GetString(string[] args, string name)
    {
        var index = Array.FindIndex(args, arg => arg.Equals(name, StringComparison.OrdinalIgnoreCase));
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }
}

sealed record AppConfig(string MongoConnectionString, OpenAIOptions OpenAIOptions, GoldenDatasetGeneratorOptions GeneratorOptions, EvaluationRateLimitOptions RateLimitOptions)
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

        var openAISection = configuration.GetSection(nameof(OpenAIOptions));
        var openAIOptions = new OpenAIOptions { ApiKey = openAISection[nameof(OpenAIOptions.ApiKey)], Endpoint = openAISection[nameof(OpenAIOptions.Endpoint)] };
        if (string.IsNullOrWhiteSpace(openAIOptions.ApiKey))
        {
            throw new InvalidOperationException($"Missing required configuration: {nameof(OpenAIOptions)}:{nameof(OpenAIOptions.ApiKey)}.");
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

sealed record CollectionConfig(ChunkingStrategyKind Strategy, double MinimumCosineSimilarity)
{
    public string CollectionName => ChunkCollectionNames.ForStrategy(this.Strategy);
    public string FilePrefix => this.CollectionName.Replace('.', '-');
    public static readonly CollectionConfig[] All =
    [
        new(ChunkingStrategyKind.FixedSize, 0.62),
        new(ChunkingStrategyKind.MarkdownSection, 0.70),
        new(ChunkingStrategyKind.Semantic, 0.70),
    ];
}

sealed record ChunkRecord(string ChunkId, string DocumentId, string? Heading, int ChunkOrder, string ChunkText, float[] Embedding, string CitationLabel)
{
    public string? SourceTitle => TextRules.TitleFromCitation(this.CitationLabel);
    public double Norm { get; } = Math.Sqrt(Embedding.Sum(value => value * value));
    public static ChunkRecord FromBson(BsonDocument document) => new(document["_id"].AsString, document.GetValue("DocumentId", string.Empty).AsString, document.GetValue("Heading", BsonNull.Value).IsBsonNull ? null : document.GetValue("Heading").AsString, document.GetValue("ChunkOrder", 0).ToInt32(), document.GetValue("ChunkText", string.Empty).AsString, document.GetValue("Embedding", new BsonArray()).AsBsonArray.Select(value => (float)value.ToDouble()).ToArray(), document.GetValue("CitationLabel", string.Empty).AsString);
}

sealed record Neighbor(ChunkRecord Chunk, double Similarity);
sealed record GroupFile(int Version, DateTimeOffset GeneratedAt, string Collection, double MinimumCosineSimilarity, MinimumQueryReadyContent MinimumQueryReadyContent, IReadOnlyList<ChunkGroup> AcceptedGroups, IReadOnlyList<ChunkGroup> RejectedGroups, IReadOnlyList<ChunkGroup> AuditGroups);
sealed record MinimumQueryReadyContent(int MinCharacters, int MinUniqueTerms);
sealed record ChunkGroup(string Id, string Collection, string Topic, string Basis, bool QueryGenerationReady, string SeedChunkId, IReadOnlyList<string> ChunkIds, IReadOnlyList<string> DocumentIds, IReadOnlyList<string> SourceTitles, IReadOnlyList<string> Headings, IReadOnlyList<string> TopTerms, GroupValidation Validation, IReadOnlyList<ChunkForPrompt> Chunks);
sealed record GroupValidation(bool Accepted, IReadOnlyList<string> SharedTerms, int RootCount, int HeadingCount, int DocumentCount, double AverageSimilarity, double MinimumSimilarity);
sealed record ChunkForPrompt(string ChunkId, string DocumentId, string? Heading, int ChunkOrder, string CitationLabel, double? SimilarityToSeed, string Text)
{
    public static ChunkForPrompt FromChunk(ChunkRecord chunk, double? similarityToSeed) => new(chunk.ChunkId, chunk.DocumentId, chunk.Heading, chunk.ChunkOrder, chunk.CitationLabel, similarityToSeed is null ? null : Math.Round(similarityToSeed.Value, 6), TextRules.Preview(chunk.ChunkText));
}

sealed record GroupLlmResponse(bool Accepted, string? RejectionReason, IReadOnlyList<QueryClassification> Queries);
sealed record QueryClassification(string Query, string Difficulty, IReadOnlyList<string> PrimaryChunkIds, IReadOnlyList<string> SupportingChunkIds, IReadOnlyList<string> AcceptableChunkIds, IReadOnlyList<string> IrrelevantChunkIds);
sealed record DatasetFile(int Version, DateTimeOffset GeneratedAt, string Collection, IReadOnlyList<DatasetCase> Cases);
sealed record DatasetCase(string Id, string Query, string Difficulty, GradedExpectations Expected);
sealed record GradedExpectations(IReadOnlyList<ExpectedChunk> PrimaryChunks, IReadOnlyList<ExpectedChunk> SupportingChunks, IReadOnlyList<ExpectedChunk> AcceptableChunks);
sealed record ExpectedChunk(string ChunkId, string DocumentId, string? Heading, int ChunkOrder, string CitationLabel, string Text)
{
    public static ExpectedChunk FromChunk(ChunkForPrompt chunk) => new(chunk.ChunkId, chunk.DocumentId, chunk.Heading, chunk.ChunkOrder, chunk.CitationLabel, chunk.Text);
}
sealed record SummaryFile(int Version, DateTimeOffset GeneratedAt, IReadOnlyList<CollectionSummary> Collections);
sealed record CollectionSummary(string Collection, int SampledChunks, int AcceptedGroups, int RejectedGroups, int AuditGroups, int DatasetCases);

static class PromptBuilder
{
    public static string ForGroup(ChunkGroup group)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Decide whether these chunks can answer one coherent user query. If yes, generate 2-3 retrieval queries and classify every chunk for each query.");
        builder.AppendLine("Keep a query only when at least one chunk is primary and at least one other chunk is supporting or acceptable. Reject broad topic mismatch.");
        builder.AppendLine("Labels: primary, supporting, acceptable, irrelevant.");
        builder.AppendLine("Return JSON: {\"accepted\":true|false,\"rejectionReason\":\"...\",\"queries\":[{\"query\":\"...\",\"difficulty\":\"easy|medium|hard\",\"primaryChunkIds\":[\"...\"],\"supportingChunkIds\":[\"...\"],\"acceptableChunkIds\":[\"...\"],\"irrelevantChunkIds\":[\"...\"]}]}");
        builder.AppendLine(JsonSerializer.Serialize(group, JsonDefaults.Options));
        return builder.ToString();
    }
}

static class TextRules
{
    private static readonly Regex WordPattern = new("[A-Za-z][A-Za-z0-9_+.#-]{2,}", RegexOptions.Compiled);
    private static readonly Regex WhatsNextPattern = new("<!-- whats-next:start -->[\\s\\S]*?(<!-- whats-next:end -->|$)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex SlugPattern = new("[^a-z0-9]+", RegexOptions.Compiled);
    private static readonly Regex LeadingNumberPattern = new("^\\d+\\s+", RegexOptions.Compiled);
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase) { "the", "and", "for", "with", "that", "this", "from", "into", "when", "then", "than", "they", "them", "their", "there", "where", "what", "why", "how", "you", "your", "are", "was", "were", "been", "being", "can", "could", "should", "would", "will", "may", "might", "must", "not", "but", "use", "using", "used", "does", "done", "same", "each", "more", "less", "most", "least", "also", "only", "between", "within", "without", "before", "after", "default", "example", "examples", "value", "values", "true", "false", "null", "new", "return", "returns", "section", "intro", "links", "references", "question", "answer", "expected", "tradeoff", "mechanism", "pitfalls", "whats", "next", "whats-next", "parent", "pages", "topics", "software", "engineering", "note" };
    public static bool IsSubstantive(ChunkRecord chunk) => Clean(chunk.ChunkText).Length >= 220 && TokenSet(chunk.ChunkText).Count >= 22;
    public static IReadOnlyList<string> CommonTerms(IReadOnlyList<ChunkRecord> chunks) => TermCounts(chunks, true).Where(item => item.Value >= Math.Max(2, (int)Math.Ceiling(chunks.Count * 0.4))).OrderByDescending(item => item.Value).Select(item => item.Key).ToArray();
    public static IReadOnlyList<string> TopTerms(IReadOnlyList<ChunkRecord> chunks, int count) => TermCounts(chunks, false).OrderByDescending(item => item.Value).Take(count).Select(item => item.Key).ToArray();
    public static string Clean(string text) => WhatsNextPattern.Replace(text, " ").ReplaceLineEndings(" ").Trim();
    public static string Preview(string text, int limit = 320) => Clean(text).Length <= limit ? Clean(text) : Clean(text)[..limit].TrimEnd() + "…";
    public static string Slug(string value) { var slug = SlugPattern.Replace(value.ToLowerInvariant(), "-").Trim('-'); return slug.Length <= 48 ? slug : slug[..48].Trim('-'); }
    public static string? TitleFromCitation(string? label) { if (string.IsNullOrWhiteSpace(label)) return null; var text = label.Trim(); if (text.StartsWith("[[", StringComparison.Ordinal) && text.EndsWith("]]", StringComparison.Ordinal)) text = text[2..^2]; return text.Split('#', 2)[0].Trim(); }
    public static string? PathRoot(string? title) => string.IsNullOrWhiteSpace(title) ? null : LeadingNumberPattern.Replace(title, string.Empty).Split('/', '\\')[0].Split('&')[0].Trim().ToLowerInvariant();
    private static HashSet<string> TokenSet(string text) => Tokens(text).ToHashSet(StringComparer.OrdinalIgnoreCase);
    private static IEnumerable<string> Tokens(string text) => WordPattern.Matches(Clean(text)).Select(match => match.Value.ToLowerInvariant().Trim('-', '_', '.', '#')).Where(term => term.Length >= 3 && !StopWords.Contains(term) && !term.All(char.IsDigit));
    private static Dictionary<string, int> TermCounts(IReadOnlyList<ChunkRecord> chunks, bool uniquePerChunk)
    {
        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var terms in chunks.Select(chunk => uniquePerChunk ? Tokens(chunk.ChunkText).Distinct(StringComparer.OrdinalIgnoreCase) : Tokens(chunk.ChunkText)))
        {
            foreach (var term in terms) counts[term] = counts.GetValueOrDefault(term) + 1;
        }
        return counts;
    }
}

static class JsonDefaults
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { WriteIndented = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull, TypeInfoResolver = new DefaultJsonTypeInfoResolver() };
}
