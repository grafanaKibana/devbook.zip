using System.Text;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class DatesTests
{
    [Fact]
    public void SelectedCandidateDatesUseItsParentAndRemainStableOnRetry()
    {
        // Arrange
        byte[] parent = Encoding.UTF8.GetBytes("---\r\ncreated_at: '2024-01-02'\r\nmodified: \"2024-02-03T10:00:00.000Z\"\r\npublish: true\r\n---\r\nOriginal mechanism.\r\n");
        byte[] candidate = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(parent).Replace("Original", "Improved", StringComparison.Ordinal));
        var instant = DateTimeOffset.Parse("2026-10-30T10:11:12.345Z");

        // Act
        byte[] prepared = NoteDates.Prepare(candidate, parent, instant);
        string text = Encoding.UTF8.GetString(prepared);
        byte[] repeatedPreparation = NoteDates.Prepare(prepared, parent, instant);
        byte[] unchangedPreparation = NoteDates.Prepare(prepared, prepared, instant.AddDays(1));

        // Assert
        text.Should().Contain("created_at: '2024-01-02'\r\n");
        text.Should().Contain("created: \"2024-01-02T00:00:00.000Z\"\r\n");
        text.Should().Contain("modified: \"2026-10-30T10:11:12.345Z\"\r\n");
        repeatedPreparation.Should().Equal(prepared);
        unchangedPreparation.Should().Equal(prepared);

        // Arrange: a timestamp-only edit.
        byte[] dateOnlyChange = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(parent).Replace("2024-02-03T10:00:00.000Z", "2025-01-01T00:00:00.000Z", StringComparison.Ordinal));

        // Act: timestamp-only edits preserve meaningful dates.
        string dateOnlyText = Encoding.UTF8.GetString(NoteDates.Prepare(dateOnlyChange, parent, instant));

        // Assert
        dateOnlyText.Should().Contain("modified: \"2024-02-03T10:00:00.000Z\"");
        NoteDates.MeaningfulContent(parent).Should().Equal(NoteDates.MeaningfulContent(dateOnlyChange));
    }

    [Fact]
    public void LocalPreparationStagesOnlyPlannedDatesAndRejectsConcurrentSource()
    {
        // Arrange
        using var repository = new DateRepository();
        string path = "Vault/Home/Programming/NET/Card.md";
        repository.Write(path, "---\ncreated: 2024-01-01\nmodified: 2024-01-02\n---\nOriginal.\n");
        Git.Run(repository.Root, "add", "--", path);
        Git.Run(repository.Root, "-c", "core.hooksPath=/dev/null", "commit", "-m", "notes: seed fixture");
        repository.Write(path, File.ReadAllText(Path.Combine(repository.Root, path)).Replace("Original.", "Improved.", StringComparison.Ordinal));
        Git.Run(repository.Root, "add", "--", path);
        var instant = DateTimeOffset.Parse("2026-10-30T10:11:12.345Z");

        // Act: prepare and stage only selected dates.
        IEnumerable<string> changedPaths = NoteDates.PrepareLocal(repository.Root, instant).Keys;
        byte[] prepared = File.ReadAllBytes(Path.Combine(repository.Root, path));
        byte[] staged = Git.Run(repository.Root, "show", ":" + path);
        var repeatedPreparation = NoteDates.PrepareLocal(repository.Root, instant.AddDays(1));
        byte[] afterRetry = File.ReadAllBytes(Path.Combine(repository.Root, path));

        // Assert
        changedPaths.Should().Equal(path);
        staged.Should().Equal(prepared);
        repeatedPreparation.Should().BeEmpty();
        afterRetry.Should().Equal(prepared);

        // Arrange: a concurrent source edit.
        repository.Write(path, Encoding.UTF8.GetString(prepared) + "Concurrent editor text.\n");

        // Act
        Action prepare = () => NoteDates.PrepareLocal(repository.Root, instant);

        // Assert
        prepare.Should().Throw<NoteDateException>().WithMessage("*unstaged or concurrent*");
        File.ReadAllText(Path.Combine(repository.Root, path)).Should().EndWith("Concurrent editor text.\n");
    }

    private sealed class DateRepository : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "devbook-dates-" + Guid.NewGuid().ToString("N"));

        public DateRepository()
        {
            Directory.CreateDirectory(Root);
            Git.Run(Root, "init", "-b", "main");
            Git.Run(Root, "config", "user.name", "Fixture");
            Git.Run(Root, "config", "user.email", "fixture@example.invalid");
        }

        public void Write(string path, string content)
        {
            string target = Path.Combine(Root, path);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.WriteAllText(target, content, new UTF8Encoding(false));
        }

        public void Dispose() => Directory.Delete(Root, true);
    }
}
