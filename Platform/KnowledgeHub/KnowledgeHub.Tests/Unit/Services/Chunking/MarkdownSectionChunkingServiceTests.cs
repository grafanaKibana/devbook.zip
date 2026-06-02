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

public sealed class MarkdownSectionChunkingServiceTests
{
    private const string EmptyDocumentId = "doc-empty";
    private const string RagDocumentId = "doc-rag";
    private const string LongDocumentId = "doc-long";
    private const string FirstDocumentId = "doc-first";
    private const string SecondDocumentId = "doc-second";

    /// <summary>
    /// Tests that markdown section chunking replaces chunks with an empty collection when a document has only whitespace content.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_WhitespaceDocument_ReplacesChunksWithEmptyCollection()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(EmptyDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository, maxChunkLength: 100);

        // Act
        await service.ReplaceDocumentChunksAsync([Document(EmptyDocumentId, "Empty", "   \n\t  ")]);

        // Assert
        capturedChunks.Should().BeEmpty();
    }

    /// <summary>
    /// Tests that markdown section chunking binds each heading section to heading metadata and an Obsidian-style citation label.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_DocumentHasMarkdownHeadings_CreatesChunksWithHeadingMetadataAndCitationLabels()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(RagDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository, maxChunkLength: 200);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(RagDocumentId, "RAG", "# Overview\n\nGround answers in notes.\n\n## Tradeoffs\n\nRetrieval adds latency.")
        ]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Should().HaveCount(2);
        capturedChunks.Select(chunk => chunk.Heading).Should().Equal("Overview", "Tradeoffs");
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().Equal("[[RAG#Overview]]", "[[RAG#Tradeoffs]]");
        capturedChunks.Select(chunk => chunk.ChunkOrder).Should().Equal(0, 1);
        capturedChunks.Select(chunk => chunk.DocumentId).Should().OnlyContain(documentId => documentId == RagDocumentId);
        capturedChunks.Select(chunk => chunk.Embedding).Should().OnlyContain(vector => vector.Length == 2);
    }

    /// <summary>
    /// Tests that markdown section chunking splits an oversized section into embeddable chunks with document citations.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_SectionExceedsMaxChunkLength_SplitsSectionAndReplacesRepositoryChunks()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(LongDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository, maxChunkLength: 24);
        var content = "First sentence. Second sentence. Third sentence.";

        // Act
        await service.ReplaceDocumentChunksAsync([Document(LongDocumentId, "Long", content)]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Should().HaveCountGreaterThan(1);
        capturedChunks.Select(chunk => chunk.ChunkText).Should().OnlyContain(text => text.Length <= 24);
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().OnlyContain(label => label == "[[Long]]");
    }

    /// <summary>
    /// Tests that markdown section chunking embeds chunks across multiple documents in one provider batch.
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
        var service = CreateService(repository, generator.Object, maxChunkLength: 100);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(FirstDocumentId, "First", "# One\n\nFirst body."),
            Document(SecondDocumentId, "Second", "# Two\n\nSecond body.")
        ]);

        // Assert
        embeddedValues.Should().Equal("First body.", "Second body.");
    }

    private static MarkdownSectionChunkingService CreateService(Mock<IChunkRepository> repository, int maxChunkLength)
    {
        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();

        return CreateService(repository, generator.Object, maxChunkLength);
    }

    private static MarkdownSectionChunkingService CreateService(
        Mock<IChunkRepository> repository,
        IEmbeddingGenerator<string, Embedding<float>> generator,
        int maxChunkLength)
    {
        var embeddingService = new EmbeddingService(generator, Options.Create(new EmbeddingOptions()));

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
