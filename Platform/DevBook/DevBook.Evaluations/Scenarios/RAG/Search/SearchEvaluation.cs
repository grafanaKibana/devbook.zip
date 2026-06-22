namespace DevBook.Evaluations.Scenarios.RAG.Search;

using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Evaluations.Common;
using DevBook.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;
using Microsoft.Extensions.Options;

public sealed class SearchEvaluation : MongoEvaluationTestBase<SearchPrediction>
{
    private const int TopK = RagRetrievalPolicy.MaxTopK;

    // One chunker-neutral golden dataset is evaluated against every chunking strategy. Ground truth is keyed by
    // source + heading + snippet (not chunk id), so a single shared question set scores all chunkers on the same
    // footing. See SearchMetricCalculator.MatchesExpectedIdentity for the chunker-neutral matching.
    private const string SharedDatasetFileName = "chunks-shared.json";

    private static readonly ChunkingStrategyKind[] ChunkingStrategies =
    [
        ChunkingStrategyKind.FixedSize,
        ChunkingStrategyKind.MarkdownSection,
        ChunkingStrategyKind.Semantic,
    ];

    private static readonly RerankingStrategyKind[] RerankingStrategies =
    [
        RerankingStrategyKind.NoReranking,
        RerankingStrategyKind.Bm25,
        RerankingStrategyKind.MaximalMarginalRelevance,
        // RerankingStrategyKind.Llm,
        RerankingStrategyKind.ReciprocalRankFusion,
    ];

    /// <inheritdoc />
    protected override string ScenarioDisplayName => "RAG.Search";

    /// <inheritdoc />
    protected override IEvaluator[] GetPerIterationEvaluators() => [new SearchEvaluator()];

    /// <inheritdoc />
    protected override Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<SearchPrediction> predictions)
        => SearchEvaluator.ComputeSummaryMetrics(predictions, TopK);

    private static IEnumerable<TestCaseData> TestCases()
    {
        var datasetFileName = ResolveDatasetVariant(SharedDatasetFileName);
        var dataset = LoadDataset<RagGoldenDataset>(datasetFileName);
        if (dataset.Cases.Count == 0)
        {
            throw new InvalidOperationException($"Dataset {datasetFileName} must contain at least one case.");
        }

        foreach (var testCase in dataset.Cases)
        {
            foreach (var chunkingStrategy in ChunkingStrategies)
            {
                foreach (var rerankingStrategy in RerankingStrategies)
                {
                    yield return new TestCaseData(testCase, chunkingStrategy, rerankingStrategy)
                        .SetArgDisplayNames(testCase.Id, chunkingStrategy.ToString(), rerankingStrategy.ToString());
                }
            }
        }
    }

    [Test]
    [TestCaseSource(nameof(TestCases))]
    public async Task SearchOverGeneratedDataset(
        RagGoldenCase testCase,
        ChunkingStrategyKind chunkingStrategy,
        RerankingStrategyKind rerankingStrategy)
    {
        await SearchFindsExpectedChunks(testCase, chunkingStrategy, rerankingStrategy);
    }

    private async Task SearchFindsExpectedChunks(
        RagGoldenCase testCase,
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
            // Expected evidence is matched chunker-neutrally by source name + heading + snippet. Chunk and document
            // ids are intentionally omitted so the shared golden case is not bound to one chunking strategy's ids.
            testCase.Expected.Select(chunk => new SearchDocument(
                chunk.CitationLabel,
                chunk.Heading,
                chunk.Text)).ToArray(),
            await MapRetrievedDocumentsAsync(response.Results),
            chunkingStrategy,
            rerankingStrategy);

        this.Predictions.Add(prediction);

        await RunLiveLlmEvaluationAsync(async () =>
        {
            await scenarioRun.EvaluateAsync(
                [new ChatMessage(ChatRole.User, testCase.Query)],
                new ChatResponse(new ChatMessage(ChatRole.Assistant, string.Join(Environment.NewLine, response.Results.Select(result => result.CitationLabel)))),
                additionalContext: [new SearchEvaluationContext(prediction, TopK)]);
        });
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
                result.Score,
                result.ChunkId,
                result.DocumentId))
            .ToArray();
    }
}
