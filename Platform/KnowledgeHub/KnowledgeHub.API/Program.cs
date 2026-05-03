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
const string mongoDatabaseName = nameof(KnowledgeHub);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<KnowledgeHubDbContext>(options =>
    options.UseMongoDB(mongoConnectionString, mongoDatabaseName));

builder.Services
    .AddOptions<IngestionOptions>()
    .Bind(builder.Configuration.GetSection(nameof(IngestionOptions)));

builder.Services
    .AddOptions<ChunkingOptions>()
    .Bind(builder.Configuration.GetSection(nameof(ChunkingOptions)));

builder.Services
    .AddOptions<EmbeddingOptions>()
    .Bind(builder.Configuration.GetSection(nameof(EmbeddingOptions)));

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

app.MapPost("/rag/search",
        (RagSearchRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return Results.BadRequest(new { error = "Query is required." });
            }

            var topK = Math.Clamp(request.TopK, 1, 10);
            var query = request.Query.Trim();
            var results = CreateMockChunks()
                .Take(topK)
                .ToArray();

            return Results.Ok(new RagSearchResponse(query, "mock", results));
        })
    .WithName("MockRagSearch");

app.MapPost("/rag/ask",
        (RagAskRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Question))
            {
                return Results.BadRequest(new { error = "Question is required." });
            }

            var topK = Math.Clamp(request.TopK, 1, 5);
            var question = request.Question.Trim();
            var sources = CreateMockChunks()
                .Take(topK)
                .ToArray();

            var answer = "Mock answer: a real RAG endpoint will embed the question, retrieve relevant chunks, "
                         + "and ask an LLM to answer from those chunks. Dummy sources: "
                         + string.Join(", ", sources.Select(source => source.CitationLabel));

            return Results.Ok(new RagAskResponse(question, answer, "mock", sources));
        })
    .WithName("MockRagAsk");

app.Run();

static IReadOnlyList<RagChunkResult> CreateMockChunks() =>
[
    new RagChunkResult(
        "chunk_mock_rag_0001",
        "doc_mock_rag",
        "RAG retrieves relevant knowledge base chunks before asking the model to answer, which keeps answers grounded in your own notes.",
        "RAG Flow",
        "[[RAG#RAG Flow]]",
        0.92),
    new RagChunkResult(
        "chunk_mock_chunking_0001",
        "doc_mock_chunking",
        "Chunking splits long pages into smaller passages so retrieval can return the specific section that answers the question.",
        "Chunking",
        "[[Chunking#Chunking]]",
        0.84),
    new RagChunkResult(
        "chunk_mock_embeddings_0001",
        "doc_mock_embeddings",
        "Embeddings turn text into vectors. Query vectors and chunk vectors must use the same model and dimensions.",
        "Embeddings",
        "[[Embeddings#Embeddings]]",
        0.76),
];
