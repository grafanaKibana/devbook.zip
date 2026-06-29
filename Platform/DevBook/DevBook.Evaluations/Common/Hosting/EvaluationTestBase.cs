namespace DevBook.Evaluations.Common.Hosting;

using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using DevBook.Evaluations.Common.Evaluation.Metrics;
using DevBook.Evaluations.Common.Evaluation.Summary;
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

    protected EvaluationRateLimitOptions RateLimitOptions { get; set; } = new();

    // Live progress markers. TestContext.Progress streams to the console in real time and survives
    // parallel execution — unlike Console/TestContext.Out, which NUnit buffers until the test ends.
    // One START line per iteration and one DONE line carrying the outcome and a running completed-count
    // is enough to confirm tests are executing and finishing.
    private static int completedCount;
    private long iterationStartTicks;

    /// <summary>
    /// Logs a START marker before each scenario iteration.
    /// </summary>
    [SetUp]
    public void LogIterationStart()
    {
        this.iterationStartTicks = Stopwatch.GetTimestamp();
        TestContext.Progress.WriteLine($"  -> START {TestContext.CurrentContext.Test.Name}");
    }

    /// <summary>
    /// Logs a DONE marker with the outcome and elapsed time after each scenario iteration.
    /// </summary>
    [TearDown]
    public void LogIterationDone()
    {
        var elapsed = Stopwatch.GetElapsedTime(this.iterationStartTicks);
        var done = Interlocked.Increment(ref completedCount);
        var outcome = TestContext.CurrentContext.Result.Outcome.Status; // Passed / Failed / Skipped
        TestContext.Progress.WriteLine(
            $"  <- DONE  [{done}] {TestContext.CurrentContext.Test.Name} :: {outcome} ({elapsed.TotalSeconds:F1}s)");
    }

    /// <summary>
    /// Runs base setup.
    /// </summary>
    [OneTimeSetUp]
    public async Task BaseSetupAsync()
    {
        // Scenario setup runs first so it can build the per-iteration evaluators (e.g. an LLM judge that
        // needs its chat client) before the reporting configuration captures them.
        await OnSetupAsync();

        this.ReportingConfig = DiskBasedReportingConfiguration.Create(
            storageRootPath: EvaluationExecutionContext.ReportsPath,
            evaluators: GetPerIterationEvaluators(),
            chatConfiguration: null,
            enableResponseCaching: false,
            executionName: EvaluationExecutionContext.ExecutionName);
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

    protected Task RunLiveLlmEvaluationAsync(Func<Task> operation)
        => RateLimitRetry.ExecuteAsync(operation, this.RateLimitOptions);

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
    /// Builds the standard single-group ("overall") panel summary shared by judge-panel scenarios: the
    /// mean of each non-informational metric, a <c>PassRate</c> (share of predictions whose metrics all
    /// pass), and a <c>SampleCount</c>. Scenarios differ only by their metric source and the two
    /// description strings, so this is the one place the aggregation logic lives.
    /// </summary>
    /// <param name="panel">Metric descriptors to summarize.</param>
    /// <param name="predictions">Captured predictions to aggregate.</param>
    /// <param name="getMetrics">Extracts the scored metrics from one prediction.</param>
    /// <param name="passRateDescription">Description for the <c>PassRate</c> summary metric.</param>
    /// <param name="sampleCountDescription">Description for the <c>SampleCount</c> summary metric.</param>
    protected static Dictionary<string, IEnumerable<SummaryMetric>> BuildPanelSummary(
        IEnumerable<MetricDescriptor> panel,
        IReadOnlyList<TPrediction> predictions,
        Func<TPrediction, IEnumerable<EvaluationMetric>> getMetrics,
        string passRateDescription,
        string sampleCountDescription)
    {
        var scored = predictions
            .SelectMany(getMetrics)
            .OfType<NumericMetric>()
            .ToList();

        var metrics = panel
            .Where(metric => !metric.Informational)
            .Select(metric =>
            {
                var values = scored.Where(value => value.Name == metric.Name).Select(value => value.Value ?? 0).ToList();
                var mean = values.Count == 0 ? 0 : values.Average();
                var kind = metric.Kind == MetricKind.Fraction ? SummaryMetricKind.Percentage : SummaryMetricKind.PlainNumber;
                return new SummaryMetric(metric.Name, mean, metric.Description, kind);
            })
            .ToList();

        var passRate = predictions.Count == 0
            ? 0
            : predictions.Count(prediction => getMetrics(prediction).All(metric => metric.Interpretation?.Failed != true)) / (double)predictions.Count;

        metrics.Add(new SummaryMetric("PassRate", passRate, passRateDescription, SummaryMetricKind.Percentage));
        metrics.Add(new SummaryMetric("SampleCount", predictions.Count, sampleCountDescription, SummaryMetricKind.Count));

        return new Dictionary<string, IEnumerable<SummaryMetric>> { ["overall"] = metrics };
    }

    /// <summary>
    /// Loads and deserializes a dataset JSON file from the Datasets output folder.
    /// </summary>
    /// <typeparam name="TDataset">Dataset root type.</typeparam>
    /// <param name="datasetFileName">Dataset file name under the Datasets output folder.</param>
    /// <returns>The deserialized dataset.</returns>
    protected static TDataset LoadDataset<TDataset>(string datasetFileName)
        where TDataset : new()
    {
        var datasetPath = Path.Combine(AppContext.BaseDirectory, "Datasets", datasetFileName);
        return JsonSerializer.Deserialize<TDataset>(File.ReadAllText(datasetPath), JsonOptions) ?? new TDataset();
    }

    /// <summary>
    /// Gets a value indicating whether the run requested the smaller "mini" datasets
    /// (set by <c>RunEvaluation.cs --mini</c>, which exports <c>EVAL_DATASET=mini</c>).
    /// </summary>
    protected static bool UseMiniDatasets =>
        string.Equals(Environment.GetEnvironmentVariable("EVAL_DATASET"), "mini", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Returns true when a dataset file exists in the Datasets output folder.
    /// </summary>
    /// <param name="datasetFileName">Dataset file name under the Datasets output folder.</param>
    protected static bool DatasetExists(string datasetFileName) =>
        File.Exists(Path.Combine(AppContext.BaseDirectory, "Datasets", datasetFileName));

    /// <summary>
    /// Resolves which dataset file to load for a given canonical (full) file name. When the run is in
    /// mini mode (<see cref="UseMiniDatasets"/>) and a <c>&lt;name&gt;-mini&lt;ext&gt;</c> sibling exists,
    /// that mini file is used; otherwise the full file name is returned unchanged. This is the single
    /// place the "mini where it exists, else full" rule lives.
    /// </summary>
    /// <param name="fullDatasetFileName">The canonical full dataset file name (e.g. <c>chunks-shared.json</c>).</param>
    protected static string ResolveDatasetVariant(string fullDatasetFileName)
    {
        if (!UseMiniDatasets)
        {
            return fullDatasetFileName;
        }

        var miniFileName = $"{Path.GetFileNameWithoutExtension(fullDatasetFileName)}-mini{Path.GetExtension(fullDatasetFileName)}";
        return DatasetExists(miniFileName) ? miniFileName : fullDatasetFileName;
    }

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
        var cases = getCases(LoadDataset<TDataset>(datasetFileName));

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
