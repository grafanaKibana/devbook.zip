namespace DevBook.Evaluations.Scenarios.RAG.Search;

using System.Globalization;
using DevBook.Data.Models;
using DevBook.Data.Services;
using DevBook.Evaluations.Common.Evaluation.Summary;
using DevBook.Evaluations.Scenarios.RAG.Search.Model;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Evaluates search results.
/// </summary>
public sealed class SearchEvaluator : IEvaluator
{
    private const string EmptyResultRateMetricName = "EmptyResultRate";
    private const string ScoreAverageMetricName = "ScoreAverage";
    private const string RecallAtRMetricName = "RecallAtR";
    private const string SectionRecallAtRMetricName = "SectionRecallAtR";
    private const string SectionHitRateAt1MetricName = "SectionHitRateAt1";
    private const string ScoreScaleGuidance = "Compare this metric only within the same reranker and scorer scale.";

    /// <summary>
    /// Gets evaluation metric names.
    /// </summary>
    public IReadOnlyCollection<string> EvaluationMetricNames { get; } = CreateRankingMetricNames(RagRetrievalPolicy.MaxTopK);

    /// <summary>
    /// Evaluates one search prediction and returns report-facing metrics.
    /// </summary>
    /// <param name="messages">Messages associated with the evaluation turn.</param>
    /// <param name="modelResponse">Model response associated with the evaluation turn.</param>
    /// <param name="chatConfiguration">Optional chat configuration for the evaluation.</param>
    /// <param name="additionalContext">Evaluation contexts containing the search prediction.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The evaluation result with ranking and score metrics.</returns>
    public ValueTask<EvaluationResult> EvaluateAsync(
        IEnumerable<ChatMessage> messages,
        ChatResponse modelResponse,
        ChatConfiguration? chatConfiguration = null,
        IEnumerable<EvaluationContext>? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = additionalContext?.OfType<SearchEvaluationContext>().FirstOrDefault();
        if (context is null)
        {
            return ValueTask.FromResult(new EvaluationResult(CreateFailedMetric(RecallAtRMetricName, "SearchEvaluationContext not provided.")));
        }

        var metrics = SearchMetricCalculator.ScoreQuery(context.Prediction, context.TopK);
        var rankingMetrics = CreateRankingMetrics(metrics, RagRetrievalPolicy.MaxTopK).ToArray();

        return ValueTask.FromResult(new EvaluationResult([
            ..rankingMetrics,
            CreateScoreMetric(metrics),
        ]));
    }

