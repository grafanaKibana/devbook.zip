namespace DevBook.Data.Services.Chunking;

/// <summary>
/// Shared fixed-size text splitting used by the chunking strategies. Splits content into windows of at
/// most <c>maxChunkLength</c> characters, preferring to break on whitespace, and advances by
/// (window − <c>overlapLength</c>) so an <c>overlapLength</c> of 0 yields non-overlapping chunks. This
/// is the single home for the window/boundary logic so the strategies that fall back to fixed-size
/// splitting cannot silently drift apart.
/// </summary>
internal static class ChunkText
{
    /// <summary>
    /// Splits <paramref name="content"/> into trimmed fixed-size chunks.
    /// </summary>
    /// <param name="content">Text to split; leading and trailing whitespace is trimmed first.</param>
    /// <param name="maxChunkLength">Maximum character length of each chunk.</param>
    /// <param name="overlapLength">Characters repeated from the end of one chunk at the start of the next; 0 means no overlap.</param>
    /// <returns>The non-empty chunks in document order.</returns>
    internal static IReadOnlyList<string> SplitFixedSize(string content, int maxChunkLength, int overlapLength)
    {
        var normalizedContent = content.Trim();
        if (string.IsNullOrWhiteSpace(normalizedContent))
        {
            return [];
        }

        var chunks = new List<string>();
        var start = 0;

        while (start < normalizedContent.Length)
        {
            var remainingLength = normalizedContent.Length - start;
            var length = Math.Min(maxChunkLength, remainingLength);
            var endExclusive = start + length;

            if (endExclusive < normalizedContent.Length)
            {
                var splitIndex = FindWhitespaceBoundary(normalizedContent, start, endExclusive);
                if (splitIndex > start)
                {
                    endExclusive = splitIndex;
                }
            }

            var text = normalizedContent[start..endExclusive].Trim();
            if (!string.IsNullOrWhiteSpace(text))
            {
                chunks.Add(text);
            }

            if (endExclusive >= normalizedContent.Length)
            {
                break;
            }

            start = Math.Max(endExclusive - overlapLength, start + 1);
        }

        return chunks;
    }

    private static int FindWhitespaceBoundary(string content, int start, int endExclusive)
    {
        for (var index = endExclusive; index > start; index--)
        {
            if (char.IsWhiteSpace(content[index - 1]))
            {
                return index;
            }
        }

        return endExclusive;
    }
}
