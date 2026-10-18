namespace DevBook.Tests.Unit.Services.Chunking;

using FluentAssertions;
using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Data.Services.Chunking;
using DevBook.Tests.Common;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using Moq;
using static DevBook.Tests.Common.ChunkingStrategyTestData;

/// <summary>
/// Contains tests for the fixed-size chunking strategy.
/// </summary>
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
        IReadOnlyCollection<StoredChunk>? capturedChunks = null;
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
        IReadOnlyCollection<StoredChunk>? capturedChunks = null;
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
        IReadOnlyCollection<StoredChunk>? capturedChunks = null;
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
}
