namespace DevBook.API.Extensions;

/// <summary>
/// Adds OpenAPI and Swagger configuration helpers.
/// </summary>
public static class AddSwaggerExtensions
{
    extension(IServiceCollection services)
    {
        /// <summary>
        /// Registers OpenAPI endpoint metadata and Swagger generation services.
        /// </summary>
        /// <returns>The same service collection so calls can be chained.</returns>
        public IServiceCollection AddOpenApiWithSwagger()
        {
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            services.AddOpenApi();
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen();

            return services;
        }
    }

    extension(WebApplication app)
    {
        /// <summary>
        /// Enables OpenAPI and Swagger UI in the development environment.
        /// </summary>
        /// <returns>The same web application so middleware calls can be chained.</returns>
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