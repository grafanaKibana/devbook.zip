namespace DevBook.Evaluations.Common;

internal static class EvaluationExecutionContext
{
    /// <summary>
    /// Gets execution name.
    /// </summary>
    public static string ExecutionName { get; } = $"EvaluationRun-{DateTime.Now:dd.MM.yyyy-HH.mm.ss}";

    /// <summary>
    /// Gets reports path.
    /// </summary>
    public static string ReportsPath { get; } = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "EvaluationReports"));
}
