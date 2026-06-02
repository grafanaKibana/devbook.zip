namespace KnowledgeHub.Data.Services;

using KnowledgeHub.Data.Models;

public interface IRagSearchService
{
    Task<RagSearchResponse> SearchAsync(
        RagSearchRequest request,
        CancellationToken cancellationToken = default);
}