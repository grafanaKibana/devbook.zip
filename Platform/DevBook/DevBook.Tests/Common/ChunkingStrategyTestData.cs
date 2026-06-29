namespace DevBook.Tests.Common;

using DevBook.Data.Models;
using DevBook.Data.Repositories;
using Moq;

/// <summary>
/// Shared document builder and chunk-repository mocks for the chunking strategy tests.
/// Imported with <c>using static</c> so each strategy test calls <see cref="Document"/> and the capture
/// factories directly while keeping its own strategy-specific service wiring.
/// </summary>
internal static class ChunkingStrategyTestData
{
    /// <summary>
    /// Builds a published document with a single page-content body for chunking.
    /// </summary>
    /// <param name="documentId">Stable document identifier.</param>
    /// <param name="title">Document title used for the source path and citation label.</param>
    /// <param name="pageContent">Markdown body fed to the chunking strategy.</param>
    public static Document Document(string documentId, string title, string pageContent) => new()
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

    /// <summary>
    /// Creates a strict chunk-repository mock that captures the chunks replaced for a single expected document.
    /// </summary>
    /// <param name="expectedDocumentId">Document identifier the replace call must target.</param>
    /// <param name="capture">Receives the replacement chunks for assertions.</param>
    public static Mock<IChunkRepository> CaptureReplace(
        string expectedDocumentId,
        Action<IReadOnlyCollection<StoredChunk>> capture)
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.ReplaceDocumentsChunksAsync(
                It.Is<IReadOnlyCollection<string>>(documentIds => documentIds.Count == 1 && documentIds.Contains(expectedDocumentId)),
                It.IsAny<IReadOnlyCollection<StoredChunk>>(),
                It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<string>, IReadOnlyCollection<StoredChunk>, CancellationToken>((_, chunks, _) => capture(chunks))
            .Returns(Task.CompletedTask);

        return repository;
    }

    /// <summary>
    /// Creates a strict chunk-repository mock that accepts a replace call spanning the given documents.
    /// </summary>
    /// <param name="documentIds">Document identifiers the replace call must cover, in any order.</param>
    public static Mock<IChunkRepository> CaptureReplaceForDocuments(params string[] documentIds)
    {
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.ReplaceDocumentsChunksAsync(
                It.Is<IReadOnlyCollection<string>>(actual => actual.Order().SequenceEqual(documentIds.Order())),
                It.IsAny<IReadOnlyCollection<StoredChunk>>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        return repository;
    }
}
