namespace KnowledgeHub.Evaluations.Scenarios.RAG.Search;

using System.Globalization;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Evaluations.Common.Evaluators.SummaryGeneration;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class SearchEvaluator : IEvaluator
{
    private const string RecallAtKMetricName = "RecallAtK";
    private const string PrecisionAtKMetricName = "PrecisionAtK";
    private const string HitRateAtKMetricName = "HitRateAtK";
    private const string ReciprocalRankMetricName = "ReciprocalRank";
    private const string ScoreAverageMetricName = "ScoreAverage";
    private const string CreditedScoreAverageMetricName = "CreditedScoreAverage";
    private const string UncreditedScoreAverageMetricName = "UncreditedScoreAverage";
    private const string CreditedToUncreditedSameSourceScoreGapMetricName = "CreditedToUncreditedSameSourceScoreGap";

    public IReadOnlyCollection<string> EvaluationMetricNames { get; } =
    [
        RecallAtKMetricName,
        PrecisionAtKMetricName,
        HitRateAtKMetricName,
        ReciprocalRankMetricName,
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
            return ValueTask.FromResult(new EvaluationResult(CreateFailedMetric(RecallAtKMetricName, "SearchEvaluationContext not provided.")));
        }

        var metrics = SearchMetricCalculator.ScoreQuery(context.Prediction, context.TopK);

        return ValueTask.FromResult(new EvaluationResult([
            CreateMetric(RecallAtKMetricName, metrics.RecallAtK, metrics),
            CreateMetric(PrecisionAtKMetricName, metrics.PrecisionAtK, metrics),
            CreateMetric(HitRateAtKMetricName, metrics.HitRateAtK, metrics),
            CreateMetric(ReciprocalRankMetricName, metrics.ReciprocalRank, metrics),
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
        new SummaryMetric(RecallAtKMetricName, report.RecallAtK, $"Average Recall@k across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.Percentage, GetRating(RecallAtKMetricName, report.RecallAtK)),
        new SummaryMetric(PrecisionAtKMetricName, report.PrecisionAtK, $"Average annotated Precision@k across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking; sparse expected evidence can cap this below 1 even when the needed evidence is found.", SummaryMetricKind.Percentage, GetRating(PrecisionAtKMetricName, report.PrecisionAtK)),
        new SummaryMetric(HitRateAtKMetricName, report.HitRateAtK, $"Average HitRate@k across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking; shows how often retrieval found at least one expected evidence item.", SummaryMetricKind.Percentage, GetRating(HitRateAtKMetricName, report.HitRateAtK)),
        new SummaryMetric(ReciprocalRankMetricName, report.MeanReciprocalRank, $"Mean reciprocal rank across RAG search cases over {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.PlainNumber, GetRating(ReciprocalRankMetricName, report.MeanReciprocalRank)),
        new SummaryMetric("EmptyResultRate", report.EmptyResultRate, $"Share of RAG search cases with no retrieved {chunkingStrategy} chunks after {rerankingStrategy} reranking.", SummaryMetricKind.Percentage, GetEmptyResultRateRating(report.EmptyResultRate)),
        new SummaryMetric(ScoreAverageMetricName, report.ScoreAverage, $"Average returned score across all scored retrieved {chunkingStrategy} chunks with {rerankingStrategy} reranking.", SummaryMetricKind.PlainNumber, GetRating(ScoreAverageMetricName, report.ScoreAverage)),
        new SummaryMetric(CreditedScoreAverageMetricName, report.CreditedScoreAverage, $"Average returned score across retrieved {chunkingStrategy} chunks credited against expected evidence with {rerankingStrategy} reranking.", SummaryMetricKind.PlainNumber, GetRating(CreditedScoreAverageMetricName, report.CreditedScoreAverage)),
        new SummaryMetric(UncreditedScoreAverageMetricName, report.UncreditedScoreAverage, $"Average returned score across retrieved {chunkingStrategy} chunks not credited by the sparse golden dataset with {rerankingStrategy} reranking; high values can still indicate useful query-similar context.", SummaryMetricKind.PlainNumber, GetRating(UncreditedScoreAverageMetricName, report.UncreditedScoreAverage)),
        new SummaryMetric(CreditedToUncreditedSameSourceScoreGapMetricName, report.CreditedToUncreditedSameSourceScoreGap, $"Average score difference between the first credited result and the highest-scored uncredited same-source {chunkingStrategy} chunk with {rerankingStrategy} reranking; descriptive only because uncredited chunks may still be useful.", SummaryMetricKind.PlainNumber, GetRating(CreditedToUncreditedSameSourceScoreGapMetricName, report.CreditedToUncreditedSameSourceScoreGap)),
    ];

    private static NumericMetric CreateMetric(string name, double value, SearchQueryMetrics metrics)
    {
        var failed = name == RecallAtKMetricName && value < 1;
        var metric = new NumericMetric(name, value, CreateMetricReason(name))
        {
            Interpretation = new EvaluationMetricInterpretation(
                GetRating(name, value),
                failed: failed,
                reason: CreateInterpretationReason(name, value, metrics)),
        };

        return metric;
    }

    private static NumericMetric CreateScoreMetric(string name, double? value, SearchQueryMetrics metrics)
    {
        var metricValue = value is null ? 0 : RoundScore(value.Value);
        var rating = value is null ? EvaluationRating.Inconclusive : GetRating(name, metricValue);

        return new NumericMetric(name, metricValue, CreateMetricReason(name))
        {
            Interpretation = new EvaluationMetricInterpretation(
                rating,
                failed: false,
                reason: CreateInterpretationReason(name, metricValue, metrics)),
        };
    }

    private static string CreateMetricReason(string name)
        => name switch
        {
            RecallAtKMetricName => "Recall@k measures evidence coverage: matched expected evidence divided by expected evidence. High means required evidence was present in top-k; low means generation is capped by missing context.",
            PrecisionAtKMetricName => "Precision@k measures annotated context purity: relevant retrieved chunks divided by retrieved chunks. With sparse expected evidence, a case with one credited chunk in top-5 scores 0.2 even when that chunk is sufficient.",
            HitRateAtKMetricName => "HitRate@k measures whether at least one expected evidence item appeared in top-k.",
            ReciprocalRankMetricName => "ReciprocalRank measures ranking quality: 1 divided by the rank of the first relevant evidence chunk. High means useful evidence appears early; 0 means no relevant evidence appeared in top-k.",
            ScoreAverageMetricName => "ScoreAverage measures the average returned score across all scored retrieved chunks in top-k. For NoReranking this is the vector score; for rerankers this is the reranker score.",
            CreditedScoreAverageMetricName => "CreditedScoreAverage measures the average returned score across retrieved chunks credited against expected evidence.",
            UncreditedScoreAverageMetricName => "UncreditedScoreAverage measures the average returned score across retrieved chunks not credited by the sparse golden dataset; uncredited does not mean irrelevant.",
            CreditedToUncreditedSameSourceScoreGapMetricName => "CreditedToUncreditedSameSourceScoreGap measures the first credited result score minus the highest-scored uncredited result from the same expected source path; it is descriptive, not a quality target.",
            _ => name,
        };

    private static string CreateInterpretationReason(string name, double value, SearchQueryMetrics metrics)
    {
        var diagnostics = metrics.Diagnostics;
        var matchedExpectedCount = MatchedExpectedCount(diagnostics);
        var relevantRetrievedCount = diagnostics.Matches.Count(match => match.IsRelevant);
        var firstRelevantRank = diagnostics.Matches.FirstOrDefault(match => match.IsRelevant)?.Rank;
        var rating = GetRating(name, value);

        return name switch
        {
            RecallAtKMetricName =>
                $"Score {FormatNumber(value)} ({rating}): matched {matchedExpectedCount}/{diagnostics.ExpectedCount} expected evidence items.",
            PrecisionAtKMetricName =>
                $"Score {FormatNumber(value)} ({rating}): {relevantRetrievedCount}/{diagnostics.RetrievedCount} retrieved chunks counted as relevant evidence.",
            HitRateAtKMetricName => value > 0
                ? $"Score 1 ({rating}): at least one expected evidence item appeared in top-k."
                : $"Score 0 ({rating}): no expected evidence item appeared in top-k.",
            ReciprocalRankMetricName => firstRelevantRank is null
                ? $"Score 0 ({rating}): no retrieved chunk matched the expected evidence."
                : $"Score {FormatNumber(value)} ({rating}): first relevant evidence was at rank {firstRelevantRank}.",
            ScoreAverageMetricName => metrics.ScoreAverage is null
                ? "Score 0 (Inconclusive): no retrieved chunks included returned scores."
                : $"Score {FormatNumber(value)} ({rating}): average score across scored retrieved chunks.",
            CreditedScoreAverageMetricName => metrics.CreditedScoreAverage is null
                ? "Score 0 (Inconclusive): no credited retrieved chunks included returned scores."
                : $"Score {FormatNumber(value)} ({rating}): average score across scored credited retrieved chunks.",
            UncreditedScoreAverageMetricName => metrics.UncreditedScoreAverage is null
                ? "Score 0 (Inconclusive): no uncredited retrieved chunks included returned scores."
                : $"Score {FormatNumber(value)} ({rating}): average score across scored uncredited retrieved chunks; uncredited means absent from the sparse expected-evidence set, not necessarily irrelevant.",
            CreditedToUncreditedSameSourceScoreGapMetricName => metrics.CreditedToUncreditedSameSourceScoreGap is null
                ? "Score 0 (Inconclusive): no scored credited and uncredited same-source pair was available."
                : $"Score {FormatNumber(value)} ({rating}): credited score minus highest uncredited same-source score; descriptive only.",
            _ => $"{name}: {FormatNumber(value)}",
        };
    }

    private static EvaluationRating GetRating(string name, double value)
        => name switch
        {
            RecallAtKMetricName => value switch
            {
                >= 1 => EvaluationRating.Exceptional,
                >= 0.8 => EvaluationRating.Good,
                >= 0.5 => EvaluationRating.Average,
                > 0 => EvaluationRating.Poor,
                _ => EvaluationRating.Unacceptable,
            },
            PrecisionAtKMetricName => value switch
            {
                >= 0.8 => EvaluationRating.Exceptional,
                >= 0.5 => EvaluationRating.Good,
                >= 0.2 => EvaluationRating.Average,
                > 0 => EvaluationRating.Poor,
                _ => EvaluationRating.Unacceptable,
            },
            HitRateAtKMetricName => value switch
            {
                >= 1 => EvaluationRating.Exceptional,
                >= 0.8 => EvaluationRating.Good,
                >= 0.5 => EvaluationRating.Average,
                > 0 => EvaluationRating.Poor,
                _ => EvaluationRating.Unacceptable,
            },
            ReciprocalRankMetricName => value switch
            {
                >= 1 => EvaluationRating.Exceptional,
                >= 0.5 => EvaluationRating.Good,
                >= 0.25 => EvaluationRating.Average,
                > 0 => EvaluationRating.Poor,
                _ => EvaluationRating.Unacceptable,
            },
            ScoreAverageMetricName or CreditedScoreAverageMetricName or UncreditedScoreAverageMetricName => value switch
            {
                > 0.8 => EvaluationRating.Exceptional,
                > 0.6 => EvaluationRating.Good,
                > 0.4 => EvaluationRating.Average,
                > 0.2 => EvaluationRating.Poor,
                _ => EvaluationRating.Unacceptable,
            },
            CreditedToUncreditedSameSourceScoreGapMetricName => EvaluationRating.Unknown,
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

    private static int MatchedExpectedCount(SearchQueryDiagnostics diagnostics)
        => diagnostics.ExpectedDocuments.Count(expectedDocument => expectedDocument.Matched);

    private static string FormatNumber(double value)
        => value.ToString("0.###", CultureInfo.InvariantCulture);

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
}
