namespace KnowledgeHub.Tests.Services;

using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Tests.TestSupport;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using Moq;

public sealed class MarkdownSectionChunkingServiceTests
{
    [Fact]
    public async Task ReplaceDocumentChunksAsync_DoesNothingForEmptyDocumentList()
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        var service = CreateService(repository, maxChunkLength: 100);

        await service.ReplaceDocumentChunksAsync([]);

        repository.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ReplaceDocumentChunksAsync_ReplacesWhitespaceDocumentWithEmptyChunks()
    {
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.ReplaceDocumentChunksAsync(
                "doc-empty",
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, IReadOnlyCollection<ChunkModel>, CancellationToken>((_, chunks, _) => capturedChunks = chunks)
            .Returns(Task.CompletedTask);
        var service = CreateService(repository, maxChunkLength: 100);

        await service.ReplaceDocumentChunksAsync([Document("doc-empty", "Empty", "   \n\t  ")]);

        capturedChunks.Should().BeEmpty();
        repository.VerifyAll();
    }

    [Fact]
    public async Task ReplaceDocumentChunksAsync_UsesHeadingMetadataAndCitationLabels()
    {
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace("doc-rag", chunks => capturedChunks = chunks);
        var service = CreateService(repository, maxChunkLength: 200);

        await service.ReplaceDocumentChunksAsync([
            Document("doc-rag", "RAG", "# Overview\n\nGround answers in notes.\n\n## Tradeoffs\n\nRetrieval adds latency.")
        ]);

        capturedChunks.Should().NotBeNull();
        capturedChunks.Should().HaveCount(2);
        capturedChunks!.Select(chunk => chunk.Heading).Should().Equal("Overview", "Tradeoffs");
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().Equal("[[RAG#Overview]]", "[[RAG#Tradeoffs]]");
        capturedChunks.Select(chunk => chunk.ChunkOrder).Should().Equal(0, 1);
        capturedChunks.Select(chunk => chunk.DocumentId).Should().OnlyContain(documentId => documentId == "doc-rag");
        capturedChunks.Select(chunk => chunk.Embedding).Should().OnlyContain(vector => vector.Length == 2);
        repository.VerifyAll();
    }

    [Fact]
    public async Task ReplaceDocumentChunksAsync_SplitsLongSectionsAndReplacesRepositoryChunks()
    {
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace("doc-long", chunks => capturedChunks = chunks);
        var service = CreateService(repository, maxChunkLength: 24);
        var content = "First sentence. Second sentence. Third sentence.";

        await service.ReplaceDocumentChunksAsync([Document("doc-long", "Long", content)]);

        capturedChunks.Should().NotBeNull();
        capturedChunks.Should().HaveCountGreaterThan(1);
        capturedChunks!.Select(chunk => chunk.ChunkText).Should().OnlyContain(text => text.Length <= 24);
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().OnlyContain(label => label == "[[Long]]");
        repository.VerifyAll();
    }

    [Fact]
    public async Task ReplaceDocumentChunksAsync_EmbedsChunksAcrossDocumentsInSingleBatch()
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.ReplaceDocumentChunksAsync(
                "doc-first",
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        repository.Setup(mock => mock.ReplaceDocumentChunksAsync(
                "doc-second",
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));
        var service = new MarkdownSectionChunkingService(
            repository.Object,
            Options.Create(new ChunkingOptions { MaxChunkLength = 100, OverlapLength = 0 }),
            embeddingService);

        await service.ReplaceDocumentChunksAsync([
            Document("doc-first", "First", "# One\n\nFirst body."),
            Document("doc-second", "Second", "# Two\n\nSecond body.")
        ]);

        generator.Verify(mock => mock.GenerateAsync(
                It.Is<IEnumerable<string>>(values => values.SequenceEqual(new[] { "First body.", "Second body." })),
                It.IsAny<EmbeddingGenerationOptions?>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        repository.VerifyAll();
    }

    private static MarkdownSectionChunkingService CreateService(Mock<IChunkRepository> repository, int maxChunkLength)
    {
        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));

        return new MarkdownSectionChunkingService(
            repository.Object,
            Options.Create(new ChunkingOptions { MaxChunkLength = maxChunkLength, OverlapLength = 0 }),
            embeddingService);
    }

    private static Mock<IChunkRepository> CaptureReplace(
        string expectedDocumentId,
        Action<IReadOnlyCollection<ChunkModel>> capture)
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.ReplaceDocumentChunksAsync(
                expectedDocumentId,
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, IReadOnlyCollection<ChunkModel>, CancellationToken>((_, chunks, _) => capture(chunks))
            .Returns(Task.CompletedTask);

        return repository;
    }

    private static Document Document(string documentId, string title, string pageContent) => new()
    {
        DocumentId = documentId,
        SourcePath = $"Notes/{title}.md",
        Title = title,
        RawMarkdown = pageContent,
        Frontmatter = string.Empty,
        PageContent = pageContent,
        SourceHash = $"hash-{documentId}",
        UpdatedAt = DateTimeOffset.UnixEpoch,
    };
}
