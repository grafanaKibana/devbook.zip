namespace DevBook.Data.Models;

public sealed record RagAskResponse(
    string Question,
    string Answer,
    string Mode,
    IReadOnlyList<RagChunkResponse> Sources);
