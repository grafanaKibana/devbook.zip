using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public sealed record TreeUploadWait(TimeProvider Clock, Func<TimeSpan, CancellationToken, Task> Delay);

/// <summary>Uploads immutable export objects without moving any refs.</summary>
public static class TreeUpload
{
    public const int MaximumEntries = 100;
    public const int MaximumRequestBytes = 1_048_576;
    private static readonly UTF8Encoding StrictUtf8 = new(false, true);

    public static async Task<string> UploadAsync(IGitHubApi api, string baseTree,
        IReadOnlyDictionary<string, byte[]?> files, Func<CancellationToken, Task> guard,
        CancellationToken cancellationToken = default, TreeUploadWait? wait = null)
    {
        TimeProvider clock = wait?.Clock ?? TimeProvider.System;
        Func<TimeSpan, CancellationToken, Task> delay = wait?.Delay ?? ((duration, token) => Task.Delay(duration, token));
        DateTimeOffset? lastWrite = null;
        var entries = new JsonArray();

        async Task<JsonObject> WriteAsync(string path, JsonObject payload)
        {
            if (lastWrite is DateTimeOffset previous)
            {
                TimeSpan remaining = previous.AddSeconds(1) - clock.GetUtcNow();
                while (remaining > TimeSpan.Zero)
                {
                    await delay(remaining, cancellationToken);
                    remaining = previous.AddSeconds(1) - clock.GetUtcNow();
                }
            }
            await guard(cancellationToken);
            JsonObject response = await Runtime.ObjectAsync(api, "POST", path, payload, cancellationToken);
            lastWrite = clock.GetUtcNow();
            return response;
        }

        JsonObject Payload(JsonArray batch) => new() { ["base_tree"] = baseTree, ["tree"] = batch.Copy() };
        bool Fits(JsonArray batch) => batch.Count <= MaximumEntries
            && Encoding.UTF8.GetByteCount(LegacyIdentity.CanonicalJson(Payload(batch))) <= MaximumRequestBytes;

        async Task FlushAsync()
        {
            if (entries.Count == 0)
            {
                return;
            }
            JsonObject tree = await WriteAsync("/git/trees", Payload(entries));
            baseTree = Bundle.ExactHead(tree.Str("sha"));
            entries.Clear();
        }

        foreach (KeyValuePair<string, byte[]?> file in files.OrderBy(item => item.Key, StringComparer.Ordinal))
        {
            var entry = new JsonObject { ["path"] = file.Key, ["mode"] = "100644", ["type"] = "blob" };
            if (file.Value is null)
            {
                entry["sha"] = null;
            }
            else
            {
                string? text = InlineText(file.Value);
                if (text is not null)
                {
                    entry["content"] = text;
                    if (!Fits(new JsonArray(entry.Copy())))
                    {
                        entry.Remove("content");
                        text = null;
                    }
                }
                if (text is null)
                {
                    JsonObject blob = await WriteAsync("/git/blobs", new JsonObject
                    {
                        ["encoding"] = "base64",
                        ["content"] = Convert.ToBase64String(file.Value)
                    });
                    string sha = blob.Str("sha");
                    if (sha != Bundle.BlobSha(file.Value))
                    {
                        throw new RuntimeFailure("GitHub blob hash differs from the verified export.");
                    }
                    entry["sha"] = sha;
                }
            }
            entries.Add(entry);
            if (!Fits(entries))
            {
                entries.RemoveAt(entries.Count - 1);
                await FlushAsync();
                entries.Add(entry);
                if (!Fits(entries))
                {
                    throw new UnsafeInput("Export tree entry exceeds its request budget.");
                }
            }
        }
        await FlushAsync();
        return baseTree;
    }

    private static string? InlineText(byte[] bytes)
    {
        try
        {
            string text = StrictUtf8.GetString(bytes);
            return text.Any(character => char.IsControl(character) && character is not '\t' and not '\r' and not '\n')
                || !StrictUtf8.GetBytes(text).AsSpan().SequenceEqual(bytes) ? null : text;
        }
        catch (DecoderFallbackException)
        {
            return null;
        }
    }
}
