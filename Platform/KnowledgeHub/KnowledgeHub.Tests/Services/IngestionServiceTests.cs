namespace KnowledgeHub.Tests.Services;

using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Tests.TestSupport;
using Microsoft.Extensions.Options;
using Moq;

public sealed class IngestionServiceTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task IngestDocumentsAsync_BlankSourcePathIngestsEverythingUnderRoot(string? sourcePath)
    {
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Root.md", "# Root\n\nRoot content.");
        workspace.WriteMarkdown("Scope/Nested.md", "# Nested\n\nNested content.");
        var upsertedDocuments = new List<Document>();
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathPrefixAsync("", It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        documents.Setup(mock => mock.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        documents.Setup(mock => mock.GetBySourcePathAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback<Document, CancellationToken>((document, _) => upsertedDocuments.Add(document))
            .Returns(Task.CompletedTask);
        var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
        chunks.Setup(mock => mock.DeleteByDocumentIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        chunks.Setup(mock => mock.ReplaceDocumentChunksAsync(It.IsAny<string>(), It.IsAny<IReadOnlyCollection<ChunkModel>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest(sourcePath, null));

        result.ProcessedCount.Should().Be(2);
        result.CreatedCount.Should().Be(2);
        result.DeletedCount.Should().Be(0);
        upsertedDocuments.Select(document => document.SourcePath).Should().Equal("Root.md", "Scope/Nested.md");
        documents.VerifyAll();
        chunks.VerifyAll();
    }

    [Theory]
    [InlineData("../Outside")]
    [InlineData("/tmp")]
    public async Task IngestDocumentsAsync_RejectsSourcePathEscapingRoot(string sourcePath)
    {
        using var workspace = TestWorkspace.Create();
        var service = CreateService(workspace.RootDirectory, new Mock<IDocumentRepository>(), new Mock<IChunkRepository>());

        var action = async () => await service.IngestDocumentsAsync(new IngestionRequest(sourcePath, null));

        await action.Should().ThrowAsync<ArgumentException>();
    }

    [Theory]
    [InlineData("../Note.md")]
    [InlineData("Nested/Note.md")]
    [InlineData("Note.txt")]
    public async Task IngestDocumentsAsync_RejectsBadFileName(string fileName)
    {
        using var workspace = TestWorkspace.Create();
        Directory.CreateDirectory(Path.Combine(workspace.RootDirectory, "Scope"));
        var service = CreateService(workspace.RootDirectory, new Mock<IDocumentRepository>(), new Mock<IChunkRepository>());

        var action = async () => await service.IngestDocumentsAsync(new IngestionRequest("Scope", fileName));

        await action.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task IngestDocumentsAsync_CreatesSingleFileAndChunksIt()
    {
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Scope/Note.md", "---\nstatus: Creation\n---\n# Note\n\nFresh content.");
        Document? upsertedDocument = null;
        IReadOnlyCollection<ChunkModel>? replacedChunks = null;
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync("Scope/Note.md", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback<Document, CancellationToken>((document, _) => upsertedDocument = document)
            .Returns(Task.CompletedTask);
        var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
        chunks.Setup(mock => mock.ReplaceDocumentChunksAsync(
                It.IsAny<string>(),
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, IReadOnlyCollection<ChunkModel>, CancellationToken>((_, newChunks, _) => replacedChunks = newChunks)
            .Returns(Task.CompletedTask);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest("Scope", "Note.md"));

        result.Success.Should().BeTrue();
        result.ProcessedCount.Should().Be(1);
        result.CreatedCount.Should().Be(1);
        result.UpdatedCount.Should().Be(0);
        result.DeletedCount.Should().Be(0);
        result.DocumentIds.Should().ContainSingle().Which.Should().StartWith("doc_");
        upsertedDocument.Should().NotBeNull();
        upsertedDocument!.SourcePath.Should().Be("Scope/Note.md");
        upsertedDocument.Title.Should().Be("Note");
        upsertedDocument.Frontmatter.Should().Be("status: Creation");
        upsertedDocument.PageContent.Should().Be("# Note\n\nFresh content.");
        replacedChunks.Should().NotBeEmpty();
        documents.VerifyAll();
        chunks.VerifyAll();
    }

    [Fact]
    public async Task IngestDocumentsAsync_UpdatesChangedSingleFileWithoutDeletingSiblings()
    {
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Scope/Note.md", "# Note\n\nChanged content.");
        var existing = Document("existing-doc", "Scope/Note.md", "# Note\n\nOld content.", "old-hash");
        Document? upsertedDocument = null;
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync("Scope/Note.md", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        documents.Setup(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback<Document, CancellationToken>((document, _) => upsertedDocument = document)
            .Returns(Task.CompletedTask);
        var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
        chunks.Setup(mock => mock.ReplaceDocumentChunksAsync("existing-doc", It.IsAny<IReadOnlyCollection<ChunkModel>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest("Scope", "Note.md"));

        result.CreatedCount.Should().Be(0);
        result.UpdatedCount.Should().Be(1);
        result.DeletedCount.Should().Be(0);
        result.DocumentIds.Should().Equal("existing-doc");
        upsertedDocument.Should().NotBeNull();
        upsertedDocument!.DocumentId.Should().Be("existing-doc");
        documents.Verify(mock => mock.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        chunks.Verify(mock => mock.DeleteByDocumentIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        documents.VerifyAll();
        chunks.VerifyAll();
    }

    [Fact]
    public async Task IngestDocumentsAsync_SkipsUnchangedSingleFile()
    {
        using var workspace = TestWorkspace.Create();
        const string rawMarkdown = "# Note\n\nStable content.";
        workspace.WriteMarkdown("Scope/Note.md", rawMarkdown);
        var existing = Document("existing-doc", "Scope/Note.md", rawMarkdown, "placeholder") with
        {
            SourceHash = ComputeSourceHash(rawMarkdown),
        };
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathAsync("Scope/Note.md", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest("Scope", "Note.md"));

        result.ProcessedCount.Should().Be(1);
        result.CreatedCount.Should().Be(0);
        result.UpdatedCount.Should().Be(0);
        result.DocumentIds.Should().BeEmpty();
        documents.Verify(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()), Times.Never);
        chunks.VerifyNoOtherCalls();
        documents.VerifyAll();
    }

    [Fact]
    public async Task IngestDocumentsAsync_FolderIngestionDeletesScopedDocumentsAndIngestsMarkdownFiles()
    {
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("Scope/A.md", "# A\n\nAlpha.");
        workspace.WriteMarkdown("Scope/Nested/B.md", "# B\n\nBeta.");
        File.WriteAllText(Path.Combine(workspace.RootDirectory, "Scope", "Ignored.txt"), "not markdown");
        var existingScoped = new[]
        {
            Document("old-a", "Scope/A.md", "old", "old"),
            Document("deleted", "Scope/Deleted.md", "old", "old"),
        };
        var deletedDocumentIds = Array.Empty<string>();
        var upsertedDocuments = new List<Document>();
        var replacedDocumentIds = new List<string>();
        var documents = new Mock<IDocumentRepository>(MockBehavior.Strict);
        documents.Setup(mock => mock.GetBySourcePathPrefixAsync("Scope", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingScoped);
        documents.Setup(mock => mock.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<string>, CancellationToken>((ids, _) => deletedDocumentIds = ids.ToArray())
            .Returns(Task.CompletedTask);
        documents.Setup(mock => mock.GetBySourcePathAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);
        documents.Setup(mock => mock.UpsertAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Callback<Document, CancellationToken>((document, _) => upsertedDocuments.Add(document))
            .Returns(Task.CompletedTask);
        var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
        chunks.Setup(mock => mock.DeleteByDocumentIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        chunks.Setup(mock => mock.ReplaceDocumentChunksAsync(It.IsAny<string>(), It.IsAny<IReadOnlyCollection<ChunkModel>>(), It.IsAny<CancellationToken>()))
            .Callback<string, IReadOnlyCollection<ChunkModel>, CancellationToken>((documentId, _, _) => replacedDocumentIds.Add(documentId))
            .Returns(Task.CompletedTask);
        var service = CreateService(workspace.RootDirectory, documents, chunks);

        var result = await service.IngestDocumentsAsync(new IngestionRequest("Scope", null));

        result.ProcessedCount.Should().Be(2);
        result.CreatedCount.Should().Be(2);
        result.UpdatedCount.Should().Be(0);
        result.DeletedCount.Should().Be(2);
        deletedDocumentIds.Should().BeEquivalentTo(["old-a", "deleted"]);
        upsertedDocuments.Select(document => document.SourcePath).Should().Equal("Scope/A.md", "Scope/Nested/B.md");
        replacedDocumentIds.Should().BeEquivalentTo(result.DocumentIds);
        documents.VerifyAll();
        chunks.VerifyAll();
    }

    private static IngestionService CreateService(
        string rootDirectory,
        Mock<IDocumentRepository> documents,
        Mock<IChunkRepository> chunks)
    {
        var embeddingGenerator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(embeddingGenerator.Object, Options.Create(new EmbeddingOptions { BatchSize = 10 }));
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
