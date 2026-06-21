namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>How an answer-judge metric's raw value should be read and coloured in the report.</summary>
public enum AnswerMetricKind
{
    /// <summary>1–5 LLM quality score.</summary>
    Score,

    /// <summary>0–1 fractional rate.</summary>
    Fraction,

    /// <summary>Informational count (e.g. tokens); no pass/fail.</summary>
    Count,
}

/// <summary>Definition of one judge metric: identity plus presentation hints carried into report metadata.</summary>
public sealed record AnswerMetricDefinition(
    string MetricName,
    string ShortName,
    string Group,
    AnswerMetricKind Kind,
    string Better,
    bool Informational,
    string Description);

/// <summary>One verdict: the value plus the MEAI interpretation, diagnostics and report metadata.</summary>
public sealed record AnswerMetricVerdict(
    AnswerMetricDefinition Definition,
    double Value,
    EvaluationRating Rating,
    bool Failed,
    string Reason,
    IReadOnlyList<EvaluationDiagnostic> Diagnostics,
    IReadOnlyDictionary<string, string> Metadata);

/// <summary>
/// The generation-quality metric panel for the RAG answer scenario. These measure the
/// <c>AnswerAgent</c> (the generation layer) — not retrieval, which <c>RAG.Search</c> already
/// covers. The panel is deliberately the RAG-specific generation set: grounding/faithfulness and
/// citation validity (the agent's core contract), plus relevance and completeness, plus a cheap
/// deterministic citation-rate gate and an informational token count.
/// </summary>
/// <remarks>
/// Answer <em>correctness</em> (equivalence to a gold reference answer) is included in <see cref="All"/>
/// but only scored when the run uses the answer dataset (<c>answers-shared.json</c>, which carries a
/// per-case <c>referenceAnswer</c>). For the reference-free <c>chunks-shared.json</c> the scenario uses
/// <see cref="ReferenceFree"/>, which drops it.
/// </remarks>
public static class AnswerMetrics
{
    /// <summary>The full metric panel (includes reference-dependent Correctness), in report-display order.</summary>
    public static IReadOnlyList<AnswerMetricDefinition> All { get; } =
    [
        new("Faithfulness", "Faith", "Grounding", AnswerMetricKind.Score, "high", false,
            "Whether every claim in the answer is supported by the provided source chunks (no outside knowledge, no fabrication)."),
        new("Citation Validity", "Cite✓", "Grounding", AnswerMetricKind.Score, "high", false,
            "Whether each inline citation points to a source chunk that actually supports the claim it is attached to."),
        new("Relevance", "Relev", "Quality", AnswerMetricKind.Score, "high", false,
            "Whether the answer addresses the question directly without drifting into unrelated material."),
        new("Completeness", "Compl", "Quality", AnswerMetricKind.Score, "high", false,
            "Whether the answer covers the aspects of the question that the provided sources can support."),
        new("Correctness", "Correct", "Quality", AnswerMetricKind.Score, "high", false,
            "Whether the answer is factually equivalent to the gold reference answer — same key facts, no contradictions. Scored only when a reference answer is available."),
        new("Citation Rate", "Cite%", "Citations", AnswerMetricKind.Fraction, "high", false,
            "Deterministic: did the answer include at least one inline [[...]] citation. Averaged, this is the citation rate — an early prompt-regression signal."),
        new("Completion Tokens", "Tokens", "Stats", AnswerMetricKind.Count, "none", true,
            "Informational — approximate completion tokens generated; no pass/fail interpretation."),
    ];

    /// <summary>The panel without reference-dependent metrics, used for the reference-free dataset.</summary>
    public static IReadOnlyList<AnswerMetricDefinition> ReferenceFree { get; } =
        All.Where(metric => metric.MetricName != "Correctness").ToArray();
}

/// <summary>Scores one generated answer against the question and the gold evidence it was given.</summary>
public interface IAnswerJudge
{
    /// <summary>The metric panel this judge reports.</summary>
    IReadOnlyList<AnswerMetricDefinition> Metrics { get; }

