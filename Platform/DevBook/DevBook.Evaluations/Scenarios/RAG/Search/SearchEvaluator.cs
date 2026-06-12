namespace DevBook.Evaluations.Scenarios.RAG.Search;

using System.Globalization;
using DevBook.Data.Models;
using DevBook.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Evaluates search results.
/// </summary>
public sealed class SearchEvaluator : IEvaluator
{
    private const string EmptyResultRateMetricName = "EmptyResultRate";
    private const string ScoreAverageMetricName = "ScoreAverage";

    /// <summary>
    /// Gets evaluation metric names.
    /// </summary>
    public IReadOnlyCollection<string> EvaluationMetricNames { get; } = CreateRankingMetricNames();

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
            return ValueTask.FromResult(new EvaluationResult(CreateFailedMetric(RecallMetricName(SearchMetricCalculator.PrimaryCutoffValue), "SearchEvaluationContext not provided.")));
        }

        var metrics = SearchMetricCalculator.ScoreQuery(context.Prediction, context.TopK);
        var rankingMetrics = CreateRankingMetrics(metrics).ToArray();

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
                group => CreateSummaryMetrics(SearchMetricCalculator.Evaluate(group.ToArray(), topK), group.Key.ChunkingStrategy, group.Key.RerankingStrategy));
    }

    private static IEnumerable<SummaryMetric> CreateSummaryMetrics(SearchReport report, ChunkingStrategyKind chunkingStrategy, RerankingStrategyKind rerankingStrategy) =>
    [
        new SummaryMetric("SampleCount", report.QueryCount, $"Total RAG search cases evaluated over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.Count),
        ..CreateSummaryRankingMetrics(report, chunkingStrategy, rerankingStrategy),
        new SummaryMetric(EmptyResultRateMetricName, report.EmptyResultRate, $"Share of RAG search cases with no retrieved {chunkingStrategy} chunks after {rerankingStrategy} reranking.", SummaryMetricKind.Percentage, GetEmptyResultRateRating(report.EmptyResultRate)),
        new SummaryMetric(ScoreAverageMetricName, report.ScoreAverage, $"Diagnostic only: average returned score across all scored retrieved {chunkingStrategy} chunks with {rerankingStrategy} reranking. Related diagnostics: CreditedScoreAverage={FormatNumber(report.CreditedScoreAverage)}, UncreditedScoreAverage={FormatNumber(report.UncreditedScoreAverage)}, CreditedToUncreditedSameSourceScoreGap={FormatNumber(report.CreditedToUncreditedSameSourceScoreGap)}. Compare only within the same reranker and scorer scale.", SummaryMetricKind.PlainNumber, EvaluationRating.Unknown),
    ];

    private static IEnumerable<SummaryMetric> CreateSummaryRankingMetrics(
        SearchReport report,
        ChunkingStrategyKind chunkingStrategy,
        RerankingStrategyKind rerankingStrategy)
    {
        var rankingAt1 = report.RankingMetrics[1];
        var rankingAt5 = report.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue];
        var rankingAt10 = report.RankingMetrics[10];

        return
        [
            new SummaryMetric(RecallMetricName(1), rankingAt1.Recall, $"Average Recall@1 across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt1.ConfidenceIntervals.Recall)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.Recall, rankingAt1.Recall)),
            new SummaryMetric(RecallMetricName(SearchMetricCalculator.PrimaryCutoffValue), rankingAt5.Recall, $"Average Recall@{SearchMetricCalculator.PrimaryCutoffValue} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt5.ConfidenceIntervals.Recall)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.Recall, rankingAt5.Recall)),
            new SummaryMetric(RecallMetricName(10), rankingAt10.Recall, $"Average Recall@10 across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt10.ConfidenceIntervals.Recall)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.Recall, rankingAt10.Recall)),
            new SummaryMetric(PrecisionMetricName(1), rankingAt1.Precision, $"Average annotated Precision@1 across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking; sparse expected evidence can cap this below 1 even when the needed evidence is found. {FormatConfidenceInterval(rankingAt1.ConfidenceIntervals.Precision)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.Precision, rankingAt1.Precision)),
            new SummaryMetric(PrecisionMetricName(SearchMetricCalculator.PrimaryCutoffValue), rankingAt5.Precision, $"Average annotated Precision@{SearchMetricCalculator.PrimaryCutoffValue} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking; sparse expected evidence can cap this below 1 even when the needed evidence is found. {FormatConfidenceInterval(rankingAt5.ConfidenceIntervals.Precision)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.Precision, rankingAt5.Precision)),
            new SummaryMetric(PrecisionMetricName(10), rankingAt10.Precision, $"Average annotated Precision@10 across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking; sparse expected evidence can cap this below 1 even when the needed evidence is found. {FormatConfidenceInterval(rankingAt10.ConfidenceIntervals.Precision)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.Precision, rankingAt10.Precision)),
            new SummaryMetric(HitRateMetricName(1), rankingAt1.HitRate, $"Average HitRate@1 across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt1.ConfidenceIntervals.HitRate)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.HitRate, rankingAt1.HitRate)),
            new SummaryMetric(HitRateMetricName(SearchMetricCalculator.PrimaryCutoffValue), rankingAt5.HitRate, $"Average HitRate@{SearchMetricCalculator.PrimaryCutoffValue} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt5.ConfidenceIntervals.HitRate)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.HitRate, rankingAt5.HitRate)),
            new SummaryMetric(HitRateMetricName(10), rankingAt10.HitRate, $"Average HitRate@10 across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt10.ConfidenceIntervals.HitRate)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.HitRate, rankingAt10.HitRate)),
            new SummaryMetric(MrrMetricName(SearchMetricCalculator.PrimaryCutoffValue), rankingAt5.MeanReciprocalRank, $"Mean reciprocal rank capped at @{SearchMetricCalculator.PrimaryCutoffValue} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt5.ConfidenceIntervals.MeanReciprocalRank)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Mrr, rankingAt5.MeanReciprocalRank)),
            new SummaryMetric(MapMetricName(SearchMetricCalculator.PrimaryCutoffValue), rankingAt5.MeanAveragePrecision, $"Mean Average Precision@{SearchMetricCalculator.PrimaryCutoffValue} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt5.ConfidenceIntervals.MeanAveragePrecision)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Map, rankingAt5.MeanAveragePrecision)),
            new SummaryMetric(NdcgMetricName(SearchMetricCalculator.PrimaryCutoffValue), rankingAt5.NormalizedDiscountedCumulativeGain, $"Mean nDCG@{SearchMetricCalculator.PrimaryCutoffValue} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(rankingAt5.ConfidenceIntervals.NormalizedDiscountedCumulativeGain)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Ndcg, rankingAt5.NormalizedDiscountedCumulativeGain)),
        ];
    }

    private static IEnumerable<NumericMetric> CreateRankingMetrics(SearchQueryMetrics metrics)
    {
        var rankingAt1 = metrics.RankingMetrics[1];
        var rankingAt5 = metrics.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue];
        var rankingAt10 = metrics.RankingMetrics[10];

        return
        [
            CreateMetric(RecallMetricName(1), MetricFamily.Recall, 1, rankingAt1.Recall, metrics),
            CreateMetric(RecallMetricName(SearchMetricCalculator.PrimaryCutoffValue), MetricFamily.Recall, SearchMetricCalculator.PrimaryCutoffValue, rankingAt5.Recall, metrics),
            CreateMetric(RecallMetricName(10), MetricFamily.Recall, 10, rankingAt10.Recall, metrics),
            CreateMetric(PrecisionMetricName(1), MetricFamily.Precision, 1, rankingAt1.Precision, metrics),
            CreateMetric(PrecisionMetricName(SearchMetricCalculator.PrimaryCutoffValue), MetricFamily.Precision, SearchMetricCalculator.PrimaryCutoffValue, rankingAt5.Precision, metrics),
            CreateMetric(PrecisionMetricName(10), MetricFamily.Precision, 10, rankingAt10.Precision, metrics),
            CreateMetric(HitRateMetricName(1), MetricFamily.HitRate, 1, rankingAt1.HitRate, metrics),
            CreateMetric(HitRateMetricName(SearchMetricCalculator.PrimaryCutoffValue), MetricFamily.HitRate, SearchMetricCalculator.PrimaryCutoffValue, rankingAt5.HitRate, metrics),
            CreateMetric(HitRateMetricName(10), MetricFamily.HitRate, 10, rankingAt10.HitRate, metrics),
            CreateMetric(MrrMetricName(SearchMetricCalculator.PrimaryCutoffValue), MetricFamily.Mrr, SearchMetricCalculator.PrimaryCutoffValue, rankingAt5.MeanReciprocalRank, metrics),
            CreateMetric(MapMetricName(SearchMetricCalculator.PrimaryCutoffValue), MetricFamily.Map, SearchMetricCalculator.PrimaryCutoffValue, rankingAt5.MeanAveragePrecision, metrics),
            CreateMetric(NdcgMetricName(SearchMetricCalculator.PrimaryCutoffValue), MetricFamily.Ndcg, SearchMetricCalculator.PrimaryCutoffValue, rankingAt5.NormalizedDiscountedCumulativeGain, metrics),
        ];
    }

    private static NumericMetric CreateMetric(string name, MetricFamily family, int cutoff, double value, SearchQueryMetrics metrics)
    {
        var failed = family == MetricFamily.Recall && cutoff == SearchMetricCalculator.PrimaryCutoffValue && value < 1;
        return new NumericMetric(name, value, CreateMetricReason(name))
        {
            Interpretation = new EvaluationMetricInterpretation(
                GetRating(family, value),
                failed: failed,
                reason: CreateInterpretationReason(family, cutoff, value, metrics)),
        };
    }


    private static NumericMetric CreateScoreMetric(SearchQueryMetrics metrics)
    {
        var value = metrics.ScoreAverage is null ? 0 : RoundScore(metrics.ScoreAverage.Value);
        var rating = metrics.ScoreAverage is null ? EvaluationRating.Inconclusive : EvaluationRating.Unknown;

        return new NumericMetric(ScoreAverageMetricName, value, CreateMetricReason(ScoreAverageMetricName))
        {
            Interpretation = new EvaluationMetricInterpretation(
                rating,
                failed: false,
                reason: CreateScoreInterpretationReason(value, metrics)),
        };
    }

    private static string CreateMetricReason(string name)
    {
        var family = GetMetricFamily(name);
        return family switch
        {
            MetricFamily.Recall => "Recall@k measures evidence coverage: matched expected evidence divided by expected evidence. High means required evidence was present in top-k; low means generation is capped by missing context.",
            MetricFamily.Precision => "Precision@k measures annotated context purity: relevant retrieved chunks divided by retrieved chunks. With sparse expected evidence, precision can look low even when the needed evidence is found.",
            MetricFamily.HitRate => "HitRate@k measures whether at least one expected evidence item appeared in top-k.",
            MetricFamily.Mrr => "MRR@k measures ranking quality: 1 divided by the rank of the first relevant evidence chunk within k. High means useful evidence appears early; 0 means no relevant evidence appeared in top-k.",
            MetricFamily.Map => "MAP@k averages precision at each relevant result rank within k, then averages across queries. It rewards retrieving multiple expected evidence items early.",
            MetricFamily.Ndcg => "nDCG@k measures discounted ranking quality against the ideal ordering of expected evidence. Range is 0 to 1 for binary relevance here.",
            _ when name == ScoreAverageMetricName => "Diagnostic only: average returned score across all scored retrieved chunks in top-k. Related score diagnostics are included in the interpretation reason.",
            _ => name,
        };
    }

    private static string CreateInterpretationReason(MetricFamily family, int cutoff, double value, SearchQueryMetrics metrics)
    {
        var diagnostics = metrics.Diagnostics;
        var ranking = metrics.RankingMetrics[cutoff];
        var matchesAtCutoff = diagnostics.Matches.Where(match => match.Rank <= cutoff).ToArray();
        var matchedExpectedCount = matchesAtCutoff.Count(match => match.IsRelevant);
        var retrievedAtCutoff = Math.Min(cutoff, diagnostics.RetrievedCount);
        var firstRelevantRank = matchesAtCutoff.FirstOrDefault(match => match.IsRelevant)?.Rank;
        var rating = GetRating(family, value);

        return family switch
        {
            MetricFamily.Recall => $"Score {FormatNumber(value)} ({rating}): matched {matchedExpectedCount}/{diagnostics.ExpectedCount} expected evidence items within top-{cutoff}.",
            MetricFamily.Precision => $"Score {FormatNumber(value)} ({rating}): {matchedExpectedCount}/{retrievedAtCutoff} retrieved chunks counted as relevant evidence within top-{cutoff}.",
            MetricFamily.HitRate => value > 0
                ? $"Score 1 ({rating}): at least one expected evidence item appeared within top-{cutoff}."
                : $"Score 0 ({rating}): no expected evidence item appeared within top-{cutoff}.",
            MetricFamily.Mrr => firstRelevantRank is null
                ? $"Score 0 ({rating}): no retrieved chunk matched the expected evidence."
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
            return "Score 0 (Inconclusive): no retrieved chunks included returned scores.";
        }

        return $"Score {FormatNumber(value)} (Diagnostic): average score across scored retrieved chunks. Related diagnostics: CreditedScoreAverage={FormatOptionalNumber(metrics.CreditedScoreAverage)}, UncreditedScoreAverage={FormatOptionalNumber(metrics.UncreditedScoreAverage)}, CreditedToUncreditedSameSourceScoreGap={FormatOptionalNumber(metrics.CreditedToUncreditedSameSourceScoreGap)}. Compare only within the same reranker scale.";
    }

    private static EvaluationRating GetRating(MetricFamily family, double value)
        => family switch
        {
            MetricFamily.Recall => value switch
            {
                >= 1 => EvaluationRating.Exceptional,
                >= 0.8 => EvaluationRating.Good,
                >= 0.5 => EvaluationRating.Average,
                > 0 => EvaluationRating.Poor,
                _ => EvaluationRating.Unacceptable,
            },
            MetricFamily.Precision => value switch
            {
                >= 0.8 => EvaluationRating.Exceptional,
                >= 0.5 => EvaluationRating.Good,
                >= 0.2 => EvaluationRating.Average,
                > 0 => EvaluationRating.Poor,
                _ => EvaluationRating.Unacceptable,
            },
            MetricFamily.HitRate or MetricFamily.Mrr or MetricFamily.Map or MetricFamily.Ndcg => value switch
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

    private static IReadOnlyList<string> CreateRankingMetricNames() =>
    [
        RecallMetricName(1),
        RecallMetricName(SearchMetricCalculator.PrimaryCutoffValue),
        RecallMetricName(10),
        PrecisionMetricName(1),
        PrecisionMetricName(SearchMetricCalculator.PrimaryCutoffValue),
        PrecisionMetricName(10),
        HitRateMetricName(1),
        HitRateMetricName(SearchMetricCalculator.PrimaryCutoffValue),
        HitRateMetricName(10),
        MrrMetricName(SearchMetricCalculator.PrimaryCutoffValue),
        MapMetricName(SearchMetricCalculator.PrimaryCutoffValue),
        NdcgMetricName(SearchMetricCalculator.PrimaryCutoffValue),
        ScoreAverageMetricName,
    ];

    private static string RecallMetricName(int cutoff) => $"RecallAt{cutoff}";

    private static string PrecisionMetricName(int cutoff) => $"PrecisionAt{cutoff}";

    private static string HitRateMetricName(int cutoff) => $"HitRateAt{cutoff}";

    private static string MrrMetricName(int cutoff) => $"MRRAt{cutoff}";

    private static string MapMetricName(int cutoff) => $"MAPAt{cutoff}";

    private static string NdcgMetricName(int cutoff) => $"NDCGAt{cutoff}";

    private static MetricFamily GetMetricFamily(string name)
    {
        if (name.StartsWith("RecallAt", StringComparison.Ordinal)) return MetricFamily.Recall;
        if (name.StartsWith("PrecisionAt", StringComparison.Ordinal)) return MetricFamily.Precision;
        if (name.StartsWith("HitRateAt", StringComparison.Ordinal)) return MetricFamily.HitRate;
        if (name.StartsWith("MRRAt", StringComparison.Ordinal)) return MetricFamily.Mrr;
        if (name.StartsWith("MAPAt", StringComparison.Ordinal)) return MetricFamily.Map;
        if (name.StartsWith("NDCGAt", StringComparison.Ordinal)) return MetricFamily.Ndcg;

        return MetricFamily.Unknown;
    }

    private static string FormatNumber(double value)
        => value.ToString("0.###", CultureInfo.InvariantCulture);

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
        Precision,
        HitRate,
        Mrr,
        Map,
        Ndcg,
    }
}
