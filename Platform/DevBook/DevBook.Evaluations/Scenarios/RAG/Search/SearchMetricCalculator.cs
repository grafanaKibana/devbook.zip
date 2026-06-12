namespace DevBook.Evaluations.Scenarios.RAG.Search;

using DevBook.Data.Models;

/// <summary>
/// Calculates search metrics.
/// </summary>
public static class SearchMetricCalculator
{
    /// <summary>
    /// Rank cutoffs reported for search quality metrics.
    /// </summary>
    public static readonly int[] RankingCutoffs = [1, 3, 5, 10];

    /// <summary>
    /// Primary rank cutoff used by convenience metric properties.
    /// </summary>
    public const int PrimaryCutoffValue = 5;

    private const int BootstrapIterations = 1_000;

    /// <summary>
    /// Evaluates search predictions and aggregates query-level metrics.
    /// </summary>
    /// <param name="cases">Search predictions to aggregate.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <returns>Aggregate ranking, empty-result, and score metrics for the predictions.</returns>
    public static SearchReport Evaluate(
        IReadOnlyList<SearchPrediction> cases,
        int topK = 5)
    {
        var queryMetrics = cases.Select(queryCase => ScoreQuery(queryCase, topK)).ToArray();

        if (queryMetrics.Length == 0)
        {
            return new SearchReport(0, CreateEmptyRankingSummaries(), 0, 0, 0, 0, 0);
        }

        var rankingSummaries = RankingCutoffs.ToDictionary(
            cutoff => cutoff,
            cutoff => CreateRankingSummary(queryMetrics, cutoff));

        return new SearchReport(
            queryMetrics.Length,
            rankingSummaries,
            queryMetrics.Count(metric => metric.IsEmptyResult) / (double)queryMetrics.Length,
            AverageAvailable(queryMetrics, metric => metric.ScoreAverage),
            AverageAvailable(queryMetrics, metric => metric.CreditedScoreAverage),
            AverageAvailable(queryMetrics, metric => metric.UncreditedScoreAverage),
            AverageAvailable(queryMetrics, metric => metric.CreditedToUncreditedSameSourceScoreGap));
    }

