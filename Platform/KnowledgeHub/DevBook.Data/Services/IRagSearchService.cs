namespace DevBook.Data.Services;

using DevBook.Data.Models;

public interface IRagSearchService
{
    Task<RagSearchResponse> SearchAsync(
        RagSearchRequest request,
        CancellationToken cancellationToken = default);
}