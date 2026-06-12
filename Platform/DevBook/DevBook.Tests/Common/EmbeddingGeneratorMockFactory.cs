namespace DevBook.Tests.Common;

using Microsoft.Extensions.AI;
using Moq;

internal static class EmbeddingGeneratorMockFactory
{
    /// <summary>
    /// Creates a strict embedding generator mock using the supplied vector factory.
    /// </summary>
    /// <param name="vectorFactory">Function that maps input text values to embedding vectors.</param>
    /// <returns>The configured embedding generator mock.</returns>
    public static Mock<IEmbeddingGenerator<string, Embedding<float>>> Create(
        Func<IReadOnlyList<string>, IReadOnlyList<float[]>> vectorFactory)
    {
        var mock = new Mock<IEmbeddingGenerator<string, Embedding<float>>>(MockBehavior.Strict);

        mock.Setup(generator => generator.GenerateAsync(
                It.IsAny<IEnumerable<string>>(),
                It.IsAny<EmbeddingGenerationOptions?>(),
                It.IsAny<CancellationToken>()))
            .Returns((IEnumerable<string> values, EmbeddingGenerationOptions? _, CancellationToken _) =>
            {
                var capturedValues = values.ToArray();
                var embeddings = vectorFactory(capturedValues)
                    .Select(vector => new Embedding<float>(vector))
                    .ToArray();

                return Task.FromResult(new GeneratedEmbeddings<Embedding<float>>(embeddings));
            });

        return mock;
    }

    /// <summary>
    /// Creates a strict embedding generator mock that derives vectors from input length and index.
    /// </summary>
    /// <returns>The configured embedding generator mock.</returns>
    public static Mock<IEmbeddingGenerator<string, Embedding<float>>> CreateByInputLength() =>
        Create(values => values
            .Select((value, index) => new[] { (float)value.Length, (float)index })
            .ToArray());
}
