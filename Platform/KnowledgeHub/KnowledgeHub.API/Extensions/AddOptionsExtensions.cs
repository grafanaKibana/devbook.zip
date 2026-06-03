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
                .AddOptions<EmbeddingOptions>()
                .Bind(configuration.GetSection(nameof(EmbeddingOptions)));

            services
                .AddOptions<AnswerAgentOptions>()
                .Bind(configuration.GetSection(nameof(AnswerAgentOptions)));

            return services;
        }
    }
}
