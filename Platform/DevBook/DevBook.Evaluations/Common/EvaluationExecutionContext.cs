namespace DevBook.Evaluations.Common;

internal static class EvaluationExecutionContext
{
    /// <summary>
    /// Gets execution name. Set EVAL_EXECUTION_NAME to write into an existing run folder (so a
    /// scenario can be appended to a prior run); otherwise a fresh timestamped run is created.
    /// </summary>
    public static string ExecutionName { get; } =
        Environment.GetEnvironmentVariable("EVAL_EXECUTION_NAME") is { Length: > 0 } name
            ? name
            : $"EvaluationRun-{DateTime.Now:dd.MM.yyyy-HH.mm.ss}";

    /// <summary>
    /// Gets reports path.
    /// </summary>
    public static string ReportsPath { get; } = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "EvaluationReports"));
}
