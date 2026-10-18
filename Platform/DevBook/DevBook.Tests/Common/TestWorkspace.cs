namespace DevBook.Tests.Common;

internal sealed class TestWorkspace : IDisposable
{
    private TestWorkspace(string rootDirectory)
    {
        this.RootDirectory = rootDirectory;
        Directory.CreateDirectory(rootDirectory);
    }

    /// <summary>
    /// Gets the workspace root directory.
    /// </summary>
    public string RootDirectory { get; }

    /// <summary>
    /// Creates a temporary workspace directory.
    /// </summary>
    /// <returns>The created test workspace.</returns>
    public static TestWorkspace Create() => new(Path.Combine(Path.GetTempPath(), Path.GetRandomFileName()));

    /// <summary>
    /// Writes markdown.
    /// </summary>
    /// <param name="relativePath">Path relative to the workspace root.</param>
    /// <param name="markdown">Markdown content to write.</param>
    public void WriteMarkdown(string relativePath, string markdown)
    {
        var path = Path.Combine(this.RootDirectory, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, markdown);
    }

    /// <summary>
    /// Deletes the temporary workspace directory.
    /// </summary>
    public void Dispose()
    {
        if (Directory.Exists(this.RootDirectory))
        {
            Directory.Delete(this.RootDirectory, recursive: true);
        }
    }
}
