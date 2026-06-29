namespace DevBook.API.Extensions;

using DevBook.Data.Options;

/// <summary>
/// Adds options binding helpers.
/// </summary>
public static class AddOptionsExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Binds application configuration sections to typed option classes.
        /// </summary>
        /// <param name="configuration">Application configuration.</param>
        /// <returns>The same service collection so registrations can be chained.</returns>
        public IServiceCollection BindOptions(IConfiguration configuration)
        {
            services
                .AddOptions<IngestionOptions>()
                .Bind(configuration.GetSection(nameof(IngestionOptions)));

            services
                .AddOptions<EmbeddingOptions>()
                .Bind(configuration.GetSection(nameof(EmbeddingOptions)));

            services
                .AddOptions<OpenAIOptions>()
                .Bind(configuration.GetSection(nameof(OpenAIOptions)));

            services
                .AddOptions<RagSearchOptions>()
                .Bind(configuration.GetSection(nameof(RagSearchOptions)));

            return services;
        }
    }
}
