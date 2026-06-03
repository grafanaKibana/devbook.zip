namespace KnowledgeHub.Evaluations.Scenarios.RAG.Search;

public sealed record SearchPrediction(
    string Query,
    IReadOnlyList<SearchDocument> ExpectedDocuments,
    IReadOnlyList<SearchDocument> RetrievedDocuments);
