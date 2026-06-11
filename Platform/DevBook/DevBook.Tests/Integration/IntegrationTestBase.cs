namespace DevBook.Tests.Integration;

using Hangfire;
using DevBook.API;
using DevBook.Data.Services;
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
        private readonly string? previousMongoConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__MongoDb");
        private readonly string mongoConnectionString = ResolveMongoConnectionString();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            Environment.SetEnvironmentVariable("ConnectionStrings__MongoDb", mongoConnectionString);
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, configurationBuilder) =>
            {
                configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:MongoDb"] = mongoConnectionString,
                    ["EmbeddingOptions:ModelId"] = "text-embedding-3-small",
                    ["EmbeddingOptions:VectorDimensions"] = "384",
                    ["OpenAIOptions:ApiKey"] = "test-key",
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

        private static string ResolveMongoConnectionString()
        {
            var environmentConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__MongoDb");
            if (!string.IsNullOrWhiteSpace(environmentConnectionString))
            {
                return environmentConnectionString;
            }

            var configuration = new ConfigurationBuilder()
                .AddJsonFile(ResolveRepositoryPath("Platform", nameof(DevBook), $"{nameof(DevBook)}.API", "appsettings.Development.json"), optional: true)
                .AddJsonFile(ResolveRepositoryPath("Platform", nameof(DevBook), $"{nameof(DevBook)}.Evaluations", "appsettings.Evaluations.json"), optional: true)
                .AddEnvironmentVariables()
                .Build();

            return configuration.GetConnectionString("MongoDb")
                   ?? throw new InvalidOperationException("Integration tests require ConnectionStrings:MongoDb or ConnectionStrings__MongoDb.");
        }

        private static string ResolveRepositoryPath(params string[] segments)
        {
            var current = new DirectoryInfo(AppContext.BaseDirectory);

            while (current is not null)
            {
                var candidate = Path.Combine(new[] { current.FullName }.Concat(segments).ToArray());
                if (File.Exists(candidate))
                {
                    return candidate;
                }

                current = current.Parent;
            }

            return Path.Combine(segments);
        }
    }
}
