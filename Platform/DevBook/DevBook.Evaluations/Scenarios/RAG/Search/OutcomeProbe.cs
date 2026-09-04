namespace DevBook.Evaluations.Scenarios.RAG.Search;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

[TestFixture]
public sealed class OutcomeProbe
{
    private static readonly SearchDocument Expected = new("Notes/RAG.md", "Tradeoffs", "Retrieval adds external knowledge at query time.");

    [TestCase(0, "NoResults")]
    [TestCase(1, "Hit@1")]
    [TestCase(3, "Hit@3")]
    [TestCase(-1, "Miss")]
    public async Task ProducesOutcomeLabel(int hitRank, string expectedOutcome)
    {
        var retrieved = new List<SearchDocument>();
        for (var rank = 1; rank <= (hitRank == 0 ? 0 : 5); rank++)
        {
            retrieved.Add(rank == hitRank
                ? Expected with { Rank = rank, Score = 0.9 }
                : new SearchDocument("Notes/Other.md", "Intro", "Unrelated text.", rank, 0.5));
        }

        var prediction = new SearchPrediction("query", [Expected], retrieved);
        var result = await new SearchEvaluator().EvaluateAsync(
            [new ChatMessage(ChatRole.User, "query")],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, string.Empty)),
            additionalContext: [new SearchEvaluationContext(prediction, 10)]);

        var metric = result.Get<StringMetric>("RetrievalOutcome");
        await TestContext.Progress.WriteLineAsync($"{metric.GetType().Name} RetrievalOutcome = {metric.Value}");
        Assert.That(metric.Value, Is.EqualTo(expectedOutcome));
    }
}
