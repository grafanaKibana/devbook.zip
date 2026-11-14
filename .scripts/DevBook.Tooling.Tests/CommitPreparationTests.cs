using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class CommitPreparationTests
{
    [Fact]
    public async Task SourcePreparationNeedsNoDesktopAndIgnoresDisposableWebChanges()
    {
        // Arrange
        using var fixture = new CommitFixture();
        fixture.Write("Vault/Home/Note.md", "---\npublish: false\n---\nUpdated source.\n");
        Git.Run(fixture.Root, "add", "Vault/Home/Note.md");
        fixture.Write("Web/content/Note.md", "A stale local preview.\n");

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(0);
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().Contain("created:").And.Contain("modified:");
        Git.Paths(fixture.Root, "diff", "--cached", "--name-only", "-z").Should().Equal("Vault/Home/Note.md");
        File.Exists(Path.Combine(fixture.Root, "maintenance-ran")).Should().BeTrue();
    }

    [Fact]
    public async Task PartiallyStagedSourceFailsBeforeMaintenance()
    {
        // Arrange
        using var fixture = new CommitFixture();
        fixture.Write("Vault/Home/Note.md", "Staged source.\n");
        Git.Run(fixture.Root, "add", "Vault/Home/Note.md");
        fixture.Write("Vault/Home/Note.md", "New concurrent work.\n");

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(1);
        File.Exists(Path.Combine(fixture.Root, "maintenance-ran")).Should().BeFalse();
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().Be("New concurrent work.\n");
    }

    private sealed class CommitFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "devbook-source-commit-" + Guid.NewGuid().ToString("N"));
        public string[] Arguments => ["--repo-root", Root, "--hook", Path.Combine(Root, ".githooks/pre-commit")];

        public CommitFixture()
        {
            Directory.CreateDirectory(Root);
            Directory.CreateDirectory(Path.Combine(Root, ".scripts"));
            Write("Vault/Home/Note.md", "---\npublish: false\n---\nOriginal source.\n");
            Write(".gitignore", "Web/content/\nmaintenance-ran\n");
            Write(".githooks/pre-commit", "#!/usr/bin/env bash\nset -e\ntest \"$DEVBOOK_QUARTZ_MAINTENANCE\" = 1\ntouch maintenance-ran\n");
            Git.Run(Root, "init", "--quiet");
            Git.Run(Root, "config", "user.name", "Fixture");
            Git.Run(Root, "config", "user.email", "fixture@example.invalid");
            Git.Run(Root, "add", "--all");
            Git.Run(Root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture");
        }

        public void Write(string name, string text)
        {
            string destination = Path.Combine(Root, name);
            Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
            File.WriteAllText(destination, text);
        }

        public void Dispose() => Directory.Delete(Root, true);
    }
}