    /// <summary>
    /// Computes summary metrics.
    /// </summary>
    /// <param name="predictions">Search predictions to summarize.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <returns>Summary metrics grouped by chunking and reranking strategy.</returns>
    public static Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<SearchPrediction> predictions,
        int topK)
    {
        return predictions
            .GroupBy(prediction => new { prediction.ChunkingStrategy, prediction.RerankingStrategy })
            .ToDictionary(
                group => $"{group.Key.ChunkingStrategy}.{group.Key.RerankingStrategy}",
                group => CreateSummaryMetrics(SearchMetricCalculator.Evaluate(group.ToArray(), topK), group.Key.ChunkingStrategy, group.Key.RerankingStrategy, RagRetrievalPolicy.MaxTopK));
    }

    private static IEnumerable<SummaryMetric> CreateSummaryMetrics(SearchReport report, ChunkingStrategyKind chunkingStrategy, RerankingStrategyKind rerankingStrategy, int primaryCutoff) =>
    [
        ..CreateSummaryRankingMetrics(report, chunkingStrategy, rerankingStrategy, primaryCutoff),
        new SummaryMetric(EmptyResultRateMetricName, report.EmptyResultRate, $"Share of evaluated RAG search cases that returned zero chunks after {rerankingStrategy} reranking over {chunkingStrategy} chunks. Read 0.000 as no empty result failures; higher values mean more queries produced no context for the answer step.", SummaryMetricKind.Percentage, GetEmptyResultRateRating(report.EmptyResultRate)),
        new SummaryMetric(ScoreAverageMetricName, report.ScoreAverage, $"Diagnostic only: average raw returned score across all scored retrieved {chunkingStrategy} chunks with {rerankingStrategy} reranking. This is not a cross-strategy quality grade because BM25, vector, and reranker scores use different scales. {ScoreScaleGuidance}", SummaryMetricKind.PlainNumber, EvaluationRating.Unknown, CreateScoreDiagnostics(report)),
        new SummaryMetric("SampleCount", report.QueryCount, $"Total RAG search cases included in this aggregate for {chunkingStrategy} chunks with {rerankingStrategy} reranking. This is a count, not a quality score; larger counts make the averages more stable.", SummaryMetricKind.Count),
    ];

    private static IEnumerable<SummaryMetric> CreateSummaryRankingMetrics(
        SearchReport report,
        ChunkingStrategyKind chunkingStrategy,
        RerankingStrategyKind rerankingStrategy,
        int primaryCutoff)
    {
        var rankingAt1 = report.RankingMetrics[1];
        var rankingAtPrimaryCutoff = report.RankingMetrics[primaryCutoff];

        return
        [
            new SummaryMetric(RecallAtRMetricName, report.RBasedMetrics.RecallAtR, $"{CreateMetricReason(RecallAtRMetricName)} Aggregated as the mean across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.Percentage, GetRating(MetricFamily.Recall, report.RBasedMetrics.RecallAtR)),
            new SummaryMetric(SectionRecallAtRMetricName, report.SectionMetrics.RecallAtR, $"{CreateMetricReason(SectionRecallAtRMetricName)} Aggregated as the mean across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.Percentage, GetRating(MetricFamily.Recall, report.SectionMetrics.RecallAtR)),
            new SummaryMetric(HitRateMetricName(1), rankingAt1.HitRate, $"Average HitRate@1 across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt1.ConfidenceIntervals.HitRate)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.HitRate, rankingAt1.HitRate)),
            new SummaryMetric(SectionHitRateAt1MetricName, report.SectionMetrics.HitRateAt1, $"{CreateMetricReason(SectionHitRateAt1MetricName)} Aggregated as the mean across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.Percentage, GetRating(MetricFamily.HitRate, report.SectionMetrics.HitRateAt1)),
            new SummaryMetric(MrrMetricName(primaryCutoff), rankingAtPrimaryCutoff.MeanReciprocalRank, $"Mean reciprocal rank capped at @{primaryCutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAtPrimaryCutoff.ConfidenceIntervals.MeanReciprocalRank)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Mrr, rankingAtPrimaryCutoff.MeanReciprocalRank)),
            new SummaryMetric(SectionMrrMetricName(primaryCutoff), report.SectionMetrics.MeanReciprocalRankAtK, $"{CreateMetricReason(SectionMrrMetricName(primaryCutoff))} Aggregated as the mean across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Mrr, report.SectionMetrics.MeanReciprocalRankAtK)),
            new SummaryMetric(MapMetricName(primaryCutoff), rankingAtPrimaryCutoff.MeanAveragePrecision, $"Mean Average Precision@{primaryCutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAtPrimaryCutoff.ConfidenceIntervals.MeanAveragePrecision)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Map, rankingAtPrimaryCutoff.MeanAveragePrecision)),
            new SummaryMetric(SectionMapMetricName(primaryCutoff), report.SectionMetrics.MeanAveragePrecisionAtK, $"{CreateMetricReason(SectionMapMetricName(primaryCutoff))} Aggregated as the mean across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Map, report.SectionMetrics.MeanAveragePrecisionAtK)),
            new SummaryMetric(NdcgMetricName(primaryCutoff), rankingAtPrimaryCutoff.NormalizedDiscountedCumulativeGain, $"Mean nDCG@{primaryCutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAtPrimaryCutoff.ConfidenceIntervals.NormalizedDiscountedCumulativeGain)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Ndcg, rankingAtPrimaryCutoff.NormalizedDiscountedCumulativeGain)),
            new SummaryMetric(SectionNdcgMetricName(primaryCutoff), report.SectionMetrics.NormalizedDiscountedCumulativeGainAtK, $"{CreateMetricReason(SectionNdcgMetricName(primaryCutoff))} Aggregated as the mean across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Ndcg, report.SectionMetrics.NormalizedDiscountedCumulativeGainAtK)),
        ];
    }

    private static IEnumerable<NumericMetric> CreateRankingMetrics(SearchQueryMetrics metrics, int primaryCutoff)
    {
        var rankingAt1 = metrics.RankingMetrics[1];
        var rankingAtPrimaryCutoff = metrics.RankingMetrics[primaryCutoff];

        return
        [
            CreateRMetric(RecallAtRMetricName, MetricFamily.Recall, metrics.RBasedMetrics.RecallAtR, metrics.RBasedMetrics.ExpectedCount, metrics.RBasedMetrics.MatchedAtR, false, true),
            CreateRMetric(SectionRecallAtRMetricName, MetricFamily.Recall, metrics.SectionMetrics.RecallAtR, metrics.SectionMetrics.ExpectedSectionCount, metrics.SectionMetrics.MatchedSectionsAtR, true),
            CreateMetric(HitRateMetricName(1), MetricFamily.HitRate, 1, rankingAt1.HitRate, metrics),
            CreateSectionMetric(SectionHitRateAt1MetricName, MetricFamily.HitRate, 1, metrics.SectionMetrics.HitRateAt1, metrics.SectionMetrics),
            CreateMetric(MrrMetricName(primaryCutoff), MetricFamily.Mrr, primaryCutoff, rankingAtPrimaryCutoff.MeanReciprocalRank, metrics),
            CreateSectionMetric(SectionMrrMetricName(primaryCutoff), MetricFamily.Mrr, primaryCutoff, metrics.SectionMetrics.MeanReciprocalRankAtK, metrics.SectionMetrics),
            CreateMetric(MapMetricName(primaryCutoff), MetricFamily.Map, primaryCutoff, rankingAtPrimaryCutoff.MeanAveragePrecision, metrics),
            CreateSectionMetric(SectionMapMetricName(primaryCutoff), MetricFamily.Map, primaryCutoff, metrics.SectionMetrics.MeanAveragePrecisionAtK, metrics.SectionMetrics),
            CreateMetric(NdcgMetricName(primaryCutoff), MetricFamily.Ndcg, primaryCutoff, rankingAtPrimaryCutoff.NormalizedDiscountedCumulativeGain, metrics),
            CreateSectionMetric(SectionNdcgMetricName(primaryCutoff), MetricFamily.Ndcg, primaryCutoff, metrics.SectionMetrics.NormalizedDiscountedCumulativeGainAtK, metrics.SectionMetrics),
        ];
    }

    private static NumericMetric CreateMetric(string name, MetricFamily family, int cutoff, double value, SearchQueryMetrics metrics)
    {
        var roundedValue = RoundScore(value);
        return new NumericMetric(name, roundedValue, CreateMetricReason(name))
        {
            Interpretation = new EvaluationMetricInterpretation(
                GetRating(family, roundedValue),
                failed: false,
                reason: CreateInterpretationReason(family, cutoff, roundedValue, metrics)),
        };
    }

    private static NumericMetric CreateRMetric(string name, MetricFamily family, double value, int expectedCount, int matchedCount, bool sectionLevel, bool failedWhenIncomplete = false)
    {
        var roundedValue = RoundScore(value);
        return new NumericMetric(name, roundedValue, CreateMetricReason(name))
        {
            Interpretation = new EvaluationMetricInterpretation(
                GetRating(family, roundedValue),
                failed: failedWhenIncomplete && matchedCount < expectedCount,
                reason: CreateRInterpretationReason(family, roundedValue, expectedCount, matchedCount, sectionLevel)),
        };
    }

    private static NumericMetric CreateSectionMetric(string name, MetricFamily family, int cutoff, double value, SearchSectionMetrics metrics)
    {
        var roundedValue = RoundScore(value);
        return new NumericMetric(name, roundedValue, CreateMetricReason(name))
        {
            Interpretation = new EvaluationMetricInterpretation(
                GetRating(family, roundedValue),
                failed: false,
                reason: CreateSectionInterpretationReason(family, cutoff, roundedValue, metrics)),
        };
    }


    private static NumericMetric CreateScoreMetric(SearchQueryMetrics metrics)
    {
        var value = metrics.ScoreAverage is null ? 0 : RoundScore(metrics.ScoreAverage.Value);
        var rating = metrics.ScoreAverage is null ? EvaluationRating.Inconclusive : EvaluationRating.Unknown;

        return new NumericMetric(ScoreAverageMetricName, value, CreateMetricReason(ScoreAverageMetricName))
        {
            Diagnostics = CreateScoreDiagnostics(metrics),
            Interpretation = new EvaluationMetricInterpretation(
                rating,
                failed: false,
                reason: CreateScoreInterpretationReason(value, metrics)),
        };
    }

    private static string CreateMetricReason(string name)
    {
        if (name == RecallAtRMetricName) return "Recall@R is the share of expected evidence chunks found within the first R retrieved chunks, where R is the number of expected evidence chunks for the case. Read 1.000 as all required evidence found within the evidence budget, 0.500 as half found, and 0.000 as none found. This is the primary retrieval gate because the answer step cannot use evidence that retrieval missed.";
        if (name == SectionRecallAtRMetricName) return "SectionRecall@R repeats Recall@R after collapsing expected chunks by source path and heading. Use it when several expected chunks come from the same note section: it shows whether retrieval reached the right section even if chunk-level matching over-penalizes sibling chunks. Read 1.000 as every expected section reached, and 0.000 as no expected section reached.";
        if (name == SectionHitRateAt1MetricName) return "SectionHitRate@1 checks whether the first result lands in any expected source section after section deduplication. Read 1.000 as the top result is from the right section and 0.000 as the top result starts in the wrong section.";
        if (name.StartsWith("SectionMRRAt", StringComparison.Ordinal)) return "SectionMRR@10 is reciprocal rank for the first matching expected section after section deduplication. Read 1.000 as the first result is from the right section, 0.500 as the first matching section is rank 2, and 0.000 as no expected section appears in the top-10.";
        if (name.StartsWith("SectionMAPAt", StringComparison.Ordinal)) return "SectionMAP@10 averages precision at each rank where a new expected section appears. It rewards finding multiple expected sections early; 1.000 means all expected sections appear before any off-section result within top-10, and 0.000 means none appear.";
        if (name.StartsWith("SectionNDCGAt", StringComparison.Ordinal)) return "SectionNDCG@10 measures section-level ranking quality with logarithmic rank discount. Read 1.000 as expected sections are ordered ideally near the top, lower values as expected sections appear later, and 0.000 as none appear in top-10.";

        var family = GetMetricFamily(name);
        return family switch
        {
            MetricFamily.HitRate => "HitRate@1 checks whether the first retrieved chunk is credited against expected evidence. Read 1.000 as the top result is immediately useful and 0.000 as the top result is not credited.",
            MetricFamily.Mrr => "MRR@10 is reciprocal rank for the first credited evidence chunk. Read 1.000 as the first result is relevant, 0.500 as the first relevant result is rank 2, 0.100 as rank 10, and 0.000 as no relevant chunk appears in top-10.",
            MetricFamily.Map => "MAP@10 averages precision at each rank where credited evidence appears. It rewards retrieving multiple expected evidence chunks early; 1.000 means all expected chunks appear before irrelevant chunks within top-10, and 0.000 means none appear.",
            MetricFamily.Ndcg => "NDCG@10 measures ranking quality with logarithmic rank discount. Read 1.000 as expected evidence is ordered ideally near the top, lower values as expected evidence appears later, and 0.000 as no expected evidence appears in top-10.",
            _ when name == ScoreAverageMetricName => $"Diagnostic only: average raw returned score across scored retrieved chunks. This is useful for comparing scorer behavior inside one reranker setup, not as a universal retrieval-quality score. {ScoreScaleGuidance}",
            _ => name,
        };
    }

    private static string CreateRInterpretationReason(MetricFamily family, double value, int expectedCount, int matchedCount, bool sectionLevel)
    {
        var rating = GetRating(family, value);
        var noun = sectionLevel ? "expected sections" : "expected evidence items";

        return $"Score {FormatNumber(value)} ({rating}): matched {matchedCount}/{expectedCount} {noun} within top-{expectedCount}.";
    }

    private static string CreateSectionInterpretationReason(MetricFamily family, int cutoff, double value, SearchSectionMetrics metrics)
    {
        var rating = GetRating(family, value);

        return family switch
        {
            MetricFamily.HitRate => value > 0
                ? $"Score {FormatNumber(1)} ({rating}): the first result matched an expected section."
                : $"Score {FormatNumber(0)} ({rating}): the first result did not match an expected section.",
            MetricFamily.Mrr => value == 0
                ? $"Score {FormatNumber(0)} ({rating}): no retrieved section matched the expected sections."
                : $"Score {FormatNumber(value)} ({rating}): first matching section appeared within top-{cutoff}.",
            MetricFamily.Map => $"Score {FormatNumber(value)} ({rating}): section-level average precision within top-{cutoff}; section Recall@R is {FormatNumber(metrics.RecallAtR)}.",
            MetricFamily.Ndcg => $"Score {FormatNumber(value)} ({rating}): section-level discounted ranking quality within top-{cutoff}; ideal score is 1.",
            _ => $"{family}: {FormatNumber(value)}",
        };
    }

    private static string CreateInterpretationReason(MetricFamily family, int cutoff, double value, SearchQueryMetrics metrics)
    {
        var diagnostics = metrics.Diagnostics;
        var ranking = metrics.RankingMetrics[cutoff];
        var matchesAtCutoff = diagnostics.Matches.Where(match => match.Rank <= cutoff).ToArray();
        var firstRelevantRank = matchesAtCutoff.FirstOrDefault(match => match.IsRelevant)?.Rank;
        var rating = GetRating(family, value);

        return family switch
        {
            MetricFamily.HitRate => value > 0
                ? $"Score {FormatNumber(1)} ({rating}): at least one expected evidence item appeared within top-{cutoff}."
                : $"Score {FormatNumber(0)} ({rating}): no expected evidence item appeared within top-{cutoff}.",
            MetricFamily.Mrr => firstRelevantRank is null
                ? $"Score {FormatNumber(0)} ({rating}): no retrieved chunk matched the expected evidence."
                : $"Score {FormatNumber(value)} ({rating}): first relevant evidence was at rank {firstRelevantRank}.",
            MetricFamily.Map => $"Score {FormatNumber(value)} ({rating}): average precision within top-{cutoff}; recall at this cutoff is {FormatNumber(ranking.Recall)}.",
            MetricFamily.Ndcg => $"Score {FormatNumber(value)} ({rating}): discounted ranking quality within top-{cutoff}; ideal score is 1.",
            _ => $"{family}: {FormatNumber(value)}",
        };
    }


    private static string CreateScoreInterpretationReason(double value, SearchQueryMetrics metrics)
    {
        if (metrics.ScoreAverage is null)
        {
            return $"Score {FormatNumber(0)} (Inconclusive): no retrieved chunks included returned scores.";
        }

        return $"Score {FormatNumber(value)} (Diagnostic): average raw score across scored retrieved chunks. {ScoreScaleGuidance}";
    }

    private static EvaluationDiagnostic[] CreateScoreDiagnostics(SearchQueryMetrics metrics) =>
    [
        EvaluationDiagnostic.Informational($"CreditedScoreAverage={FormatOptionalNumber(metrics.CreditedScoreAverage)}"),
        EvaluationDiagnostic.Informational($"UncreditedScoreAverage={FormatOptionalNumber(metrics.UncreditedScoreAverage)}"),
        EvaluationDiagnostic.Informational($"CreditedToUncreditedSameSourceScoreGap={FormatOptionalNumber(metrics.CreditedToUncreditedSameSourceScoreGap)}"),
    ];

    private static EvaluationDiagnostic[] CreateScoreDiagnostics(SearchReport report) =>
    [
        EvaluationDiagnostic.Informational($"CreditedScoreAverage={FormatNumber(report.CreditedScoreAverage)}"),
        EvaluationDiagnostic.Informational($"UncreditedScoreAverage={FormatNumber(report.UncreditedScoreAverage)}"),
        EvaluationDiagnostic.Informational($"CreditedToUncreditedSameSourceScoreGap={FormatNumber(report.CreditedToUncreditedSameSourceScoreGap)}"),
    ];

    private static EvaluationRating GetRating(MetricFamily family, double value)
        => family switch
        {
            MetricFamily.Recall or MetricFamily.HitRate or MetricFamily.Mrr or MetricFamily.Map or MetricFamily.Ndcg => value switch
            {
                >= 1 => EvaluationRating.Exceptional,
                >= 0.8 => EvaluationRating.Good,
                >= 0.5 => EvaluationRating.Average,
                > 0 => EvaluationRating.Poor,
                _ => EvaluationRating.Unacceptable,
            },
            _ => EvaluationRating.Unknown,
        };

    private static EvaluationRating GetEmptyResultRateRating(double value)
        => value switch
        {
            <= 0 => EvaluationRating.Exceptional,
            <= 0.05 => EvaluationRating.Good,
            <= 0.2 => EvaluationRating.Average,
            < 1 => EvaluationRating.Poor,
            _ => EvaluationRating.Unacceptable,
        };

    private static IReadOnlyList<string> CreateRankingMetricNames(int primaryCutoff) =>
    [
        RecallAtRMetricName,
        SectionRecallAtRMetricName,
        HitRateMetricName(1),
        SectionHitRateAt1MetricName,
        MrrMetricName(primaryCutoff),
        SectionMrrMetricName(primaryCutoff),
        MapMetricName(primaryCutoff),
        SectionMapMetricName(primaryCutoff),
        NdcgMetricName(primaryCutoff),
        SectionNdcgMetricName(primaryCutoff),
        ScoreAverageMetricName,
    ];

    private static string HitRateMetricName(int cutoff) => $"HitRateAt{cutoff}";

    private static string MrrMetricName(int cutoff) => $"MRRAt{cutoff}";

    private static string MapMetricName(int cutoff) => $"MAPAt{cutoff}";

    private static string NdcgMetricName(int cutoff) => $"NDCGAt{cutoff}";

    private static string SectionMrrMetricName(int cutoff) => $"SectionMRRAt{cutoff}";

    private static string SectionMapMetricName(int cutoff) => $"SectionMAPAt{cutoff}";

    private static string SectionNdcgMetricName(int cutoff) => $"SectionNDCGAt{cutoff}";

    private static MetricFamily GetMetricFamily(string name)
    {
        if (name.StartsWith("HitRateAt", StringComparison.Ordinal)) return MetricFamily.HitRate;
        if (name.StartsWith("MRRAt", StringComparison.Ordinal)) return MetricFamily.Mrr;
        if (name.StartsWith("MAPAt", StringComparison.Ordinal)) return MetricFamily.Map;
        if (name.StartsWith("NDCGAt", StringComparison.Ordinal)) return MetricFamily.Ndcg;
        if (name == RecallAtRMetricName || name == SectionRecallAtRMetricName) return MetricFamily.Recall;
        if (name == SectionHitRateAt1MetricName) return MetricFamily.HitRate;
        if (name.StartsWith("SectionMRRAt", StringComparison.Ordinal)) return MetricFamily.Mrr;
        if (name.StartsWith("SectionMAPAt", StringComparison.Ordinal)) return MetricFamily.Map;
        if (name.StartsWith("SectionNDCGAt", StringComparison.Ordinal)) return MetricFamily.Ndcg;

        return MetricFamily.Unknown;
    }

    private static string FormatNumber(double value)
        => value.ToString("0.000", CultureInfo.InvariantCulture);

    private static string FormatOptionalNumber(double? value)
        => value is null ? "n/a" : FormatNumber(RoundScore(value.Value));

    private static string FormatConfidenceInterval(SearchConfidenceInterval confidenceInterval)
        => $"Bootstrap 95% CI: [{FormatNumber(confidenceInterval.Lower)}, {FormatNumber(confidenceInterval.Upper)}].";

    private static double RoundScore(double value)
        => Math.Round(value, 3);

    private static NumericMetric CreateFailedMetric(string name, string reason)
        => new(name, 0, reason)
        {
            Interpretation = new EvaluationMetricInterpretation(
                EvaluationRating.Inconclusive,
                failed: true,
                reason: reason),
        };

    private enum MetricFamily
    {
        Unknown,
        Recall,
        HitRate,
        Mrr,
        Map,
        Ndcg,
    }
}
