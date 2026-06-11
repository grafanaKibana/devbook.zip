namespace DevBook.Data.Models;

public sealed record RagSearchResponse(
    string Query,
    string Mode,
    IReadOnlyList<RagChunkResponse> Results);
