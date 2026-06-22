namespace DevBook.Evaluations.Scenarios.AskAgent;

using DevBook.Evaluations.Common;
using DevBook.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Demo agent-quality scenario. It scores a corpus of agent transcripts with an LLM-as-judge panel
/// (currently the deterministic <see cref="MockAgentJudge"/> — no live model) and writes the results
/// to the MEAI store like any other scenario. The fancy report renders it with the generic default
/// view; no part of this scenario is special-cased in the report generator.
/// </summary>
[Category("Offline")]
public sealed class AskAgentEvaluation : EvaluationTestBase<AskAgentPrediction>
{
    private static readonly IAgentJudge Judge = new MockAgentJudge();

    /// <inheritdoc />
    protected override string ScenarioDisplayName => AskAgentCorpus.DisplayName;

    /// <inheritdoc />
    protected override IEvaluator[] GetPerIterationEvaluators() => [new AskAgentQualityEvaluator(Judge)];

    private static IEnumerable<TestCaseData> Cases()
        => AskAgentCorpus.BuildCases().Select(agentCase => new TestCaseData(agentCase).SetArgDisplayNames(agentCase.Id));

    [Test]
    [TestCaseSource(nameof(Cases))]
    public async Task JudgeAgentTranscript(AgentCase agentCase)
    {
        await using var scenarioRun = await this.ReportingConfig.CreateScenarioRunAsync(
            scenarioName: this.ScenarioDisplayName,
            iterationName: agentCase.Id,
            additionalTags: [$"name:{agentCase.Name}", $"difficulty:{agentCase.Difficulty}"]);

        var messages = new List<ChatMessage> { new(ChatRole.User, agentCase.Task) };

        var responseMessages = new List<ChatMessage>();
        foreach (var toolCall in agentCase.ToolCalls)
        {
            responseMessages.Add(new ChatMessage(
                ChatRole.Assistant,
                [new FunctionCallContent($"{toolCall.Name}-{agentCase.Id}", toolCall.Name, new Dictionary<string, object?> { ["arguments"] = toolCall.Arguments })]));
        }

        responseMessages.Add(new ChatMessage(ChatRole.Assistant, agentCase.Answer));

        await scenarioRun.EvaluateAsync(
            messages,
            new ChatResponse(responseMessages),
            additionalContext: [new AskAgentCaseContext(agentCase)]);

        this.Predictions.Add(new AskAgentPrediction(agentCase, Judge.Judge(agentCase)));
    }

    /// <inheritdoc />
    protected override Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<AskAgentPrediction> predictions)
    {
        var scored = predictions
            .SelectMany(prediction => prediction.Verdicts)
            .Where(verdict => !verdict.Definition.Informational)
            .ToList();

        var metrics = Judge.Metrics
            .Where(metric => !metric.Informational)
            .Select(metric =>
            {
                var values = scored.Where(verdict => verdict.Definition.MetricName == metric.MetricName).Select(verdict => verdict.Value).ToList();
                var mean = values.Count == 0 ? 0 : values.Average();
                var kind = metric.Kind == AgentMetricKind.Fraction ? SummaryMetricKind.Percentage : SummaryMetricKind.PlainNumber;
                return new SummaryMetric(metric.MetricName, mean, metric.Description, kind);
            })
            .ToList();

        var passRate = predictions.Count == 0
            ? 0
            : predictions.Count(prediction => prediction.Verdicts.All(verdict => !verdict.Failed)) / (double)predictions.Count;

        metrics.Add(new SummaryMetric("PassRate", passRate, "Share of agent scenarios with no metric below its failure threshold.", SummaryMetricKind.Percentage));
        metrics.Add(new SummaryMetric("SampleCount", predictions.Count, "Number of agent scenarios scored.", SummaryMetricKind.Count));

        return new Dictionary<string, IEnumerable<SummaryMetric>> { ["overall"] = metrics };
    }
}

/// <summary>Captured agent case plus the judge verdicts, used to compute summary aggregates.</summary>
public sealed record AskAgentPrediction(AgentCase Case, IReadOnlyList<AgentMetricVerdict> Verdicts);

/// <summary>Carries the agent case into the evaluation pipeline so the judge can score it.</summary>
public sealed class AskAgentCaseContext(AgentCase agentCase)
    : EvaluationContext(nameof(AskAgentCaseContext), new TextContent(agentCase.Task))
{
    public AgentCase Case { get; } = agentCase;
}

/// <summary>
/// Turns judge verdicts into MEAI metrics. Presentation hints (kind/group/short), per-metric judge
/// context and evaluator metadata ride along on metric metadata so the report can render them
/// generically without knowing anything about this scenario.
/// </summary>
public sealed class AskAgentQualityEvaluator(IAgentJudge judge) : IEvaluator
{
    /// <inheritdoc />
    public IReadOnlyCollection<string> EvaluationMetricNames { get; } = judge.Metrics.Select(metric => metric.MetricName).ToArray();

    /// <inheritdoc />
    public ValueTask<EvaluationResult> EvaluateAsync(
        IEnumerable<ChatMessage> messages,
        ChatResponse modelResponse,
        ChatConfiguration? chatConfiguration = null,
        IEnumerable<EvaluationContext>? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = additionalContext?.OfType<AskAgentCaseContext>().FirstOrDefault();
        if (context is null)
        {
            return ValueTask.FromResult(new EvaluationResult(new NumericMetric("Intent Resolution", 0, "AskAgentCaseContext not provided.")
            {
                Interpretation = new EvaluationMetricInterpretation(EvaluationRating.Inconclusive, failed: true, reason: "AskAgentCaseContext not provided."),
            }));
        }

        var metrics = judge.Judge(context.Case).Select(ToMetric);
        return ValueTask.FromResult(new EvaluationResult(metrics));
    }

    private static NumericMetric ToMetric(AgentMetricVerdict verdict)
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
