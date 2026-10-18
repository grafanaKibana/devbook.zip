namespace DevBook.Tests;

using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Services;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;

internal static class TestSupport
{
    public static Document Document(string id, string content) => new()
    {
        DocumentId = id,
        SourcePath = $"Scope/{id}.md",
        Title = id,
        RawMarkdown = content,
        Frontmatter = string.Empty,
        PageContent = content,
        SourceHash = "old",
        UpdatedAt = DateTimeOffset.UnixEpoch,
    };

    public static EmbeddingService Embeddings(Func<IReadOnlyList<string>, IReadOnlyList<float[]>>? vectors = null)
    {
        var generator = new Mock<IEmbeddingGenerator<string, Embedding<float>>>(MockBehavior.Strict);
        generator.Setup(g => g.GenerateAsync(It.IsAny<IEnumerable<string>>(),
                It.IsAny<EmbeddingGenerationOptions?>(), It.IsAny<CancellationToken>()))
            .Returns((IEnumerable<string> values, EmbeddingGenerationOptions? _, CancellationToken _) =>
            {
                var inputs = values.ToArray();
                var result = vectors?.Invoke(inputs) ?? inputs.Select(s => new[] { (float)s.Length, 0f }).ToArray();
                return Task.FromResult(new GeneratedEmbeddings<Embedding<float>>(
                    result.Select(v => new Embedding<float>(v)).ToArray()));
            });
        return new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions { MaxConcurrentBatches = 1 }));
    }
}

internal sealed class TestWorkspace : IDisposable, IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Testing";
    public string ApplicationName { get; set; } = "DevBook.Tests";
    public string ContentRootPath { get; set; } = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();

    public TestWorkspace() => Directory.CreateDirectory(ContentRootPath);

    public void Write(string path, string content)
    {
        var target = Path.Combine(ContentRootPath, path);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        File.WriteAllText(target, content);
    }

    public void Dispose() => Directory.Delete(ContentRootPath, recursive: true);
}
