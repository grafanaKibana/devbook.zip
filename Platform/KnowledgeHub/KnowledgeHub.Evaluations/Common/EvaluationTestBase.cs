namespace KnowledgeHub.Evaluations.Common;

using System.Collections.Concurrent;
using System.Text.Json;
using KnowledgeHub.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;
using Microsoft.Extensions.AI.Evaluation.Reporting;
using Microsoft.Extensions.AI.Evaluation.Reporting.Storage;

[TestFixture]
[Category("LLMCalls")]
[Parallelizable(ParallelScope.Children)]
public abstract class EvaluationTestBase<TPrediction>
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    protected ConcurrentBag<TPrediction> Predictions { get; } = [];

    protected ReportingConfiguration ReportingConfig { get; private set; } = null!;

    protected virtual string ScenarioDisplayName => GetType().Name.Replace("Evaluation", string.Empty);

    protected virtual string? SummaryGroupName => null;

    [OneTimeSetUp]
    public async Task BaseSetupAsync()
    {
        this.ReportingConfig = DiskBasedReportingConfiguration.Create(
            storageRootPath: EvaluationExecutionContext.ReportsPath,
            evaluators: GetPerIterationEvaluators(),
            chatConfiguration: null,
            enableResponseCaching: false,
            executionName: EvaluationExecutionContext.ExecutionName);

        await OnSetupAsync();
    }

    [OneTimeTearDown]
    public async Task BaseTeardownAsync()
    {
        await OnTeardownAsync();
        await GenerateSummaryReportAsync();
    }

    protected virtual Task OnSetupAsync() => Task.CompletedTask;

    protected virtual Task OnTeardownAsync() => Task.CompletedTask;

    protected abstract IEvaluator[] GetPerIterationEvaluators();

    protected string GetScenarioName() => $"{this.ScenarioDisplayName}.{TestContext.CurrentContext.Test.MethodName}";

    protected abstract Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<TPrediction> predictions);

    protected static IEnumerable<TestCaseData> LoadTestCases<TDataset, TCase>(
        string datasetFileName,
        Func<TDataset, IReadOnlyList<TCase>> getCases,
        Func<TCase, string> getTestCaseId)
        where TDataset : new()
    {
        var datasetPath = Path.Combine(AppContext.BaseDirectory, "Datasets", datasetFileName);
        var dataset = JsonSerializer.Deserialize<TDataset>(File.ReadAllText(datasetPath), JsonOptions) ?? new TDataset();
        var cases = getCases(dataset);

        if (cases.Count == 0)
        {
            throw new InvalidOperationException("Dataset must contain at least one case.");
        }

        return cases.Select(testCase =>
        {
            var testCaseId = getTestCaseId(testCase);
            if (string.IsNullOrWhiteSpace(testCaseId))
            {
                throw new InvalidOperationException("Each dataset case requires an id.");
            }

            return new TestCaseData(testCase).SetArgDisplayNames(testCaseId);
        });
    }

    protected async Task CreateSummaryScenarioAsync(string iterationName, IEnumerable<SummaryMetric> metrics)
    {
        var metricsList = metrics.ToList();
        var sampleCount = metricsList.FirstOrDefault(metric => metric.Name == "SampleCount")?.Value ?? metricsList.Count;
        var summaryConfig = DiskBasedReportingConfiguration.Create(
            storageRootPath: EvaluationExecutionContext.ReportsPath,
            evaluators: [new SummaryEvaluator(metricsList)],
            chatConfiguration: null,
            enableResponseCaching: false,
            executionName: EvaluationExecutionContext.ExecutionName);

        var scenarioName = string.IsNullOrWhiteSpace(this.SummaryGroupName)
            ? $"Summary.{this.ScenarioDisplayName}"
            : $"Summary.{this.SummaryGroupName}.{this.ScenarioDisplayName}";

        await using var scenarioRun = await summaryConfig.CreateScenarioRunAsync(
            scenarioName: scenarioName,
            iterationName: iterationName,
            additionalTags: ["Summary"]);

        var message = new ChatMessage(ChatRole.System, $"Summary for {scenarioName}");
        var response = new ChatResponse(new ChatMessage(ChatRole.Assistant, $"Aggregated result from {sampleCount:F0} samples"));

        await scenarioRun.EvaluateAsync([message], response);
    }

    private async Task GenerateSummaryReportAsync()
    {
        if (this.Predictions.IsEmpty)
        {
            return;
        }

        var summaryMetrics = ComputeSummaryMetrics(this.Predictions.ToList());
        foreach (var (iterationName, metrics) in summaryMetrics)
        {
            await CreateSummaryScenarioAsync(iterationName, metrics);
        }
    }

}
