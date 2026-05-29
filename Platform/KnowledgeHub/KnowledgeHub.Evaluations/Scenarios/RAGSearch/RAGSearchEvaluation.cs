namespace KnowledgeHub.Evaluations.Scenarios.RAGSearch;

using KnowledgeHub.Data.Models;
using KnowledgeHub.Evaluations.Common;
using KnowledgeHub.Evaluations.Common.Evaluators.RAGSearch;
using KnowledgeHub.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class RAGSearchEvaluation : MongoEvaluationTestBase<RAGSearchPrediction>
{
    private const string DatasetFile = "golden-rag-cases.json";
    private const int TopK = 5;

    protected override IEvaluator[] GetPerIterationEvaluators() => [new RAGSearchEvaluator()];

    protected override Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<RAGSearchPrediction> predictions)
        => RAGSearchEvaluator.ComputeSummaryMetrics(predictions, TopK);

    private static IEnumerable<TestCaseData> TestCases() => LoadTestCases<RAGSearchDataset, RAGSearchEvaluationCase>(
        DatasetFile, dataset => dataset.Cases, testCase => testCase.Id);

    [Test]
    [TestCaseSource(nameof(TestCases))]
    public async Task SearchFindsExpectedSources(RAGSearchEvaluationCase testCase)
    {
        await using var scenarioRun = await ReportingConfig.CreateScenarioRunAsync(
            scenarioName: GetScenarioName(),
            iterationName: testCase.Id);

        var response = await RagSearchService.SearchAsync(new RagSearchRequest(testCase.Query, TopK));
        var prediction = new RAGSearchPrediction(
            testCase.Id,
            testCase.Query,
            testCase.ExpectedSources.Select(source => new RAGSearchDocument(source.Path, source.Heading, source.Snippet)).ToArray(),
            await MapRetrievedDocumentsAsync(response.Results));

        Predictions.Add(prediction);

        await scenarioRun.EvaluateAsync(
            [new ChatMessage(ChatRole.User, testCase.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, string.Join(Environment.NewLine, response.Results.Select(result => result.CitationLabel)))),
            additionalContext: [new RAGSearchEvaluationContext(prediction, TopK)]);
    }

    private async Task<IReadOnlyList<RAGSearchDocument>> MapRetrievedDocumentsAsync(IReadOnlyList<RagChunkResponse> results)
    {
        var documentIds = results
            .Select(result => result.DocumentId)
            .Where(documentId => !string.IsNullOrWhiteSpace(documentId))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        IReadOnlyList<Document> documents = documentIds.Length == 0
            ? []
            : await DocumentRepository.GetByIdsAsync(documentIds);
        var sourcePathsByDocumentId = documents.ToDictionary(document => document.DocumentId, document => document.SourcePath, StringComparer.Ordinal);

        return results
            .Select(result => new RAGSearchDocument(
                sourcePathsByDocumentId.TryGetValue(result.DocumentId, out var sourcePath) ? sourcePath : result.CitationLabel,
                result.Heading,
                result.ChunkText))
            .ToArray();
    }

    public sealed record RAGSearchDataset
    {
        public IReadOnlyList<RAGSearchEvaluationCase> Cases { get; init; } = [];
    }

    public sealed record RAGSearchEvaluationCase
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
