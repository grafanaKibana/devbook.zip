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

    private const string DatedNote = "---\npublish: false\ncreated: \"2024-01-02T03:04:05.000Z\"\nmodified: \"2024-02-03T04:05:06.000Z\"\n---\nOriginal source.\n";

    [Fact]
    public async Task MergePreservesCommittedNotesFromBothParentsIncludingAddsAndRenames()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        string incoming = DatedNote.Replace("Original source.", "Incoming source.", StringComparison.Ordinal);
        fixture.StartMerge(current =>
        {
            current.Write("Vault/Home/Note.md", incoming);
            current.Write("Vault/Home/Added.md", DatedNote);
            Git.Run(current.Root, "mv", "Vault/Home/Rename.md", "Vault/Home/Renamed.md");
        }, current => current.Write("Vault/Home/Head.md", DatedNote));
        string[] paths = ["Note.md", "Added.md", "Renamed.md", "Head.md"];

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(0);
        foreach (string name in paths)
        {
            string expected = name == "Note.md" ? incoming : DatedNote;
            File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home", name)).Should().Be(expected);
        }
        File.Exists(Path.Combine(fixture.Root, "maintenance-ran")).Should().BeTrue();
    }

    [Fact]
    public async Task MergeStillPreparesNewResolutionAndNewNoteDates()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.StartMerge(current => current.Write("Vault/Home/Note.md", DatedNote.Replace("Original source.", "Incoming source.", StringComparison.Ordinal)));
        fixture.Write("Vault/Home/Note.md", DatedNote.Replace("Original source.", "New resolution.", StringComparison.Ordinal));
        fixture.Write("Vault/Home/New.md", "---\npublish: false\n---\nNew note.\n");
        Git.Run(fixture.Root, "add", "Vault/Home/Note.md", "Vault/Home/New.md");

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(0);
        IReadOnlyDictionary<string, string?> dates = NoteDates.Read(File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Note.md")));
        dates["created"].Should().Be("2024-01-02T03:04:05.000Z");
        dates["modified"].Should().NotBe("2024-02-03T04:05:06.000Z");
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/New.md")).Should().Contain("created:").And.Contain("modified:");
    }

    [Fact]
    public async Task MergeMetadataIsLocatedInTheLinkedWorktreeGitDirectory()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.StartMerge(current => current.Write("Vault/Home/Note.md", DatedNote.Replace("Original source.", "Incoming source.", StringComparison.Ordinal)), linked: true);
        string expected = File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md"));

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(0);
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().Be(expected);
    }

    [Theory]
    [InlineData("not-a-commit\n")]
    [InlineData("1111111111111111111111111111111111111111\n")]
    [InlineData("")]
    public async Task InvalidMergeMetadataBlocksDatePreparation(string metadata)
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.Write("Vault/Home/Note.md", DatedNote.Replace("Original source.", "New source.", StringComparison.Ordinal));
        Git.Run(fixture.Root, "add", "Vault/Home/Note.md");
        string original = File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md"));
        File.WriteAllText(Path.GetFullPath(Git.Text(fixture.Root, "rev-parse", "--git-path", "MERGE_HEAD"), fixture.Root), metadata);

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(1);
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().Be(original);
    }

    [Theory]
    [InlineData("modified: \"2024-02-03T04:05:06.000Z\"\n", "")]
    [InlineData("modified: \"2024-02-03T04:05:06.000Z\"", "modified: invalid")]
    [InlineData("created: \"2024-01-02T03:04:05.000Z\"\n", "")]
    [InlineData("publish: false", "publish: true")]
    public async Task InheritedMergeContentMustStillHaveValidRequiredDates(string before, string after)
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.StartMerge(current => current.Write("Vault/Home/Note.md", DatedNote.Replace(before, after, StringComparison.Ordinal)));
        string expected = File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md"));

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(1);
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().Be(expected);
    }

    [Fact]
    public async Task MaintenanceFailureStillBlocksSourcePreparation()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.Write(".githooks/pre-commit", "#!/usr/bin/env bash\nexit 1\n");
        fixture.Write("Vault/Home/Note.md", DatedNote + "Changed source.\n");
        Git.Run(fixture.Root, "add", "Vault/Home/Note.md");
        string expected = File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md"));

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(1);
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().Be(expected);
    }

    [Fact]
    public async Task SourceChangedDuringMaintenanceStillBlocksWithoutOverwritingIt()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.Write(".githooks/pre-commit", "#!/usr/bin/env bash\nprintf 'Concurrent work.\\n' > Vault/Home/Note.md\n");
        fixture.Write("Vault/Home/Note.md", DatedNote + "Staged source.\n");
        Git.Run(fixture.Root, "add", "Vault/Home/Note.md");

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(1);
        File.ReadAllText(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().Be("Concurrent work.\n");
    }

    [Fact]
    public async Task UnresolvedMergeStillBlocksBeforeMaintenance()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.StartMerge(current => current.Write("Vault/Home/Note.md", DatedNote + "Incoming change.\n"),
            current => current.Write("Vault/Home/Note.md", DatedNote + "Local change.\n"), allowConflicts: true);

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(1);
        File.Exists(Path.Combine(fixture.Root, "maintenance-ran")).Should().BeFalse();
        Git.Paths(fixture.Root, "diff", "--name-only", "--diff-filter=U", "-z").Should().Contain("Vault/Home/Note.md");
    }

    [Fact]
    public async Task IncomingChangesFollowAHeadSideRenameUsingThatIncomingParentsPath()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.Write("Vault/Home/Rename.md", DatedNote.Replace("Original source.", "Distinct unrelated note.", StringComparison.Ordinal));
        Git.Run(fixture.Root, "add", "Vault/Home/Rename.md");
        Git.Run(fixture.Root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "distinct fixture");
        string incoming = DatedNote.Replace("Original source.", "Incoming source.", StringComparison.Ordinal);
        fixture.StartMerge(current => current.Write("Vault/Home/Note.md", incoming),
            current => Git.Run(current.Root, "mv", "Vault/Home/Note.md", "Vault/Home/Moved.md"));

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(0);
        File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Moved.md")).Should().Equal(System.Text.Encoding.UTF8.GetBytes(incoming));
        File.Exists(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().BeFalse();
        Git.Text(fixture.Root, "show", "incoming:Vault/Home/Note.md").Should().Be(incoming.TrimEnd('\n'));
    }

    [Fact]
    public async Task MergeDateOnlyEditStillUsesNormalDatePreparation()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.StartMerge(current => current.Write("Vault/Home/Incoming.md", DatedNote));
        string candidate = DatedNote.Replace("2024-02-03T04:05:06.000Z", "2030-01-02T03:04:05.000Z", StringComparison.Ordinal);
        fixture.Write("Vault/Home/Note.md", candidate);
        Git.Run(fixture.Root, "add", "Vault/Home/Note.md");

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(0);
        File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Note.md")).Should().Equal(System.Text.Encoding.UTF8.GetBytes(DatedNote));
    }

    [Fact]
    public async Task MaintenanceChangesDuringMergeStillReceiveANewModifiedDate()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.StartMerge(current => current.Write("Vault/Home/Incoming.md", DatedNote));
        fixture.Write(".githooks/pre-commit", "#!/usr/bin/env bash\nset -e\nprintf '\\nMaintenance source.\\n' >> Vault/Home/Note.md\ngit add -- Vault/Home/Note.md\n");

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(0);
        byte[] actual = File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Note.md"));
        IReadOnlyDictionary<string, string?> dates = NoteDates.Read(actual);
        dates["created"].Should().Be("2024-01-02T03:04:05.000Z");
        dates["modified"].Should().NotBe("2024-02-03T04:05:06.000Z");
        System.Text.Encoding.UTF8.GetString(actual).Should().EndWith("Maintenance source.\n");
        Git.Run(fixture.Root, "show", ":Vault/Home/Note.md").Should().Equal(actual);
    }

    [Fact]
    public async Task MergePreservesAConfiguredPublicationAliasByteForByte()
    {
        // Arrange
        using var fixture = new CommitFixture(dated: true);
        fixture.Write(".scripts/quartz-syncer.defaults.json", """{"publishedTimestampKey":"released"}""");
        string published = DatedNote.Replace("publish: false", "publish: true\nreleased: \"2024-02-04T05:06:07.000Z\"", StringComparison.Ordinal);
        fixture.StartMerge(current => current.Write("Vault/Home/Note.md", published));

        // Act
        int result = await CommitPreparation.RunAsync(fixture.Arguments);

        // Assert
        result.Should().Be(0);
        byte[] actual = File.ReadAllBytes(Path.Combine(fixture.Root, "Vault/Home/Note.md"));
        actual.Should().Equal(System.Text.Encoding.UTF8.GetBytes(published));
        NoteDates.Published(actual, NoteDates.PublicationKeys(fixture.Root)).Should().Be("2024-02-04T05:06:07.000Z");
        System.Text.Encoding.UTF8.GetString(actual).Should().NotContain("\npublished:");
    }

    private sealed class CommitFixture : IDisposable
    {
        public string Root { get; private set; } = Path.Combine(Path.GetTempPath(), "devbook-source-commit-" + Guid.NewGuid().ToString("N"));
        public string[] Arguments => ["--repo-root", Root, "--hook", Path.Combine(Root, ".githooks/pre-commit")];

        private string? originalRoot;

        public CommitFixture(bool dated = false)
        {
            Directory.CreateDirectory(Root);
            Write(".scripts/fixture.txt", "Fixture checkout.\n");
            Write("Vault/Home/Note.md", dated ? DatedNote : "---\npublish: false\n---\nOriginal source.\n");
            if (dated) Write("Vault/Home/Rename.md", DatedNote);
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

        public void StartMerge(Action<CommitFixture> incoming, Action<CommitFixture>? local = null, bool linked = false, bool allowConflicts = false)
        {
            string original = Git.Text(Root, "rev-parse", "HEAD");
            Git.Run(Root, "checkout", "--quiet", "-b", "incoming");
            incoming(this);
            Git.Run(Root, "add", "--all");
            Git.Run(Root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "incoming fixture");
            Git.Run(Root, "checkout", "--quiet", "-b", "local", original);
            Write("Vault/Assets/local.txt", "Local committed asset.\n");
            local?.Invoke(this);
            Git.Run(Root, "add", "--all");
            Git.Run(Root, "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "local fixture");
            if (linked)
            {
                originalRoot = Root;
                string linkedRoot = Root + "-linked";
                Git.Run(Root, "worktree", "add", "--quiet", "--detach", linkedRoot, "HEAD");
                Root = linkedRoot;
            }
            if (allowConflicts)
            {
                ProcessResult merge = Git.RunAsync(new ProcessRequest("git", ["merge", "--no-ff", "--no-commit", "incoming"], Root)).GetAwaiter().GetResult();
                merge.ExitCode.Should().Be(1);
            }
            else
            {
                Git.Run(Root, "merge", "--no-ff", "--no-commit", "incoming");
            }
        }

        public void Dispose()
        {
            Directory.Delete(Root, true);
            if (originalRoot is not null) Directory.Delete(originalRoot, true);
        }
    }
}
