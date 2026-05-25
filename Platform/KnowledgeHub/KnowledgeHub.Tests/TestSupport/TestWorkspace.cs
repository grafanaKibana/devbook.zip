namespace KnowledgeHub.Tests.TestSupport;

internal sealed class TestWorkspace : IDisposable
{
    private TestWorkspace(string rootDirectory)
    {
        RootDirectory = rootDirectory;
        Directory.CreateDirectory(rootDirectory);
    }

    public string RootDirectory { get; }

    public static TestWorkspace Create() => new(Path.Combine(Path.GetTempPath(), Path.GetRandomFileName()));

    public void WriteMarkdown(string relativePath, string markdown)
    {
        var path = Path.Combine(RootDirectory, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, markdown);
    }

    public void Dispose()
    {
        if (Directory.Exists(RootDirectory))
        {
            Directory.Delete(RootDirectory, recursive: true);
        }
    }
}
