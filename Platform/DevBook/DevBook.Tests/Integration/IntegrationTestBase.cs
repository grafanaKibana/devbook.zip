namespace DevBook.Tests.Integration;

using Hangfire;
using DevBook.Data.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Moq;

/// <summary>
/// Base class for offline ASP.NET Core integration tests.
/// </summary>
public abstract class IntegrationTestBase : IAsyncLifetime
{
    /// <summary>
    /// ProblemDetails response media type used by endpoint assertions.
    /// </summary>
    protected const string ProblemJsonMediaType = "application/problem+json";
    private OfflineApplicationFactory? factory;
    private HttpClient? client;

    /// <summary>
    /// Gets the HTTP client for the offline test application.
    /// </summary>
    protected HttpClient Client => client ??= this.Factory.CreateClient();

    private OfflineApplicationFactory Factory => factory ??= new(ConfigureTestServices);

    /// <summary>
    /// Initializes the integration test fixture.
    /// </summary>
    public Task InitializeAsync() => Task.CompletedTask;

    /// <summary>
    /// Disposes the integration test fixture and HTTP client.
    /// </summary>
    public async Task DisposeAsync()
    {
        client?.Dispose();

        if (factory is not null)
        {
            await factory.DisposeAsync();
        }
    }

    /// <summary>
    /// Replaces application services for a specific integration test fixture.
    /// </summary>
    /// <param name="services">Service collection for the test host.</param>
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

        /// <summary>
        /// Restores the previous MongoDB environment variable and disposes the factory.
        /// </summary>
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
