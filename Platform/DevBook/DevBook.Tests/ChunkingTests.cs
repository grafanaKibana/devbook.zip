namespace DevBook.Tests;

using DevBook.Data.Models;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Data.Services.Chunking;
using Moq;

public sealed class ChunkingTests
{
    [Theory]
    [InlineData(ChunkingStrategyKind.FixedSize)]
    [InlineData(ChunkingStrategyKind.MarkdownSection)]
    [InlineData(ChunkingStrategyKind.Semantic)]
    public async Task Chunk_replacement_preserves_content_order_identity_vectors_and_size(ChunkingStrategyKind kind)
    {
        var content = string.Concat(Enumerable.Range(0, 2600).Select(i => (char)('a' + i % 26)));
        IReadOnlyCollection<StoredChunk>? captured = null;
        var repository = Capture((ids, chunks) =>
        {
            ids.Should().Equal("Long", "Empty");
            captured = chunks;
        });
        var service = new ChunkingService(repository.Object, Embeddings(), Strategy(kind));
        await service.ReplaceDocumentChunksAsync([Document("Long", content), Document("Empty", " \n\t ")]);
        var chunks = captured!.ToArray();
        chunks.Should().HaveCountGreaterThan(1);
        chunks.Select(c => c.ChunkOrder).Should().Equal(Enumerable.Range(0, chunks.Length));
        chunks.Should().OnlyContain(c => c.DocumentId == "Long" && c.CitationLabel == "[[Long]]" && c.Heading == null);
        chunks.Should().OnlyContain(c => c.ChunkText.Length <= 1200 && c.Embedding.SequenceEqual(new[] { (float)c.ChunkText.Length, 0f }));
        chunks.Select(c => c.ChunkId).Should().OnlyHaveUniqueItems();
        var overlap = kind == ChunkingStrategyKind.MarkdownSection ? 0 : 200;
        var reconstructed = chunks[0].ChunkText + string.Concat(chunks.Skip(1).Select(c => c.ChunkText[overlap..]));
        reconstructed.Should().Be(content);
        await service.ReplaceDocumentChunksAsync([Document("Long", content), Document("Empty", " \n\t ")]);
        captured!.Select(c => c.ChunkId).Should().Equal(chunks.Select(c => c.ChunkId));
    }

    [Theory]
    [InlineData(ChunkingStrategyKind.FixedSize)]
    [InlineData(ChunkingStrategyKind.MarkdownSection)]
    [InlineData(ChunkingStrategyKind.Semantic)]
    public async Task Empty_document_clears_old_chunks(ChunkingStrategyKind kind)
    {
        var repository = Capture((ids, chunks) =>
        {
            ids.Should().Equal("Empty");
            chunks.Should().BeEmpty();
        });
        await new ChunkingService(repository.Object, Embeddings(), Strategy(kind))
            .ReplaceDocumentChunksAsync([Document("Empty", " \n\t ")]);
        repository.VerifyAll();
    }

    [Fact]
    public async Task Markdown_sections_keep_heading_citations_and_semantic_units_split_at_topic_changes()
    {
        IReadOnlyCollection<StoredChunk>? captured = null;
        var repository = Capture((_, chunks) => captured = chunks);
        await new ChunkingService(repository.Object, Embeddings(), new MarkdownSectionChunkingStrategy())
            .ReplaceDocumentChunksAsync([Document("RAG", "# Overview\n\nGround answers.\n\n## Tradeoffs\n\nRetrieval adds latency.")]);
        captured!.Select(c => c.Heading).Should().Equal("Overview", "Tradeoffs");
        captured!.Select(c => c.CitationLabel).Should().Equal("[[RAG#Overview]]", "[[RAG#Tradeoffs]]");
        var embeddings = Embeddings(values => values.Select(v => v.Contains("Database", StringComparison.Ordinal)
            ? new[] { 0f, 1f } : new[] { 1f, 0f }).ToArray());
        await new ChunkingService(repository.Object, embeddings, new SemanticChunkingStrategy())
            .ReplaceDocumentChunksAsync([Document("Topics", "Cats chase mice. Cats purr.\n\nDatabase indexes speed queries.")]);
        captured!.Select(c => c.ChunkText).Should().Equal("Cats chase mice. Cats purr.", "Database indexes speed queries.");
        captured!.Should().OnlyContain(c => c.Heading == null && c.CitationLabel == "[[Topics]]");
    }

    [Fact]
    public async Task Embedding_failure_never_replaces_stored_chunks()
    {
        var embeddings = new Mock<IEmbeddingService>(MockBehavior.Strict);
        embeddings.Setup(e => e.GenerateEmbeddingsAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("provider unavailable"));
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        var service = new ChunkingService(repository.Object, embeddings.Object, new FixedSizeChunkingStrategy());
        await Assert.ThrowsAsync<IOException>(() => service.ReplaceDocumentChunksAsync([Document("A", "content")]));
        repository.Invocations.Should().BeEmpty();
    }

    private static IChunkingStrategy Strategy(ChunkingStrategyKind kind) => kind switch
    {
        ChunkingStrategyKind.FixedSize => new FixedSizeChunkingStrategy(),
        ChunkingStrategyKind.MarkdownSection => new MarkdownSectionChunkingStrategy(),
        ChunkingStrategyKind.Semantic => new SemanticChunkingStrategy(),
        _ => throw new ArgumentOutOfRangeException(nameof(kind)),
    };

    private static Mock<IChunkRepository> Capture(Action<IReadOnlyCollection<string>, IReadOnlyCollection<StoredChunk>> capture)
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(r => r.ReplaceDocumentsChunksAsync(It.IsAny<IReadOnlyCollection<string>>(),
                It.IsAny<IReadOnlyCollection<StoredChunk>>(), It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<string>, IReadOnlyCollection<StoredChunk>, CancellationToken>((ids, chunks, _) => capture(ids, chunks))
            .Returns(Task.CompletedTask);
        return repository;
    }
}
