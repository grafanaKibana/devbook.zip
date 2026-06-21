namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using System.ClientModel;
using DevBook.Data.Agents;
using DevBook.Data.Options;
using DevBook.Data.Services;
using DevBook.Evaluations.Common;
using DevBook.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;
using Microsoft.Extensions.Configuration;
using OpenAI;

/// <summary>
/// Evaluates the <see cref="AnswerAgent"/> — the RAG generation layer — in <em>isolated generation</em>
/// mode: the shared golden dataset's gold evidence chunks are fed to the agent as fixed context
/// (no live retrieval), so a regression reflects the prompt or model rather than the retriever.
/// Each generated answer is scored by an LLM-as-judge panel (<see cref="AnswerMetrics"/>) and written
/// to the MEAI store like any other scenario; the fancy report renders it with the generic default
/// view. Live model calls are required, so the scenario self-ignores without an OpenAI key.
/// </summary>
public sealed class AnswerEvaluation : EvaluationTestBase<AnswerPrediction>
{
    private const string SharedDatasetFileName = "chunks-shared.json";
    private const string AnswerDatasetFileName = "answers-shared.json";

    private AIAgent answerAgent = null!;
    private IAnswerJudge judge = null!;

    /// <inheritdoc />
    protected override string ScenarioDisplayName => "RAG.Answer";

    /// <inheritdoc />
    protected override IEvaluator[] GetPerIterationEvaluators() => [new AnswerQualityEvaluator(SelectedMetrics())];

    // Prefer the answer dataset (carries per-case reference answers → unlocks Correctness); fall back to
    // the reference-free shared search dataset. Both deserialize to AnswerCase. The metric panel and the
    // loaded file are chosen from the same signal so they always agree.
    private static bool HasAnswerDataset() => File.Exists(Path.Combine(AppContext.BaseDirectory, "Datasets", AnswerDatasetFileName));
    private static string ResolveDatasetFileName() => HasAnswerDataset() ? AnswerDatasetFileName : SharedDatasetFileName;
    private static IReadOnlyList<AnswerMetricDefinition> SelectedMetrics() => HasAnswerDataset() ? AnswerMetrics.All : AnswerMetrics.ReferenceFree;

    /// <inheritdoc />
    protected override Task OnSetupAsync()
    {
        var configuration = BuildConfiguration();
        var openAIOptions = configuration.GetSection(nameof(OpenAIOptions)).Get<OpenAIOptions>();
        this.RateLimitOptions = configuration.GetSection(nameof(EvaluationRateLimitOptions)).Get<EvaluationRateLimitOptions>() ?? new EvaluationRateLimitOptions();

        if (string.IsNullOrWhiteSpace(openAIOptions?.ApiKey))
        {
            Assert.Ignore($"{this.ScenarioDisplayName} evaluation requires OpenAIOptions:ApiKey.");
        }

        var answerConfig = new AnswerAgent();

        // The judge defaults to the answer agent's own model so the scenario runs out of the box;
        // override AnswerEvaluationOptions:JudgeModelId with a different/stronger model to avoid the
        // self-preference bias an LLM judge has for outputs from its own model family.
        var judgeModelId = configuration["AnswerEvaluationOptions:JudgeModelId"];
        if (string.IsNullOrWhiteSpace(judgeModelId))
        {
            judgeModelId = answerConfig.ModelId;
        }

        var client = string.IsNullOrWhiteSpace(openAIOptions!.Endpoint)
            ? new OpenAIClient(openAIOptions.ApiKey)
            : new OpenAIClient(
                new ApiKeyCredential(openAIOptions.ApiKey),
                new OpenAIClientOptions { Endpoint = new Uri(openAIOptions.Endpoint, UriKind.Absolute) });

        this.answerAgent = new ChatClientAgent(
            client.GetChatClient(answerConfig.ModelId).AsIChatClient(),
            answerConfig.ChatClientAgentOptions);
        this.judge = new LlmAnswerJudge(client.GetChatClient(judgeModelId).AsIChatClient(), judgeModelId, SelectedMetrics());

        return Task.CompletedTask;
    }

    private static IEnumerable<TestCaseData> Cases()
        => LoadTestCases<AnswerDataset, AnswerCase>(ResolveDatasetFileName(), dataset => dataset.Cases, answerCase => answerCase.Id);

    [Test]
    [TestCaseSource(nameof(Cases))]
    public async Task JudgeAnswer(AnswerCase answerCase)
    {
        await using var scenarioRun = await this.ReportingConfig.CreateScenarioRunAsync(
            scenarioName: this.ScenarioDisplayName,
            iterationName: answerCase.Id,
            additionalTags: [$"difficulty:{answerCase.Difficulty}"]);

        // Isolated generation: hand the answer agent the gold evidence as fixed context, assembled by
        // the same RagAskService.BuildAgentInput the production ask path uses (so the eval cannot drift).
        var sources = answerCase.Expected.Select(source => source.ToChunkResponse()).ToList();
        var input = RagAskService.BuildAgentInput(answerCase.Query, sources);

        var answer = string.Empty;
        IReadOnlyList<AnswerMetricVerdict> verdicts = [];

        await RunLiveLlmEvaluationAsync(async () =>
        {
            var agentResponse = await this.answerAgent.RunAsync(input);
            answer = agentResponse.Text;
            verdicts = await this.judge.JudgeAsync(answerCase, answer);
        });

        await scenarioRun.EvaluateAsync(
            [new ChatMessage(ChatRole.User, answerCase.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, answer)),
            additionalContext: [new AnswerCaseContext(answerCase, verdicts)]);

        this.Predictions.Add(new AnswerPrediction(answerCase, verdicts));
    }

