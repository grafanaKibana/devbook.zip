namespace KnowledgeHub.Data;

using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenAI;
using System.ClientModel;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddServices(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IngestionService>();
        services.AddScoped<ChunkingService>();
        services.AddScoped<IDocumentRepository, DocumentRepository>();
        services.AddScoped<IChunkRepository, ChunkRepository>();
        services.AddScoped<RagSearchService>();

        services.AddEmbeddingGenerator(CreateEmbeddingGenerator);
        services.AddSingleton<EmbeddingService>();

        return services;
    }


    private static IEmbeddingGenerator<string, Embedding<float>> CreateEmbeddingGenerator(IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);

        var options = serviceProvider.GetRequiredService<IOptions<EmbeddingOptions>>().Value;

        if (string.IsNullOrWhiteSpace(options.ApiKey))
        {
            throw new InvalidOperationException("EmbeddingOptions API key is required. Configure EmbeddingOptions:ApiKey or OPENAI_API_KEY.");
        }

        if (string.IsNullOrWhiteSpace(options.ModelId))
        {
            throw new InvalidOperationException("EmbeddingOptions model ID is required. Configure EmbeddingOptions:ModelId.");
        }

        var client = string.IsNullOrWhiteSpace(options.Endpoint)
            ? new OpenAIClient(options.ApiKey)
            : new OpenAIClient(
                new ApiKeyCredential(options.ApiKey),
                new OpenAIClientOptions
                {
                    Endpoint = new Uri(options.Endpoint, UriKind.Absolute),
                });

        return client.GetEmbeddingClient(options.ModelId).AsIEmbeddingGenerator(options.VectorDimensions);
    }
}
