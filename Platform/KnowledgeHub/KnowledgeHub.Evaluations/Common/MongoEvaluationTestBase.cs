namespace KnowledgeHub.Evaluations.Common;

using KnowledgeHub.Data;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Data.Services.Reranking;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

public abstract class MongoEvaluationTestBase<TPrediction> : EvaluationTestBase<TPrediction>
{
    private ServiceProvider? serviceProvider;

    protected IRagSearchService RagSearchService { get; private set; } = null!;

    protected IEmbeddingService EmbeddingService { get; private set; } = null!;

    protected IChunkRepositoryFactory ChunkRepositoryFactory { get; private set; } = null!;

    protected IRerankingStrategyFactory RerankingStrategyFactory { get; private set; } = null!;

    protected IDocumentRepository DocumentRepository { get; private set; } = null!;

    protected override Task OnSetupAsync()
    {
        var configuration = BuildConfiguration();
        var connectionString = configuration.GetConnectionString("MongoDb");
        var embeddingApiKey = configuration.GetSection(nameof(EmbeddingOptions)).Get<EmbeddingOptions>()?.ApiKey;

        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(embeddingApiKey))
        {
            Assert.Ignore($"{this.ScenarioDisplayName} evaluation requires ConnectionStrings:MongoDb and EmbeddingOptions:ApiKey.");
        }

        var services = new ServiceCollection();
        services.AddOptions<EmbeddingOptions>().Bind(configuration.GetSection(nameof(EmbeddingOptions)));
        services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));
        services.AddSingleton(serviceProvider => serviceProvider.GetRequiredService<IMongoClient>().GetDatabase("KnowledgeHub"));
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
