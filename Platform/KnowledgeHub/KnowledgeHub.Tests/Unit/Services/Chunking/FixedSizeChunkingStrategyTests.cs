namespace KnowledgeHub.Tests.Unit.Services.Chunking;

using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Data.Services.Chunking;
using KnowledgeHub.Tests.Common;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using Moq;

public sealed class FixedSizeChunkingStrategyTests
{
    private const string EmptyDocumentId = "doc-empty";
    private const string FixedDocumentId = "doc-fixed";
    private const string OverlapDocumentId = "doc-overlap";
    private const string FirstDocumentId = "doc-first";
    private const string SecondDocumentId = "doc-second";

    /// <summary>
    /// Tests that fixed-size chunking replaces chunks with an empty collection when a document has only whitespace content.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_WhitespaceDocument_ReplacesChunksWithEmptyCollection()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(EmptyDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository);

        // Act
        await service.ReplaceDocumentChunksAsync([Document(EmptyDocumentId, "Empty", "   \n\t  ")]);

        // Assert
        capturedChunks.Should().BeEmpty();
    }

    /// <summary>
    /// Tests that fixed-size chunking creates chunks without heading metadata while still assigning citation labels and embeddings.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_TextExceedsMaxChunkLength_CreatesFixedSizeChunksWithoutHeadingMetadata()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(FixedDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository);
        var content = string.Join(' ', Enumerable.Repeat("Alpha beta gamma delta", 70));

        // Act
        await service.ReplaceDocumentChunksAsync([Document(FixedDocumentId, "Fixed", content)]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Should().HaveCountGreaterThan(1);
        capturedChunks.Select(chunk => chunk.Heading).Should().OnlyContain(heading => heading == null);
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().OnlyContain(label => label == "[[Fixed]]");
        capturedChunks.Select(chunk => chunk.ChunkText).Should().OnlyContain(text => text.Length <= 1200);
        capturedChunks.Select(chunk => chunk.ChunkOrder).Should().Equal(Enumerable.Range(0, capturedChunks.Count));
        capturedChunks.Select(chunk => chunk.Embedding).Should().OnlyContain(vector => vector.Length == 2);
    }

    /// <summary>
    /// Tests that fixed-size chunking applies configured overlap so adjacent chunks preserve boundary context.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_OverlapConfigured_CreatesOverlappingChunks()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(OverlapDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository);
        var content = string.Concat(Enumerable.Range(0, 1300).Select(index => (char)('a' + index % 26)));

        // Act
        await service.ReplaceDocumentChunksAsync([Document(OverlapDocumentId, "Overlap", content)]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Select(chunk => chunk.ChunkText).Should().Equal(content[..1200], content[1000..]);
    }

    /// <summary>
    /// Tests that fixed-size chunking embeds chunks across multiple documents in one provider batch.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_MultipleDocuments_EmbedsChunksInSingleBatch()
    {
        // Arrange
        IReadOnlyList<string>? embeddedValues = null;
        var repository = CaptureReplaceForDocuments(FirstDocumentId, SecondDocumentId);
        var generator = EmbeddingGeneratorMockFactory.Create(values =>
        {
            embeddedValues = values;
            return values.Select(value => new[] { (float)value.Length }).ToArray();
        });
        var service = CreateService(repository, generator.Object);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(FirstDocumentId, "First", "First body."),
            Document(SecondDocumentId, "Second", "Second body.")
        ]);

        // Assert
        embeddedValues.Should().Equal("First body.", "Second body.");
    }

    private static ChunkingService CreateService(Mock<IChunkRepository> repository)
    {
        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();

        return CreateService(repository, generator.Object);
    }

    private static ChunkingService CreateService(
        Mock<IChunkRepository> repository,
        IEmbeddingGenerator<string, Embedding<float>> generator)
    {
        var embeddingService = new EmbeddingService(generator, Options.Create(new EmbeddingOptions()));

        return new ChunkingService(
            repository.Object,
            embeddingService,
            new FixedSizeChunkingStrategy());
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

    private static Mock<IChunkRepository> CaptureReplaceForDocuments(params string[] documentIds)
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        foreach (var documentId in documentIds)
        {
            repository.Setup(mock => mock.ReplaceDocumentChunksAsync(
                    documentId,
                    It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                    It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
        }

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
