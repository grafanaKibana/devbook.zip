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
/// Contains tests for the semantic chunking strategy.
/// </summary>
public sealed class SemanticChunkingStrategyTests
{
    private const string EmptyDocumentId = "doc-empty";
    private const string RagDocumentId = "doc-rag";
    private const string BlocksDocumentId = "doc-blocks";
    private const string LongDocumentId = "doc-long";
    private const string DotNetDocumentId = "doc-dotnet";
    private const string FirstDocumentId = "doc-first";
    private const string SecondDocumentId = "doc-second";

    /// <summary>
    /// Tests that semantic chunking replaces chunks with an empty collection when a document has only whitespace content.
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
    /// Tests that semantic chunking can merge related text across Markdown headings without heading metadata.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_RelatedTextCrossesMarkdownHeadings_CreatesSingleChunkWithoutHeadingMetadata()
    {
        // Arrange
        IReadOnlyCollection<StoredChunk>? capturedChunks = null;
        var repository = CaptureReplace(RagDocumentId, chunks => capturedChunks = chunks);
        var generator = EmbeddingGeneratorMockFactory.Create(values => values.Select(_ => new[] { 1f, 0f }).ToArray());
        var service = CreateService(repository, generator.Object);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(RagDocumentId, "RAG", "# Overview\n\nGround answers in notes.\n\n## Tradeoffs\n\nGround answers need cited evidence.")
        ]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Should().ContainSingle();
        capturedChunks.Single().Heading.Should().BeNull();
        capturedChunks.Single().CitationLabel.Should().Be("[[RAG]]");
        capturedChunks.Single().ChunkText.Should().Contain("# Overview");
        capturedChunks.Single().ChunkText.Should().Contain("## Tradeoffs");
        capturedChunks.Select(chunk => chunk.ChunkOrder).Should().Equal(0);
        capturedChunks.Select(chunk => chunk.DocumentId).Should().OnlyContain(documentId => documentId == RagDocumentId);
        capturedChunks.Select(chunk => chunk.Embedding).Should().OnlyContain(vector => vector.Length == 2);
    }

    /// <summary>
    /// Tests that semantic chunking splits into separate chunks where embedding similarity drops at a topic boundary.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_EmbeddingSimilarityDrops_SplitsAtSemanticBoundary()
    {
        // Arrange
        IReadOnlyCollection<StoredChunk>? capturedChunks = null;
        var repository = CaptureReplace(BlocksDocumentId, chunks => capturedChunks = chunks);
        var generator = EmbeddingGeneratorMockFactory.Create(values => values.Select(value =>
            value.Contains("database", StringComparison.OrdinalIgnoreCase)
                ? new[] { 0f, 1f }
                : new[] { 1f, 0f }).ToArray());
        var service = CreateService(repository, generator.Object);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(BlocksDocumentId, "Blocks", "Cats chase mice. Cats purr softly.\n\nDatabase indexes speed queries. Database query plans use indexes.")
        ]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Should().HaveCount(2);
        capturedChunks.Select(chunk => chunk.Heading).Should().OnlyContain(heading => heading == null);
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().OnlyContain(label => label == "[[Blocks]]");
        capturedChunks.ElementAt(0).ChunkText.Should().Be("Cats chase mice. Cats purr softly.");
        capturedChunks.ElementAt(1).ChunkText.Should().Be("Database indexes speed queries. Database query plans use indexes.");
    }

    /// <summary>
    /// Tests that semantic chunking splits an oversized section into chunks that stay within the embeddable length limit.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_SectionExceedsMaxChunkLength_SplitsIntoEmbeddableChunks()
    {
        // Arrange
        IReadOnlyCollection<StoredChunk>? capturedChunks = null;
        var repository = CaptureReplace(LongDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository);
        var content = string.Join(". ", Enumerable.Range(0, 80).Select(index => $"Sentence {index:D2} explains semantic chunking behavior"));

        // Act
        await service.ReplaceDocumentChunksAsync([Document(LongDocumentId, "Long", content)]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Should().HaveCountGreaterThan(1);
        capturedChunks.Select(chunk => chunk.ChunkText).Should().OnlyContain(text => text.Length <= 1200);
        capturedChunks.Select(chunk => chunk.CitationLabel).Should().OnlyContain(label => label == "[[Long]]");
    }

    /// <summary>
    /// Tests that semantic chunking embeds a multi-sentence paragraph as one semantic unit.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_MultipleSentencesInParagraph_EmbedsSingleParagraphUnit()
    {
        // Arrange
        var embeddedCalls = new List<IReadOnlyList<string>>();
        var repository = CaptureReplace(DotNetDocumentId, _ => { });
        var generator = EmbeddingGeneratorMockFactory.Create(values =>
        {
            embeddedCalls.Add(values);
            return values.Select(_ => new[] { 1f, 0f }).ToArray();
        });
        var service = CreateService(repository, generator.Object);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(DotNetDocumentId, "DotNet", "Use .NET for backend APIs. It supports async workflows.")
        ]);

        // Assert
        embeddedCalls.Should().HaveCount(2);
        embeddedCalls[0].Should().Equal("Use .NET for backend APIs. It supports async workflows.");
    }

    /// <summary>
    /// Tests that semantic chunking embeds each document's semantic units separately, then persists all chunks in one batch.
    /// </summary>
    [Fact]
    public async Task ReplaceDocumentChunksAsync_MultipleDocuments_EmbedsSemanticUnitsPerDocumentAndChunksInSingleBatch()
    {
        // Arrange
        var embeddedCalls = new List<IReadOnlyList<string>>();
        var repository = CaptureReplaceForDocuments(FirstDocumentId, SecondDocumentId);
        var generator = EmbeddingGeneratorMockFactory.Create(values =>
        {
            embeddedCalls.Add(values);
            return values.Select(value => new[] { (float)value.Length }).ToArray();
        });
        var service = CreateService(repository, generator.Object);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(FirstDocumentId, "First", "# One\n\nFirst body."),
            Document(SecondDocumentId, "Second", "# Two\n\nSecond body.")
        ]);

        // Assert
        embeddedCalls.Should().HaveCount(3);
        embeddedCalls[0].Should().Equal("# One", "First body.");
        embeddedCalls[1].Should().Equal("# Two", "Second body.");
        embeddedCalls[2].Should().Equal("# One\n\nFirst body.", "# Two\n\nSecond body.");
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
            new SemanticChunkingStrategy());
    }
}
