namespace DevBook.Data.Services;

using System.Diagnostics;
using DevBook.Data.Agents;
using DevBook.Data.Models;
using Microsoft.Agents.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Answers RAG questions using retrieved chunks and the answer agent.
/// </summary>
/// <param name="ragSearchService">RAG search service used to retrieve source chunks.</param>
/// <param name="answerAgent">Agent that generates the grounded answer.</param>
public sealed class RagAskService(
    IRagSearchService ragSearchService,
    [FromKeyedServices(nameof(AnswerAgent))] AIAgent answerAgent,
    ILogger<RagAskService>? logger = null) : IRagAskService
{
    private readonly ILogger<RagAskService> logger = logger ?? NullLogger<RagAskService>.Instance;

    /// <summary>
    /// Answers one RAG question.
    /// </summary>
    /// <param name="request">The request to process.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The generated answer and source chunks.</returns>
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
        var stopwatch = Stopwatch.StartNew();

        logger.LogInformation(
            "Starting RAG ask with QuestionLength {QuestionLength} and TopK {TopK}.",
            question.Length,
            request.TopK);

        var searchResult = await ragSearchService.SearchAsync(
            new RagSearchRequest(question, request.TopK),
            cancellationToken);

        var query = BuildAgentInput(question, searchResult.Results);
        var response = await answerAgent.RunAsync(query, cancellationToken: cancellationToken);

        logger.LogInformation(
            "Completed RAG ask in {ElapsedMilliseconds} ms. Mode {Mode}, SourceCount {SourceCount}, AnswerLength {AnswerLength}.",
            stopwatch.ElapsedMilliseconds,
            searchResult.Mode,
            searchResult.Results.Count,
            response.Text.Length);

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
