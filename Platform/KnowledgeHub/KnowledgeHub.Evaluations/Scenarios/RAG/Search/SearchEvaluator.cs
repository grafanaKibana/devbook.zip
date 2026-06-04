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
    private const int DiagnosticItemLimit = 2;

    public IReadOnlyCollection<string> EvaluationMetricNames { get; } =
    [
        RecallAtKMetricName,
        PrecisionAtKMetricName,
        HitRateAtKMetricName,
        ReciprocalRankMetricName,
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
        ]));
    }

    public static Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<SearchPrediction> predictions,
        int topK)
    {
        return predictions
            .GroupBy(prediction => prediction.ChunkingStrategy)
            .ToDictionary(
                group => group.Key.ToString(),
                group => CreateSummaryMetrics(SearchMetricCalculator.Evaluate(group.ToArray(), topK), group.Key));
    }

    private static IEnumerable<SummaryMetric> CreateSummaryMetrics(SearchReport report, ChunkingStrategyKind strategy) =>
    [
        new SummaryMetric("SampleCount", report.QueryCount, $"Total RAG search cases evaluated over {strategy} chunks.", SummaryMetricKind.Count),
        new SummaryMetric(RecallAtKMetricName, report.RecallAtK, $"Average Recall@k across RAG search cases over {strategy} chunks.", SummaryMetricKind.Percentage, GetRating(RecallAtKMetricName, report.RecallAtK)),
        new SummaryMetric(PrecisionAtKMetricName, report.PrecisionAtK, $"Average annotated Precision@k across RAG search cases over {strategy} chunks; sparse expected evidence can cap this below 1 even when the needed evidence is found.", SummaryMetricKind.Percentage, GetRating(PrecisionAtKMetricName, report.PrecisionAtK)),
        new SummaryMetric(HitRateAtKMetricName, report.HitRateAtK, $"Average HitRate@k across RAG search cases over {strategy} chunks; shows how often retrieval found at least one expected evidence item.", SummaryMetricKind.Percentage, GetRating(HitRateAtKMetricName, report.HitRateAtK)),
        new SummaryMetric(ReciprocalRankMetricName, report.MeanReciprocalRank, $"Mean reciprocal rank across RAG search cases over {strategy} chunks.", SummaryMetricKind.PlainNumber, GetRating(ReciprocalRankMetricName, report.MeanReciprocalRank)),
        new SummaryMetric("EmptyResultRate", report.EmptyResultRate, $"Share of RAG search cases with no retrieved {strategy} chunks.", SummaryMetricKind.Percentage, GetEmptyResultRateRating(report.EmptyResultRate)),
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

        AddDiagnostics(metric, name, metrics);

        return metric;
    }

    private static void AddDiagnostics(NumericMetric metric, string name, SearchQueryMetrics metrics)
    {
        var diagnostics = metrics.Diagnostics;
        var relevantRetrievedCount = diagnostics.Matches.Count(match => match.IsRelevant);
        var firstRelevantRank = diagnostics.Matches.FirstOrDefault(match => match.IsRelevant)?.Rank;
        var sameSourceMisses = diagnostics.Matches
            .Where(match => match.SourcePathMatched && !match.IsRelevant)
            .ToArray();

        if (name == RecallAtKMetricName && diagnostics.MissingExpectedSourcePaths.Count > 0)
        {
            var missingExpected = diagnostics.ExpectedDocuments.Where(expectedDocument => !expectedDocument.Matched).ToArray();
            metric.AddDiagnostics(EvaluationDiagnostic.Warning(
                $"Recall affected: missing {missingExpected.Length}/{diagnostics.ExpectedCount} expected evidence: {FormatLimitedItems(missingExpected, FormatExpectedDocument)}."));
            if (sameSourceMisses.Length > 0)
            {
                metric.AddDiagnostics(EvaluationDiagnostic.Informational(
                    $"Closest same-source misses: {FormatLimitedItems(sameSourceMisses, FormatRetrievedMiss)}."));
            }
        }

        if (name == PrecisionAtKMetricName && relevantRetrievedCount < diagnostics.RetrievedCount)
        {
            metric.AddDiagnostics(EvaluationDiagnostic.Informational(
                $"Precision affected: {diagnostics.RetrievedCount - relevantRetrievedCount}/{diagnostics.RetrievedCount} retrieved chunks were not relevant; ranks {string.Join(", ", diagnostics.Matches.Where(match => !match.IsRelevant).Select(match => match.Rank))}."));
            if (diagnostics.DuplicateRetrievedSourcePaths.Count > 0)
            {
                metric.AddDiagnostics(EvaluationDiagnostic.Informational(
                    $"Duplicate sources affected precision: {string.Join(", ", diagnostics.DuplicateRetrievedSourcePaths)}."));
            }
        }

        if (name == ReciprocalRankMetricName)
        {
            if (firstRelevantRank is null)
            {
                metric.AddDiagnostics(EvaluationDiagnostic.Warning("MRR affected: no relevant evidence was found in top-k."));
            }
            else if (firstRelevantRank > 1)
            {
                metric.AddDiagnostics(EvaluationDiagnostic.Informational(
                    $"MRR affected: first relevant evidence was at rank {firstRelevantRank} after {firstRelevantRank - 1} non-relevant chunks."));
            }
        }
    }

    private static string CreateMetricReason(string name)
        => name switch
        {
            RecallAtKMetricName => "Recall@k measures evidence coverage: matched expected evidence divided by expected evidence. High means required evidence was present in top-k; low means generation is capped by missing context.",
            PrecisionAtKMetricName => "Precision@k measures annotated context purity: relevant retrieved chunks divided by retrieved chunks. With sparse expected evidence, a case with one credited chunk in top-5 scores 0.2 even when that chunk is sufficient.",
            HitRateAtKMetricName => "HitRate@k measures whether at least one expected evidence item appeared in top-k.",
            ReciprocalRankMetricName => "ReciprocalRank measures ranking quality: 1 divided by the rank of the first relevant evidence chunk. High means useful evidence appears early; 0 means no relevant evidence appeared in top-k.",
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

    private static string FormatExpectedDocument(SearchExpectedDiagnostic expectedDocument)
        => $"#{expectedDocument.Index} {expectedDocument.SourcePath} heading={FormatValue(expectedDocument.Heading)}";

    private static string FormatRetrievedMiss(SearchMatchDiagnostic match)
        => $"rank {match.Rank} heading={FormatValue(match.Heading)} expectedHeading={FormatValue(match.MatchedExpectedHeading)} reason={ShortReason(match)}";

    private static string FormatLimitedItems<T>(IReadOnlyCollection<T> items, Func<T, string> formatter)
    {
        var formatted = string.Join(" | ", items.Take(DiagnosticItemLimit).Select(formatter));
        var remainingCount = items.Count - DiagnosticItemLimit;

        return remainingCount > 0 ? $"{formatted} (+{remainingCount} more)" : formatted;
    }

    private static string ShortReason(SearchMatchDiagnostic match)
    {
        if (match.SourcePathMatched && !match.HeadingMatched && !match.SnippetMatched)
        {
            return "expected heading/snippet absent";
        }

        return match.Reason;
    }

    private static int MatchedExpectedCount(SearchQueryDiagnostics diagnostics)
        => diagnostics.ExpectedDocuments.Count(expectedDocument => expectedDocument.Matched);

    private static string FormatValue(string? value)
        => string.IsNullOrWhiteSpace(value) ? "<none>" : $"\"{value}\"";

    private static string FormatNumber(double value)
        => value.ToString("0.###", CultureInfo.InvariantCulture);

    private static NumericMetric CreateFailedMetric(string name, string reason)
        => new(name, 0, reason)
        {
            Interpretation = new EvaluationMetricInterpretation(
                EvaluationRating.Inconclusive,
                failed: true,
                reason: reason),
        };
}
