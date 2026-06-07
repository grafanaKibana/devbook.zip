namespace KnowledgeHub.Data;

using System.ClientModel;
using KnowledgeHub.Data.Agents;
using KnowledgeHub.Data.Agents.Abstractions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Data.Services.Chunking;
using KnowledgeHub.Data.Services.Reranking;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenAI;

public static class ServiceCollectionExtensions
{
    extension(IServiceCollection services)
    {
        public IServiceCollection AddServices()
        {
            ArgumentNullException.ThrowIfNull(services);

            services.AddScoped<IIngestionService, IngestionService>();

            services.AddScoped<FixedSizeChunkingStrategy>();
            services.AddScoped<MarkdownSectionChunkingStrategy>();
            services.AddScoped<SemanticChunkingStrategy>();

            services.AddScoped<IChunkingStrategy>(serviceProvider => serviceProvider.GetRequiredService<FixedSizeChunkingStrategy>());
            services.AddScoped<IChunkingStrategy>(serviceProvider => serviceProvider.GetRequiredService<MarkdownSectionChunkingStrategy>());
            services.AddScoped<IChunkingStrategy>(serviceProvider => serviceProvider.GetRequiredService<SemanticChunkingStrategy>());

            services.AddScoped<IChunkingService>(serviceProvider => CreateChunkingService(serviceProvider, ChunkingStrategyKind.FixedSize));
            services.AddScoped<IChunkingService>(serviceProvider => CreateChunkingService(serviceProvider, ChunkingStrategyKind.MarkdownSection));
            services.AddScoped<IChunkingService>(serviceProvider => CreateChunkingService(serviceProvider, ChunkingStrategyKind.Semantic));

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

            services.AddScoped<IDocumentRepository, DocumentRepository>();
            services.AddScoped<IChunkRepositoryFactory, ChunkRepositoryFactory>();

            services.AddScoped<IRagSearchService, RagSearchService>();
            services.AddScoped<IRagAskService, RagAskService>();

            services.AddAgent<AnswerAgent>();
            services.AddAgent<RerankingAgent>();

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

        if (string.IsNullOrWhiteSpace(openAIOptions.ApiKey))
        {
            throw new InvalidOperationException("OpenAIOptions API key is required. Configure OpenAIOptions:ApiKey.");
        }

        if (string.IsNullOrWhiteSpace(options.ModelId))
        {
            throw new InvalidOperationException("EmbeddingOptions model ID is required. Configure EmbeddingOptions:ModelId.");
        }

        var client = string.IsNullOrWhiteSpace(openAIOptions.Endpoint)
            ? new OpenAIClient(openAIOptions.ApiKey)
            : new OpenAIClient(
                new ApiKeyCredential(openAIOptions.ApiKey),
                new OpenAIClientOptions
                {
                    Endpoint = new Uri(openAIOptions.Endpoint, UriKind.Absolute),
                });

        return client.GetEmbeddingClient(options.ModelId).AsIEmbeddingGenerator(options.VectorDimensions);
    }

    private static void AddAgent<T>(this IServiceCollection services)
        where T : class, IAgentConfig
    {
        services.AddSingleton<T>();

        services.AddKeyedSingleton<AIAgent>(typeof(T).Name, (serviceProvider, _) =>
        {
            var config = serviceProvider.GetRequiredService<T>();
            var openAIOptions = serviceProvider.GetRequiredService<IOptions<OpenAIOptions>>().Value;

            if (string.IsNullOrWhiteSpace(openAIOptions.ApiKey))
            {
                throw new InvalidOperationException("OpenAIOptions API key is required. Configure OpenAIOptions:ApiKey.");
            }

            if (string.IsNullOrWhiteSpace(config.ModelId))
            {
                throw new InvalidOperationException($"{config.Name} model ID is required. Override {nameof(IAgentConfig.ModelId)} with a non-empty value.");
            }

            var client = string.IsNullOrWhiteSpace(openAIOptions.Endpoint)
                ? new OpenAIClient(openAIOptions.ApiKey)
                : new OpenAIClient(
                    new ApiKeyCredential(openAIOptions.ApiKey),
                    new OpenAIClientOptions
                    {
                        Endpoint = new Uri(openAIOptions.Endpoint, UriKind.Absolute),
                    });

            var chatClient = client.GetChatClient(config.ModelId).AsIChatClient();

            return new ChatClientAgent(chatClient, config.ChatClientAgentOptions);
        });
    }
}
