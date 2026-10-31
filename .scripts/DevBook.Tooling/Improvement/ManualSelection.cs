using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class ManualSelection
{
    public static JsonObject Configure(JsonObject config, string root, string note, string focus)
    {
        if (note.Length == 0 && focus.Length == 0)
        {
            return config;
        }
        if (string.IsNullOrWhiteSpace(note) || string.IsNullOrWhiteSpace(focus))
        {
            throw new ArgumentException("A targeted run requires both --note and --focus.");
        }
        string path = Runtime.ValidateNotePath(root, note);
        if (!File.Exists(path) || Core.SpecialNotes.Contains(note))
        {
            throw new ArgumentException("Target must be an existing authorable concept or folder note.");
        }
        JsonObject selected = config.Copy();
        selected["target_note"] = note;
        selected["review_focus"] = focus.Trim();
        return selected;
    }

    public static void RequireManualOwner(JsonObject config, IReadOnlyDictionary<string, string>? environment = null)
    {
        if (config.Str("target_note").Length == 0)
        {
            return;
        }
        string Value(string key) => environment is null ? Environment.GetEnvironmentVariable(key) ?? "" : environment.GetValueOrDefault(key) ?? "";
        var actor = new JsonObject { ["id"] = Value("GITHUB_ACTOR_ID"), ["login"] = Value("GITHUB_ACTOR") };
        if (Value("GITHUB_EVENT_NAME") != "workflow_dispatch"
            || Value("GITHUB_TRIGGERING_ACTOR") != Value("GITHUB_ACTOR")
            || !Core.ActorAllowed(actor, config.Arr("owner_allowlist")))
        {
            throw new ProductionGate("Live targeted runs require a manual dispatch by an allowlisted owner.");
        }
    }

    public static (JsonObject State, JsonArray Notes) Apply(JsonObject state, JsonArray notes, JsonObject config)
    {
        string target = config.Str("target_note");
        if (target.Length == 0)
        {
            return (state, notes);
        }
        Runtime.ValidateRelativeNotePath(target);
        if (string.IsNullOrWhiteSpace(config.Str("review_focus")))
        {
            throw new ArgumentException("A targeted recheck requires an explicit review focus.");
        }
        JsonObject selection = state.Copy();
        selection.RequiredObject("notes").Remove(target);
        foreach (JsonObject item in selection.Obj("feedback").Select(pair => pair.Value).OfType<JsonObject>())
        {
            string[] paths = item.Arr("paths").Strings().ToArray();
            if (item.Str("topic") != Core.TopicFor(target) || paths.Length == 0 || paths.Any(path => path != target))
            {
                item["status"] = "paused";
            }
        }
        return (selection, new JsonArray(notes.OfType<JsonObject>().Where(note => note.Str("path") == target).Select(note => (JsonNode)note.Copy()).ToArray()));
    }
}
