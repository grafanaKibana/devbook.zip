namespace DevBook.Data.Services;

using System.Buffers.Binary;
using System.IO.Hashing;
using System.Text;

/// <summary>
/// Content hashing (xxHash3) and deterministic document-id generation used by
/// <see cref="IngestionService"/>. The content hash drives change detection across re-ingestion.
/// </summary>
internal static class HashingHelper
{
    internal static string GenerateDocumentId(string normalizedSourcePath)
    {
        var hash = ComputeXxHash3(normalizedSourcePath).Split(':', 2)[0];

        return $"doc_{hash}";
    }

    internal static string ComputeXxHash3(string value)
    {
        var hashBytes = XxHash3.Hash(Encoding.UTF8.GetBytes(value));
        var hashValue = BinaryPrimitives.ReadUInt64BigEndian(hashBytes);

        return Convert.ToHexStringLower(hashBytes) + $":{hashValue}";
    }
}
