namespace DevBook.Evaluations.Common.Evaluation;

/// <summary>
/// How a metric's raw value should be read, rounded and coloured in the report. One shared vocabulary
/// for every judged scenario (RAG.Answer, AskAgent, …) — this replaces the per-scenario
/// <c>AnswerMetricKind</c> / <c>AgentMetricKind</c> / <c>SummaryMetricKind</c> enums. Direction
/// (higher- vs lower-is-better) is a <em>separate</em> concern carried by
/// <see cref="MetricDescriptor.Better"/>, not folded in here.
/// </summary>
public enum MetricKind
{
    /// <summary>1–5 LLM quality score.</summary>
    Score,

    /// <summary>0–1 fractional rate (rendered as a percentage).</summary>
    Fraction,

    /// <summary>Informational count (e.g. tokens); no pass/fail.</summary>
    Count,

    /// <summary>Plain decimal number shown as-is (e.g. an average).</summary>
    Number,

    /// <summary>0–7 content-safety severity, lower is better.</summary>
    Severity,
}