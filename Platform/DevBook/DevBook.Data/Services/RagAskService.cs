namespace DevBook.Data.Services;

using DevBook.Data.Agents;
using DevBook.Data.Models;
using Microsoft.Agents.AI;
using Microsoft.Extensions.DependencyInjection;

public sealed class RagAskService(
    IRagSearchService ragSearchService,
    [FromKeyedServices(nameof(AnswerAgent))] AIAgent answerAgent) : IRagAskService
{
    public async Task<RagAskResponse> AskAsync(
        RagAskRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Question))
        {
            throw new ArgumentException("Question is required.");
        }

        var question = request.Question.Trim();
        var searchResult = await ragSearchService.SearchAsync(
            new RagSearchRequest(question, request.TopK),
            cancellationToken);

        var query = BuildAgentInput(question, searchResult.Results);
        var response = await answerAgent.RunAsync(query, cancellationToken: cancellationToken);

        return new RagAskResponse(question, response.Text, searchResult.Mode, searchResult.Results);
    }

    private static string BuildAgentInput(string question, IReadOnlyList<RagChunkResponse> sources)
    {
        return $"""
            Question:
            {question}

            Sources:
            {BuildSourceBlocks(sources)}
            """;
    }

    private static string BuildSourceBlocks(IReadOnlyList<RagChunkResponse> sources)
    {
        return string.Join(Environment.NewLine, sources.Select((source, index) =>
            $"""
            [{index + 1}] {source.CitationLabel}
            {source.ChunkText.Trim()}

            """));
    }
}
