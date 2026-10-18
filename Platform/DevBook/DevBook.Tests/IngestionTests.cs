namespace DevBook.Tests;

using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Data.Services.Chunking;
using Microsoft.Extensions.Options;
using Moq;

public sealed class IngestionTests
{
    [Fact]
    public async Task Folder_sync_preserves_identity_skips_unchanged_and_removes_only_missing_documents()
    {
        using var fixture = new Fixture();
        fixture.Workspace.Write("Scope/A.md", Published("# A"));
        fixture.Workspace.Write("Scope/B.md", Published("# B"));
        fixture.Workspace.Write("Scope/Draft.md", "# Unpublished");
        fixture.Workspace.Write("Scope/Templates/Template.md", Published("# Scaffold"));
        fixture.Workspace.Write("Scope/.hidden/Hidden.md", Published("# Hidden"));
        fixture.Workspace.Write("Scope/Ignore.txt", "ignored");
        var first = await fixture.Service.IngestDocumentsAsync(new("Scope", null));
        first.Should().BeEquivalentTo(new { ProcessedCount = 2, CreatedCount = 2, UpdatedCount = 0, DeletedCount = 0 });
        var original = fixture.Stored["Scope/A.md"];
        original.Should().BeEquivalentTo(new { Title = "A", Frontmatter = "publish: true", PageContent = "# A" });
        original.DocumentId.Should().StartWith("doc_");
        original.RawMarkdown.Should().Be(Published("# A"));
        var second = await fixture.Service.IngestDocumentsAsync(new("Scope", null));
        second.DocumentIds.Should().BeEmpty();
        fixture.Upserts.Should().Be(1);
        fixture.Workspace.Write("Scope/A.md", Published("# Changed"));
        File.Delete(Path.Combine(fixture.Workspace.ContentRootPath, "Scope/B.md"));
        var third = await fixture.Service.IngestDocumentsAsync(new("Scope", null));
        third.Should().BeEquivalentTo(new { CreatedCount = 0, UpdatedCount = 1, DeletedCount = 1 });
        fixture.Stored["Scope/A.md"].DocumentId.Should().Be(original.DocumentId);
        fixture.Stored.Keys.Should().Equal("Scope/A.md");
        fixture.DeletedChunks.Should().ContainSingle().Which.Should().Be(first.DocumentIds.Single(id => id != original.DocumentId));
        fixture.Chunked.Last().Should().ContainSingle().Which.PageContent.Should().Be("# Changed");
    }

    [Fact]
    public async Task Single_file_sync_is_idempotent_forceable_and_never_deletes_siblings()
    {
        using var fixture = new Fixture();
        fixture.Workspace.Write("Scope/A.md", Published("# A"));
        fixture.Workspace.Write("Scope/B.md", Published("# B"));
        await fixture.Service.IngestDocumentsAsync(new(null, null));
        var id = fixture.Stored["Scope/A.md"].DocumentId;
        var unchanged = await fixture.Service.IngestDocumentsAsync(new("Scope", "A.md"));
        unchanged.DocumentIds.Should().BeEmpty();
        var forced = await fixture.Service.IngestDocumentsAsync(new("Scope", "A.md", ForceReingest: true));
        forced.DocumentIds.Should().Equal(id);
        forced.UpdatedCount.Should().Be(1);
        fixture.Stored.Should().HaveCount(2);
        fixture.DeletedChunks.Should().BeEmpty();
    }

    [Theory]
    [InlineData("../outside", null)]
    [InlineData("/tmp", null)]
    [InlineData("Scope", "../A.md")]
    [InlineData("Scope", "Nested/A.md")]
    [InlineData("Scope", "A.txt")]
    public async Task Invalid_paths_fail_before_repository_access(string source, string? file)
    {
        using var fixture = new Fixture();
        fixture.Workspace.Write("Scope/A.md", Published("# A"));
        await Assert.ThrowsAsync<ArgumentException>(() => fixture.Service.IngestDocumentsAsync(new(source, file)));
        fixture.Documents.Invocations.Should().BeEmpty();
    }

    [Fact]
    public async Task Storage_failure_propagates_without_chunking_new_content()
    {
        using var fixture = new Fixture();
        fixture.Workspace.Write("Scope/A.md", Published("# A"));
        fixture.Documents.Setup(d => d.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("storage unavailable"));
        await Assert.ThrowsAsync<IOException>(() => fixture.Service.IngestDocumentsAsync(new("Scope", "A.md")));
        fixture.Chunked.Should().BeEmpty();
    }

