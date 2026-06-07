namespace KnowledgeHub.Evaluations.Scenarios.RAG.Search;

using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Evaluations.Common;
using KnowledgeHub.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;
using Microsoft.Extensions.Options;

public sealed class SearchEvaluation : MongoEvaluationTestBase<SearchPrediction>
{
    private const string DatasetFile = "golden-rag-cases.json";
    private const int TopK = 10;

    private static readonly RerankingStrategyKind[] RerankingStrategies =
    [
        RerankingStrategyKind.NoReranking,
        RerankingStrategyKind.Bm25,
        RerankingStrategyKind.MaximalMarginalRelevance,
        RerankingStrategyKind.Llm,
        RerankingStrategyKind.ReciprocalRankFusion,
    ];

    protected override string ScenarioDisplayName => "RAG.Search";

    protected override IEvaluator[] GetPerIterationEvaluators() => [new SearchEvaluator()];

    protected override Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<SearchPrediction> predictions)
        => SearchEvaluator.ComputeSummaryMetrics(predictions, TopK);

    private static IEnumerable<TestCaseData> TestCases()
    {
        foreach (var testCaseData in LoadTestCases<SearchDataset, SearchEvaluationCase>(DatasetFile, dataset => dataset.Cases, testCase => testCase.Id))
        {
            var testCase = (SearchEvaluationCase)testCaseData.Arguments[0]!;
            foreach (var rerankingStrategy in RerankingStrategies)
            {
                yield return new TestCaseData(testCase, rerankingStrategy)
                    .SetArgDisplayNames(testCase.Id, rerankingStrategy.ToString());
            }
        }
    }

    [Test]
    [TestCaseSource(nameof(TestCases))]
    public async Task SearchOverFixedSizeChunks(SearchEvaluationCase testCase, RerankingStrategyKind rerankingStrategy)
    {
        await SearchFindsExpectedSources(testCase, ChunkingStrategyKind.FixedSize, rerankingStrategy);
    }

    [Test]
    [TestCaseSource(nameof(TestCases))]
    public async Task SearchOverMarkdownSectionChunks(SearchEvaluationCase testCase, RerankingStrategyKind rerankingStrategy)
    {
        await SearchFindsExpectedSources(testCase, ChunkingStrategyKind.MarkdownSection, rerankingStrategy);
    }

    [Test]
    [TestCaseSource(nameof(TestCases))]
    public async Task SearchOverSemanticChunks(SearchEvaluationCase testCase, RerankingStrategyKind rerankingStrategy)
    {
        await SearchFindsExpectedSources(testCase, ChunkingStrategyKind.Semantic, rerankingStrategy);
    }

    private async Task SearchFindsExpectedSources(
        SearchEvaluationCase testCase,
        ChunkingStrategyKind chunkingStrategy,
        RerankingStrategyKind rerankingStrategy)
    {
        await using var scenarioRun = await this.ReportingConfig.CreateScenarioRunAsync(
            scenarioName: $"{ScenarioDisplayName}.{chunkingStrategy}.{rerankingStrategy}",
            iterationName: testCase.Id);

        var searchService = CreateSearchService(chunkingStrategy, rerankingStrategy);
        var response = await searchService.SearchAsync(new RagSearchRequest(testCase.Query, TopK));
        var prediction = new SearchPrediction(
            testCase.Query,
            testCase.ExpectedSources.Select(source => new SearchDocument(source.Path, source.Heading, source.Snippet)).ToArray(),
            await MapRetrievedDocumentsAsync(response.Results),
            chunkingStrategy,
            rerankingStrategy);

        this.Predictions.Add(prediction);

        await scenarioRun.EvaluateAsync(
            [new ChatMessage(ChatRole.User, testCase.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, string.Join(Environment.NewLine, response.Results.Select(result => result.CitationLabel)))),
            additionalContext: [new SearchEvaluationContext(prediction, TopK)]);
    }

    private RagSearchService CreateSearchService(
        ChunkingStrategyKind chunkingStrategy,
        RerankingStrategyKind rerankingStrategy)
    {
        return new RagSearchService(this.EmbeddingService, this.ChunkRepositoryFactory, this.RerankingStrategyFactory,
            Options.Create(new RagSearchOptions
            {
                ChunkingStrategy = chunkingStrategy,
                RerankingStrategy = rerankingStrategy,
            }));
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
            : await this.DocumentRepository.GetByIdsAsync(documentIds);
        var sourcePathsByDocumentId = documents.ToDictionary(document => document.DocumentId, document => document.SourcePath, StringComparer.Ordinal);

        return results
            .Select((result, index) => new SearchDocument(
                sourcePathsByDocumentId.TryGetValue(result.DocumentId, out var sourcePath) ? sourcePath : result.CitationLabel,
                result.Heading,
                result.ChunkText,
                index + 1,
                result.Score))
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