    /// <summary>
    /// Scores one search prediction against its expected sources.
    /// </summary>
    /// <param name="queryCase">Search prediction to compare with expected evidence.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <returns>Ranking metrics and diagnostics for the query.</returns>
    public static SearchQueryMetrics ScoreQuery(SearchPrediction queryCase, int topK = 5)
    {
        var expectedDocuments = queryCase.ExpectedDocuments;
        var maxCutoff = Math.Max(topK, RankingCutoffs.Max());
        var retrievedDocuments = queryCase.RetrievedDocuments.Take(maxCutoff).ToArray();
        var matchedExpected = new bool[expectedDocuments.Count];
        var duplicateRetrievedSourcePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenRetrievedSourcePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var matchDiagnostics = new List<SearchMatchDiagnostic>(retrievedDocuments.Length);
        var relevantRetrievedCount = 0;
        var reciprocalRank = 0d;

        for (var index = 0; index < retrievedDocuments.Length; index++)
        {
            var retrievedDocument = retrievedDocuments[index];
            var rank = index + 1;

            if (!seenRetrievedSourcePaths.Add(NormalizePath(retrievedDocument.SourcePath)))
            {
                duplicateRetrievedSourcePaths.Add(retrievedDocument.SourcePath);
            }

            var analysis = AnalyzeRetrievedDocument(expectedDocuments, matchedExpected, retrievedDocument);
            if (!analysis.IsRelevant)
            {
                matchDiagnostics.Add(new SearchMatchDiagnostic(
                    rank,
                    retrievedDocument.SourcePath,
                    retrievedDocument.Heading,
                    retrievedDocument.Score,
                    analysis.Expected?.SourcePath,
                    analysis.Expected?.Heading,
                    analysis.SourcePathMatched,
                    analysis.HeadingMatched,
                    analysis.SnippetMatched,
                    false,
                    analysis.Reason));
                continue;
            }

            matchedExpected[analysis.ExpectedIndex!.Value] = true;
            relevantRetrievedCount++;
            reciprocalRank = reciprocalRank == 0 ? 1d / rank : reciprocalRank;

            matchDiagnostics.Add(new SearchMatchDiagnostic(
                rank,
                retrievedDocument.SourcePath,
                retrievedDocument.Heading,
                retrievedDocument.Score,
                analysis.Expected!.SourcePath,
                analysis.Expected.Heading,
                analysis.SourcePathMatched,
                analysis.HeadingMatched,
                analysis.SnippetMatched,
                true,
                analysis.Reason));
        }

        var missingExpectedSourcePaths = expectedDocuments
            .Select((expectedDocument, index) => new { expectedDocument.SourcePath, Matched = matchedExpected[index] })
            .Where(item => !item.Matched)
            .Select(item => item.SourcePath)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var expectedCount = expectedDocuments.Count;
        var expectedDiagnostics = expectedDocuments
            .Select((expectedDocument, index) => new SearchExpectedDiagnostic(
                index + 1,
                expectedDocument.SourcePath,
                expectedDocument.Heading,
                Preview(expectedDocument.Snippet),
                matchedExpected[index]))
            .ToArray();
        var rankingMetrics = RankingCutoffs.ToDictionary(
            cutoff => cutoff,
            cutoff => CreateRankingMetrics(expectedCount, retrievedDocuments.Length, matchDiagnostics, cutoff));
        var scoreMetrics = CreateScoreMetrics(matchDiagnostics);

        return new SearchQueryMetrics(
            rankingMetrics,
            retrievedDocuments.Length == 0,
            scoreMetrics.ScoreAverage,
            scoreMetrics.CreditedScoreAverage,
            scoreMetrics.UncreditedScoreAverage,
            scoreMetrics.CreditedToUncreditedSameSourceScoreGap,
            new SearchQueryDiagnostics(
                retrievedDocuments.Length,
                expectedCount,
                expectedDiagnostics,
                missingExpectedSourcePaths,
                duplicateRetrievedSourcePaths.OrderBy(path => path, StringComparer.OrdinalIgnoreCase).ToArray(),
                new SearchChunkDiagnostics(
                    retrievedDocuments.Length,
                    retrievedDocuments.Select(document => NormalizePath(document.SourcePath)).Distinct(StringComparer.OrdinalIgnoreCase).Count(),
                    duplicateRetrievedSourcePaths.Count,
                    retrievedDocuments.Length == 0 ? 0 : retrievedDocuments.Average(document => document.Snippet?.Length ?? 0),
                    expectedCount == 0 ? 0 : matchedExpected.Count(matched => matched) / (double)expectedCount,
                    relevantRetrievedCount),
                matchDiagnostics));
    }

    private static IReadOnlyDictionary<int, SearchRankingSummary> CreateEmptyRankingSummaries()
        => RankingCutoffs.ToDictionary(cutoff => cutoff, _ => new SearchRankingSummary(0, 0, 0, 0, 0, 0, SearchRankingConfidenceIntervals.Empty));

    private static SearchRankingSummary CreateRankingSummary(IReadOnlyList<SearchQueryMetrics> queryMetrics, int cutoff)
    {
        var recallValues = queryMetrics.Select(metric => metric.RankingMetrics[cutoff].Recall).ToArray();
        var precisionValues = queryMetrics.Select(metric => metric.RankingMetrics[cutoff].Precision).ToArray();
        var hitRateValues = queryMetrics.Select(metric => metric.RankingMetrics[cutoff].HitRate).ToArray();
        var mrrValues = queryMetrics.Select(metric => metric.RankingMetrics[cutoff].MeanReciprocalRank).ToArray();
        var mapValues = queryMetrics.Select(metric => metric.RankingMetrics[cutoff].MeanAveragePrecision).ToArray();
        var ndcgValues = queryMetrics.Select(metric => metric.RankingMetrics[cutoff].NormalizedDiscountedCumulativeGain).ToArray();

        return new SearchRankingSummary(
            recallValues.Average(),
            precisionValues.Average(),
            hitRateValues.Average(),
            mrrValues.Average(),
            mapValues.Average(),
            ndcgValues.Average(),
            new SearchRankingConfidenceIntervals(
                BootstrapMeanConfidenceInterval(recallValues),
                BootstrapMeanConfidenceInterval(precisionValues),
                BootstrapMeanConfidenceInterval(hitRateValues),
                BootstrapMeanConfidenceInterval(mrrValues),
                BootstrapMeanConfidenceInterval(mapValues),
                BootstrapMeanConfidenceInterval(ndcgValues)));
    }

