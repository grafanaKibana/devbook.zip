namespace DevBook.Data.Services;

using DevBook.Data.Models;

/// <summary>
/// Defines RAG chunk search operations.
/// </summary>
public interface IRagSearchService
{
    /// <summary>
    /// Searches indexed RAG chunks for a query.
    /// </summary>
    /// <param name="request">The search query and result count.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The normalized query, retrieval mode, and matching chunks.</returns>
    Task<RagSearchResponse> SearchAsync(
        RagSearchRequest request,
        CancellationToken cancellationToken = default);
}