    /// <inheritdoc />
    protected override Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<AnswerPrediction> predictions)
    {
        var scored = predictions
            .SelectMany(prediction => prediction.Verdicts)
            .Where(verdict => !verdict.Definition.Informational)
            .ToList();

        var metrics = SelectedMetrics()
            .Where(metric => !metric.Informational)
            .Select(metric =>
            {
                var values = scored.Where(verdict => verdict.Definition.MetricName == metric.MetricName).Select(verdict => verdict.Value).ToList();
                var mean = values.Count == 0 ? 0 : values.Average();
                var kind = metric.Kind == AnswerMetricKind.Fraction ? SummaryMetricKind.Percentage : SummaryMetricKind.PlainNumber;
                return new SummaryMetric(metric.MetricName, mean, metric.Description, kind);
            })
            .ToList();

        var passRate = predictions.Count == 0
            ? 0
            : predictions.Count(prediction => prediction.Verdicts.All(verdict => !verdict.Failed)) / (double)predictions.Count;

        metrics.Add(new SummaryMetric("PassRate", passRate, "Share of answers with no metric below its failure threshold.", SummaryMetricKind.Percentage));
        metrics.Add(new SummaryMetric("SampleCount", predictions.Count, "Number of answers scored.", SummaryMetricKind.Count));

        return new Dictionary<string, IEnumerable<SummaryMetric>> { ["overall"] = metrics };
    }

    private static IConfiguration BuildConfiguration()
        => new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Evaluations.json", optional: true)
            .AddUserSecrets(System.Reflection.Assembly.GetExecutingAssembly(), optional: true)
            .AddEnvironmentVariables()
            .Build();
}

/// <summary>Captured answer case plus the judge verdicts, used to compute summary aggregates.</summary>
public sealed record AnswerPrediction(AnswerCase Case, IReadOnlyList<AnswerMetricVerdict> Verdicts);

/// <summary>Carries the case and its precomputed verdicts into the evaluation pipeline.</summary>
public sealed class AnswerCaseContext(AnswerCase answerCase, IReadOnlyList<AnswerMetricVerdict> verdicts)
    : EvaluationContext(nameof(AnswerCaseContext), new TextContent(answerCase.Query))
{
    /// <summary>Gets the scored case.</summary>
    public AnswerCase Case { get; } = answerCase;

    /// <summary>Gets the verdicts produced by the judge for this case.</summary>
    public IReadOnlyList<AnswerMetricVerdict> Verdicts { get; } = verdicts;
}

/// <summary>
/// Maps the precomputed judge verdicts into MEAI metrics. The judge runs once in the test method and
/// its verdicts ride along on <see cref="AnswerCaseContext"/>, so this evaluator does not make a
/// second model call. Presentation hints, per-metric judge context and evaluator metadata are carried
/// on metric metadata so the report can render them generically.
/// </summary>
public sealed class AnswerQualityEvaluator(IReadOnlyList<AnswerMetricDefinition> metrics) : IEvaluator
{
    /// <inheritdoc />
    public IReadOnlyCollection<string> EvaluationMetricNames { get; } = metrics.Select(metric => metric.MetricName).ToArray();

    /// <inheritdoc />
    public ValueTask<EvaluationResult> EvaluateAsync(
        IEnumerable<ChatMessage> messages,
        ChatResponse modelResponse,
        ChatConfiguration? chatConfiguration = null,
        IEnumerable<EvaluationContext>? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = additionalContext?.OfType<AnswerCaseContext>().FirstOrDefault();
        if (context is null)
        {
            return ValueTask.FromResult(new EvaluationResult(new NumericMetric("Faithfulness", 0, "AnswerCaseContext not provided.")
            {
                Interpretation = new EvaluationMetricInterpretation(EvaluationRating.Inconclusive, failed: true, reason: "AnswerCaseContext not provided."),
            }));
        }

        return ValueTask.FromResult(new EvaluationResult(context.Verdicts.Select(ToMetric)));
    }

    private static NumericMetric ToMetric(AnswerMetricVerdict verdict)
    {
        var metric = new NumericMetric(verdict.Definition.MetricName, verdict.Value, verdict.Definition.Description)
        {
            Interpretation = new EvaluationMetricInterpretation(verdict.Rating, failed: verdict.Failed, reason: verdict.Reason),
            Diagnostics = verdict.Diagnostics.ToArray(),
        };

        foreach (var (key, value) in verdict.Metadata)
        {
            metric.AddOrUpdateMetadata(key, value);
        }

        return metric;
    }
}
