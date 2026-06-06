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

public sealed class SemanticChunkingStrategyTests
{
    private const string EmptyDocumentId = "doc-empty";
    private const string RagDocumentId = "doc-rag";
    private const string BlocksDocumentId = "doc-blocks";
    private const string LongDocumentId = "doc-long";
    private const string FirstDocumentId = "doc-first";
    private const string SecondDocumentId = "doc-second";

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

    [Fact]
    public async Task ReplaceDocumentChunksAsync_DocumentHasMarkdownHeadings_CreatesChunksWithHeadingMetadataAndCitationLabels()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(RagDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(RagDocumentId, "RAG", "# Overview\n\nGround answers in notes.\n\nPrefer cited evidence.\n\n## Tradeoffs\n\nRetrieval adds latency.")
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

    [Fact]
    public async Task ReplaceDocumentChunksAsync_CodeFenceFitsBudget_PreservesFenceInSingleChunk()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
        var repository = CaptureReplace(BlocksDocumentId, chunks => capturedChunks = chunks);
        var service = CreateService(repository);

        // Act
        await service.ReplaceDocumentChunksAsync([
            Document(BlocksDocumentId, "Blocks", "# Example\n\nBefore the example.\n\n```csharp\nConsole.WriteLine(\"semantic\");\n```\n\nAfter the example.")
        ]);

        // Assert
        capturedChunks.Should().NotBeNull();
        capturedChunks!.Should().ContainSingle();
        capturedChunks.Single().ChunkText.Should().Contain("```csharp\nConsole.WriteLine(\"semantic\");\n```");
    }

    [Fact]
    public async Task ReplaceDocumentChunksAsync_SectionExceedsMaxChunkLength_SplitsIntoEmbeddableChunks()
    {
        // Arrange
        IReadOnlyCollection<ChunkModel>? capturedChunks = null;
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
            new SemanticChunkingStrategy());
    }

    private static Mock<IChunkRepository> CaptureReplace(
        string expectedDocumentId,
        Action<IReadOnlyCollection<ChunkModel>> capture)
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.ReplaceDocumentsChunksAsync(
                It.Is<IReadOnlyCollection<string>>(documentIds => documentIds.Count == 1 && documentIds.Contains(expectedDocumentId)),
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<string>, IReadOnlyCollection<ChunkModel>, CancellationToken>((_, chunks, _) => capture(chunks))
            .Returns(Task.CompletedTask);

        return repository;
    }

    private static Mock<IChunkRepository> CaptureReplaceForDocuments(params string[] documentIds)
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.ReplaceDocumentsChunksAsync(
                It.Is<IReadOnlyCollection<string>>(actual => actual.Order().SequenceEqual(documentIds.Order())),
                It.IsAny<IReadOnlyCollection<ChunkModel>>(),
                It.IsAny<CancellationToken>()))
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
