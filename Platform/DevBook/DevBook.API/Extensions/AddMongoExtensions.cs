namespace DevBook.API.Extensions;

using DevBook.Data.Models;
using MongoDB.Driver;

/// <summary>
/// Adds MongoDB service registration helpers.
/// </summary>
public static class AddMongoExtensions
{
    private const string MongoDatabaseName = nameof(DevBook);

    extension(IServiceCollection services)
    {
        /// <summary>
        /// Registers MongoDB client, database, and document collection services.
        /// </summary>
        /// <param name="configuration">Application configuration containing the MongoDB connection string.</param>
        /// <param name="connectionString">Resolved MongoDB connection string used by Hangfire storage.</param>
        /// <param name="databaseName">Resolved MongoDB database name used by the API.</param>
        /// <returns>The same service collection so registrations can be chained.</returns>
        public IServiceCollection AddMongoDb(IConfiguration configuration, out string connectionString, out string databaseName)
        {
            var mongoConnectionString = configuration.GetConnectionString("MongoDb") ?? throw new ArgumentNullException();
            connectionString = mongoConnectionString;
            databaseName = MongoDatabaseName;

            services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoConnectionString));
            services.AddSingleton(serviceProvider =>
                serviceProvider.GetRequiredService<IMongoClient>().GetDatabase(MongoDatabaseName));
            services.AddSingleton(serviceProvider =>
                serviceProvider.GetRequiredService<IMongoDatabase>().GetCollection<Document>("documents"));

            return services;
        }
    }
}
