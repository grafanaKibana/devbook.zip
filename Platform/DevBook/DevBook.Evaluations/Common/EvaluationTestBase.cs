namespace DevBook.Evaluations.Common;

using System.Collections.Concurrent;
using System.Text.Json;
using DevBook.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;
using Microsoft.Extensions.AI.Evaluation.Reporting;
using Microsoft.Extensions.AI.Evaluation.Reporting.Storage;

/// <summary>
/// Base class for scenario tests that write Microsoft.Extensions.AI evaluation reports.
/// </summary>
[TestFixture]
[Category("LLMCalls")]
[Parallelizable(ParallelScope.Children)]
public abstract class EvaluationTestBase<TPrediction>
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Gets predictions captured during scenario iterations for summary reporting.
    /// </summary>
    protected ConcurrentBag<TPrediction> Predictions { get; } = [];

    /// <summary>
    /// Gets the disk-backed evaluation reporting configuration.
    /// </summary>
    protected ReportingConfiguration ReportingConfig { get; private set; } = null!;

    /// <summary>
    /// Gets the display name used for evaluation scenario reports.
    /// </summary>
    protected virtual string ScenarioDisplayName => GetType().Name.Replace("Evaluation", string.Empty);

    /// <summary>
    /// Gets the optional summary group name used in report output.
    /// </summary>
    protected virtual string? SummaryGroupName => null;

    /// <summary>
    /// Runs base setup.
    /// </summary>
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

    /// <summary>
    /// Runs base teardown.
    /// </summary>
    [OneTimeTearDown]
    public async Task BaseTeardownAsync()
    {
        await OnTeardownAsync();
        await GenerateSummaryReportAsync();
    }

    /// <summary>
    /// Runs scenario-specific setup after reporting is configured.
    /// </summary>
    /// <returns>The setup task.</returns>
    protected virtual Task OnSetupAsync() => Task.CompletedTask;

    /// <summary>
    /// Runs scenario-specific cleanup before summary reports are generated.
    /// </summary>
    /// <returns>The teardown task.</returns>
    protected virtual Task OnTeardownAsync() => Task.CompletedTask;

    /// <summary>
    /// Gets evaluators that run for each scenario iteration.
    /// </summary>
    /// <returns>The per-iteration evaluators.</returns>
    protected abstract IEvaluator[] GetPerIterationEvaluators();

    /// <summary>
    /// Builds the current scenario name from the scenario display name and test method.
    /// </summary>
    /// <returns>The scenario name used in evaluation reports.</returns>
    protected string GetScenarioName() => $"{this.ScenarioDisplayName}.{TestContext.CurrentContext.Test.MethodName}";

    /// <summary>
    /// Computes aggregate metrics for captured predictions.
    /// </summary>
    /// <param name="predictions">Predictions captured during scenario iterations.</param>
    /// <returns>Summary metrics grouped by report iteration name.</returns>
    protected abstract Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<TPrediction> predictions);

    /// <summary>
    /// Loads typed test cases from a dataset JSON file.
    /// </summary>
    /// <typeparam name="TDataset">Dataset root type.</typeparam>
    /// <typeparam name="TCase">Dataset case type.</typeparam>
    /// <param name="datasetFileName">Dataset file name under the Datasets output folder.</param>
    /// <param name="getCases">Function that extracts cases from the dataset.</param>
    /// <param name="getTestCaseId">Function that returns the display id for each case.</param>
    /// <returns>NUnit test case data for the dataset.</returns>
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

    /// <summary>
    /// Writes one synthetic summary scenario into the evaluation report.
    /// </summary>
    /// <param name="iterationName">Report iteration name for the summary.</param>
    /// <param name="metrics">Summary metrics to write.</param>
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
