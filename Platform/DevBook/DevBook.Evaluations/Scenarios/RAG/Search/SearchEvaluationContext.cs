namespace DevBook.Evaluations.Scenarios.RAG.Search;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class SearchEvaluationContext(SearchPrediction prediction, int topK)
    : EvaluationContext(nameof(SearchEvaluationContext), new TextContent(prediction.Query))
{
    public SearchPrediction Prediction { get; } = prediction;

    public int TopK { get; } = topK;
}
