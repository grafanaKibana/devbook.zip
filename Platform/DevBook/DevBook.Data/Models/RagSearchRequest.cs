namespace DevBook.Data.Models;

/// <summary>
/// Request to retrieve chunks for a RAG query.
/// </summary>
/// <param name="Query">Question or search phrase to embed and search for.</param>
/// <param name="TopK">Requested number of final chunks. The service normalizes unsupported values.</param>
public sealed record RagSearchRequest(string Query, int TopK = 5);
