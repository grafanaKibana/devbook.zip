namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using System.ClientModel;
using DevBook.Data.Agents;
using DevBook.Data.Options;
using DevBook.Data.Services;
using DevBook.Evaluations.Common.Hosting;
using DevBook.Evaluations.Common.Evaluation.Metrics;
using DevBook.Evaluations.Common.Evaluation.Judging;
using DevBook.Evaluations.Common.Evaluation.Summary;
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
    private IJudge<AnswerJudgeInput> judge = null!;
    private IEvaluator[] evaluators = [];

    /// <inheritdoc />
    protected override string ScenarioDisplayName => "RAG.Answer";

    /// <inheritdoc />
    protected override IEvaluator[] GetPerIterationEvaluators() => this.evaluators;

    // Prefer the answer dataset (carries per-case reference answers → unlocks Correctness); fall back to
    // the reference-free shared search dataset. Both deserialize to RagGoldenCase. With --mini,
    // ResolveDatasetVariant swaps in the "-mini" sibling when it exists, else keeps the full file. The
    // metric panel and the loaded file are derived from the same resolved file so they always agree.
    private static string ResolveAnswerDatasetFileName() => ResolveDatasetVariant(AnswerDatasetFileName);
    private static bool HasAnswerDataset() => DatasetExists(ResolveAnswerDatasetFileName());
    private static string ResolveDatasetFileName() => HasAnswerDataset() ? ResolveAnswerDatasetFileName() : ResolveDatasetVariant(SharedDatasetFileName);
    private static IReadOnlyList<MetricDescriptor> SelectedMetrics() => HasAnswerDataset() ? AnswerMetrics.All : AnswerMetrics.ReferenceFree;

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

        // The judge defaults to GPT-5.4 nano (the budget tier) to keep run cost low, and is overridable
        // via AnswerEvaluationOptions:JudgeModelId. Nano is positioned for narrow/high-volume tasks, so
        // validate its agreement against a labeled subset before trusting it on the nuanced
        // faithfulness/citation-validity scoring.
        var judgeModelId = configuration["AnswerEvaluationOptions:JudgeModelId"];
        if (string.IsNullOrWhiteSpace(judgeModelId))
        {
            judgeModelId = "gpt-5.4-nano";
        }

        var client = string.IsNullOrWhiteSpace(openAIOptions!.Endpoint)
            ? new OpenAIClient(openAIOptions.ApiKey)
            : new OpenAIClient(
                new ApiKeyCredential(openAIOptions.ApiKey),
                new OpenAIClientOptions { Endpoint = new Uri(openAIOptions.Endpoint, UriKind.Absolute) });

        // Wrap both chat clients with the rate-limit retry middleware so 429s are handled inside the MEAI
        // pipeline: the answer agent's RunAsync and the judge's structured-output call each retry on their
        // own, which is what lets the judge run as a plain evaluator (no test-body retry wrapper).
        var agentClient = new RateLimitingChatClient(client.GetChatClient(answerConfig.ModelId).AsIChatClient(), this.RateLimitOptions);
        this.answerAgent = new ChatClientAgent(agentClient, answerConfig.ChatClientAgentOptions);

        var judgeChatClient = new RateLimitingChatClient(client.GetChatClient(judgeModelId).AsIChatClient(), this.RateLimitOptions);
        this.judge = new AnswerJudge(judgeChatClient, judgeModelId, SelectedMetrics());
        this.evaluators = [new JudgeEvaluator<AnswerJudgeInput, AnswerCaseContext>(this.judge, (context, response) => new AnswerJudgeInput(context.Case, response.Text))];

        return Task.CompletedTask;
    }

    private static IEnumerable<TestCaseData> Cases()
        => LoadTestCases<RagGoldenDataset, RagGoldenCase>(ResolveDatasetFileName(), dataset => dataset.Cases, answerCase => answerCase.Id);

    [Test]
    [TestCaseSource(nameof(Cases))]
    public async Task JudgeAnswer(RagGoldenCase answerCase)
    {
        await using var scenarioRun = await this.ReportingConfig.CreateScenarioRunAsync(
            scenarioName: this.ScenarioDisplayName,
            iterationName: answerCase.Id,
            additionalTags: [$"difficulty:{answerCase.Difficulty}"]);

        // Isolated generation: hand the answer agent the gold evidence as fixed context, assembled by
        // the same RagAskService.BuildAgentInput the production ask path uses (so the eval cannot drift).
        var sources = answerCase.Expected.Select(source => source.ToChunkResponse()).ToList();
        var input = RagAskService.BuildAgentInput(answerCase.Query, sources);

        // The answer agent's client retries 429s internally, so no test-body wrapper is needed. The judge
        // runs inside EvaluateAsync (via JudgeEvaluator) and its metrics come back on the returned result.
        var agentResponse = await this.answerAgent.RunAsync(input);
        var answer = agentResponse.Text;

        var result = await scenarioRun.EvaluateAsync(
            [new ChatMessage(ChatRole.User, answerCase.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, answer)),
            additionalContext: [new AnswerCaseContext(answerCase)]);

        this.Predictions.Add(new AnswerPrediction(answerCase, result.Metrics.Values.ToList()));
    }

    /// <summary>
    /// Diagnostic probe (run explicitly): judges a concise grounded answer and a verbosity-padded
    /// variant of it, and asserts the padding does not inflate the claim-grounded Faithfulness ratio.
    /// Two live judge calls — not part of a normal run.
    /// </summary>
    [Test]
    [Explicit("Live judge calls; run manually to check verbosity-bias robustness.")]
    public async Task VerbosityBiasProbe()
    {
        var probeCase = new RagGoldenCase
        {
            Id = "verbosity-probe",
            Query = "When should I use RAG instead of fine-tuning?",
            Difficulty = "probe",
            Expected =
            [
                new RagGoldenChunk
                {
                    DocumentId = "doc_probe",
                    Heading = "Tradeoffs",
                    CitationLabel = "RAG/RAG.md",
                    Text = "Retrieval adds external knowledge at query time and keeps answers tied to current documents. Fine-tuning changes model behaviour but does not reliably inject fresh facts.",
                },
            ],
        };

        const string concise =
            "Use RAG when the answer must be grounded in current or inspectable documents; use fine-tuning to change model behaviour rather than supply facts. [[RAG/RAG.md#Tradeoffs]]";

        var filler = string.Concat(Enumerable.Repeat(
            " It is worth noting that this is an important and widely discussed consideration that many teams weigh carefully in practice.", 5));
        var verbose = concise + filler;

        static double Faithfulness(EvaluationResult result)
            => result.Get<NumericMetric>("Faithfulness").Value ?? 0;

        var faithConcise = Faithfulness(await this.judge.JudgeAsync(new AnswerJudgeInput(probeCase, concise)));
        var faithVerbose = Faithfulness(await this.judge.JudgeAsync(new AnswerJudgeInput(probeCase, verbose)));

        await TestContext.Progress.WriteLineAsync(
            $"Verbosity probe — Faithfulness concise={faithConcise:0.000}, verbose={faithVerbose:0.000}, delta={faithVerbose - faithConcise:+0.000;-0.000}");

        Assert.That(
            faithVerbose,
            Is.LessThanOrEqualTo(faithConcise + 0.10),
            "Padding the answer with ungrounded filler must not inflate the claim-grounded Faithfulness ratio.");
    }

    /// <inheritdoc />
    protected override Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<AnswerPrediction> predictions)
    {
        var scored = predictions
            .SelectMany(prediction => prediction.Metrics)
            .OfType<NumericMetric>()
            .ToList();

        var metrics = SelectedMetrics()
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