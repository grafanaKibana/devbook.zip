namespace DevBook.Data.Services;

using DevBook.Data.Models;

public interface IRagAskService
{
    Task<RagAskResponse> AskAsync(
        RagAskRequest request,
        CancellationToken cancellationToken = default);
}
