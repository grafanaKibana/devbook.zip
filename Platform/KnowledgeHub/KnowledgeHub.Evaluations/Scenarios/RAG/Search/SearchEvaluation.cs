namespace KnowledgeHub.Evaluations.Scenarios.RAG.Search;

using KnowledgeHub.Data.Models;
using KnowledgeHub.Evaluations.Common;
using KnowledgeHub.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class SearchEvaluation : MongoEvaluationTestBase<SearchPrediction>
{
    private const string DatasetFile = "golden-rag-cases.json";
    private const int TopK = 5;

    protected override string ScenarioDisplayName => "RAG.Search";

    protected override IEvaluator[] GetPerIterationEvaluators() => [new SearchEvaluator()];

    protected override Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<SearchPrediction> predictions)
        => SearchEvaluator.ComputeSummaryMetrics(predictions, TopK);

    private static IEnumerable<TestCaseData> TestCases() => LoadTestCases<SearchDataset, SearchEvaluationCase>(
        DatasetFile, dataset => dataset.Cases, testCase => testCase.Id);

    [Test]
    [TestCaseSource(nameof(TestCases))]
    public async Task SearchOverFixedSizeChunks(SearchEvaluationCase testCase)
    {
        await SearchFindsExpectedSources(testCase, ChunkingStrategyKind.FixedSize);
    }

    [Test]
    [TestCaseSource(nameof(TestCases))]
    public async Task SearchOverMarkdownSectionChunks(SearchEvaluationCase testCase)
    {
        await SearchFindsExpectedSources(testCase, ChunkingStrategyKind.MarkdownSection);
    }

    private async Task SearchFindsExpectedSources(SearchEvaluationCase testCase, ChunkingStrategyKind chunkingStrategy)
    {
        await using var scenarioRun = await ReportingConfig.CreateScenarioRunAsync(
            scenarioName: GetScenarioName(),
            iterationName: $"{chunkingStrategy}.{testCase.Id}");

        var response = await RagSearchService.SearchAsync(new RagSearchRequest(testCase.Query, TopK, chunkingStrategy));
        var prediction = new SearchPrediction(
            testCase.Query,
            testCase.ExpectedSources.Select(source => new SearchDocument(source.Path, source.Heading, source.Snippet)).ToArray(),
            await MapRetrievedDocumentsAsync(response.Results),
            chunkingStrategy);

        Predictions.Add(prediction);

        await scenarioRun.EvaluateAsync(
            [new ChatMessage(ChatRole.User, testCase.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, string.Join(Environment.NewLine, response.Results.Select(result => result.CitationLabel)))),
            additionalContext: [new SearchEvaluationContext(prediction, TopK)]);
    }

    private async Task<IReadOnlyList<SearchDocument>> MapRetrievedDocumentsAsync(IReadOnlyList<RagChunkResponse> results)
    {
        var documentIds = results
            .Select(result => result.DocumentId)
            .Where(documentId => !string.IsNullOrWhiteSpace(documentId))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var documents = documentIds.Length == 0
            ? []
            : await DocumentRepository.GetByIdsAsync(documentIds);
        var sourcePathsByDocumentId = documents.ToDictionary(document => document.DocumentId, document => document.SourcePath, StringComparer.Ordinal);

        return results
            .Select(result => new SearchDocument(
                sourcePathsByDocumentId.TryGetValue(result.DocumentId, out var sourcePath) ? sourcePath : result.CitationLabel,
                result.Heading,
                result.ChunkText))
            .ToArray();
    }

    public sealed record SearchDataset
    {
        public IReadOnlyList<SearchEvaluationCase> Cases { get; init; } = [];
    }

    public sealed record SearchEvaluationCase
    {
        public string Id { get; init; } = string.Empty;
        public string Query { get; init; } = string.Empty;
        public IReadOnlyList<ExpectedSourceDocument> ExpectedSources { get; init; } = [];
    }

    public sealed record ExpectedSourceDocument
    {
        public string Path { get; init; } = string.Empty;
        public string? Heading { get; init; }
        public string? Snippet { get; init; }
    }
}
