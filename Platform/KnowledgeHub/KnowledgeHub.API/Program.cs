using Hangfire;
using Hangfire.Mongo;
using KnowledgeHub.Data;
using KnowledgeHub.Data.Chunking;
using KnowledgeHub.Data.Embeddings;
using KnowledgeHub.Data.Ingestion;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDb") ?? throw new ArgumentNullException();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddDbContext<KnowledgeHubDbContext>(options =>
    options.UseMongoDB(mongoConnectionString));

builder.Services
    .AddOptions<ChunkingOptions>()
    .Bind(builder.Configuration.GetSection(ChunkingOptions.SectionName));

builder.Services
    .AddOptions<EmbeddingOptions>()
    .Bind(builder.Configuration.GetSection(EmbeddingOptions.SectionName));

builder.Services.AddKnowledgeHubDataServices();
builder.Services.AddHangfire((_, configuration) => configuration
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseMongoStorage(
        mongoConnectionString,
        new MongoStorageOptions
        {
            Prefix = "knowledgehub.hangfire",
        }));
builder.Services.AddHangfireServer();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapPost("/ingestion/documents",
        async (IngestionRequest request, IIngestionService ingestionService, CancellationToken cancellationToken) =>
        {
            var result = await ingestionService.IngestDocumentsAsync(request, cancellationToken);

            return Results.Ok(result);
        })
    .WithName("IngestDocument");

app.MapGet("/weatherforecast", null!)
    .WithName("GetWeatherForecast");

app.Run();
