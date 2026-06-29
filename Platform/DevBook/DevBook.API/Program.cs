using Hangfire;
using Hangfire.Mongo;
using Hangfire.Mongo.Migration.Strategies;
using Hangfire.Mongo.Migration.Strategies.Backup;
using DevBook.API.ExceptionHandling;
using DevBook.API.Extensions;
using DevBook.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApiWithSwagger();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ClientRequestExceptionHandler>();

builder.Services.BindOptions(builder.Configuration);
builder.Services.AddMongoDb(builder.Configuration, out var mongoConnectionString, out var mongoDatabaseName);
builder.Services.AddServices();

builder.Services.AddHangfire((_, configuration) => configuration
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseMongoStorage(
        mongoConnectionString,
        mongoDatabaseName,
        new MongoStorageOptions
        {
            Prefix = "hangfire",
            ConnectionCheckTimeout = TimeSpan.FromSeconds(10),
            MigrationOptions = new MongoMigrationOptions
            {
                MigrationStrategy = new MigrateMongoMigrationStrategy(),
                BackupStrategy = new CollectionMongoBackupStrategy()
            }
        }));

builder.Services.AddHangfireServer();

var app = builder.Build();

await app.EnsureChunkVectorSearchIndexesAsync();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseOpenApiWithSwagger();
app.UseHttpsRedirection();
app.AddEndpoints();
app.Run();