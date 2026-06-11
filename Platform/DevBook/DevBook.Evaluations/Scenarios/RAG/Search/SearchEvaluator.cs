namespace DevBook.Evaluations.Scenarios.RAG.Search;

using System.Globalization;
using DevBook.Data.Models;
using DevBook.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class SearchEvaluator : IEvaluator
{
    private const string EmptyResultRateMetricName = "EmptyResultRate";
    private const string ScoreAverageMetricName = "ScoreAverage";
    private const string CreditedScoreAverageMetricName = "CreditedScoreAverage";
    private const string UncreditedScoreAverageMetricName = "UncreditedScoreAverage";
    private const string CreditedToUncreditedSameSourceScoreGapMetricName = "CreditedToUncreditedSameSourceScoreGap";

    public IReadOnlyCollection<string> EvaluationMetricNames { get; } =
    [
        ..CreateRankingMetricNames(),
        ScoreAverageMetricName,
        CreditedScoreAverageMetricName,
        UncreditedScoreAverageMetricName,
        CreditedToUncreditedSameSourceScoreGapMetricName,
    ];

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
        var rankingMetrics = SearchMetricCalculator.RankingCutoffs
            .SelectMany(cutoff => CreateRankingMetrics(cutoff, metrics.RankingMetrics[cutoff], metrics))
            .ToArray();

        return ValueTask.FromResult(new EvaluationResult([
            ..rankingMetrics,
            CreateScoreMetric(ScoreAverageMetricName, metrics.ScoreAverage, metrics),
            CreateScoreMetric(CreditedScoreAverageMetricName, metrics.CreditedScoreAverage, metrics),
            CreateScoreMetric(UncreditedScoreAverageMetricName, metrics.UncreditedScoreAverage, metrics),
            CreateScoreMetric(CreditedToUncreditedSameSourceScoreGapMetricName, metrics.CreditedToUncreditedSameSourceScoreGap, metrics),
        ]));
    }

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
        ..SearchMetricCalculator.RankingCutoffs.SelectMany(cutoff => CreateSummaryRankingMetrics(report, chunkingStrategy, rerankingStrategy, cutoff)),
        new SummaryMetric(EmptyResultRateMetricName, report.EmptyResultRate, $"Share of RAG search cases with no retrieved {chunkingStrategy} chunks after {rerankingStrategy} reranking.", SummaryMetricKind.Percentage, GetEmptyResultRateRating(report.EmptyResultRate)),
        new SummaryMetric(ScoreAverageMetricName, report.ScoreAverage, $"Diagnostic only: average returned score across all scored retrieved {chunkingStrategy} chunks with {rerankingStrategy} reranking. Compare only within the same reranker and scorer scale.", SummaryMetricKind.PlainNumber, EvaluationRating.Unknown),
        new SummaryMetric(CreditedScoreAverageMetricName, report.CreditedScoreAverage, $"Diagnostic only: average returned score across retrieved {chunkingStrategy} chunks credited against expected evidence with {rerankingStrategy} reranking. Compare only within the same reranker and scorer scale.", SummaryMetricKind.PlainNumber, EvaluationRating.Unknown),
        new SummaryMetric(UncreditedScoreAverageMetricName, report.UncreditedScoreAverage, $"Diagnostic only: average returned score across retrieved {chunkingStrategy} chunks not credited by the sparse golden dataset with {rerankingStrategy} reranking. Compare only within the same reranker and scorer scale.", SummaryMetricKind.PlainNumber, EvaluationRating.Unknown),
        new SummaryMetric(CreditedToUncreditedSameSourceScoreGapMetricName, report.CreditedToUncreditedSameSourceScoreGap, $"Diagnostic only: average score difference between the first credited result and the highest-scored uncredited same-source {chunkingStrategy} chunk with {rerankingStrategy} reranking.", SummaryMetricKind.PlainNumber, EvaluationRating.Unknown),
    ];

    private static IEnumerable<SummaryMetric> CreateSummaryRankingMetrics(
        SearchReport report,
        ChunkingStrategyKind chunkingStrategy,
        RerankingStrategyKind rerankingStrategy,
        int cutoff)
    {
        var ranking = report.RankingMetrics[cutoff];

        return
        [
            new SummaryMetric(RecallMetricName(cutoff), ranking.Recall, $"Average Recall@{cutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(ranking.ConfidenceIntervals.Recall)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.Recall, ranking.Recall)),
            new SummaryMetric(PrecisionMetricName(cutoff), ranking.Precision, $"Average annotated Precision@{cutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking; sparse expected evidence can cap this below 1 even when the needed evidence is found. {FormatConfidenceInterval(ranking.ConfidenceIntervals.Precision)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.Precision, ranking.Precision)),
            new SummaryMetric(HitRateMetricName(cutoff), ranking.HitRate, $"Average HitRate@{cutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(ranking.ConfidenceIntervals.HitRate)}", SummaryMetricKind.Percentage, GetRating(MetricFamily.HitRate, ranking.HitRate)),
            new SummaryMetric(MrrMetricName(cutoff), ranking.MeanReciprocalRank, $"Mean reciprocal rank capped at @{cutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(ranking.ConfidenceIntervals.MeanReciprocalRank)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Mrr, ranking.MeanReciprocalRank)),
            new SummaryMetric(MapMetricName(cutoff), ranking.MeanAveragePrecision, $"Mean Average Precision@{cutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(ranking.ConfidenceIntervals.MeanAveragePrecision)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Map, ranking.MeanAveragePrecision)),
            new SummaryMetric(NdcgMetricName(cutoff), ranking.NormalizedDiscountedCumulativeGain, $"Mean nDCG@{cutoff} across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking. {FormatConfidenceInterval(ranking.ConfidenceIntervals.NormalizedDiscountedCumulativeGain)}", SummaryMetricKind.PlainNumber, GetRating(MetricFamily.Ndcg, ranking.NormalizedDiscountedCumulativeGain)),
        ];
    }

    private static IEnumerable<NumericMetric> CreateRankingMetrics(int cutoff, SearchRankingMetrics ranking, SearchQueryMetrics metrics) =>
    [
        CreateMetric(RecallMetricName(cutoff), MetricFamily.Recall, cutoff, ranking.Recall, metrics),
        CreateMetric(PrecisionMetricName(cutoff), MetricFamily.Precision, cutoff, ranking.Precision, metrics),
        CreateMetric(HitRateMetricName(cutoff), MetricFamily.HitRate, cutoff, ranking.HitRate, metrics),
        CreateMetric(MrrMetricName(cutoff), MetricFamily.Mrr, cutoff, ranking.MeanReciprocalRank, metrics),
        CreateMetric(MapMetricName(cutoff), MetricFamily.Map, cutoff, ranking.MeanAveragePrecision, metrics),
        CreateMetric(NdcgMetricName(cutoff), MetricFamily.Ndcg, cutoff, ranking.NormalizedDiscountedCumulativeGain, metrics),
    ];

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

    private static NumericMetric CreateScoreMetric(string name, double? value, SearchQueryMetrics metrics)
    {
        var metricValue = value is null ? 0 : RoundScore(value.Value);
        var rating = value is null ? EvaluationRating.Inconclusive : EvaluationRating.Unknown;

        return new NumericMetric(name, metricValue, CreateMetricReason(name))
        {
            Interpretation = new EvaluationMetricInterpretation(
                rating,
                failed: false,
                reason: CreateScoreInterpretationReason(name, metricValue, metrics)),
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
            _ => name switch
            {
                ScoreAverageMetricName => "Diagnostic only: average returned score across all scored retrieved chunks in top-k. Scores are scorer-scale-specific and must not be compared across rerankers.",
                CreditedScoreAverageMetricName => "Diagnostic only: average returned score across retrieved chunks credited against expected evidence. Compare only within the same reranker and score scale.",
                UncreditedScoreAverageMetricName => "Diagnostic only: average returned score across retrieved chunks not credited by the sparse golden dataset; uncredited does not mean irrelevant. Compare only within the same reranker and score scale.",
                CreditedToUncreditedSameSourceScoreGapMetricName => "Diagnostic only: first credited result score minus the highest-scored uncredited result from the same expected source path.",
                _ => name,
            },
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

    private static string CreateScoreInterpretationReason(string name, double value, SearchQueryMetrics metrics)
        => name switch
        {
            ScoreAverageMetricName => metrics.ScoreAverage is null
                ? "Score 0 (Inconclusive): no retrieved chunks included returned scores."
                : $"Score {FormatNumber(value)} (Diagnostic): average score across scored retrieved chunks; compare only within the same reranker scale.",
            CreditedScoreAverageMetricName => metrics.CreditedScoreAverage is null
                ? "Score 0 (Inconclusive): no credited retrieved chunks included returned scores."
                : $"Score {FormatNumber(value)} (Diagnostic): average score across scored credited retrieved chunks; compare only within the same reranker scale.",
            UncreditedScoreAverageMetricName => metrics.UncreditedScoreAverage is null
                ? "Score 0 (Inconclusive): no uncredited retrieved chunks included returned scores."
                : $"Score {FormatNumber(value)} (Diagnostic): average score across scored uncredited retrieved chunks; uncredited means absent from the sparse expected-evidence set, not necessarily irrelevant.",
            CreditedToUncreditedSameSourceScoreGapMetricName => metrics.CreditedToUncreditedSameSourceScoreGap is null
                ? "Score 0 (Inconclusive): no scored credited and uncredited same-source pair was available."
                : $"Score {FormatNumber(value)} (Diagnostic): credited score minus highest uncredited same-source score; descriptive only.",
            _ => $"{name}: {FormatNumber(value)}",
        };

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

    private static IReadOnlyList<string> CreateRankingMetricNames()
        => SearchMetricCalculator.RankingCutoffs
            .SelectMany(cutoff => new[]
            {
                RecallMetricName(cutoff),
                PrecisionMetricName(cutoff),
                HitRateMetricName(cutoff),
                MrrMetricName(cutoff),
                MapMetricName(cutoff),
                NdcgMetricName(cutoff),
            })
            .ToArray();

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
