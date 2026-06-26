namespace DevBook.Data;

using System.ClientModel;
using DevBook.Data.Agents;
using DevBook.Data.Agents.Abstractions;
using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Data.Services.Chunking;
using DevBook.Data.Services.Reranking;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenAI;

/// <summary>
/// Registers DevBook data services and RAG agents.
/// </summary>
public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Registers repositories, chunking services, rerankers, and Microsoft Agent Framework agents.
        /// </summary>
        /// <returns>The same service collection so registrations can be chained.</returns>
        public IServiceCollection AddServices()
        {
            ArgumentNullException.ThrowIfNull(services);

            // Ingestion
            services.AddScoped<IIngestionService, IngestionService>();

            // Chunking strategies. Each concrete strategy is registered once and then re-resolved as
            // IChunkingStrategy, so a single shared instance is reachable both by concrete type and via
            // GetServices<IChunkingStrategy>() (which CreateChunkingService selects from by Strategy).
            services.AddScoped<FixedSizeChunkingStrategy>();
            services.AddScoped<MarkdownSectionChunkingStrategy>();
            services.AddScoped<SemanticChunkingStrategy>();

            services.AddScoped<IChunkingStrategy>(serviceProvider => serviceProvider.GetRequiredService<FixedSizeChunkingStrategy>());
            services.AddScoped<IChunkingStrategy>(serviceProvider => serviceProvider.GetRequiredService<MarkdownSectionChunkingStrategy>());
            services.AddScoped<IChunkingStrategy>(serviceProvider => serviceProvider.GetRequiredService<SemanticChunkingStrategy>());

            // One IChunkingService per strategy, resolved at registration time. There is deliberately no
            // IChunkingStrategyFactory (unlike reranking below): the chunker set is built here and later
            // filtered by IngestionService via service.Strategy, so no per-request factory is needed.
            services.AddScoped<IChunkingService>(serviceProvider => CreateChunkingService(serviceProvider, ChunkingStrategyKind.FixedSize));
            services.AddScoped<IChunkingService>(serviceProvider => CreateChunkingService(serviceProvider, ChunkingStrategyKind.MarkdownSection));
            services.AddScoped<IChunkingService>(serviceProvider => CreateChunkingService(serviceProvider, ChunkingStrategyKind.Semantic));

            // Reranking strategies. Same concrete-then-interface idiom as chunking, but selection is exposed
            // through IRerankingStrategyFactory because the active reranker is chosen per request from RagSearchOptions.
            services.AddScoped<NoRerankingStrategy>();
            services.AddScoped<Bm25RerankingStrategy>();
            services.AddScoped<MaximalMarginalRelevanceRerankingStrategy>();
            services.AddScoped<LlmRerankingStrategy>();
            services.AddScoped<ReciprocalRankFusionRerankingStrategy>();

            services.AddScoped<IRerankingStrategy>(serviceProvider => serviceProvider.GetRequiredService<NoRerankingStrategy>());
            services.AddScoped<IRerankingStrategy>(serviceProvider => serviceProvider.GetRequiredService<Bm25RerankingStrategy>());
            services.AddScoped<IRerankingStrategy>(serviceProvider => serviceProvider.GetRequiredService<MaximalMarginalRelevanceRerankingStrategy>());
            services.AddScoped<IRerankingStrategy>(serviceProvider => serviceProvider.GetRequiredService<LlmRerankingStrategy>());
            services.AddScoped<IRerankingStrategy>(serviceProvider => serviceProvider.GetRequiredService<ReciprocalRankFusionRerankingStrategy>());
            services.AddScoped<IRerankingStrategyFactory, RerankingStrategyFactory>();

            // Repositories
            services.AddScoped<IDocumentRepository, DocumentRepository>();
            services.AddScoped<IChunkRepositoryFactory, ChunkRepositoryFactory>();

            // RAG services
            services.AddScoped<IRagSearchService, RagSearchService>();
            services.AddScoped<IRagAskService, RagAskService>();

            // Agents
            services.AddAgent<AnswerAgent>();
            services.AddAgent<RerankingAgent>();

            // Embeddings
            services.AddEmbeddingGenerator(CreateEmbeddingGenerator);
            services.AddSingleton<IEmbeddingService, EmbeddingService>();

            return services;
        }
    }


    private static IChunkingService CreateChunkingService(IServiceProvider serviceProvider, ChunkingStrategyKind strategy)
    {
        var chunkingStrategy = serviceProvider.GetServices<IChunkingStrategy>().Single(item => item.Strategy == strategy);
        var chunkRepository = serviceProvider.GetRequiredService<IChunkRepositoryFactory>().Create(strategy);
        var embeddingService = serviceProvider.GetRequiredService<IEmbeddingService>();

        return new ChunkingService(chunkRepository, embeddingService, chunkingStrategy);
    }


    private static IEmbeddingGenerator<string, Embedding<float>> CreateEmbeddingGenerator(IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);

        var options = serviceProvider.GetRequiredService<IOptions<EmbeddingOptions>>().Value;
        var openAIOptions = serviceProvider.GetRequiredService<IOptions<OpenAIOptions>>().Value;

        var client = CreateOpenAIClient(openAIOptions);

        if (string.IsNullOrWhiteSpace(options.ModelId))
        {
            throw new InvalidOperationException("EmbeddingOptions model ID is required. Configure EmbeddingOptions:ModelId.");
        }

        return client.GetEmbeddingClient(options.ModelId).AsIEmbeddingGenerator(options.VectorDimensions);
    }

    /// <summary>
    /// Builds an <see cref="OpenAIClient"/> from <see cref="OpenAIOptions"/>, honoring the configured
    /// endpoint when present. Shared by the embedding generator and every chat agent so the API-key
    /// guard and endpoint policy live in exactly one place.
    /// </summary>
    private static OpenAIClient CreateOpenAIClient(OpenAIOptions openAIOptions)
    {
        if (string.IsNullOrWhiteSpace(openAIOptions.ApiKey))
        {
            throw new InvalidOperationException("OpenAIOptions API key is required. Configure OpenAIOptions:ApiKey.");
        }

        return string.IsNullOrWhiteSpace(openAIOptions.Endpoint)
            ? new OpenAIClient(openAIOptions.ApiKey)
            : new OpenAIClient(
                new ApiKeyCredential(openAIOptions.ApiKey),
                new OpenAIClientOptions
                {
                    Endpoint = new Uri(openAIOptions.Endpoint, UriKind.Absolute),
                });
    }

    private static void AddAgent<T>(this IServiceCollection services)
        where T : class, IAgentConfig
    {
        services.AddSingleton<T>();

        services.AddKeyedSingleton<AIAgent>(typeof(T).Name, (serviceProvider, _) =>
        {
            var config = serviceProvider.GetRequiredService<T>();
            var openAIOptions = serviceProvider.GetRequiredService<IOptions<OpenAIOptions>>().Value;

            var client = CreateOpenAIClient(openAIOptions);

            if (string.IsNullOrWhiteSpace(config.ModelId))
            {
                throw new InvalidOperationException($"{config.Name} model ID is required. Override {nameof(IAgentConfig.ModelId)} with a non-empty value.");
            }

            var chatClient = client.GetChatClient(config.ModelId).AsIChatClient();

            return new ChatClientAgent(chatClient, config.ChatClientAgentOptions);
        });
    }
}
