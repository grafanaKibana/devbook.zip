namespace KnowledgeHub.Evaluations.Scenarios.RAGSearch;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class RAGSearchEvaluationContext(RAGSearchPrediction prediction, int topK)
    : EvaluationContext(nameof(RAGSearchEvaluationContext), new TextContent(prediction.Query))
{
    public RAGSearchPrediction Prediction { get; } = prediction;

    public int TopK { get; } = topK;
}
