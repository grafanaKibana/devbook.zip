namespace KnowledgeHub.Tests.Integration;

using Hangfire;
using KnowledgeHub.API;
using KnowledgeHub.Data.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Moq;

public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected const string ProblemJsonMediaType = "application/problem+json";
    private OfflineApplicationFactory? factory;
    private HttpClient? client;

    protected HttpClient Client => client ??= this.Factory.CreateClient();

    private OfflineApplicationFactory Factory => factory ??= new(ConfigureTestServices);

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync()
    {
        client?.Dispose();

        if (factory is not null)
        {
            await factory.DisposeAsync();
        }
    }

    protected virtual void ConfigureTestServices(IServiceCollection services)
    {
    }

    private sealed class OfflineApplicationFactory(Action<IServiceCollection> configureTestServices) : WebApplicationFactory<Program>
    {
        private const string LocalMongoConnectionString = "mongodb://localhost:27017";
        private readonly string? previousMongoConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__MongoDb");

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            Environment.SetEnvironmentVariable("ConnectionStrings__MongoDb", LocalMongoConnectionString);
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, configurationBuilder) =>
            {
                configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:MongoDb"] = LocalMongoConnectionString,
                    ["EmbeddingOptions:ModelId"] = "text-embedding-3-small",
                    ["EmbeddingOptions:VectorDimensions"] = "384",
                    ["EmbeddingOptions:ApiKey"] = "test-key",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IHostedService>();
                services.RemoveAll<IBackgroundJobClient>();
                services.RemoveAll<IRecurringJobManager>();
                services.RemoveAll<IIngestionService>();
                services.RemoveAll<IRagSearchService>();
                services.RemoveAll<IRagAskService>();
                services.AddScoped(_ => Mock.Of<IIngestionService>());
                services.AddScoped(_ => Mock.Of<IRagSearchService>());
                services.AddScoped(_ => Mock.Of<IRagAskService>());
                configureTestServices(services);
            });
        }

        public override async ValueTask DisposeAsync()
        {
            Environment.SetEnvironmentVariable("ConnectionStrings__MongoDb", previousMongoConnectionString);

            await base.DisposeAsync();
        }
    }
}
