namespace KnowledgeHub.Tests.Evaluation;

using System.Text.Json;
using FluentAssertions;

public sealed class GoldenRagDatasetTests
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    [Fact]
    public void GoldenDataset_HasExpectedCasesAndSourcePaths()
    {
        var dataset = LoadDataset();

        dataset.Cases.Should().HaveCount(15);
        dataset.Cases.SelectMany(testCase => testCase.ExpectedSources)
            .Should()
            .OnlyContain(source => source.Path.StartsWith("Software Engineering/", StringComparison.Ordinal));
    }

    [Fact]
    public void DatasetSnippets_AreExactSubstringsOfTheirSourceNotes()
    {
        var dataset = LoadDataset();

        foreach (var source in dataset.Cases.SelectMany(testCase => testCase.ExpectedSources))
        {
            var notePath = Path.Combine(VaultRoot(), source.Path);
            var noteText = File.ReadAllText(notePath);

            noteText.Should().Contain(source.Snippet);
        }
    }

    private static GoldenDataset LoadDataset()
        => JsonSerializer.Deserialize<GoldenDataset>(File.ReadAllText(DatasetFilePath()), JsonOptions)
            ?? new GoldenDataset();

    private static string DatasetFilePath()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);

        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, "Platform", "KnowledgeHub", "KnowledgeHub.Evaluations", "Datasets", "golden-rag-cases.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        throw new FileNotFoundException("Unable to locate Platform/KnowledgeHub/KnowledgeHub.Evaluations/Datasets/golden-rag-cases.json.");
    }

    private static string VaultRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);

        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, "Vault");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        throw new DirectoryNotFoundException("Unable to locate the Vault directory.");
    }

    private sealed record GoldenDataset
    {
        public IReadOnlyList<GoldenCase> Cases { get; init; } = [];
    }

    private sealed record GoldenCase
    {
        public IReadOnlyList<GoldenSource> ExpectedSources { get; init; } = [];
    }

    private sealed record GoldenSource
    {
        public string Path { get; init; } = string.Empty;
        public string? Snippet { get; init; }
    }
}
