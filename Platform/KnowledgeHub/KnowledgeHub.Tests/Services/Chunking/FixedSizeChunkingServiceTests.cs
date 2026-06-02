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

public sealed class FixedSizeChunkingServiceTests
{
    [Fact]
    public async Task ReplaceDocumentChunksAsync_DoesNothingForEmptyDocumentList()
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        var service = CreateService(repository, maxChunkLength: 100, overlapLength: 0);

        await service.ReplaceDocumentChunksAsync([]);

        repository.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ReplaceDocumentChunksAsync_ReplacesWhitespaceDocumentWithEmptyChunks()
    {
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace("doc-empty", chunks => capturedChunks = chunks);
        var service = CreateService(repository, maxChunkLength: 100, overlapLength: 0);

        await service.ReplaceDocumentChunksAsync([Document("doc-empty", "Empty", "   \n\t  ")]);

        capturedChunks.Should().BeEmpty();
        repository.VerifyAll();
    }

    [Fact]
    public async Task ReplaceDocumentChunksAsync_UsesFixedSizeChunksWithoutHeadingMetadata()
    {
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace("doc-fixed", chunks => capturedChunks = chunks);
        var service = CreateService(repository, maxChunkLength: 12, overlapLength: 0);

        await service.ReplaceDocumentChunksAsync([Document("doc-fixed", "Fixed", "Alpha beta gamma delta")]);

        capturedChunks.Should().NotBeNull();
        capturedChunks.Should().HaveCountGreaterThan(1);
        capturedChunks!.Select(chunk => chunk.Heading).Should().OnlyContain(heading => heading == null);
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().OnlyContain(label => label == "[[Fixed]]");
        capturedChunks.Select(chunk => chunk.ChunkText).Should().OnlyContain(text => text.Length <= 12);
        capturedChunks.Select(chunk => chunk.ChunkOrder).Should().Equal(0, 1);
        capturedChunks.Select(chunk => chunk.Embedding).Should().OnlyContain(vector => vector.Length == 2);
        repository.VerifyAll();
    }

    [Fact]
    public async Task ReplaceDocumentChunksAsync_AppliesConfiguredOverlap()
    {
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace("doc-overlap", chunks => capturedChunks = chunks);
        var service = CreateService(repository, maxChunkLength: 10, overlapLength: 3);

        await service.ReplaceDocumentChunksAsync([Document("doc-overlap", "Overlap", "abcdefghij12345")]);

        capturedChunks.Should().NotBeNull();
        capturedChunks!.Select(chunk => chunk.ChunkText).Should().Equal("abcdefghij", "hij12345");
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
        var service = new FixedSizeChunkingService(
            repository.Object,
            Options.Create(new ChunkingOptions { MaxChunkLength = 100, OverlapLength = 0 }),
            embeddingService);

        await service.ReplaceDocumentChunksAsync([
            Document("doc-first", "First", "First body."),
            Document("doc-second", "Second", "Second body.")
        ]);

        generator.Verify(mock => mock.GenerateAsync(
                It.Is<IEnumerable<string>>(values => values.SequenceEqual(new[] { "First body.", "Second body." })),
                It.IsAny<EmbeddingGenerationOptions?>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        repository.VerifyAll();
    }

    private static FixedSizeChunkingService CreateService(
        Mock<IChunkRepository> repository,
        int maxChunkLength,
        int overlapLength)
    {
        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));

        return new FixedSizeChunkingService(
            repository.Object,
            Options.Create(new ChunkingOptions { MaxChunkLength = maxChunkLength, OverlapLength = overlapLength }),
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
