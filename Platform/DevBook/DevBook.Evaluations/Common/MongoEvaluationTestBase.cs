namespace DevBook.Evaluations.Common;

using DevBook.Data;
using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Data.Services.Reranking;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

/// <summary>
/// Base class for evaluation scenarios that need MongoDB-backed RAG services.
/// </summary>
public abstract class MongoEvaluationTestBase<TPrediction> : EvaluationTestBase<TPrediction>
{
    private ServiceProvider? serviceProvider;

    /// <summary>
    /// Gets the RAG search service resolved for evaluation runs.
    /// </summary>
    protected IRagSearchService RagSearchService { get; private set; } = null!;

    /// <summary>
    /// Gets the embedding service resolved for evaluation runs.
    /// </summary>
    protected IEmbeddingService EmbeddingService { get; private set; } = null!;

    /// <summary>
    /// Gets the chunk repository factory resolved for evaluation runs.
    /// </summary>
    protected IChunkRepositoryFactory ChunkRepositoryFactory { get; private set; } = null!;

    /// <summary>
    /// Gets the reranking strategy factory resolved for evaluation runs.
    /// </summary>
    protected IRerankingStrategyFactory RerankingStrategyFactory { get; private set; } = null!;

    /// <summary>
    /// Gets the document repository resolved for evaluation runs.
    /// </summary>
    protected IDocumentRepository DocumentRepository { get; private set; } = null!;

    /// <inheritdoc />
    protected override Task OnSetupAsync()
    {
        var configuration = BuildConfiguration();
        var connectionString = configuration.GetConnectionString("MongoDb");
        var openAIApiKey = configuration.GetSection(nameof(OpenAIOptions)).Get<OpenAIOptions>()?.ApiKey;

        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(openAIApiKey))
        {
            Assert.Ignore($"{this.ScenarioDisplayName} evaluation requires ConnectionStrings:MongoDb and OpenAIOptions:ApiKey.");
        }

        var services = new ServiceCollection();
        services.AddOptions<EmbeddingOptions>().Bind(configuration.GetSection(nameof(EmbeddingOptions)));
        services.AddOptions<OpenAIOptions>().Bind(configuration.GetSection(nameof(OpenAIOptions)));
        services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));
        services.AddSingleton(serviceProvider => serviceProvider.GetRequiredService<IMongoClient>().GetDatabase("DevBook"));
        services.AddSingleton(serviceProvider => serviceProvider.GetRequiredService<IMongoDatabase>().GetCollection<Document>("documents"));
        services.AddServices();

        serviceProvider = services.BuildServiceProvider();
        this.RagSearchService = serviceProvider.GetRequiredService<IRagSearchService>();
        this.EmbeddingService = serviceProvider.GetRequiredService<IEmbeddingService>();
        this.ChunkRepositoryFactory = serviceProvider.GetRequiredService<IChunkRepositoryFactory>();
        this.RerankingStrategyFactory = serviceProvider.GetRequiredService<IRerankingStrategyFactory>();
        this.DocumentRepository = serviceProvider.GetRequiredService<IDocumentRepository>();

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    protected override async Task OnTeardownAsync()
    {
        if (serviceProvider is not null)
        {
            await serviceProvider.DisposeAsync();
        }
    }

    private static IConfiguration BuildConfiguration()
        => new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Evaluations.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
}