    private static SearchConfidenceInterval BootstrapMeanConfidenceInterval(IReadOnlyList<double> values)
    {
        if (values.Count == 0)
        {
            return new SearchConfidenceInterval(0, 0);
        }

        var random = new Random(17_317 + values.Count);
        var means = new double[BootstrapIterations];
        for (var iteration = 0; iteration < BootstrapIterations; iteration++)
        {
            var sum = 0d;
            for (var sample = 0; sample < values.Count; sample++)
            {
                sum += values[random.Next(values.Count)];
            }

            means[iteration] = sum / values.Count;
        }

        Array.Sort(means);
        return new SearchConfidenceInterval(
            means[(int)Math.Floor((BootstrapIterations - 1) * 0.025)],
            means[(int)Math.Ceiling((BootstrapIterations - 1) * 0.975)]);
    }

    private static SearchRankingMetrics CreateRankingMetrics(
        int expectedCount,
        int retrievedCount,
        IReadOnlyList<SearchMatchDiagnostic> matches,
        int cutoff)
    {
        var retrievedAtCutoff = Math.Min(cutoff, retrievedCount);
        var matchesAtCutoff = matches.Where(match => match.Rank <= cutoff).ToArray();
        var relevantMatches = matchesAtCutoff.Where(match => match.IsRelevant).ToArray();
        var relevantCount = relevantMatches.Length;
        var firstRelevantRank = relevantMatches.FirstOrDefault()?.Rank;

        return new SearchRankingMetrics(
            expectedCount == 0 ? 0 : relevantCount / (double)expectedCount,
            retrievedAtCutoff == 0 ? 0 : relevantCount / (double)retrievedAtCutoff,
            relevantCount > 0 ? 1d : 0d,
            firstRelevantRank is null ? 0 : 1d / firstRelevantRank.Value,
            CalculateAveragePrecision(expectedCount, matchesAtCutoff),
            CalculateNormalizedDiscountedCumulativeGain(expectedCount, matchesAtCutoff, cutoff));
    }

    private static double CalculateAveragePrecision(int expectedCount, IReadOnlyList<SearchMatchDiagnostic> matchesAtCutoff)
    {
        if (expectedCount == 0)
        {
            return 0;
        }

        var relevantSeen = 0;
        var precisionSum = 0d;
        foreach (var match in matchesAtCutoff)
        {
            if (!match.IsRelevant)
            {
                continue;
            }

            relevantSeen++;
            precisionSum += relevantSeen / (double)match.Rank;
        }

        return precisionSum / expectedCount;
    }

    private static double CalculateNormalizedDiscountedCumulativeGain(
        int expectedCount,
        IReadOnlyList<SearchMatchDiagnostic> matchesAtCutoff,
        int cutoff)
    {
        if (expectedCount == 0)
        {
            return 0;
        }

        var idealRelevantCount = Math.Min(expectedCount, cutoff);
        var idealDcg = Enumerable.Range(1, idealRelevantCount).Sum(rank => Discount(rank));
        if (idealDcg == 0)
        {
            return 0;
        }

        var dcg = matchesAtCutoff.Where(match => match.IsRelevant).Sum(match => Discount(match.Rank));
        return dcg / idealDcg;
    }

    private static double Discount(int rank) => 1d / Math.Log2(rank + 1);

    private static double AverageAvailable(IReadOnlyList<SearchQueryMetrics> metrics, Func<SearchQueryMetrics, double?> selector)
    {
        var values = metrics.Select(selector).OfType<double>().ToArray();

        return values.Length == 0 ? 0 : values.Average();
    }

