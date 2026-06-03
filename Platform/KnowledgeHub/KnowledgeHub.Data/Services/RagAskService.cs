namespace KnowledgeHub.Data.Services;

using System.Text;
using KnowledgeHub.Data.Agents;
using KnowledgeHub.Data.Models;
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

        var response = await answerAgent.RunAsync(BuildAgentInput(question, searchResult.Results), cancellationToken: cancellationToken);

        return new RagAskResponse(question, response.Text, searchResult.Mode, searchResult.Results);
    }

    private static string BuildAgentInput(string question, IReadOnlyList<RagChunkResponse> sources)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Question:").AppendLine(question).AppendLine();
        builder.AppendLine("Sources:");

        for (var index = 0; index < sources.Count; index++)
        {
            var source = sources[index];
            builder.Append('[').Append(index + 1).Append("] ").AppendLine(source.CitationLabel);
            builder.AppendLine(source.ChunkText.Trim()).AppendLine();
        }

        return builder.ToString();
    }
}
