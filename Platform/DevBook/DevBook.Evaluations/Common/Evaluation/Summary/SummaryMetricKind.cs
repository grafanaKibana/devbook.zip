namespace DevBook.Evaluations.Common.Evaluation.Summary;

/// <summary>
/// Selects how a summary metric value should be rounded and displayed in reports.
/// </summary>
public enum SummaryMetricKind
{
    /// <summary>
    /// Whole-number metric such as evaluated sample count.
    /// </summary>
    Count,

    /// <summary>
    /// Decimal metric shown as a plain number, such as an average score.
    /// </summary>
    PlainNumber,

    /// <summary>
    /// Fractional metric interpreted as a rate, such as recall or empty-result rate.
    /// </summary>
    Percentage,
}
