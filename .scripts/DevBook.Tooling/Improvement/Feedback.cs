using System.Globalization;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class Feedback
{
    public const string ReceiptMarker = "<!-- devbook-feedback-result:";

    public static JsonArray Normalize(JsonArray ordinary, JsonArray inline, JsonArray reviews, JsonArray allowlist, IEnumerable<string>? scopedPaths = null)
    {
        HashSet<(long Id, string Login)> trusted = allowlist.OfType<JsonObject>().Select(item => (Id: Id(item["id"]), Login: LegacyIdentity.CaseFold(item.Str("login"))))
            .Where(identity => identity.Id >= 0 && identity.Login.Length != 0).ToHashSet();
        string[] existingPaths = (scopedPaths ?? []).Where(path => path.Length != 0).Distinct().Order(StringComparer.Ordinal).ToArray();
        var result = new List<JsonObject>();
        foreach ((string kind, JsonArray items) in new[] { ("comment", ordinary), ("inline", inline), ("review", reviews) })
        {
            foreach (JsonObject item in items.OfType<JsonObject>())
            {
                JsonObject user = item.Obj("user");
                long actorId = Id(user["id"]);
                if (!trusted.Contains((actorId, LegacyIdentity.CaseFold(user.Str("login")))))
                {
                    continue;
                }
                string body = item.Str("body");
                if (kind == "comment" && body.Contains(ReceiptMarker, StringComparison.Ordinal))
                {
                    continue;
                }
                string updated = item.Str("updated_at", item.Str("submitted_at", item.Str("created_at")));
                var identity = new JsonObject
                {
                    ["id"] = item["id"]?.DeepClone(),
                    ["kind"] = kind,
                    ["body"] = body,
                    ["updated_at"] = updated,
                    ["state"] = item["state"]?.DeepClone(),
                    ["commit_id"] = item["commit_id"]?.DeepClone(),
                    ["path"] = item["path"]?.DeepClone(),
                    ["line"] = item["line"]?.DeepClone()
                };
                string revision = LegacyIdentity.Fingerprint(identity);
                string path = item.Str("path");
                string[] paths = kind == "inline" ? path.Length == 0 ? [] : [path]
                    : item["paths"] is JsonArray given && given.Count != 0 ? given.Strings().Distinct().Order(StringComparer.Ordinal).ToArray() : existingPaths;
                result.Add(new JsonObject
                {
                    ["key"] = $"{kind}:{Id(item["id"])}:{revision[..12]}",
                    ["id"] = item["id"]?.DeepClone(),
                    ["kind"] = kind,
                    ["body"] = body,
                    ["updated_at"] = updated,
                    ["revision"] = revision,
                    ["url"] = item["html_url"]?.DeepClone(),
                    ["user"] = new JsonObject { ["id"] = actorId, ["login"] = user.Str("login") },
                    ["path"] = path.Length == 0 ? null : path,
                    ["paths"] = new JsonArray(paths.Select(value => (JsonNode?)JsonValue.Create(value)).ToArray()),
                    ["line"] = item["line"]?.DeepClone(),
                    ["commit_id"] = item["commit_id"]?.DeepClone()
                });
            }
        }
        return new JsonArray(result.OrderBy(item => item.Str("updated_at"), StringComparer.Ordinal).ThenBy(item => item.Str("kind"), StringComparer.Ordinal)
            .ThenBy(item => Id(item["id"]).ToString(CultureInfo.InvariantCulture), StringComparer.Ordinal).Select(item => (JsonNode)item).ToArray());
    }

    public static async Task<JsonArray> PollAsync(IGitHubApi api, int prNumber, JsonArray allowlist, CancellationToken cancellationToken = default)
    {
        JsonArray ordinary = await Runtime.ArrayAsync(api, $"/issues/{prNumber}/comments?per_page=100", cancellationToken);
        JsonArray inline = await Runtime.ArrayAsync(api, $"/pulls/{prNumber}/comments?per_page=100", cancellationToken);
        JsonArray reviews = await Runtime.ArrayAsync(api, $"/pulls/{prNumber}/reviews?per_page=100", cancellationToken);
        JsonArray files = await Runtime.ArrayAsync(api, $"/pulls/{prNumber}/files?per_page=100", cancellationToken);
        return Normalize(ordinary, inline, reviews, allowlist, files.OfType<JsonObject>().Select(item => item.Str("filename")));
    }

    public static bool ShouldFreeze(JsonObject pr, JsonArray feedback, int notes = 0, int lines = 0, int maxNotes = 16, int maxLines = 1200) =>
        pr["draft"]?.GetValue<bool>() == false || pr.Str("reviewDecision").Length != 0 || notes >= maxNotes || lines >= maxLines
        || feedback.OfType<JsonObject>().Any(item => item.Str("kind") is "comment" or "inline" or "review");

    public static void ValidateFrozenEdits(JsonArray edits, JsonArray pendingFeedback)
    {
        Dictionary<string, JsonObject> feedback = pendingFeedback.OfType<JsonObject>().ToDictionary(item => item.Str("key"));
        foreach (JsonObject edit in edits.OfType<JsonObject>())
        {
            string path = edit.Str("path");
            string[] causes = edit.Arr("feedback_keys").Strings().Distinct().ToArray();
            if (path.Length == 0 || causes.Length == 0 || causes.Any(key => !feedback.ContainsKey(key)))
            {
                throw new UnsafeInput("Frozen PR edits require pending owner feedback causality.");
            }
            if (causes.Any(key => !feedback[key].Arr("paths").Strings().Contains(path)))
            {
                throw new UnsafeInput("Frozen PR feedback does not authorize the edited path.");
            }
        }
    }

    private static long Id(JsonNode? node) => node is JsonValue value && value.GetValueKind() == System.Text.Json.JsonValueKind.Number
        && long.TryParse(value.ToJsonString(), NumberStyles.None, CultureInfo.InvariantCulture, out long id) ? id : -1;
}
