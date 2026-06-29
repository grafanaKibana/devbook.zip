namespace DevBook.Data.Services;

using DevBook.Data.Models;

/// <summary>
/// Defines RAG question answering operations.
/// </summary>
public interface IRagAskService
{
    /// <summary>
    /// Answers a question using retrieved RAG chunks.
    /// </summary>
    /// <param name="request">The question and result count.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The generated answer and source chunks.</returns>
    Task<RagAskResponse> AskAsync(
        RagAskRequest request,
        CancellationToken cancellationToken = default);
}
