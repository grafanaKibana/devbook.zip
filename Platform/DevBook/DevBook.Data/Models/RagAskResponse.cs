namespace DevBook.Data.Models;

/// <summary>
/// Generated answer and retrieved evidence returned by the RAG ask endpoint.
/// </summary>
/// <param name="Question">Normalized question used for retrieval and answering.</param>
/// <param name="Answer">Answer generated from retrieved source chunks.</param>
/// <param name="Mode">Retrieval mode used to obtain sources.</param>
/// <param name="Sources">Retrieved chunks supplied to the answer agent.</param>
public sealed record RagAskResponse(
    string Question,
    string Answer,
    string Mode,
    IReadOnlyList<RagChunkResponse> Sources);
