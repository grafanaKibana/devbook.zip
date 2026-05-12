namespace KnowledgeHub.API.Extensions;

using KnowledgeHub.Data.Options;

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
                .AddOptions<ChunkingOptions>()
                .Bind(configuration.GetSection(nameof(ChunkingOptions)));

            services
                .AddOptions<EmbeddingOptions>()
                .Bind(configuration.GetSection(nameof(EmbeddingOptions)));

            return services;
        }
    }
}