    /// <summary>Scores a single generated answer.</summary>
    /// <param name="answerCase">The case, carrying the question and gold evidence.</param>
    /// <param name="answer">The answer the agent generated from that evidence.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task<IReadOnlyList<AnswerMetricVerdict>> JudgeAsync(
        AnswerCase answerCase,
        string answer,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// A real LLM-as-judge. The four semantic metrics (faithfulness, citation validity, relevance,
/// completeness) come from a single structured judge call over {question, sources, answer}; the
/// citation-rate gate and token count are computed deterministically without a model. Verdicts carry
/// the report-metadata conventions (kind/group/better/short presentation hints, <c>ctx:</c> judge
/// context, <c>meta:</c> evaluator rows) so the fancy report renders them generically.
/// </summary>
/// <param name="judgeClient">Chat client used for the judge model.</param>
/// <param name="judgeModelId">Judge model id, surfaced as <c>meta:judge</c> in the report.</param>
/// <param name="metrics">The metric panel to score (full or reference-free, chosen by the scenario).</param>
public sealed class LlmAnswerJudge(IChatClient judgeClient, string judgeModelId, IReadOnlyList<AnswerMetricDefinition> metrics) : IAnswerJudge
{
    private static readonly Regex CitationPattern = new(@"\[\[[^\]]+\]\]", RegexOptions.Compiled);

    /// <inheritdoc />
    public IReadOnlyList<AnswerMetricDefinition> Metrics => metrics;

    /// <inheritdoc />
    public async Task<IReadOnlyList<AnswerMetricVerdict>> JudgeAsync(
        AnswerCase answerCase,
        string answer,
        CancellationToken cancellationToken = default)
    {
        answer ??= string.Empty;

        var citations = CitationPattern.Matches(answer).Select(match => match.Value).Distinct(StringComparer.Ordinal).ToList();
        var (scores, judgeError, elapsed) = await ScoreSemanticAsync(answerCase, answer, cancellationToken);

        return Metrics.Select(metric => metric.MetricName switch
        {
            "Citation Rate" => CitationRateVerdict(metric, citations),
            "Completion Tokens" => TokenVerdict(metric, answer),
            _ => SemanticVerdict(metric, answerCase, scores, judgeError, elapsed),
        }).ToList();
    }

    // -------- deterministic metrics (no model call) --------

    private static AnswerMetricVerdict CitationRateVerdict(AnswerMetricDefinition metric, IReadOnlyList<string> citations)
    {
        var value = citations.Count > 0 ? 1.0 : 0.0;
        var rating = value > 0 ? EvaluationRating.Exceptional : EvaluationRating.Unacceptable;
        var reason = value > 0
            ? $"Answer included {citations.Count} inline citation(s)."
            : "Answer included no inline [[...]] citation despite being given sources.";

        IReadOnlyList<EvaluationDiagnostic> diagnostics = value > 0
            ? []
            : [EvaluationDiagnostic.Warning("No inline citation found — the answer agent may be ignoring the retrieved context.")];

        var metadata = BaseMetadata(metric);
        metadata["ctx:citations"] = citations.Count > 0 ? string.Join(", ", citations) : "(none)";
        metadata["meta:source"] = "deterministic";

        return new AnswerMetricVerdict(metric, value, rating, value == 0, reason, diagnostics, metadata);
    }

    private static AnswerMetricVerdict TokenVerdict(AnswerMetricDefinition metric, string answer)
    {
        // No usage is surfaced through the agent run here, so approximate from text length (~4 chars/token).
        var value = Math.Round(answer.Length / 4.0);
        var metadata = BaseMetadata(metric);
        metadata["info"] = "true";
        metadata["meta:source"] = "agent runtime";
        metadata["meta:unit"] = "tokens";

        return new AnswerMetricVerdict(
            metric,
            value,
            EvaluationRating.Unknown,
            Failed: false,
            "Informational metric — reported without a pass/fail interpretation.",
            [],
            metadata);
    }

