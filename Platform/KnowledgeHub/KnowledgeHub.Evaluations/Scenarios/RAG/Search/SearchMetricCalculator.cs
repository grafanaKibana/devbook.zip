namespace KnowledgeHub.Evaluations.Scenarios.RAG.Search;

public static class SearchMetricCalculator
{
    public static SearchReport Evaluate(
        IReadOnlyList<SearchPrediction> cases,
        int topK = 5)
    {
        var queryMetrics = cases.Select(queryCase => ScoreQuery(queryCase, topK)).ToArray();

        if (queryMetrics.Length == 0)
        {
            return new SearchReport(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }

        return new SearchReport(
            queryMetrics.Length,
            queryMetrics.Average(metric => metric.RecallAtK),
            queryMetrics.Average(metric => metric.PrecisionAtK),
            queryMetrics.Average(metric => metric.HitRateAtK),
            queryMetrics.Average(metric => metric.ReciprocalRank),
            queryMetrics.Count(metric => metric.IsEmptyResult) / (double)queryMetrics.Length,
            AverageAvailable(queryMetrics, metric => metric.ScoreAverage),
            AverageAvailable(queryMetrics, metric => metric.CreditedScoreAverage),
            AverageAvailable(queryMetrics, metric => metric.UncreditedScoreAverage),
            AverageAvailable(queryMetrics, metric => metric.CreditedToUncreditedSameSourceScoreGap));
    }

    public static SearchQueryMetrics ScoreQuery(SearchPrediction queryCase, int topK = 5)
    {
        var expectedDocuments = queryCase.ExpectedDocuments;
        var retrievedDocuments = queryCase.RetrievedDocuments.Take(topK).ToArray();
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
        var recallAtK = expectedCount == 0 ? 0 : matchedExpected.Count(matched => matched) / (double)expectedCount;
        var precisionAtK = retrievedDocuments.Length == 0 ? 0 : relevantRetrievedCount / (double)retrievedDocuments.Length;
        var hitRateAtK = relevantRetrievedCount > 0 ? 1d : 0d;
        var scoreMetrics = CreateScoreMetrics(matchDiagnostics);

        return new SearchQueryMetrics(
            recallAtK,
            precisionAtK,
            hitRateAtK,
            reciprocalRank,
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
                matchDiagnostics));
    }

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

            var headingMatched = MatchesContains(expectedDocument.Heading, retrievedDocument.Heading);
            var snippetMatched = MatchesContains(expectedDocument.Snippet, retrievedDocument.Snippet);

            if (RequiresEvidenceMatch(expectedDocument) && !headingMatched && !snippetMatched)
            {
                evidenceMismatch ??= new RetrievedDocumentAnalysis(
                    null,
                    expectedDocument,
                    true,
                    headingMatched,
                    snippetMatched,
                    "Source path matched an expected document, but neither the expected heading nor expected snippet appeared in the retrieved chunk.");
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
                MatchesContains(alreadyMatchedExpected.ExpectedDocument.Heading, retrievedDocument.Heading),
                MatchesContains(alreadyMatchedExpected.ExpectedDocument.Snippet, retrievedDocument.Snippet),
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

    private static bool RequiresEvidenceMatch(SearchDocument expectedDocument)
    {
        return !string.IsNullOrWhiteSpace(expectedDocument.Heading)
            || !string.IsNullOrWhiteSpace(expectedDocument.Snippet);
    }

    private static bool MatchesSourcePath(string expectedSourcePath, string retrievedSourcePath)
    {
        return string.Equals(NormalizePath(expectedSourcePath), NormalizePath(retrievedSourcePath), StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesContains(string? expectedValue, string? actualValue)
    {
        if (string.IsNullOrWhiteSpace(expectedValue) || string.IsNullOrWhiteSpace(actualValue))
        {
            return false;
        }

        return actualValue.Contains(expectedValue, StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizePath(string value)
    {
        return value.Replace('\\', '/').Trim();
    }

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
        public bool IsRelevant => ExpectedIndex is not null;
    }
}

public sealed record SearchReport(
    int QueryCount,
    double RecallAtK,
    double PrecisionAtK,
    double HitRateAtK,
    double MeanReciprocalRank,
    double EmptyResultRate,
    double ScoreAverage,
    double CreditedScoreAverage,
    double UncreditedScoreAverage,
    double CreditedToUncreditedSameSourceScoreGap);

public sealed record SearchQueryMetrics(
    double RecallAtK,
    double PrecisionAtK,
    double HitRateAtK,
    double ReciprocalRank,
    bool IsEmptyResult,
    double? ScoreAverage,
    double? CreditedScoreAverage,
    double? UncreditedScoreAverage,
    double? CreditedToUncreditedSameSourceScoreGap,
    SearchQueryDiagnostics Diagnostics);

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
    IReadOnlyList<SearchMatchDiagnostic> Matches);

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