    private static SearchScoreMetrics CreateScoreMetrics(IReadOnlyList<SearchMatchDiagnostic> matches)
    {
        var scoredMatches = matches.Where(match => match.Score.HasValue).ToArray();
        var creditedScores = scoredMatches.Where(match => match.IsRelevant).Select(match => match.Score!.Value).ToArray();
        var uncreditedScores = scoredMatches.Where(match => !match.IsRelevant).Select(match => match.Score!.Value).ToArray();
        var firstCredited = scoredMatches.FirstOrDefault(match => match.IsRelevant);
        var highestUncreditedSameSource = firstCredited is null
            ? null
            : scoredMatches
                .Where(match => !match.IsRelevant && match.SourcePathMatched)
                .OrderByDescending(match => match.Score)
                .FirstOrDefault();

        return new SearchScoreMetrics(
            AverageOrNull(scoredMatches.Select(match => match.Score!.Value).ToArray()),
            AverageOrNull(creditedScores),
            AverageOrNull(uncreditedScores),
            firstCredited?.Score is not null && highestUncreditedSameSource?.Score is not null
                ? firstCredited.Score - highestUncreditedSameSource.Score
                : null);
    }

    private static double? AverageOrNull(IReadOnlyList<double> values)
        => values.Count == 0 ? null : values.Average();

    private static RetrievedDocumentAnalysis AnalyzeRetrievedDocument(
        IReadOnlyList<SearchDocument> expectedDocuments,
        bool[] matchedExpected,
        SearchDocument retrievedDocument)
    {
        RetrievedDocumentAnalysis? evidenceMismatch = null;

        for (var index = 0; index < expectedDocuments.Count; index++)
        {
            if (matchedExpected[index])
            {
                continue;
            }

            var expectedDocument = expectedDocuments[index];
            if (!MatchesSourcePath(expectedDocument.SourcePath, retrievedDocument.SourcePath))
            {
                continue;
            }

            var headingMatched = MatchesNormalizedContains(expectedDocument.Heading, retrievedDocument.Heading);
            var snippetMatched = MatchesNormalizedContains(expectedDocument.Snippet, retrievedDocument.Snippet);

            if (!MatchesExpectedEvidence(expectedDocument, headingMatched, snippetMatched))
            {
                evidenceMismatch ??= new RetrievedDocumentAnalysis(
                    null,
                    expectedDocument,
                    true,
                    headingMatched,
                    snippetMatched,
                    CreateEvidenceMismatchReason(expectedDocument));
                continue;
            }

            return new RetrievedDocumentAnalysis(
                index,
                expectedDocument,
                true,
                headingMatched,
                snippetMatched,
                headingMatched && snippetMatched
                    ? "Matched expected source path, heading, and snippet."
                    : headingMatched
                        ? "Matched expected source path and heading."
                        : snippetMatched
                            ? "Matched expected source path and snippet."
                            : "Matched expected source path; no heading or snippet was required.");
        }

        if (evidenceMismatch is not null)
        {
            return evidenceMismatch;
        }

        var alreadyMatchedExpected = expectedDocuments
            .Select((expectedDocument, index) => new { ExpectedDocument = expectedDocument, Matched = matchedExpected[index] })
            .FirstOrDefault(item => item.Matched && MatchesSourcePath(item.ExpectedDocument.SourcePath, retrievedDocument.SourcePath));
        if (alreadyMatchedExpected is not null)
        {
            return new RetrievedDocumentAnalysis(
                null,
                alreadyMatchedExpected.ExpectedDocument,
                true,
                MatchesNormalizedContains(alreadyMatchedExpected.ExpectedDocument.Heading, retrievedDocument.Heading),
                MatchesNormalizedContains(alreadyMatchedExpected.ExpectedDocument.Snippet, retrievedDocument.Snippet),
                "Source path matched an expected document that was already credited by an earlier retrieved result; duplicate retrieval does not add recall credit.");
        }

        return new RetrievedDocumentAnalysis(
            null,
            null,
            false,
            false,
            false,
            "Retrieved source path did not match any expected source path.");
    }

    private static bool MatchesExpectedEvidence(SearchDocument expectedDocument, bool headingMatched, bool snippetMatched)
        => !string.IsNullOrWhiteSpace(expectedDocument.Snippet)
            ? snippetMatched
            : string.IsNullOrWhiteSpace(expectedDocument.Heading) || headingMatched;

    private static string CreateEvidenceMismatchReason(SearchDocument expectedDocument)
        => !string.IsNullOrWhiteSpace(expectedDocument.Snippet)
            ? "Source path matched an expected document, but the normalized expected snippet did not appear in the retrieved chunk."
            : "Source path matched an expected document, but the normalized expected heading did not appear in the retrieved chunk.";

