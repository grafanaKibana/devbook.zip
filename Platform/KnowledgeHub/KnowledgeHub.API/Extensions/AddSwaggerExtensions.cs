namespace KnowledgeHub.API.Extensions;

public static class AddSwaggerExtensions
{
    extension(IServiceCollection services)
    {
        public IServiceCollection AddOpenApiWithSwagger()
        {
            // Add services to the container.
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            services.AddOpenApi();
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen();

            return services;
        }
    }

    extension(WebApplication app)
    {
        public WebApplication UseOpenApiWithSwagger()
        {
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            return app;
        }
    }
}