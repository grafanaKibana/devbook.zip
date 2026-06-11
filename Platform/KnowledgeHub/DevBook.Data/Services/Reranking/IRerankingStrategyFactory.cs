namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

public interface IRerankingStrategyFactory
{
    IRerankingStrategy Create(RerankingStrategyKind strategy);
}