    private static bool MatchesSourcePath(string expectedSourcePath, string retrievedSourcePath)
    {
        return string.Equals(NormalizePath(expectedSourcePath), NormalizePath(retrievedSourcePath), StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesNormalizedContains(string? expectedValue, string? actualValue)
    {
        if (string.IsNullOrWhiteSpace(expectedValue) || string.IsNullOrWhiteSpace(actualValue))
        {
            return false;
        }

        return NormalizeText(actualValue).Contains(NormalizeText(expectedValue), StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizePath(string value)
    {
        return value.Replace('\\', '/').Trim();
    }

    private static string NormalizeText(string value)
        => string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).Trim();

    private static string? Preview(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        const int maxLength = 180;

        return normalized.Length <= maxLength ? normalized : normalized[..maxLength] + "…";
    }

    private sealed record RetrievedDocumentAnalysis(
        int? ExpectedIndex,
        SearchDocument? Expected,
        bool SourcePathMatched,
        bool HeadingMatched,
        bool SnippetMatched,
        string Reason)
    {
        /// <summary>
        /// Gets whether the retrieved document matched expected evidence.
        /// </summary>
        public bool IsRelevant => this.ExpectedIndex is not null;
    }
}

/// <summary>
/// Aggregate retrieval-quality report for a set of search predictions.
/// </summary>
/// <param name="QueryCount">Number of queries included in the report.</param>
/// <param name="RankingMetrics">Ranking summaries keyed by rank cutoff.</param>
/// <param name="EmptyResultRate">Fraction of queries that returned no chunks.</param>
/// <param name="ScoreAverage">Average score across all scored retrieved chunks.</param>
/// <param name="CreditedScoreAverage">Average score for chunks credited against expected evidence.</param>
/// <param name="UncreditedScoreAverage">Average score for retrieved chunks not credited by the expected-evidence set.</param>
/// <param name="CreditedToUncreditedSameSourceScoreGap">Score gap between credited chunks and higher-scored uncredited chunks from the same source.</param>
public sealed record SearchReport(
    int QueryCount,
    IReadOnlyDictionary<int, SearchRankingSummary> RankingMetrics,
    double EmptyResultRate,
    double ScoreAverage,
    double CreditedScoreAverage,
    double UncreditedScoreAverage,
    double CreditedToUncreditedSameSourceScoreGap)
{
    /// <summary>
    /// Gets recall at the primary rank cutoff.
    /// </summary>
    public double RecallAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Recall;

    /// <summary>
    /// Gets precision at the primary rank cutoff.
    /// </summary>
    public double PrecisionAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Precision;

    /// <summary>
    /// Gets hit rate at the primary rank cutoff.
    /// </summary>
    public double HitRateAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].HitRate;

    /// <summary>
    /// Gets mean reciprocal rank at the primary rank cutoff.
    /// </summary>
    public double MeanReciprocalRank => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].MeanReciprocalRank;
}

/// <summary>
/// Retrieval metrics and diagnostics for one search query.
/// </summary>
/// <param name="RankingMetrics">Ranking metrics keyed by rank cutoff.</param>
/// <param name="IsEmptyResult">Whether the query returned no chunks.</param>
/// <param name="ScoreAverage">Average score across scored retrieved chunks.</param>
/// <param name="CreditedScoreAverage">Average score for chunks credited against expected evidence.</param>
/// <param name="UncreditedScoreAverage">Average score for chunks not credited by expected evidence.</param>
/// <param name="CreditedToUncreditedSameSourceScoreGap">Score gap between credited and uncredited same-source chunks.</param>
/// <param name="Diagnostics">Diagnostics explaining expected, missing, duplicate, and matched evidence.</param>
public sealed record SearchQueryMetrics(
    IReadOnlyDictionary<int, SearchRankingMetrics> RankingMetrics,
    bool IsEmptyResult,
    double? ScoreAverage,
    double? CreditedScoreAverage,
    double? UncreditedScoreAverage,
    double? CreditedToUncreditedSameSourceScoreGap,
    SearchQueryDiagnostics Diagnostics)
{
    /// <summary>
    /// Gets recall at the primary rank cutoff.
    /// </summary>
    public double RecallAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Recall;

    /// <summary>
    /// Gets precision at the primary rank cutoff.
    /// </summary>
    public double PrecisionAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Precision;

    /// <summary>
    /// Gets hit rate at the primary rank cutoff.
    /// </summary>
    public double HitRateAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].HitRate;

