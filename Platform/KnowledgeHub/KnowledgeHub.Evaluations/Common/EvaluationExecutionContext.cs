namespace KnowledgeHub.Evaluations.Common;

internal static class EvaluationExecutionContext
{
    public static string ExecutionName { get; } = $"EvaluationRun-{DateTime.Now:dd.MM.yyyy-HH.mm.ss}";

    public static string ReportsPath { get; } = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "EvaluationReports"));
}
