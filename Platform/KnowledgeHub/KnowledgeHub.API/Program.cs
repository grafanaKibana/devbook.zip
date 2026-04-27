using Hangfire;
using Hangfire.Mongo;
using KnowledgeHub.Data;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
var mongoConnectionString = builder.Configuration.GetConnectionString("MongoDb") ?? throw new ArgumentNullException();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddDbContext<KnowledgeHubDbContext>(options =>
    options.UseMongoDB(mongoConnectionString));

builder.Services
    .AddOptions<IngestionOptions>()
    .Bind(builder.Configuration.GetSection(IngestionOptions.SectionName));

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
