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
/// Contains tests for the Markdown-section chunking strategy.
/// </summary>
public sealed class MarkdownSectionChunkingStrategyTests
{
    private const string EmptyDocumentId = "doc-empty";
    private const string RagDocumentId = "doc-rag";
    private const string LongDocumentId = "doc-long";
    private const string FirstDocumentId = "doc-first";
    private const string SecondDocumentId = "doc-second";

    /// <summary>
    /// Tests that Markdown-section chunking replaces chunks with an empty collection when a document has only whitespace content.
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
    /// Tests that Markdown-section chunking binds each heading section to heading metadata and an Obsidian-style citation label.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_DocumentHasMarkdownHeadings_CreatesChunksWithHeadingMetadataAndCitationLabels()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(RagDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository);

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
    /// Tests that Markdown-section chunking splits an oversized section into embeddable chunks with document citations.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_SectionExceedsMaxChunkLength_SplitsSectionAndReplacesRepositoryChunks()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(LongDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository);
        var content = string.Join(". ", Enumerable.Range(0, 80).Select(index => $"Sentence {index:D2} explains markdown chunking behavior"));

        // Act
        await service.ReplaceDocumentChunksAsync([Document(LongDocumentId, "Long", content)]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Should().HaveCountGreaterThan(1);
        capturedChunks.Select(chunk => chunk.ChunkText).Should().OnlyContain(text => text.Length <= 1200);
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().OnlyContain(label => label == "[[Long]]");
    }

    /// <summary>
    /// Tests that Markdown-section chunking embeds chunks across multiple documents in one provider batch.
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
            Document(FirstDocumentId, "First", "# One\n\nFirst body."),
            Document(SecondDocumentId, "Second", "# Two\n\nSecond body.")
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
            new MarkdownSectionChunkingStrategy());
    }
}
