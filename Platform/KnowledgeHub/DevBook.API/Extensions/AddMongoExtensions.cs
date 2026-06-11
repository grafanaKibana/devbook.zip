namespace DevBook.API.Extensions;

using DevBook.Data.Models;
using MongoDB.Driver;

public static class AddMongoExtensions
{
    private const string MongoDatabaseName = nameof(DevBook);

    extension(IServiceCollection services)
    {
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
