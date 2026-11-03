using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace DevBook.Tooling.Infrastructure;

public static class JsonData
{
    public static JsonSerializerOptions Options { get; } = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public static string Str(this JsonNode? node, string key, string fallback = "") =>
        node?[key] is JsonValue value && value.TryGetValue(out string? text) ? text ?? fallback : fallback;

    public static int Int(this JsonNode? node, string key, int fallback = 0) =>
        node?[key] is JsonValue value && value.TryGetValue(out int number) ? number : fallback;

    public static bool Bool(this JsonNode? node, string key, bool fallback = false) =>
        node?[key] is JsonValue value && value.TryGetValue(out bool flag) ? flag : fallback;

    public static JsonObject Obj(this JsonNode? node, string key) =>
        node?[key] as JsonObject ?? new JsonObject();

    public static JsonArray Arr(this JsonNode? node, string key) =>
        node?[key] as JsonArray ?? new JsonArray();

    public static JsonObject RequiredObject(this JsonNode? node, string key) =>
        node?[key] as JsonObject ?? throw new InvalidDataException($"JSON object required: {key}.");

    public static JsonArray RequiredArray(this JsonNode? node, string key) =>
        node?[key] as JsonArray ?? throw new InvalidDataException($"JSON array required: {key}.");

    public static JsonObject ParseObject(string text) =>
        JsonNode.Parse(text) as JsonObject ?? throw new InvalidDataException("JSON object required.");

    public static T Copy<T>(this T node) where T : JsonNode => (T)node.DeepClone();

    public static IEnumerable<string> Strings(this JsonArray array) =>
        array.Select(node => node?.GetValue<string>() ?? throw new InvalidDataException("JSON string required."));
}
