namespace KnowledgeHub.Tests.Unit.Services;

using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Data.Services.Chunking;
using KnowledgeHub.Tests.Common;
using Microsoft.Extensions.Options;
using Moq;

public sealed class IngestionServiceTests
{
    private const string ScopePath = "Scope";
    private const string NoteFileName = "Note.md";
    private const string ScopedNotePath = "Scope/Note.md";
    private const string ExistingDocumentId = "existing-doc";
    private const string RootMarkdownPath = "Root.md";
    private const string NestedMarkdownPath = "Scope/Nested.md";

    /// <summary>
    /// Protects the documented full-root ingestion behavior for null, empty, and whitespace source paths.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task IngestDocumentsAsync_BlankSourcePathIngestsEverythingUnderRoot(string? sourcePath)
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(RootMarkdownPath, "# Root\n\nRoot content.");
        workspace.WriteMarkdown(NestedMarkdownPath, "# Nested\n\nNested content.");
        var upsertedDocuments = new List<Document>();
        var documents = CreateFolderDocumentRepository(string.Empty, [], upsertedDocuments);
        var chunks = CreateReplacingChunkRepository();
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        // Act
        var result = await service.IngestDocumentsAsync(new IngestionRequest(sourcePath, null));

        // Assert
        result.Should().BeEquivalentTo(new
        {
            Success = true,
            ProcessedCount = 2,
            CreatedCount = 2,
            UpdatedCount = 0,
            DeletedCount = 0,
        });
        upsertedDocuments.Select(document => document.SourcePath).Should().Equal(RootMarkdownPath, NestedMarkdownPath);
    }

    /// <summary>
    /// Protects the filesystem boundary so ingestion cannot read folders outside the configured vault root.
    /// </summary>
    [Theory]
    [InlineData("../Outside")]
    [InlineData("/tmp")]
    public async Task IngestDocumentsAsync_RejectsSourcePathEscapingRoot(string sourcePath)
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        var service = CreateService(workspace.RootDirectory, new Mock<IDocumentRepository>(MockBehavior.Strict), new Mock<IChunkRepository>(MockBehavior.Strict));

        // Act
        var action = async () => await service.IngestDocumentsAsync(new IngestionRequest(sourcePath, null));

        // Assert
        await action.Should().ThrowAsync<ArgumentException>();
    }

    /// <summary>
    /// Protects single-file ingestion from path traversal, nested paths, and non-markdown files masquerading as selected notes.
    /// </summary>
    [Theory]
    [InlineData("../Note.md")]
    [InlineData("Nested/Note.md")]
    [InlineData("Note.txt")]
    public async Task IngestDocumentsAsync_RejectsBadFileName(string fileName)
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        Directory.CreateDirectory(Path.Combine(workspace.RootDirectory, ScopePath));
        var service = CreateService(workspace.RootDirectory, new Mock<IDocumentRepository>(MockBehavior.Strict), new Mock<IChunkRepository>(MockBehavior.Strict));

        // Act
        var action = async () => await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, fileName));

        // Assert
        await action.Should().ThrowAsync<ArgumentException>();
    }

    /// <summary>
    /// Protects the primary single-note ingestion path: create document metadata, split frontmatter, and replace chunks for the new document.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_CreatesSingleFileAndChunksIt()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(ScopedNotePath, "---\nstatus: Creation\n---\n# Note\n\nFresh content.");
        Document? upsertedDocument = null;
        IReadOnlyCollection<ChunkModel>? replacedChunks = null;
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback<Document, CancellationToken>((document, _) => upsertedDocument = document)
            .Returns(Task.CompletedTask);
        var chunks = CaptureReplaceChunks((_, newChunks) => replacedChunks = newChunks);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        // Act
        var result = await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, NoteFileName));

        // Assert
        result.Should().BeEquivalentTo(new
        {
            Success = true,
            ProcessedCount = 1,
            CreatedCount = 1,
            UpdatedCount = 0,
            DeletedCount = 0,
        });
        result.DocumentIds.Should().ContainSingle().Which.Should().StartWith("doc_");
        upsertedDocument.Should().BeEquivalentTo(new
        {
            SourcePath = ScopedNotePath,
            Title = "Note",
            Frontmatter = "status: Creation",
            PageContent = "# Note\n\nFresh content.",
        });
        replacedChunks.Should().NotBeEmpty();
    }

    /// <summary>
    /// Protects single-file update scoping so changing one note updates its document and chunks without deleting sibling documents.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_UpdatesChangedSingleFileWithoutDeletingSiblings()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(ScopedNotePath, "# Note\n\nChanged content.");
        var existing = Document(ExistingDocumentId, ScopedNotePath, "# Note\n\nOld content.", "old-hash");
        Document? upsertedDocument = null;
        IReadOnlyCollection<string>? deletedDocumentIds = null;
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        documents.Setup(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback<Document, CancellationToken>((document, _) => upsertedDocument = document)
            .Returns(Task.CompletedTask);
        documents.Setup(mock => mock.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<string>, CancellationToken>((ids, _) => deletedDocumentIds = ids)
            .Returns(Task.CompletedTask);
        var chunks = CaptureReplaceChunks((_, _) => { });
        chunks.Setup(mock => mock.DeleteByDocumentIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<string>, CancellationToken>((ids, _) => deletedDocumentIds = ids)
            .Returns(Task.CompletedTask);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        // Act
        var result = await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, NoteFileName));

        // Assert
        result.Should().BeEquivalentTo(new
        {
            CreatedCount = 0,
            UpdatedCount = 1,
            DeletedCount = 0,
            DocumentIds = new[] { ExistingDocumentId },
        });
        upsertedDocument.Should().BeEquivalentTo(new { DocumentId = ExistingDocumentId, SourcePath = ScopedNotePath });
        deletedDocumentIds.Should().BeNull();
    }

    /// <summary>
    /// Protects idempotent single-file ingestion so unchanged notes do not rewrite documents or regenerate embeddings.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_SkipsUnchangedSingleFile()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        const string rawMarkdown = "# Note\n\nStable content.";
        workspace.WriteMarkdown(ScopedNotePath, rawMarkdown);
        var existing = Document(ExistingDocumentId, ScopedNotePath, rawMarkdown, "placeholder") with
        {
            SourceHash = ComputeSourceHash(rawMarkdown),
        };
        Document? upsertedDocument = null;
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        documents.Setup(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback<Document, CancellationToken>((document, _) => upsertedDocument = document)
            .Returns(Task.CompletedTask);
        var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        // Act
        var result = await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, NoteFileName));

        // Assert
        result.Should().BeEquivalentTo(new
        {
            ProcessedCount = 1,
            CreatedCount = 0,
            UpdatedCount = 0,
            DocumentIds = Array.Empty<string>(),
        });
        upsertedDocument.Should().BeNull();
    }

    /// <summary>
    /// Protects folder rebuild semantics: scoped documents are deleted before the current markdown files are recreated and chunked.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_FolderIngestionDeletesScopedDocumentsAndIngestsMarkdownFiles()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Scope/A.md", "# A\n\nAlpha.");
        workspace.WriteMarkdown(NestedMarkdownPath, "# B\n\nBeta.");
        File.WriteAllText(Path.Combine(workspace.RootDirectory, ScopePath, "Ignored.txt"), "not markdown");
        var existingScoped = new[]
        {
            Document("old-a", "Scope/A.md", "old", "old"),
            Document("deleted", "Scope/Deleted.md", "old", "old"),
        };
        var upsertedDocuments = new List<Document>();
        var deletedDocumentIds = Array.Empty<string>();
        var replacedDocumentIds = new List<string>();
        var documents = CreateFolderDocumentRepository(ScopePath, existingScoped, upsertedDocuments);
        documents.Setup(mock => mock.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<string>, CancellationToken>((ids, _) => deletedDocumentIds = ids.ToArray())
            .Returns(Task.CompletedTask);
        var chunks = CaptureReplaceChunks((documentId, _) => replacedDocumentIds.Add(documentId));
        chunks.Setup(mock => mock.DeleteByDocumentIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        // Act
        var result = await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, null));

        // Assert
        result.Should().BeEquivalentTo(new
        {
            ProcessedCount = 2,
            CreatedCount = 2,
            UpdatedCount = 0,
            DeletedCount = 2,
        });
        deletedDocumentIds.Should().BeEquivalentTo(["old-a", "deleted"]);
        upsertedDocuments.Select(document => document.SourcePath).Should().Equal("Scope/A.md", NestedMarkdownPath);
        replacedDocumentIds.Should().BeEquivalentTo(result.DocumentIds);
    }

    private static IngestionService CreateService(
        string rootDirectory,
        Mock<IDocumentRepository> documents,
        Mock<IChunkRepository> chunks)
    {
        var embeddingGenerator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(embeddingGenerator.Object, Options.Create(new EmbeddingOptions()));
        var chunkingService = new MarkdownSectionChunkingService(
            chunks.Object,
            Options.Create(new ChunkingOptions { MaxChunkLength = 500, OverlapLength = 0 }),
            embeddingService);

        return new IngestionService(
            documents.Object,
            chunks.Object,
            chunkingService,
            new TestHostEnvironment(rootDirectory),
            Options.Create(new IngestionOptions { ContentRootPath = "." }));
    }

    private static Mock<IDocumentRepository> CreateFolderDocumentRepository(
        string expectedSourcePathPrefix,
        IReadOnlyList<Document> existingDocuments,
        List<Document> upsertedDocuments)
    {
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathPrefixAsync(expectedSourcePathPrefix, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingDocuments);
        documents.Setup(mock => mock.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        documents.Setup(mock => mock.GetBySourcePathAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback<Document, CancellationToken>((document, _) => upsertedDocuments.Add(document))
            .Returns(Task.CompletedTask);

        return documents;
    }

    private static Mock<IChunkRepository> CreateReplacingChunkRepository()
    {
        var chunks = CaptureReplaceChunks((_, _) => { });
        chunks.Setup(mock => mock.DeleteByDocumentIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return chunks;
    }

    private static Mock<IChunkRepository> CaptureReplaceChunks(Action<string, IReadOnlyCollection<ChunkModel>> capture)
    {
        var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
        chunks.Setup(mock => mock.ReplaceDocumentChunksAsync(
                It.IsAny<string>(),
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, IReadOnlyCollection<ChunkModel>, CancellationToken>((documentId, newChunks, _) => capture(documentId, newChunks))
            .Returns(Task.CompletedTask);

        return chunks;
    }

    private static Document Document(string documentId, string sourcePath, string rawMarkdown, string sourceHash) => new()
    {
        DocumentId = documentId,
        SourcePath = sourcePath,
        Title = Path.GetFileNameWithoutExtension(sourcePath),
        RawMarkdown = rawMarkdown,
        Frontmatter = string.Empty,
        PageContent = rawMarkdown,
        SourceHash = sourceHash,
        UpdatedAt = DateTimeOffset.UnixEpoch,
    };

    private static string ComputeSourceHash(string value)
    {
        var bytes = System.IO.Hashing.XxHash3.Hash(System.Text.Encoding.UTF8.GetBytes(value));
        var hashValue = System.Buffers.Binary.BinaryPrimitives.ReadUInt64BigEndian(bytes);

        return Convert.ToHexStringLower(bytes) + $":{hashValue}";
    }
}
