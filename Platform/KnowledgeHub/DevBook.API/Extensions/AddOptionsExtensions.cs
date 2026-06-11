namespace DevBook.API.Extensions;

using DevBook.Data.Options;

public static class AddOptionsExtensions
{
    extension(IServiceCollection services)
    {
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
