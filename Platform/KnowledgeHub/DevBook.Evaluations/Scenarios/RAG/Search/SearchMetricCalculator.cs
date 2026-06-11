namespace DevBook.Evaluations.Scenarios.RAG.Search;

using DevBook.Data.Models;

public static class SearchMetricCalculator
{
    public static readonly int[] RankingCutoffs = [1, 3, 5, 10];

    public const int PrimaryCutoffValue = 5;

    private const int BootstrapIterations = 1_000;

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
        public bool IsRelevant => this.ExpectedIndex is not null;
    }
}

public sealed record SearchReport(
    int QueryCount,
    IReadOnlyDictionary<int, SearchRankingSummary> RankingMetrics,
    double EmptyResultRate,
    double ScoreAverage,
    double CreditedScoreAverage,
    double UncreditedScoreAverage,
    double CreditedToUncreditedSameSourceScoreGap)
{
    public double RecallAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Recall;

    public double PrecisionAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Precision;

    public double HitRateAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].HitRate;

    public double MeanReciprocalRank => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].MeanReciprocalRank;
}

public sealed record SearchQueryMetrics(
    IReadOnlyDictionary<int, SearchRankingMetrics> RankingMetrics,
    bool IsEmptyResult,
    double? ScoreAverage,
    double? CreditedScoreAverage,
    double? UncreditedScoreAverage,
    double? CreditedToUncreditedSameSourceScoreGap,
    SearchQueryDiagnostics Diagnostics)
{
    public double RecallAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Recall;

    public double PrecisionAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Precision;

    public double HitRateAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].HitRate;

    public double ReciprocalRank => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].MeanReciprocalRank;
}

public sealed record SearchRankingMetrics(
    double Recall,
    double Precision,
    double HitRate,
    double MeanReciprocalRank,
    double MeanAveragePrecision,
    double NormalizedDiscountedCumulativeGain);

public sealed record SearchRankingSummary(
    double Recall,
    double Precision,
    double HitRate,
    double MeanReciprocalRank,
    double MeanAveragePrecision,
    double NormalizedDiscountedCumulativeGain,
    SearchRankingConfidenceIntervals ConfidenceIntervals);

public sealed record SearchRankingConfidenceIntervals(
    SearchConfidenceInterval Recall,
    SearchConfidenceInterval Precision,
    SearchConfidenceInterval HitRate,
    SearchConfidenceInterval MeanReciprocalRank,
    SearchConfidenceInterval MeanAveragePrecision,
    SearchConfidenceInterval NormalizedDiscountedCumulativeGain)
{
    public static SearchRankingConfidenceIntervals Empty { get; } = new(
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0));
}

public sealed record SearchConfidenceInterval(double Lower, double Upper);

public sealed record SearchScoreMetrics(
    double? ScoreAverage,
    double? CreditedScoreAverage,
    double? UncreditedScoreAverage,
    double? CreditedToUncreditedSameSourceScoreGap);

public sealed record SearchQueryDiagnostics(
    int RetrievedCount,
    int ExpectedCount,
    IReadOnlyList<SearchExpectedDiagnostic> ExpectedDocuments,
    IReadOnlyList<string> MissingExpectedSourcePaths,
    IReadOnlyList<string> DuplicateRetrievedSourcePaths,
    SearchChunkDiagnostics ChunkDiagnostics,
    IReadOnlyList<SearchMatchDiagnostic> Matches);

public sealed record SearchChunkDiagnostics(
    int RetrievedChunkCount,
    int UniqueSourceCount,
    int DuplicateSourceCount,
    double AverageRetrievedChunkLength,
    double EvidenceCoverage,
    int RelevantRetrievedCount);

public sealed record SearchExpectedDiagnostic(
    int Index,
    string SourcePath,
    string? Heading,
    string? SnippetPreview,
    bool Matched);

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
