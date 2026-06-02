namespace KnowledgeHub.Tests.Common;

using Microsoft.Extensions.AI;
using Moq;

internal static class EmbeddingGeneratorMockFactory
{
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

    public static Mock<IEmbeddingGenerator<string, Embedding<float>>> CreateByInputLength() =>
        Create(values => values
            .Select((value, index) => new[] { (float)value.Length, (float)index })
            .ToArray());
}
