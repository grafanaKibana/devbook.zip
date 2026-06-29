namespace DevBook.Data.Models;

/// <summary>
/// Request to answer a question with retrieved RAG context.
/// </summary>
/// <param name="Question">Question sent to retrieval and the answer agent.</param>
/// <param name="TopK">Requested number of source chunks used for answering.</param>
public sealed record RagAskRequest(string Question, int TopK = 5);
