using System.Text.Json;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

namespace DevBook.Tooling.Improvement;

public static class RepairInputs
{
    public static IReadOnlySet<string> ReadIds(string root)
    {
        string path = Path.Combine(root, "Vault", ".obsidian", "plugins", "qard", "data.json");
        if (!File.Exists(path))
        {
            return new HashSet<string>(StringComparer.Ordinal);
        }
        try
        {
            if (JsonNode.Parse(File.ReadAllText(path)) is not JsonObject data || data["states"] is not JsonObject states)
            {
                throw new InvalidDataException("Qard repair inputs require an object containing a states object.");
            }
            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (KeyValuePair<string, JsonNode?> item in states)
            {
                if (item.Value is not JsonObject state || state["needsFixing"] is JsonNode flag
                    && (flag is not JsonValue value || !value.TryGetValue<bool>(out _)))
                {
                    throw new InvalidDataException("Qard repair inputs contain an invalid card state or needsFixing flag.");
                }
                if (state.Bool("needsFixing"))
                {
                    ids.Add(item.Key);
                }
            }
            return ids;
        }
        catch (JsonException error)
        {
            throw new InvalidDataException("Qard repair inputs could not be read: data.json contains malformed JSON.", error);
        }
    }

    public static void Apply(JsonObject note, IReadOnlySet<string> ids)
    {
        string[] matched = QardScanner.Scan(note.Str("content")).Select(card => card.Id)
            .OfType<string>().Where(ids.Contains).Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
        var values = new JsonArray(matched.Select(id => (JsonNode?)JsonValue.Create(id)).ToArray());
        note["needs_fixing_ids"] = values;
        note["repair_input_hash"] = matched.Length == 0 ? "" : LegacyIdentity.Fingerprint(values);
    }
}
