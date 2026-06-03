namespace KnowledgeHub.Evaluations.Common.Calculators;

using KnowledgeHub.Evaluations.Scenarios.RAGSearch;

public static class RAGSearchMetricCalculator
{
    public static RAGSearchReport Evaluate(
        IReadOnlyList<RAGSearchPrediction> cases,
        int topK = 5)
    {
        var queryMetrics = cases.Select(queryCase => ScoreQuery(queryCase, topK)).ToArray();

        if (queryMetrics.Length == 0)
        {
            return new RAGSearchReport(topK, 0, 0, 0, 0, [], queryMetrics);
        }

        return new RAGSearchReport(
            topK,
            queryMetrics.Average(metric => metric.RecallAtK),
            queryMetrics.Average(metric => metric.PrecisionAtK),
            queryMetrics.Average(metric => metric.ReciprocalRank),
            queryMetrics.Count(metric => metric.IsEmptyResult) / (double)queryMetrics.Length,
            SummarizeSourceDocuments(cases, queryMetrics),
            queryMetrics);
    }

    public static RAGSearchQueryMetrics ScoreQuery(RAGSearchPrediction queryCase, int topK = 5)
    {
        var expectedDocuments = queryCase.ExpectedDocuments;
        var retrievedDocuments = queryCase.RetrievedDocuments.Take(topK).ToArray();
        var matchedExpected = new bool[expectedDocuments.Count];
        var duplicateRetrievedSourcePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenRetrievedSourcePaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var matchDiagnostics = new List<RAGSearchMatchDiagnostic>(retrievedDocuments.Length);
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
                matchDiagnostics.Add(new RAGSearchMatchDiagnostic(
                    rank,
                    retrievedDocument.SourcePath,
                    retrievedDocument.Heading,
                    Preview(retrievedDocument.Snippet),
                    analysis.Expected?.SourcePath,
                    analysis.Expected?.Heading,
                    Preview(analysis.Expected?.Snippet),
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

            matchDiagnostics.Add(new RAGSearchMatchDiagnostic(
                rank,
                retrievedDocument.SourcePath,
                retrievedDocument.Heading,
                Preview(retrievedDocument.Snippet),
                analysis.Expected!.SourcePath,
                analysis.Expected.Heading,
                Preview(analysis.Expected.Snippet),
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

        var uniqueRetrievedCount = seenRetrievedSourcePaths.Count;
        var expectedCount = expectedDocuments.Count;
        var expectedDiagnostics = expectedDocuments
            .Select((expectedDocument, index) => new RAGSearchExpectedDiagnostic(
                index + 1,
                expectedDocument.SourcePath,
                expectedDocument.Heading,
                Preview(expectedDocument.Snippet),
                matchedExpected[index]))
            .ToArray();
        var recallAtK = expectedCount == 0 ? 0 : matchedExpected.Count(matched => matched) / (double)expectedCount;
        var precisionAtK = retrievedDocuments.Length == 0 ? 0 : relevantRetrievedCount / (double)retrievedDocuments.Length;
        var failureReason = reciprocalRank == 0
            ? "No relevant source document appeared in the retrieved results."
            : null;

        return new RAGSearchQueryMetrics(
            queryCase.CaseId,
            queryCase.Query,
            expectedDocuments.Select(document => document.SourcePath).ToArray(),
            retrievedDocuments.Select(document => document.SourcePath).ToArray(),
            recallAtK,
            precisionAtK,
            reciprocalRank,
            retrievedDocuments.Length == 0,
            failureReason,
            new RAGSearchQueryDiagnostics(
                retrievedDocuments.Length,
                uniqueRetrievedCount,
                expectedCount,
                expectedDiagnostics,
                missingExpectedSourcePaths,
                duplicateRetrievedSourcePaths.OrderBy(path => path, StringComparer.OrdinalIgnoreCase).ToArray(),
                matchDiagnostics));
    }

    private static RetrievedDocumentAnalysis AnalyzeRetrievedDocument(
        IReadOnlyList<RAGSearchDocument> expectedDocuments,
        bool[] matchedExpected,
        RAGSearchDocument retrievedDocument)
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

    private static bool RequiresEvidenceMatch(RAGSearchDocument expectedDocument)
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
        RAGSearchDocument? Expected,
        bool SourcePathMatched,
        bool HeadingMatched,
        bool SnippetMatched,
        string Reason)
    {
        public bool IsRelevant => ExpectedIndex is not null;
    }

    private static IReadOnlyList<RAGSearchSourceDocumentSummary> SummarizeSourceDocuments(
        IReadOnlyList<RAGSearchPrediction> cases,
        IReadOnlyList<RAGSearchQueryMetrics> queryMetrics)
    {
        return cases
            .Zip(queryMetrics)
            .SelectMany(pair => pair.First.ExpectedDocuments
                .Select(expectedDocument => new { expectedDocument.SourcePath, Metrics = pair.Second }))
            .GroupBy(item => NormalizePath(item.SourcePath), StringComparer.OrdinalIgnoreCase)
            .OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)
            .Select(group => new RAGSearchSourceDocumentSummary(
                group.First().SourcePath,
                group.Count(),
                group.Average(item => item.Metrics.RecallAtK),
                group.Average(item => item.Metrics.PrecisionAtK),
                group.Average(item => item.Metrics.ReciprocalRank),
                group.Count(item => item.Metrics.IsEmptyResult)))
            .ToArray();
    }
}
