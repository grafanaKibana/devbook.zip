namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using DevBook.Evaluations.Common.Evaluation.Metrics;

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
    public static IReadOnlyList<MetricDescriptor> All { get; } =
    [
        new("Faithfulness", "Grounding", MetricKind.Fraction, "high", false,
            "Fraction of the answer's atomic claims that are supported by the provided sources. Claim-grounded, so padding the answer cannot inflate it — unsupported elaboration lowers it."),
        new("Citation Validity", "Grounding", MetricKind.Fraction, "high", false,
            "Fraction of the answer's inline citations that point to a source actually supporting the cited claim."),
        new("Relevance", "Quality", MetricKind.Fraction, "high", false,
            "Fraction of the answer's atomic claims that are relevant to the question. Off-topic padding lowers it."),
        new("Completeness", "Quality", MetricKind.Fraction, "high", false,
            "Fraction of the question's expected points (from the reference, or what the sources support) that the answer covers."),
        new("Correctness", "Quality", MetricKind.Score, "high", false,
            "Whether the answer is factually equivalent to the gold reference answer — same key facts, no contradictions. Scored only when a reference answer is available."),
        new("Citation Rate", "Citations", MetricKind.Fraction, "high", false,
            "Deterministic: did the answer include at least one inline [[...]] citation. Averaged, this is the citation rate — an early prompt-regression signal."),
        new("Completion Tokens", "Stats", MetricKind.Count, "none", true,
            "Informational — approximate completion tokens generated; no pass/fail interpretation."),
    ];

    /// <summary>The panel without reference-dependent metrics, used for the reference-free dataset.</summary>
    public static IReadOnlyList<MetricDescriptor> ReferenceFree { get; } =
        All.Where(metric => metric.Name != "Correctness").ToArray();
}