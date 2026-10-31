using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace DevBook.Tooling.Infrastructure;

/// <summary>Retains the persisted Python-era identity encodings across the native migration.</summary>
public static class LegacyIdentity
{
    private static readonly UTF8Encoding StrictUtf8 = new(false, true);
    private static readonly IReadOnlyDictionary<int, string> CaseFolds = LoadCaseFolds();

    public static string Digest(string text) =>
        Convert.ToHexStringLower(SHA256.HashData(StrictUtf8.GetBytes(text)));

    public static string CanonicalJson(JsonNode? value, bool ascii = false, bool spaced = false)
    {
        var result = new StringBuilder();
        AppendJson(result, value, ascii, spaced);
        return result.ToString();
    }

    public static string Fingerprint(JsonNode? value, bool ascii = false, bool spaced = false) =>
        Digest(CanonicalJson(value, ascii, spaced));

    public static string Proposal(JsonObject edit, bool semantic = false)
    {
        string before = edit.Str("before");
        string after = edit.Str("after");
        var value = new JsonObject
        {
            ["path"] = edit["path"]?.DeepClone(),
            ["kind"] = edit["kind"]?.DeepClone(),
            ["learning_target"] = edit["learning_target"]?.DeepClone(),
            ["before"] = semantic ? CaseFold(NormalizeWhitespace(before)) : before,
            ["after"] = semantic ? CaseFold(NormalizeWhitespace(after)) : after
        };
        return Fingerprint(value);
    }

    public static (string Key, string Revision) CoreFeedback(JsonObject item)
    {
        var value = new JsonObject
        {
            ["body"] = item.Str("body"),
            ["state"] = item.Str("state"),
            ["updated_at"] = item["updated_at"]?.DeepClone()
        };
        string revision = Fingerprint(value, ascii: true);
        string id = item["id"] is JsonValue idValue && idValue.GetValueKind() == JsonValueKind.String
            ? idValue.GetValue<string>()
            : item["id"]?.ToJsonString() ?? throw new InvalidDataException("Feedback ID required.");
        return ($"{item.Str("kind", "comment")}:{id}:{revision[..16]}", revision);
    }

    public static string ViolationHash(JsonArray violations) =>
        Fingerprint(violations, ascii: true, spaced: true);

    public static string CaseFold(string text)
    {
        var result = new StringBuilder();
        foreach (Rune rune in text.EnumerateRunes())
        {
            result.Append(CaseFolds.TryGetValue(rune.Value, out string? folded) ? folded : rune.ToString());
        }

        return result.ToString();
    }

    public static string NormalizeWhitespace(string text)
    {
        var result = new StringBuilder();
        var separator = false;
        foreach (Rune rune in text.EnumerateRunes())
        {
            if (Rune.IsWhiteSpace(rune) || rune.Value is >= 0x1c and <= 0x1f)
            {
                separator = result.Length > 0;
                continue;
            }

            if (separator)
            {
                result.Append(' ');
                separator = false;
            }

            result.Append(rune.ToString());
        }

        return result.ToString();
    }

    private static IReadOnlyDictionary<int, string> LoadCaseFolds()
    {
        using Stream stream = typeof(LegacyIdentity).Assembly.GetManifestResourceStream(
            "DevBook.Tooling.Infrastructure.LegacyCaseFold.json")
            ?? throw new InvalidOperationException("Legacy Unicode case-fold data is missing.");
        JsonObject mapping = JsonNode.Parse(stream)!.RequiredObject("map");
        return mapping.ToDictionary(
            item => int.Parse(item.Key, CultureInfo.InvariantCulture),
            item => item.Value!.GetValue<string>());
    }

    private static void AppendJson(StringBuilder result, JsonNode? value, bool ascii, bool spaced)
    {
        string comma = spaced ? ", " : ",";
        if (value is null)
        {
            result.Append("null");
        }
        else if (value is JsonObject map)
        {
            result.Append('{');
            var first = true;
            foreach (KeyValuePair<string, JsonNode?> item in map.OrderBy(item => item.Key, CodePointComparer.Instance))
            {
                if (!first)
                {
                    result.Append(comma);
                }

                first = false;
                AppendString(result, item.Key, ascii);
                result.Append(spaced ? ": " : ":");
                AppendJson(result, item.Value, ascii, spaced);
            }

            result.Append('}');
        }
        else if (value is JsonArray array)
        {
            result.Append('[');
            for (var index = 0; index < array.Count; index++)
            {
                if (index > 0)
                {
                    result.Append(comma);
                }

                AppendJson(result, array[index], ascii, spaced);
            }

            result.Append(']');
        }
        else if (value.GetValueKind() == JsonValueKind.String)
        {
            AppendString(result, value.GetValue<string>(), ascii);
        }
        else
        {
            result.Append(value.ToJsonString());
        }
    }

    private static void AppendString(StringBuilder result, string text, bool ascii)
    {
        result.Append('"');
        foreach (char character in text)
        {
            result.Append(character switch
            {
                '"' => "\\\"",
                '\\' => "\\\\",
                '\b' => "\\b",
                '\f' => "\\f",
                '\n' => "\\n",
                '\r' => "\\r",
                '\t' => "\\t",
                < ' ' => $"\\u{(int)character:x4}",
                >= '\x7f' when ascii => $"\\u{(int)character:x4}",
                _ => character.ToString()
            });
        }

        result.Append('"');
    }

    private sealed class CodePointComparer : IComparer<string>
    {
        public static CodePointComparer Instance { get; } = new();

        public int Compare(string? left, string? right)
        {
            if (ReferenceEquals(left, right))
            {
                return 0;
            }

            if (left is null || right is null)
            {
                return left is null ? -1 : 1;
            }

            StringRuneEnumerator leftRunes = left.EnumerateRunes();
            StringRuneEnumerator rightRunes = right.EnumerateRunes();
            while (leftRunes.MoveNext())
            {
                if (!rightRunes.MoveNext())
                {
                    return 1;
                }

                int difference = leftRunes.Current.Value.CompareTo(rightRunes.Current.Value);
                if (difference != 0)
                {
                    return difference;
                }
            }

            return rightRunes.MoveNext() ? -1 : 0;
        }
    }
}
