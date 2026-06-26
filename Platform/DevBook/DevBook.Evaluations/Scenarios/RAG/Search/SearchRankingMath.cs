namespace DevBook.Evaluations.Scenarios.RAG.Search;

using DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Pure ranking and bootstrap-statistics math for <see cref="SearchMetricCalculator"/>: average
/// precision, normalized discounted cumulative gain, and the bootstrap mean confidence interval.
/// The AP/NDCG formulas are generic over the match type — callers project each match to its rank and
/// relevance — so one formula serves both document-level and section-level matches.
/// </summary>
internal static class SearchRankingMath
{
    private const int BootstrapIterations = 1_000;

    internal static double AveragePrecision<TMatch>(
        int expectedCount,
        IReadOnlyList<TMatch> matchesAtCutoff,
        Func<TMatch, int> rank,
        Func<TMatch, bool> isRelevant)
    {
        if (expectedCount == 0)
        {
            return 0;
        }

        var relevantSeen = 0;
        var precisionSum = 0d;
        foreach (var match in matchesAtCutoff)
        {
            if (!isRelevant(match))
            {
                continue;
            }

            relevantSeen++;
            precisionSum += relevantSeen / (double)rank(match);
        }

        return precisionSum / expectedCount;
    }

    internal static double NormalizedDiscountedCumulativeGain<TMatch>(
        int expectedCount,
        IReadOnlyList<TMatch> matchesAtCutoff,
        int cutoff,
        Func<TMatch, int> rank,
        Func<TMatch, bool> isRelevant)
    {
        if (expectedCount == 0)
        {
            return 0;
        }

        var idealRelevantCount = Math.Min(expectedCount, cutoff);
        var idealDcg = Enumerable.Range(1, idealRelevantCount).Sum(rankPosition => Discount(rankPosition));
        if (idealDcg == 0)
        {
            return 0;
        }

        var dcg = matchesAtCutoff.Where(isRelevant).Sum(match => Discount(rank(match)));
        return dcg / idealDcg;
    }

    internal static SearchConfidenceInterval BootstrapMeanConfidenceInterval(IReadOnlyList<double> values)
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

    internal static double? AverageOrNull(IReadOnlyList<double> values)
        => values.Count == 0 ? null : values.Average();

    private static double Discount(int rank) => 1d / Math.Log2(rank + 1);
}
