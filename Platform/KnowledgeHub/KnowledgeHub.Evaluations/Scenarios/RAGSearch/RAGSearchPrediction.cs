namespace KnowledgeHub.Evaluations.Scenarios.RAGSearch;

public sealed record RAGSearchPrediction(
    string CaseId,
    string Query,
    IReadOnlyList<RAGSearchDocument> ExpectedDocuments,
    IReadOnlyList<RAGSearchDocument> RetrievedDocuments);
