namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using System.ComponentModel;
using System.Text;
using System.Text.RegularExpressions;
using DevBook.Evaluations.Common.Evaluation.Metrics;
using DevBook.Evaluations.Common.Evaluation.Judging;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// The LLM-as-judge for generated answers. A single structured judge call over
/// {question, sources, [reference,] answer} decomposes the answer into atomic claims (each graded for
/// grounding, relevance and citation) plus the question's expected points; the grounding/quality
/// metrics are then computed as claim/point <em>ratios</em>, so answer length cannot inflate them —
/// unsupported padding lowers the ratio. The citation-rate gate and token count are deterministic. The
/// reusable plumbing (the model call, structured output, timing, parse-guard) lives in
/// <see cref="LlmJudge{TInput, TResult}"/>; this type adds only the rubric, the payload, and the
/// per-metric scoring. Bridge it into the MEAI pipeline with
/// <see cref="JudgeEvaluator{TInput, TContext}"/>.
/// </summary>
/// <param name="judgeClient">Chat client for the judge model (wrap with <see cref="RateLimitingChatClient"/>).</param>
/// <param name="judgeModelId">Judge model id used by the base judge for the model call.</param>
/// <param name="metrics">The metric panel to score (full or reference-free, chosen by the scenario).</param>
public sealed class AnswerJudge(IChatClient judgeClient, string judgeModelId, IReadOnlyList<MetricDescriptor> metrics)
    : LlmJudge<AnswerJudgeInput, AnswerJudge.JudgeResult>(judgeClient, judgeModelId, metrics)
{
    private static readonly Regex CitationPattern = new(@"\[\[[^\]]+\]\]", RegexOptions.Compiled);

    /// <inheritdoc />
    protected override string SystemPrompt => JudgeSystemPrompt;

    /// <inheritdoc />
    protected override string BuildPayload(AnswerJudgeInput input)
    {
        var answerCase = input.Case;
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

        builder.AppendLine("ANSWER:").AppendLine(input.Answer);
        return builder.ToString();
    }

    /// <inheritdoc />
    protected override NumericMetric Score(MetricDescriptor metric, AnswerJudgeInput input, JudgeResult? result, string? judgeError, long elapsedMs)
        => metric.Name switch
        {
            "Citation Rate" => CitationRateMetric(metric, input.Answer),
            "Completion Tokens" => TokenMetric(metric, input.Answer),
            _ => SemanticMetric(metric, input.Case, result, judgeError),
        };

    // -------- deterministic metrics (no model output) --------

    private static NumericMetric CitationRateMetric(MetricDescriptor metric, string answer)
    {
        var citations = CitationPattern.Matches(answer).Select(match => match.Value).Distinct(StringComparer.Ordinal).ToList();
        var present = citations.Count > 0;
        var reason = present
            ? $"Answer included {citations.Count} inline citation(s)."
            : "Answer included no inline [[...]] citation despite being given sources.";

        IReadOnlyList<EvaluationDiagnostic> diagnostics = present
            ? []
            : [EvaluationDiagnostic.Warning("No inline citation found — the answer agent may be ignoring the retrieved context.")];

        return MetricFactory.Numeric(metric, present ? 1.0 : 0.0, present ? EvaluationRating.Exceptional : EvaluationRating.Unacceptable, failed: !present, reason, diagnostics);
    }

    private static NumericMetric TokenMetric(MetricDescriptor metric, string answer)
    {
        // No usage is surfaced through the agent run here, so approximate from text length (~4 chars/token).
        return MetricFactory.Numeric(
            metric,
            Math.Round(answer.Length / 4.0),
            EvaluationRating.Unknown,
            failed: false,
            "Informational metric — reported without a pass/fail interpretation.");
    }

    // -------- LLM-judged semantic metrics --------

    private NumericMetric SemanticMetric(MetricDescriptor metric, RagGoldenCase answerCase, JudgeResult? result, string? judgeError)
    {
        if (result is null)
        {
            return MetricFactory.Inconclusive(metric, judgeError ?? $"Judge returned no result for {metric.Name}.");
        }

        var claims = result.Claims ?? [];

        switch (metric.Name)
        {
            case "Faithfulness":
            {
                if (claims.Count == 0)
                {
                    return MetricFactory.Inconclusive(metric, "Judge extracted no claims from the answer.");
                }

                var supported = claims.Count(claim => claim.Supported);
                var firstUnsupported = claims.FirstOrDefault(claim => !claim.Supported)?.Claim;
                var detail = firstUnsupported is null ? string.Empty : $" Unsupported e.g.: \"{Truncate(firstUnsupported, 100)}\".";
                return MetricFactory.Ratio(metric, supported, claims.Count, $"{supported}/{claims.Count} claims grounded in the sources.{detail}");
            }

            case "Relevance":
            {
                if (claims.Count == 0)
                {
                    return MetricFactory.Inconclusive(metric, "Judge extracted no claims from the answer.");
                }

                var relevant = claims.Count(claim => claim.Relevant);
                return MetricFactory.Ratio(metric, relevant, claims.Count, $"{relevant}/{claims.Count} claims are relevant to the question.");
            }

            case "Citation Validity":
            {
                var cited = claims.Where(claim => claim.HasCitation).ToList();
                if (cited.Count == 0)
                {
                    return MetricFactory.Numeric(
                        metric,
                        0,
                        EvaluationRating.Unacceptable,
                        failed: true,
                        "No inline citations to validate — the answer made claims without citing sources.",
                        [EvaluationDiagnostic.Warning("Answer claims carry no inline citations.")]);
                }

                var valid = cited.Count(claim => claim.CitationSupportsClaim);
                return MetricFactory.Ratio(metric, valid, cited.Count, $"{valid}/{cited.Count} inline citations support their claim.");
            }

            case "Completeness":
            {
                var points = result.ExpectedPoints ?? [];
                if (points.Count == 0)
                {
                    return MetricFactory.Inconclusive(metric, "Judge listed no expected points for the question.");
                }

                var covered = points.Count(point => point.Covered);
                var firstMissing = points.FirstOrDefault(point => !point.Covered)?.Point;
                var detail = firstMissing is null ? string.Empty : $" Missing e.g.: \"{Truncate(firstMissing, 100)}\".";
                return MetricFactory.Ratio(metric, covered, points.Count, $"{covered}/{points.Count} expected points covered.{detail}");
            }

            case "Correctness":
            {
                if (result.Correctness is not { } dimension)
                {
                    return MetricFactory.Inconclusive(metric, "Judge returned no Correctness score.");
                }

                var value = Math.Clamp(dimension.Score, 1, 5);
                var rating = Ratings.ForScore(value);
                var reason = string.IsNullOrWhiteSpace(dimension.Reason)
                    ? $"Correctness scored {value:0.0}/5 ({rating})."
                    : $"Correctness scored {value:0.0}/5 ({rating}). {dimension.Reason.Trim()}";
                return MetricFactory.Numeric(metric, value, rating, Ratings.IsFailing(rating), reason, MetricFactory.RatingDiagnostics(rating));
            }

            default:
                return MetricFactory.Inconclusive(metric, $"Unknown semantic metric {metric.Name}.");
        }
    }

    private static string Truncate(string value, int max)
        => value.Length <= max ? value : value[..max] + "…";

    private const string JudgeSystemPrompt =
        """
        You are a strict evaluator of retrieval-augmented answers. You are given a user QUESTION, the
        SOURCES provided to the answerer (the ONLY admissible evidence), optionally a gold REFERENCE
        ANSWER, and the ANSWER produced.

        Judge substance, not length. Do not reward verbosity, hedging, or repetition: a concise, fully
        grounded answer must score at least as high as a longer one, and unsupported elaboration must
        lower the grounding scores rather than raise them.

        Decompose the ANSWER into its atomic factual claims. For each claim decide, independently:
        - Supported: is the claim fully entailed by the SOURCES (not outside knowledge)?
        - Relevant: does the claim help answer the QUESTION (not a tangent)?
        - HasCitation: does the claim carry an inline [[...]] citation?
        - CitationSupportsClaim: if it is cited, does that cited source actually support the claim?

        Separately, list the key points the QUESTION warrants — taken from the REFERENCE ANSWER if one
        is provided, otherwise from what the SOURCES can support — and mark each as Covered by the
        ANSWER or not. Do not invent points the sources cannot support.

        If a REFERENCE ANSWER is provided, also score Correctness as factual equivalence to it (1–5),
        ignoring wording and citation style. If no reference is provided, score Correctness 3.
        """;

    /// <summary>
    /// Structured judge output. MEAI generates the request's JSON schema from this type, so the
    /// <see cref="DescriptionAttribute"/> text on each property guides the model. Grounding/quality
    /// metrics are computed from the per-claim and per-point verdicts as ratios (length-robust); only
    /// Correctness, which is judged against a gold reference, stays a holistic score.
    /// </summary>
    public sealed record JudgeResult
    {
        [Description("Every atomic factual claim stated in the answer, each graded for grounding, relevance and citation.")]
        public IReadOnlyList<ClaimVerdict>? Claims { get; init; }

        [Description("The key points the question warrants (from the reference answer if provided, else from what the sources support), each marked covered by the answer or not.")]
        public IReadOnlyList<PointVerdict>? ExpectedPoints { get; init; }

        [Description("If a REFERENCE ANSWER (gold) is provided, is this answer factually equivalent to it — same key facts, no contradictions or missing essentials? Ignore wording and citation style. If no reference is provided, score 3.")]
        public JudgeDimension? Correctness { get; init; }
    }

    /// <summary>One atomic claim from the answer, graded along the four grounding/citation axes.</summary>
    public sealed record ClaimVerdict
    {
        [Description("One atomic factual claim stated in the answer.")]
        public string? Claim { get; init; }

        [Description("True if the claim is fully entailed by the sources (not outside knowledge).")]
        public bool Supported { get; init; }

        [Description("True if the claim helps answer the question (not a tangent).")]
        public bool Relevant { get; init; }

        [Description("True if the claim carries an inline [[...]] citation in the answer.")]
        public bool HasCitation { get; init; }

        [Description("True if the claim is cited AND that cited source actually supports it. False if uncited or the citation does not support the claim.")]
        public bool CitationSupportsClaim { get; init; }
    }

    /// <summary>One expected point the question warrants, marked covered by the answer or not.</summary>
    public sealed record PointVerdict
    {
        [Description("A key point the question warrants, given the sources (or the reference answer if provided).")]
        public string? Point { get; init; }

        [Description("True if the answer covers this point.")]
        public bool Covered { get; init; }
    }

    /// <summary>A holistic 1–5 score with a one-line justification (used for Correctness).</summary>
    public sealed record JudgeDimension
    {
        [Description("Score from 1 (worst) to 5 (best).")]
        public double Score { get; init; }

        [Description("One short sentence justifying the score.")]
        public string? Reason { get; init; }
    }
}