    [Theory]
    [InlineData(null, 1, 1)]
    [InlineData(ChunkingStrategyKind.FixedSize, 1, 0)]
    [InlineData(ChunkingStrategyKind.Semantic, 0, 1)]
    public async Task Requested_strategy_controls_chunk_updates(ChunkingStrategyKind? requested, int fixedCalls, int semanticCalls)
    {
        using var fixture = new Fixture();
        fixture.Workspace.Write("Scope/A.md", Published("# A"));
        var semantic = new Mock<IChunkingService>(MockBehavior.Strict);
        semantic.SetupGet(c => c.Strategy).Returns(ChunkingStrategyKind.Semantic);
        semantic.Setup(c => c.ReplaceDocumentChunksAsync(It.IsAny<IReadOnlyList<Document>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        var service = fixture.CreateService([fixture.Chunker.Object, semantic.Object]);
        await service.IngestDocumentsAsync(new("Scope", "A.md", ChunkingStrategy: requested));
        fixture.Chunked.Should().HaveCount(fixedCalls);
        semantic.Verify(c => c.ReplaceDocumentChunksAsync(It.IsAny<IReadOnlyList<Document>>(), It.IsAny<CancellationToken>()), Times.Exactly(semanticCalls));
    }

    private static string Published(string body) => $"---\npublish: true\n---\n{body}";

    private sealed class Fixture : IDisposable
    {
        public TestWorkspace Workspace { get; } = new();
        public Mock<IDocumentRepository> Documents { get; } = new(MockBehavior.Strict);
        public Mock<IChunkingService> Chunker { get; } = new(MockBehavior.Strict);
        public Dictionary<string, Document> Stored { get; } = new();
        public List<IReadOnlyList<Document>> Chunked { get; } = [];
        public List<string> DeletedChunks { get; } = [];
        public int Upserts { get; private set; }
        public IngestionService Service => CreateService([Chunker.Object]);
        private readonly Mock<IChunkRepositoryFactory> factory = new(MockBehavior.Strict);

        public Fixture()
        {
            Documents.Setup(d => d.GetBySourcePathPrefixAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((string prefix, CancellationToken _) => Stored.Values.Where(d => d.SourcePath.StartsWith(prefix, StringComparison.Ordinal)).ToArray());
            Documents.Setup(d => d.GetBySourcePathAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((string path, CancellationToken _) => Stored.GetValueOrDefault(path));
            Documents.Setup(d => d.BulkUpsertAsync(It.IsAny<IReadOnlyCollection<Document>>(), It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyCollection<Document>, CancellationToken>((batch, _) =>
                {
                    Upserts++;
                    foreach (var document in batch) Stored[document.SourcePath] = document;
                }).Returns(Task.CompletedTask);
            Documents.Setup(d => d.DeleteByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyCollection<string>, CancellationToken>((ids, _) =>
                {
                    foreach (var path in Stored.Where(p => ids.Contains(p.Value.DocumentId)).Select(p => p.Key).ToArray()) Stored.Remove(path);
                }).Returns(Task.CompletedTask);
            var chunks = new Mock<IChunkRepository>(MockBehavior.Strict);
            chunks.Setup(c => c.DeleteByDocumentIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyCollection<string>, CancellationToken>((ids, _) => DeletedChunks.AddRange(ids)).Returns(Task.CompletedTask);
            factory.Setup(f => f.Create(It.IsAny<ChunkingStrategyKind>())).Returns(chunks.Object);
            Chunker.SetupGet(c => c.Strategy).Returns(ChunkingStrategyKind.FixedSize);
            Chunker.Setup(c => c.ReplaceDocumentChunksAsync(It.IsAny<IReadOnlyList<Document>>(), It.IsAny<CancellationToken>()))
                .Callback<IReadOnlyList<Document>, CancellationToken>((documents, _) => Chunked.Add(documents)).Returns(Task.CompletedTask);
        }

        public IngestionService CreateService(IEnumerable<IChunkingService> chunkers) =>
            new(Documents.Object, factory.Object, chunkers, Workspace, Options.Create(new IngestionOptions { ContentRootPath = "." }));

        public void Dispose() => Workspace.Dispose();
    }
}