    // -------- LLM-judged semantic metrics --------

    private async Task<(JudgeResult? Scores, string? Error, long ElapsedMs)> ScoreSemanticAsync(
        AnswerCase answerCase,
        string answer,
        CancellationToken cancellationToken)
    {
        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, JudgeSystemPrompt),
            new(ChatRole.User, BuildJudgePayload(answerCase, answer)),
        };

        // MEAI structured output: the JSON schema is generated from JudgeResult and applied to the
        // request, and the response is deserialized for us — no hand-written JSON instructions or
        // parsing. Transport faults (e.g. 429) propagate so the caller's rate-limit retry handles
        // them; an unparseable result is surfaced per metric rather than throwing.
        var stopwatch = Stopwatch.StartNew();
        var response = await judgeClient.GetResponseAsync<JudgeResult>(messages, cancellationToken: cancellationToken);
        stopwatch.Stop();

        return response.TryGetResult(out var result) && result is not null
            ? (result, null, stopwatch.ElapsedMilliseconds)
            : (null, "Judge did not return a parseable structured result.", stopwatch.ElapsedMilliseconds);
    }

    private AnswerMetricVerdict SemanticVerdict(
        AnswerMetricDefinition metric,
        AnswerCase answerCase,
        JudgeResult? scores,
        string? judgeError,
        long elapsedMs)
    {
        var dimension = scores is null ? null : metric.MetricName switch
        {
            "Faithfulness" => scores.Faithfulness,
            "Citation Validity" => scores.CitationValidity,
            "Relevance" => scores.Relevance,
            "Completeness" => scores.Completeness,
            "Correctness" => scores.Correctness,
            _ => null,
        };

        var metadata = BaseMetadata(metric);
        metadata["meta:judge"] = judgeModelId;
        metadata["meta:eval"] = $"{elapsedMs}ms";
        if (metric.MetricName == "Correctness")
        {
            metadata["ctx:reference"] = Truncate(answerCase.ReferenceAnswer ?? "(none)", 240);
        }
        else if (metric.MetricName is "Faithfulness" or "Citation Validity" or "Completeness")
        {
            metadata["ctx:sources"] = RenderSources(answerCase.Expected);
        }
        else
        {
            metadata["ctx:question"] = answerCase.Query;
        }

        if (dimension is null)
        {
            var reason = judgeError ?? $"Judge did not return a score for {metric.MetricName}.";
            return new AnswerMetricVerdict(
                metric,
                0,
                EvaluationRating.Inconclusive,
                Failed: true,
                reason,
                [EvaluationDiagnostic.Error(reason)],
                metadata);
        }

        var value = Math.Clamp(dimension.Score, 1, 5);
        var rating = ScoreRating(value);
        var failed = rating is EvaluationRating.Poor or EvaluationRating.Unacceptable;
        var reasonText = string.IsNullOrWhiteSpace(dimension.Reason)
            ? $"{metric.MetricName} scored {value:0.0}/5 ({rating})."
            : $"{metric.MetricName} scored {value:0.0}/5 ({rating}). {dimension.Reason.Trim()}";

        return new AnswerMetricVerdict(
            metric,
            Math.Round(value, 3),
            rating,
            failed,
            reasonText,
            Diagnostics(rating),
            metadata);
    }

    private static EvaluationRating ScoreRating(double value) => value switch
    {
        >= 4.5 => EvaluationRating.Exceptional,
        >= 3.5 => EvaluationRating.Good,
        >= 2.5 => EvaluationRating.Average,
        >= 1.5 => EvaluationRating.Poor,
        _ => EvaluationRating.Unacceptable,
    };

    private static IReadOnlyList<EvaluationDiagnostic> Diagnostics(EvaluationRating rating) => rating switch
    {
        EvaluationRating.Unacceptable => [EvaluationDiagnostic.Error("Judge marked this metric below the failure threshold; gating this scenario.")],
        EvaluationRating.Poor => [EvaluationDiagnostic.Warning("Judge cited a missing or unsupported element in the answer.")],
        _ => [],
    };

    // -------- metadata + rendering helpers --------

    private static Dictionary<string, string> BaseMetadata(AnswerMetricDefinition metric) => new(StringComparer.Ordinal)
    {
        ["kind"] = metric.Kind.ToString().ToLowerInvariant(),
        ["group"] = metric.Group,
        ["better"] = metric.Better,
        ["short"] = metric.ShortName,
    };

    private static string RenderSources(IReadOnlyList<AnswerSource> sources)
        => string.Join(
            Environment.NewLine,
            sources.Select((source, index) =>
            {
                var heading = string.IsNullOrWhiteSpace(source.Heading) ? string.Empty : $" #{source.Heading}";
                return $"[{index + 1}] {source.CitationLabel}{heading}: {Truncate(source.Text, 160)}";
            }));

    private static string BuildJudgePayload(AnswerCase answerCase, string answer)
    {
        var builder = new StringBuilder();
        builder.AppendLine("QUESTION:").AppendLine(answerCase.Query).AppendLine();
        builder.AppendLine("SOURCES (the only admissible evidence):");
        for (var index = 0; index < answerCase.Expected.Count; index++)
        {
            var source = answerCase.Expected[index];
            builder.AppendLine($"[{index + 1}] {source.CitationLabel}");
            builder.AppendLine(source.Text.Trim());
            builder.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(answerCase.ReferenceAnswer))
        {
            builder.AppendLine("REFERENCE ANSWER (gold — the answer should be factually equivalent to this):");
            builder.AppendLine(answerCase.ReferenceAnswer.Trim());
            builder.AppendLine();
        }

        builder.AppendLine("ANSWER:").AppendLine(answer);
        return builder.ToString();
    }

    private static string Truncate(string value, int max)
        => value.Length <= max ? value : value[..max] + "…";

    private const string JudgeSystemPrompt =
        """
        You are a strict evaluator of retrieval-augmented answers. You are given a user QUESTION, the
        SOURCES that were provided to the answerer (the ONLY admissible evidence), and the ANSWER that
        was produced. Score each requested dimension on an integer scale of 1 (worst) to 5 (best) and
        give one short reason for each. Treat only the SOURCES as evidence: reward answers that stay
        grounded in them and that correctly abstain when the evidence is missing. A REFERENCE ANSWER
        (gold) may also be provided; when it is, judge Correctness as factual equivalence to it.
        """;

    /// <summary>
    /// Structured judge output. MEAI generates the request's JSON schema from this type, so the
    /// <see cref="DescriptionAttribute"/> text on each property is what guides the model per dimension
    /// (the rubric lives here, not in hand-written prompt JSON).
    /// </summary>
    private sealed record JudgeResult
    {
        [Description("Is every factual claim in the answer supported by the sources? Penalise outside knowledge or claims not entailed by the sources; a correct abstention when evidence is missing is faithful.")]
        public JudgeDimension? Faithfulness { get; init; }

        [Description("Does each inline [[...]] citation point to a source that actually supports the adjacent claim? If there are no citations at all, score 1.")]
        public JudgeDimension? CitationValidity { get; init; }

        [Description("Does the answer address the question directly, without drifting into unrelated material?")]
        public JudgeDimension? Relevance { get; init; }

        [Description("Does the answer cover the aspects of the question that the sources can support? Do not penalise omission of facts absent from the sources.")]
        public JudgeDimension? Completeness { get; init; }

        [Description("If a REFERENCE ANSWER (gold) is provided, is this answer factually equivalent to it — same key facts, no contradictions or missing essentials? Ignore differences in wording and citation style. If no reference is provided, score 3.")]
        public JudgeDimension? Correctness { get; init; }
    }

    private sealed record JudgeDimension
    {
        [Description("Score from 1 (worst) to 5 (best).")]
        public double Score { get; init; }

        [Description("One short sentence justifying the score.")]
        public string? Reason { get; init; }
    }
}
