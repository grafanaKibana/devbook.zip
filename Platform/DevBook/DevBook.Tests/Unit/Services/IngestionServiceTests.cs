namespace DevBook.Tests.Unit.Services;

using FluentAssertions;
using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Data.Services.Chunking;
using DevBook.Tests.Common;
using Microsoft.Extensions.Options;
using Moq;

/// <summary>
/// Contains tests for ingestion service.
/// </summary>
public sealed class IngestionServiceTests
{
    private const string ScopePath = "Scope";
    private const string NoteFileName = "Note.md";
    private const string ScopedNotePath = "Scope/Note.md";
    private const string ExistingDocumentId = "existing-doc";
    private const string RootMarkdownPath = "Root.md";
    private const string NestedMarkdownPath = "Scope/Nested.md";

    /// <summary>
    /// Tests that ingestion treats null, empty, and whitespace source paths as full-root ingestion requests.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task IngestDocumentsAsync_BlankSourcePath_IngestsEverythingUnderRoot(string? sourcePath)
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(RootMarkdownPath, Published("# Root\n\nRoot content."));
        workspace.WriteMarkdown(NestedMarkdownPath, Published("# Nested\n\nNested content."));
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
        VerifyFolderRepositoryUsedOnce(documents, string.Empty);
    }

    /// <summary>
    /// Tests that ingestion rejects source paths escaping the configured root to avoid reading files outside the vault.
    /// </summary>
    [Theory]
    [InlineData("../Outside")]
    [InlineData("/tmp")]
    public async Task IngestDocumentsAsync_SourcePathEscapesRoot_ThrowsArgumentException(string sourcePath)
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
    /// Tests that single-file ingestion rejects invalid file names to avoid path traversal and non-markdown ingestion.
    /// </summary>
    [Theory]
    [InlineData("../Note.md")]
    [InlineData("Nested/Note.md")]
    [InlineData("Note.txt")]
    public async Task IngestDocumentsAsync_InvalidFileName_ThrowsArgumentException(string fileName)
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
    /// Tests that single-file ingestion creates a document, parses frontmatter, and replaces chunks for a new markdown file.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_NewSingleFile_CreatesDocumentAndReplacesChunks()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(ScopedNotePath, Published("# Note\n\nFresh content.", "status: Creation"));
        Document? upsertedDocument = null;
        IReadOnlyCollection<ChunkModel>? replacedChunks = null;
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<Document>, CancellationToken>((batch, _) => upsertedDocument = batch.Single())
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
            Frontmatter = "dg-publish: true\nstatus: Creation",
            PageContent = "# Note\n\nFresh content.",
        });
        replacedChunks.Should().NotBeEmpty();
    }

    /// <summary>
    /// Tests that selecting fixed-size chunking updates only the fixed-size chunk collection.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_FixedSizeStrategy_RunsOnlyFixedSizeChunkingService()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(ScopedNotePath, Published("# Note\n\nFresh content."));
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var fixedChunking = CreateChunkingService(ChunkingStrategyKind.FixedSize);
        var markdownChunking = CreateChunkingService(ChunkingStrategyKind.MarkdownSection);
        var service = new IngestionService(
            documents.Object,
            new Mock<IChunkRepositoryFactory>(MockBehavior.Strict).Object,
            [fixedChunking.Object, markdownChunking.Object],
            new TestHostEnvironment(workspace.RootDirectory),
            Options.Create(new IngestionOptions { ContentRootPath = "." }));

        // Act
        await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, NoteFileName, ChunkingStrategy: ChunkingStrategyKind.FixedSize));

        // Assert
        fixedChunking.Verify(mock => mock.ReplaceDocumentChunksAsync(
            It.Is<IReadOnlyList<Document>>(documents => documents.Count == 1 && documents[0].SourcePath == ScopedNotePath),
            It.IsAny<CancellationToken>()), Times.Once);
        markdownChunking.Verify(mock => mock.ReplaceDocumentChunksAsync(
            It.IsAny<IReadOnlyList<Document>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    /// <summary>
    /// Ingests documents semantic strategy runs only semantic chunking service.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_SemanticStrategy_RunsOnlySemanticChunkingService()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(ScopedNotePath, Published("# Note\n\nFresh content."));
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var fixedChunking = CreateChunkingService(ChunkingStrategyKind.FixedSize);
        var markdownChunking = CreateChunkingService(ChunkingStrategyKind.MarkdownSection);
        var semanticChunking = CreateChunkingService(ChunkingStrategyKind.Semantic);
        var service = new IngestionService(
            documents.Object,
            new Mock<IChunkRepositoryFactory>(MockBehavior.Strict).Object,
            [fixedChunking.Object, markdownChunking.Object, semanticChunking.Object],
            new TestHostEnvironment(workspace.RootDirectory),
            Options.Create(new IngestionOptions { ContentRootPath = "." }));

        // Act
        await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, NoteFileName, ChunkingStrategy: ChunkingStrategyKind.Semantic));

        // Assert
        fixedChunking.Verify(mock => mock.ReplaceDocumentChunksAsync(
            It.IsAny<IReadOnlyList<Document>>(),
            It.IsAny<CancellationToken>()), Times.Never);
        markdownChunking.Verify(mock => mock.ReplaceDocumentChunksAsync(
            It.IsAny<IReadOnlyList<Document>>(),
            It.IsAny<CancellationToken>()), Times.Never);
        semanticChunking.Verify(mock => mock.ReplaceDocumentChunksAsync(
            It.Is<IReadOnlyList<Document>>(documents => documents.Count == 1 && documents[0].SourcePath == ScopedNotePath),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>
    /// Ingests documents null chunking strategy runs all chunking services.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_NullChunkingStrategy_RunsAllChunkingServices()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(ScopedNotePath, Published("# Note\n\nFresh content."));
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var fixedChunking = CreateChunkingService(ChunkingStrategyKind.FixedSize);
        var markdownChunking = CreateChunkingService(ChunkingStrategyKind.MarkdownSection);
        var semanticChunking = CreateChunkingService(ChunkingStrategyKind.Semantic);
        var service = new IngestionService(
            documents.Object,
            new Mock<IChunkRepositoryFactory>(MockBehavior.Strict).Object,
            [fixedChunking.Object, markdownChunking.Object, semanticChunking.Object],
            new TestHostEnvironment(workspace.RootDirectory),
            Options.Create(new IngestionOptions { ContentRootPath = "." }));

        // Act
        await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, NoteFileName));

        // Assert
        fixedChunking.Verify(mock => mock.ReplaceDocumentChunksAsync(
            It.Is<IReadOnlyList<Document>>(documents => documents.Count == 1 && documents[0].SourcePath == ScopedNotePath),
            It.IsAny<CancellationToken>()), Times.Once);
        markdownChunking.Verify(mock => mock.ReplaceDocumentChunksAsync(
            It.Is<IReadOnlyList<Document>>(documents => documents.Count == 1 && documents[0].SourcePath == ScopedNotePath),
            It.IsAny<CancellationToken>()), Times.Once);
        semanticChunking.Verify(mock => mock.ReplaceDocumentChunksAsync(
            It.Is<IReadOnlyList<Document>>(documents => documents.Count == 1 && documents[0].SourcePath == ScopedNotePath),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>
    /// Tests that single-file ingestion updates a changed document without deleting other documents in the same folder.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_ChangedSingleFile_UpdatesDocumentWithoutDeletingSiblings()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown(ScopedNotePath, Published("# Note\n\nChanged content."));
        var existing = Document(ExistingDocumentId, ScopedNotePath, "# Note\n\nOld content.", "old-hash");
        Document? upsertedDocument = null;
        IReadOnlyCollection<string>? deletedDocumentIds = null;
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        documents.Setup(mock => mock.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<Document>, CancellationToken>((batch, _) => upsertedDocument = batch.Single())
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
    /// Tests that single-file ingestion skips unchanged content to avoid unnecessary document writes and embedding regeneration.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_UnchangedSingleFile_SkipsDocumentUpdateAndChunking()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        var rawMarkdown = Published("# Note\n\nStable content.");
        workspace.WriteMarkdown(ScopedNotePath, rawMarkdown);
        var existing = Document(ExistingDocumentId, ScopedNotePath, rawMarkdown, "placeholder") with
        {
            SourceHash = ComputeSourceHash(rawMarkdown),
        };
        Document? upsertedDocument = null;
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
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
    /// Ingests documents force reingest unchanged single file updates document and replaces chunks.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_ForceReingestUnchangedSingleFile_UpdatesDocumentAndReplacesChunks()
    {
        using var workspace = TestWorkspace.Create();
        var rawMarkdown = Published("# Note\n\nStable content.");
        workspace.WriteMarkdown(ScopedNotePath, rawMarkdown);
        var existing = Document(ExistingDocumentId, ScopedNotePath, rawMarkdown, "placeholder") with
        {
            SourceHash = ComputeSourceHash(rawMarkdown),
        };
        Document? upsertedDocument = null;
        var replacedDocumentIds = new List<string>();
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync(ScopedNotePath, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        documents.Setup(mock => mock.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<Document>, CancellationToken>((batch, _) => upsertedDocument = batch.Single())
            .Returns(Task.CompletedTask);
        var chunks = CaptureReplaceChunks((documentId, _) => replacedDocumentIds.Add(documentId));
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, NoteFileName, ForceReingest: true));

        result.Should().BeEquivalentTo(new
        {
            ProcessedCount = 1,
            CreatedCount = 0,
            UpdatedCount = 1,
            DeletedCount = 0,
            DocumentIds = new[] { ExistingDocumentId },
        });
        upsertedDocument.Should().BeEquivalentTo(new { DocumentId = ExistingDocumentId, SourcePath = ScopedNotePath });
        replacedDocumentIds.Should().Equal(ExistingDocumentId);
    }

    /// <summary>
    /// Tests that folder ingestion deletes missing stored documents and ingests changed markdown files.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_FolderSource_DeletesMissingDocumentsAndIngestsChangedMarkdownFiles()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        var unchangedMarkdown = Published("# A\n\nAlpha.");
        workspace.WriteMarkdown("Scope/A.md", unchangedMarkdown);
        workspace.WriteMarkdown(NestedMarkdownPath, Published("# B\n\nChanged beta."));
        workspace.WriteMarkdown("Scope/New.md", Published("# New\n\nFresh."));
        File.WriteAllText(Path.Combine(workspace.RootDirectory, ScopePath, "Ignored.txt"), "not markdown");
        var existingScoped = new[]
        {
            Document("old-a", "Scope/A.md", unchangedMarkdown, ComputeSourceHash(unchangedMarkdown)),
            Document("old-b", NestedMarkdownPath, Published("# B\n\nOld beta."), "old-hash"),
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
            ProcessedCount = 3,
            CreatedCount = 1,
            UpdatedCount = 1,
            DeletedCount = 1,
        });
        deletedDocumentIds.Should().BeEquivalentTo(["deleted"]);
        upsertedDocuments.Select(document => document.SourcePath).Should().Equal(NestedMarkdownPath, "Scope/New.md");
        replacedDocumentIds.Should().BeEquivalentTo(result.DocumentIds);
        replacedDocumentIds.Should().NotContain("old-a");
        VerifyFolderRepositoryUsedOnce(documents, ScopePath);
    }

    /// <summary>
    /// Ingests documents unchanged folder skips document updates and chunking.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_UnchangedFolder_SkipsDocumentUpdatesAndChunking()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        var rawMarkdown = Published("# Note\n\nStable content.");
        workspace.WriteMarkdown(ScopedNotePath, rawMarkdown);
        var existing = Document(ExistingDocumentId, ScopedNotePath, rawMarkdown, ComputeSourceHash(rawMarkdown));
        var upsertedDocuments = new List<Document>();
        var documents = CreateFolderDocumentRepository(ScopePath, [existing], upsertedDocuments);
        var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
        chunks.Setup(mock => mock.DeleteByDocumentIdsAsync(It.Is<IReadOnlyCollection<string>>(ids => ids.Count == 0), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        // Act
        var result = await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, null));

        // Assert
        result.Should().BeEquivalentTo(new
        {
            ProcessedCount = 1,
            CreatedCount = 0,
            UpdatedCount = 0,
            DeletedCount = 0,
            DocumentIds = Array.Empty<string>(),
        });
        upsertedDocuments.Should().BeEmpty();
        VerifyFolderRepositoryUsedOnce(documents, ScopePath);
    }

    /// <summary>
    /// Tests that folder ingestion skips markdown files not published for RAG.
    /// </summary>
    [Fact]
    public async Task IngestDocumentsAsync_FolderSource_SkipsNonRagMarkdownFiles()
    {
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Scope/Published.md", Published("# Published\n\nUseful RAG content."));
        workspace.WriteMarkdown("Scope/Draft.md", "# Draft\n\nNot published yet.");
        workspace.WriteMarkdown("Scope/Templates/Template.md", Published("# Template\n\nScaffold."));
        var upsertedDocuments = new List<Document>();
        var documents = CreateFolderDocumentRepository(ScopePath, [], upsertedDocuments);
        var chunks = CreateReplacingChunkRepository();
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest(ScopePath, null));

        result.Should().BeEquivalentTo(new
        {
            ProcessedCount = 1,
            CreatedCount = 1,
            UpdatedCount = 0,
            DeletedCount = 0,
        });
        upsertedDocuments.Select(document => document.SourcePath).Should().Equal("Scope/Published.md");
    }

    private static IngestionService CreateService(
        string rootDirectory,
        Mock<IDocumentRepository> documents,
        Mock<IChunkRepository> chunks)
    {
        var embeddingGenerator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(embeddingGenerator.Object, Options.Create(new EmbeddingOptions()));
        var chunkingService = new ChunkingService(
            chunks.Object,
            embeddingService,
            new MarkdownSectionChunkingStrategy());
        var chunkRepositoryFactory = new Mock<IChunkRepositoryFactory>(MockBehavior.Strict);
        chunkRepositoryFactory.Setup(factory => factory.Create(It.IsAny<ChunkingStrategyKind>()))
            .Returns(chunks.Object);

        return new IngestionService(
            documents.Object,
            chunkRepositoryFactory.Object,
            [chunkingService],
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
        documents.Setup(mock => mock.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<Document>, CancellationToken>((batch, _) => upsertedDocuments.AddRange(batch))
            .Returns(Task.CompletedTask);

        return documents;
    }

    private static void VerifyFolderRepositoryUsedOnce(Mock<IDocumentRepository> documents, string expectedSourcePathPrefix)
    {
        documents.Verify(
            mock => mock.GetBySourcePathPrefixAsync(expectedSourcePathPrefix, It.IsAny<CancellationToken>()),
            Times.Once);
        documents.Verify(
            mock => mock.GetBySourcePathAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
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
        chunks.Setup(mock => mock.ReplaceDocumentsChunksAsync(
                It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<string>, IReadOnlyCollection<ChunkModel>, CancellationToken>((documentIds, newChunks, _) =>
            {
                foreach (var documentId in documentIds)
                {
                    capture(documentId, newChunks.Where(chunk => chunk.DocumentId == documentId).ToArray());
                }
            })
            .Returns(Task.CompletedTask);

        return chunks;
    }

    private static Mock<IChunkingService> CreateChunkingService(ChunkingStrategyKind strategy)
    {
        var chunkingService = new Mock<IChunkingService>(MockBehavior.Strict);
        chunkingService.SetupGet(mock => mock.Strategy).Returns(strategy);
        chunkingService.Setup(mock => mock.ReplaceDocumentChunksAsync(
                It.IsAny<IReadOnlyList<Document>>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return chunkingService;
    }

    private static Document Document(string documentId, string sourcePath, string rawMarkdown, string sourceHash)
    {
        var parts = SplitFrontmatter(rawMarkdown);

        return new Document
        {
            DocumentId = documentId,
            SourcePath = sourcePath,
            Title = Path.GetFileNameWithoutExtension(sourcePath),
            RawMarkdown = rawMarkdown,
            Frontmatter = parts.Frontmatter,
            PageContent = parts.PageContent,
            SourceHash = sourceHash,
            UpdatedAt = DateTimeOffset.UnixEpoch,
        };
    }

    private static string Published(string pageContent, string? extraFrontmatter = null)
    {
        var frontmatter = string.IsNullOrWhiteSpace(extraFrontmatter)
            ? "dg-publish: true"
            : $"dg-publish: true\n{extraFrontmatter}";

        return $"---\n{frontmatter}\n---\n{pageContent}";
    }

    private static (string Frontmatter, string PageContent) SplitFrontmatter(string rawMarkdown)
    {
        if (!rawMarkdown.StartsWith("---", StringComparison.Ordinal))
        {
            return (string.Empty, rawMarkdown);
        }

        using var reader = new StringReader(rawMarkdown);
        if (!string.Equals(reader.ReadLine(), "---", StringComparison.Ordinal))
        {
            return (string.Empty, rawMarkdown);
        }

        var frontmatter = new System.Text.StringBuilder();
        while (reader.ReadLine() is { } line)
        {
            if (string.Equals(line, "---", StringComparison.Ordinal))
            {
                return (frontmatter.ToString().TrimEnd(), reader.ReadToEnd().TrimStart());
            }

            frontmatter.AppendLine(line);
        }

        return (string.Empty, rawMarkdown);
    }

    private static string ComputeSourceHash(string value)
    {
        var bytes = System.IO.Hashing.XxHash3.Hash(System.Text.Encoding.UTF8.GetBytes(value));
        var hashValue = System.Buffers.Binary.BinaryPrimitives.ReadUInt64BigEndian(bytes);

        return Convert.ToHexStringLower(bytes) + $":{hashValue}";
    }
}
