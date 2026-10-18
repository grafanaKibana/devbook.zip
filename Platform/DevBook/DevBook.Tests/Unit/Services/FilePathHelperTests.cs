namespace DevBook.Tests.Unit.Services;

using FluentAssertions;
using DevBook.Data.Services;
using DevBook.Tests.Common;

/// <summary>
/// Contains tests for <see cref="FilePathHelper"/>.
/// </summary>
public sealed class FilePathHelperTests
{
    /// <summary>
    /// Tests that markdown discovery skips files under dot-prefixed directories (e.g. .obsidian, .omc)
    /// so tool and app metadata is never chunked, embedded, or surfaced by RAG search.
    /// </summary>
    [Fact]
    public void GetMarkdownFiles_HiddenDirectories_ExcludesFilesUnderDotPrefixedFolders()
    {
        // Arrange
        using var workspace = TestWorkspace.Create();
        workspace.WriteMarkdown("note.md", "# Note");
        workspace.WriteMarkdown(".hidden/artifact.md", "# Artifact");
        workspace.WriteMarkdown("sub/nested.md", "# Nested");
        workspace.WriteMarkdown("sub/.omc/state.md", "# State");

        // Act
        var markdownFiles = FilePathHelper.GetMarkdownFiles(workspace.RootDirectory, workspace.RootDirectory, fileName: null);

        // Assert
        var relativePaths = markdownFiles
            .Select(path => FilePathHelper.NormalizePath(Path.GetRelativePath(workspace.RootDirectory, path)))
            .ToArray();
        relativePaths.Should().Equal("note.md", "sub/nested.md");
        relativePaths.Should().NotContain(path => path.Contains("/.", StringComparison.Ordinal));
    }
}