    /// <summary>
    /// Gets reciprocal rank at the primary rank cutoff.
    /// </summary>
    public double ReciprocalRank => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].MeanReciprocalRank;
}

/// <summary>
/// Ranking metrics calculated at one cutoff.
/// </summary>
/// <param name="Recall">Matched expected evidence divided by expected evidence.</param>
/// <param name="Precision">Relevant retrieved chunks divided by retrieved chunks at the cutoff.</param>
/// <param name="HitRate">Whether at least one relevant chunk appears at the cutoff.</param>
/// <param name="MeanReciprocalRank">Reciprocal rank of the first relevant chunk.</param>
/// <param name="MeanAveragePrecision">Average precision over relevant chunks at the cutoff.</param>
/// <param name="NormalizedDiscountedCumulativeGain">Discounted ranking quality normalized against the ideal ordering.</param>
public sealed record SearchRankingMetrics(
    double Recall,
    double Precision,
    double HitRate,
    double MeanReciprocalRank,
    double MeanAveragePrecision,
    double NormalizedDiscountedCumulativeGain);

/// <summary>
/// Mean ranking metrics and bootstrap confidence intervals for one cutoff.
/// </summary>
/// <param name="Recall">Mean recall across queries.</param>
/// <param name="Precision">Mean precision across queries.</param>
/// <param name="HitRate">Mean hit rate across queries.</param>
/// <param name="MeanReciprocalRank">Mean reciprocal rank across queries.</param>
/// <param name="MeanAveragePrecision">Mean average precision across queries.</param>
/// <param name="NormalizedDiscountedCumulativeGain">Mean normalized discounted cumulative gain across queries.</param>
/// <param name="ConfidenceIntervals">Bootstrap confidence intervals for the mean metrics.</param>
public sealed record SearchRankingSummary(
    double Recall,
    double Precision,
    double HitRate,
    double MeanReciprocalRank,
    double MeanAveragePrecision,
    double NormalizedDiscountedCumulativeGain,
    SearchRankingConfidenceIntervals ConfidenceIntervals);

/// <summary>
/// Confidence intervals for ranking metrics at one cutoff.
/// </summary>
/// <param name="Recall">Recall confidence interval.</param>
/// <param name="Precision">Precision confidence interval.</param>
/// <param name="HitRate">Hit-rate confidence interval.</param>
/// <param name="MeanReciprocalRank">Mean reciprocal rank confidence interval.</param>
/// <param name="MeanAveragePrecision">Mean average precision confidence interval.</param>
/// <param name="NormalizedDiscountedCumulativeGain">Normalized discounted cumulative gain confidence interval.</param>
public sealed record SearchRankingConfidenceIntervals(
    SearchConfidenceInterval Recall,
    SearchConfidenceInterval Precision,
    SearchConfidenceInterval HitRate,
    SearchConfidenceInterval MeanReciprocalRank,
    SearchConfidenceInterval MeanAveragePrecision,
    SearchConfidenceInterval NormalizedDiscountedCumulativeGain)
{
    /// <summary>
    /// Gets zero-width intervals used when no query metrics exist.
    /// </summary>
    public static SearchRankingConfidenceIntervals Empty { get; } = new(
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0));
}

/// <summary>
/// Lower and upper bounds for a bootstrap confidence interval.
/// </summary>
/// <param name="Lower">Lower interval bound.</param>
/// <param name="Upper">Upper interval bound.</param>
public sealed record SearchConfidenceInterval(double Lower, double Upper);

/// <summary>
/// Score statistics for retrieved chunks.
/// </summary>
/// <param name="ScoreAverage">Average score across scored retrieved chunks.</param>
/// <param name="CreditedScoreAverage">Average score for chunks credited against expected evidence.</param>
/// <param name="UncreditedScoreAverage">Average score for chunks not credited by expected evidence.</param>
/// <param name="CreditedToUncreditedSameSourceScoreGap">Score gap between credited and uncredited same-source chunks.</param>
public sealed record SearchScoreMetrics(
    double? ScoreAverage,
    double? CreditedScoreAverage,
    double? UncreditedScoreAverage,
    double? CreditedToUncreditedSameSourceScoreGap);

