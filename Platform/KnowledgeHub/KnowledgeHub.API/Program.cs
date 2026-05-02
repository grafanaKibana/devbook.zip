using Hangfire;
using Hangfire.Mongo;
using Hangfire.Mongo.Migration.Strategies;
using Hangfire.Mongo.Migration.Strategies.Backup;
using KnowledgeHub.Data;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDb") ?? throw new ArgumentNullException();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<KnowledgeHubDbContext>(options =>
    options.UseMongoDB(mongoConnectionString));

builder.Services
    .AddOptions<IngestionOptions>()
    .Bind(builder.Configuration.GetSection(nameof(IngestionOptions)));

builder.Services
    .AddOptions<ChunkingOptions>()
    .Bind(builder.Configuration.GetSection(nameof(ChunkingOptions)));

builder.Services
    .AddOptions<EmbeddingOptions>()
    .Bind(builder.Configuration.GetSection(nameof(EmbeddingOptions)));

builder.Services.AddKnowledgeHubDataServices();
builder.Services.AddHangfire((_, configuration) => configuration
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseMongoStorage(
        mongoConnectionString,
        nameof(KnowledgeHub),
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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapPost("/ingestion/documents",
        async (IngestionRequest request, IngestionService ingestionService, CancellationToken cancellationToken) =>
        {
            try
            {
                var result = await ingestionService.IngestDocumentsAsync(request, cancellationToken);

                return Results.Ok(result);
            }
            catch (ArgumentException exception)
            {
                return Results.BadRequest(new { error = exception.Message });
            }
            catch (DirectoryNotFoundException exception)
            {
                return Results.BadRequest(new { error = exception.Message });
            }
            catch (FileNotFoundException exception)
            {
                return Results.BadRequest(new { error = exception.Message });
            }
        })
    .WithName("IngestDocument");

app.Run();
