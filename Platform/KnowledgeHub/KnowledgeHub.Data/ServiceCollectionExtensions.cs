namespace KnowledgeHub.Data;

using KnowledgeHub.Data.Jobs;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Services;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenAI;
using System.ClientModel;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddKnowledgeHubDataServices(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IngestionService>();
        services.AddScoped<ChunkingService>();
        services.AddScoped<DocumentChunkIngestionJob>();

        services.AddEmbeddingGenerator(CreateEmbeddingGenerator);
        services.AddSingleton<EmbeddingService>();

        return services;
    }

    private static IEmbeddingGenerator<string, Embedding<float>> CreateEmbeddingGenerator(IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(serviceProvider);

        var options = serviceProvider.GetRequiredService<IOptions<EmbeddingOptions>>().Value;
        var apiKey = ResolveEmbeddingSetting(options.ApiKey, "OPENAI_API_KEY");

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Embeddings API key is required. Configure Embeddings:ApiKey or OPENAI_API_KEY.");
        }

        if (string.IsNullOrWhiteSpace(options.ModelId))
        {
            throw new InvalidOperationException("Embeddings model ID is required. Configure Embeddings:ModelId.");
        }

        var endpoint = ResolveEmbeddingSetting(options.Endpoint, "OPENAI_ENDPOINT");

        var client = string.IsNullOrWhiteSpace(endpoint)
            ? new OpenAIClient(apiKey)
            : new OpenAIClient(
                new ApiKeyCredential(apiKey),
                new OpenAIClientOptions
                {
                    Endpoint = new Uri(endpoint, UriKind.Absolute),
                });

        return client
            .GetEmbeddingClient(options.ModelId)
            .AsIEmbeddingGenerator(options.VectorDimensions);
    }

    private static string? ResolveEmbeddingSetting(string? configuredValue, string environmentVariableName)
    {
        return !string.IsNullOrWhiteSpace(configuredValue) ? configuredValue : Environment.GetEnvironmentVariable(environmentVariableName);
    }
}
