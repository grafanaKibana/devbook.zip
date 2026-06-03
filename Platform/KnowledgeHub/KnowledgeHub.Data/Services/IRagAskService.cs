namespace KnowledgeHub.Data.Services;

using KnowledgeHub.Data.Models;

public interface IRagAskService
{
    Task<RagAskResponse> AskAsync(
        RagAskRequest request,
        CancellationToken cancellationToken = default);
}
