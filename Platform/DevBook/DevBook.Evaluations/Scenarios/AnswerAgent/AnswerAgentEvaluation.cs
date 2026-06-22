namespace DevBook.Evaluations.Scenarios.AnswerAgent;

using DevBook.Evaluations.Common.Hosting;
using DevBook.Evaluations.Common.Evaluation.Metrics;
using DevBook.Evaluations.Common.Evaluation.Judging;
using DevBook.Evaluations.Common.Evaluation.Summary;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Demo agent-quality scenario. It scores a corpus of agent transcripts with an LLM-as-judge panel
/// (currently the deterministic <see cref="MockAgentJudge"/> — no live model) and writes the results
/// to the MEAI store like any other scenario. The fancy report renders it with the generic default
/// view; no part of this scenario is special-cased in the report generator.
/// </summary>
[Category("Offline")]
public sealed class AnswerAgentEvaluation : EvaluationTestBase<AnswerAgentPrediction>
{
    private static readonly IJudge<AgentCase> Judge = new MockAgentJudge();

    /// <inheritdoc />
    protected override string ScenarioDisplayName => AnswerAgentCorpus.DisplayName;

    /// <inheritdoc />
    protected override IEvaluator[] GetPerIterationEvaluators() => [new JudgeEvaluator<AgentCase, AnswerAgentCaseContext>(Judge, (context, _) => context.Case)];

    private static IEnumerable<TestCaseData> Cases()
        => AnswerAgentCorpus.BuildCases().Select(agentCase => new TestCaseData(agentCase).SetArgDisplayNames(agentCase.Id));

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

        var result = await scenarioRun.EvaluateAsync(
            messages,
            new ChatResponse(responseMessages),
            additionalContext: [new AnswerAgentCaseContext(agentCase)]);

        this.Predictions.Add(new AnswerAgentPrediction(agentCase, result.Metrics.Values.ToList()));
    }

    /// <inheritdoc />
    protected override Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<AnswerAgentPrediction> predictions)
    {
        var scored = predictions
            .SelectMany(prediction => prediction.Metrics)
            .OfType<NumericMetric>()
            .ToList();

        var metrics = Judge.Metrics
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
            : predictions.Count(prediction => prediction.Metrics.All(metric => metric.Interpretation?.Failed != true)) / (double)predictions.Count;

        metrics.Add(new SummaryMetric("PassRate", passRate, "Share of agent scenarios with no metric below its failure threshold.", SummaryMetricKind.Percentage));
        metrics.Add(new SummaryMetric("SampleCount", predictions.Count, "Number of agent scenarios scored.", SummaryMetricKind.Count));

        return new Dictionary<string, IEnumerable<SummaryMetric>> { ["overall"] = metrics };
    }
}
