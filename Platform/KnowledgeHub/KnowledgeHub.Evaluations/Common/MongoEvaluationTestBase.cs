namespace KnowledgeHub.Evaluations.Common;

using KnowledgeHub.Data;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;

public abstract class MongoEvaluationTestBase<TPrediction> : EvaluationTestBase<TPrediction>
{
    private ServiceProvider? serviceProvider;

    protected IRagSearchService RagSearchService { get; private set; } = null!;

    protected IDocumentRepository DocumentRepository { get; private set; } = null!;

    protected override Task OnSetupAsync()
    {
        var configuration = BuildConfiguration();
        var connectionString = configuration.GetConnectionString("MongoDb");
        var embeddingApiKey = configuration.GetSection(nameof(EmbeddingOptions)).Get<EmbeddingOptions>()?.ApiKey;

        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(embeddingApiKey))
        {
            Assert.Ignore($"{ScenarioDisplayName} evaluation requires ConnectionStrings:MongoDb and EmbeddingOptions:ApiKey.");
        }

        var services = new ServiceCollection();
        services.AddOptions<EmbeddingOptions>().Bind(configuration.GetSection(nameof(EmbeddingOptions)));
        services.AddSingleton<IMongoClient>(_ => new MongoClient(connectionString));
        services.AddSingleton(serviceProvider => serviceProvider.GetRequiredService<IMongoClient>().GetDatabase("KnowledgeHub"));
        services.AddSingleton(serviceProvider => serviceProvider.GetRequiredService<IMongoDatabase>().GetCollection<Document>("documents"));
        services.AddServices();

        serviceProvider = services.BuildServiceProvider();
        RagSearchService = serviceProvider.GetRequiredService<IRagSearchService>();
        DocumentRepository = serviceProvider.GetRequiredService<IDocumentRepository>();

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
