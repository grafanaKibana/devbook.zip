namespace DevBook.Data.Services;

public static class RagRetrievalPolicy
{
    public const int DefaultTopK = 5;

    public const int MaxTopK = 10;

    public const int RerankingCandidateMultiplier = 5;

    public const int MaxRerankingCandidateCount = 50;

    public const int VectorSearchNumCandidatesMultiplier = 10;

    public static int NormalizeTopK(int requestedTopK) =>
        requestedTopK <= 0 ? DefaultTopK : Math.Min(requestedTopK, MaxTopK);

    public static int GetRerankingCandidateCount(int topK) =>
        Math.Min(topK * RerankingCandidateMultiplier, MaxRerankingCandidateCount);

    public static int GetVectorSearchNumCandidates(int rerankingCandidateCount) =>
        rerankingCandidateCount * VectorSearchNumCandidatesMultiplier;
}