/// <summary>
/// Diagnostic details explaining how one query was scored.
/// </summary>
/// <param name="RetrievedCount">Number of retrieved chunks considered for scoring.</param>
/// <param name="ExpectedCount">Number of expected source documents for the query.</param>
/// <param name="ExpectedDocuments">Expected evidence and whether each item was matched.</param>
/// <param name="MissingExpectedSourcePaths">Expected source paths not matched by retrieved chunks.</param>
/// <param name="DuplicateRetrievedSourcePaths">Retrieved source paths that appeared more than once.</param>
/// <param name="ChunkDiagnostics">Aggregate diagnostics about retrieved chunks.</param>
/// <param name="Matches">Per-rank match diagnostics for retrieved chunks.</param>
public sealed record SearchQueryDiagnostics(
    int RetrievedCount,
    int ExpectedCount,
    IReadOnlyList<SearchExpectedDiagnostic> ExpectedDocuments,
    IReadOnlyList<string> MissingExpectedSourcePaths,
    IReadOnlyList<string> DuplicateRetrievedSourcePaths,
    SearchChunkDiagnostics ChunkDiagnostics,
    IReadOnlyList<SearchMatchDiagnostic> Matches);

/// <summary>
/// Aggregate diagnostics for retrieved chunks in one query.
/// </summary>
/// <param name="RetrievedChunkCount">Number of retrieved chunks inspected.</param>
/// <param name="UniqueSourceCount">Number of distinct source paths in retrieved chunks.</param>
/// <param name="DuplicateSourceCount">Number of retrieved source paths repeated at least once.</param>
/// <param name="AverageRetrievedChunkLength">Average retrieved chunk text length in characters.</param>
/// <param name="EvidenceCoverage">Share of expected evidence matched by retrieved chunks.</param>
/// <param name="RelevantRetrievedCount">Number of retrieved chunks credited as relevant.</param>
public sealed record SearchChunkDiagnostics(
    int RetrievedChunkCount,
    int UniqueSourceCount,
    int DuplicateSourceCount,
    double AverageRetrievedChunkLength,
    double EvidenceCoverage,
    int RelevantRetrievedCount);

/// <summary>
/// Diagnostic record for one expected evidence item.
/// </summary>
/// <param name="Index">One-based expected evidence index.</param>
/// <param name="SourcePath">Expected source path.</param>
/// <param name="Heading">Expected heading evidence, when required.</param>
/// <param name="SnippetPreview">Preview of expected snippet evidence, when required.</param>
/// <param name="Matched">Whether retrieved chunks matched this expected evidence item.</param>
public sealed record SearchExpectedDiagnostic(
    int Index,
    string SourcePath,
    string? Heading,
    string? SnippetPreview,
    bool Matched);

/// <summary>
/// Diagnostic record explaining one retrieved chunk match decision.
/// </summary>
/// <param name="Rank">One-based retrieved rank.</param>
/// <param name="SourcePath">Retrieved source path.</param>
/// <param name="Heading">Retrieved heading metadata.</param>
/// <param name="Score">Retrieved or reranked score.</param>
/// <param name="MatchedExpectedSourcePath">Expected source path matched by this chunk, when any.</param>
/// <param name="MatchedExpectedHeading">Expected heading matched by this chunk, when any.</param>
/// <param name="SourcePathMatched">Whether the source path matched expected evidence.</param>
/// <param name="HeadingMatched">Whether the heading matched expected evidence.</param>
/// <param name="SnippetMatched">Whether the snippet matched expected evidence.</param>
/// <param name="IsRelevant">Whether the chunk received relevance credit.</param>
/// <param name="Reason">Human-readable explanation of the match decision.</param>
public sealed record SearchMatchDiagnostic(
    int Rank,
    string SourcePath,
    string? Heading,
    double? Score,
    string? MatchedExpectedSourcePath,
    string? MatchedExpectedHeading,
    bool SourcePathMatched,
    bool HeadingMatched,
    bool SnippetMatched,
    bool IsRelevant,
    string Reason);
