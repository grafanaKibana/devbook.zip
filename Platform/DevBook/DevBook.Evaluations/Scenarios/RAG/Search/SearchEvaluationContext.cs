namespace DevBook.Evaluations.Scenarios.RAG.Search;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Carries a search prediction into the Microsoft evaluation pipeline.
/// </summary>
/// <param name="prediction">The prediction to evaluate.</param>
/// <param name="topK">Maximum rank cutoff used for primary metrics.</param>
public sealed class SearchEvaluationContext(SearchPrediction prediction, int topK)
    : EvaluationContext(nameof(SearchEvaluationContext), BuildContents(prediction))
{
    /// <summary>
    /// Gets the prediction evaluated by this context.
    /// </summary>
    public SearchPrediction Prediction { get; } = prediction;

    /// <summary>
    /// Gets the maximum number of results requested.
    /// </summary>
    public int TopK { get; } = topK;

    private static TextContent BuildContents(SearchPrediction prediction)
        => new(string.Join("\n", prediction.ExpectedDocuments.Select(document =>
            document.Heading is null ? document.SourcePath : $"{document.SourcePath} § {document.Heading}")));
}
