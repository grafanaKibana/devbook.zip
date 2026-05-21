using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Tests.RagSearch;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Xunit;

namespace KnowledgeHub.Tests.Ingestion;

public sealed class IngestionServiceTests
{
    [Fact]
    public async Task FolderIngestionRebuildsScopeAndRemovesDeletedDocumentsAndChunks()
    {
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Scope/Current.md", "---\nstatus: Creation\n---\n# Current\n\nFresh content.");

        var documents = new InMemoryDocumentRepository(
            ExistingDocument("old_current", "Scope/Current.md"),
            ExistingDocument("old_deleted", "Scope/Deleted.md"),
            ExistingDocument("outside", "Other/Keep.md"));
        var chunks = new InMemoryChunkRepository(
            ExistingChunk("old_current"),
            ExistingChunk("old_deleted"),
            ExistingChunk("outside"));
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest("Scope", null));

        Assert.Equal(1, result.ProcessedCount);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal(0, result.UpdatedCount);
        Assert.Equal(2, result.DeletedCount);
        var newDocumentId = Assert.Single(result.DocumentIds);

        Assert.Null(await documents.GetBySourcePathAsync("Scope/Deleted.md"));
        Assert.NotNull(await documents.GetBySourcePathAsync("Scope/Current.md"));
        Assert.NotNull(await documents.GetBySourcePathAsync("Other/Keep.md"));
        Assert.DoesNotContain(chunks.Chunks, chunk => chunk.DocumentId is "old_current" or "old_deleted");
        Assert.Contains(chunks.Chunks, chunk => chunk.DocumentId == newDocumentId);
        Assert.Contains(chunks.Chunks, chunk => chunk.DocumentId == "outside");
    }

    [Fact]
    public async Task SingleFileIngestionDoesNotDeleteSiblingDocuments()
    {
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Scope/Current.md", "# Current\n\nChanged content.");

        var documents = new InMemoryDocumentRepository(
            ExistingDocument("current", "Scope/Current.md"),
            ExistingDocument("sibling", "Scope/Sibling.md"));
        var chunks = new InMemoryChunkRepository(
            ExistingChunk("current"),
            ExistingChunk("sibling"));
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest("Scope", "Current.md"));

        Assert.Equal(1, result.ProcessedCount);
        Assert.Equal(0, result.CreatedCount);
        Assert.Equal(1, result.UpdatedCount);
        Assert.Equal(0, result.DeletedCount);
        Assert.Equal(["current"], result.DocumentIds);

        Assert.NotNull(await documents.GetBySourcePathAsync("Scope/Sibling.md"));
        Assert.Contains(chunks.Chunks, chunk => chunk.DocumentId == "sibling");
    }

    [Fact]
    public async Task RootFolderIngestionRebuildsWholeIngestionRoot()
    {
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Current.md", "# Current\n\nFresh root content.");

        var documents = new InMemoryDocumentRepository(
            ExistingDocument("old_current", "Current.md"),
            ExistingDocument("old_deleted", "Deleted.md"));
        var chunks = new InMemoryChunkRepository(
            ExistingChunk("old_current"),
            ExistingChunk("old_deleted"));
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest(".", null));

        Assert.Equal(1, result.ProcessedCount);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal(0, result.UpdatedCount);
        Assert.Equal(2, result.DeletedCount);
        var newDocumentId = Assert.Single(result.DocumentIds);

        Assert.NotNull(await documents.GetBySourcePathAsync("Current.md"));
        Assert.Null(await documents.GetBySourcePathAsync("Deleted.md"));
        Assert.DoesNotContain(chunks.Chunks, chunk => chunk.DocumentId is "old_current" or "old_deleted");
        Assert.Contains(chunks.Chunks, chunk => chunk.DocumentId == newDocumentId);
    }

    private static IngestionService CreateService(
        string rootDirectory,
        InMemoryDocumentRepository documents,
        InMemoryChunkRepository chunks)
    {
        var embeddingGenerator = new DeterministicEmbeddingGenerator();
        var embeddingService = new EmbeddingService(embeddingGenerator, Options.Create(new EmbeddingOptions()));
        var chunkingService = new ChunkingService(
            chunks,
            Options.Create(new ChunkingOptions { MaxChunkLength = 500, OverlapLength = 50 }),
            embeddingService);

        return new IngestionService(
            documents,
            chunks,
            chunkingService,
            new TestHostEnvironment(rootDirectory),
            Options.Create(new IngestionOptions { ContentRootPath = "." }));
    }

    private static Document ExistingDocument(string documentId, string sourcePath) => new()
    {
        DocumentId = documentId,
        SourcePath = sourcePath,
        Title = Path.GetFileNameWithoutExtension(sourcePath),
        RawMarkdown = "old",
        Frontmatter = string.Empty,
        PageContent = "old",
        SourceHash = "old",
        UpdatedAt = DateTimeOffset.UnixEpoch,
    };

    private static ChunkModel ExistingChunk(string documentId) => new()
    {
        ChunkId = $"chunk_{documentId}",
        DocumentId = documentId,
        ChunkText = "old",
        ChunkOrder = 0,
        Embedding = [1, 2, 3],
        CitationLabel = "[[Old]]",
    };

    private sealed class InMemoryDocumentRepository(params Document[] seedDocuments) : IDocumentRepository
    {
        private readonly Dictionary<string, Document> documents = seedDocuments.ToDictionary(document => document.DocumentId);

        public Task<Document?> GetBySourcePathAsync(string sourcePath, CancellationToken cancellationToken = default) =>
            Task.FromResult(documents.Values.FirstOrDefault(document => document.SourcePath == sourcePath));

        public Task<IReadOnlyList<Document>> GetBySourcePathPrefixAsync(
            string sourcePathPrefix,
            CancellationToken cancellationToken = default)
        {
            var prefix = sourcePathPrefix.TrimEnd('/');
            var matchingDocuments = documents.Values
                .Where(document => string.IsNullOrEmpty(prefix)
                    || document.SourcePath == prefix
                    || document.SourcePath.StartsWith(prefix + "/", StringComparison.Ordinal))
                .OrderBy(document => document.SourcePath, StringComparer.Ordinal)
                .ToArray();

            return Task.FromResult<IReadOnlyList<Document>>(matchingDocuments);
        }

        public Task<IReadOnlyList<Document>> GetByIdsAsync(
            IReadOnlyCollection<string> documentIds,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Document>>(documents.Values
                .Where(document => documentIds.Contains(document.DocumentId))
                .OrderBy(document => document.DocumentId, StringComparer.Ordinal)
                .ToArray());

        public Task UpsertAsync(Document document, CancellationToken cancellationToken = default)
        {
            documents[document.DocumentId] = document;

            return Task.CompletedTask;
        }

        public Task DeleteByIdsAsync(IReadOnlyCollection<string> documentIds, CancellationToken cancellationToken = default)
        {
            foreach (var documentId in documentIds)
            {
                documents.Remove(documentId);
            }

            return Task.CompletedTask;
        }
    }

    private sealed class InMemoryChunkRepository(params ChunkModel[] seedChunks) : IChunkRepository
    {
        public List<ChunkModel> Chunks { get; } = [.. seedChunks];

        public Task ReplaceDocumentChunksAsync(
            string documentId,
            IReadOnlyCollection<ChunkModel> newChunks,
            CancellationToken cancellationToken = default)
        {
            Chunks.RemoveAll(chunk => chunk.DocumentId == documentId);
            Chunks.AddRange(newChunks);

            return Task.CompletedTask;
        }

        public Task DeleteByDocumentIdsAsync(
            IReadOnlyCollection<string> documentIds,
            CancellationToken cancellationToken = default)
        {
            Chunks.RemoveAll(chunk => documentIds.Contains(chunk.DocumentId));

            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<RagChunkResponse>> VectorSearchAsync(
            float[] queryVector,
            int topK,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<RagChunkResponse>>([]);
    }

    private sealed class TestHostEnvironment(string contentRootPath) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;

        public string ApplicationName { get; set; } = "KnowledgeHub.Tests";

        public string ContentRootPath { get; set; } = contentRootPath;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class TestWorkspace : IDisposable
    {
        private TestWorkspace(string rootDirectory)
        {
            RootDirectory = rootDirectory;
        }

        public string RootDirectory { get; }

        public static TestWorkspace Create() => new(Path.Combine(Path.GetTempPath(), Path.GetRandomFileName()));

        public void WriteMarkdown(string relativePath, string markdown)
        {
            var path = Path.Combine(RootDirectory, relativePath);
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllText(path, markdown);
        }

        public void Dispose()
        {
            if (Directory.Exists(RootDirectory))
            {
                Directory.Delete(RootDirectory, recursive: true);
            }
        }
    }
}
