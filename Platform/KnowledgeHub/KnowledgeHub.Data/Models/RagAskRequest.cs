namespace KnowledgeHub.Data.Models;

public sealed record RagAskRequest(string Question, int TopK = 5);