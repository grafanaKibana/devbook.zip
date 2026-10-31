using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class Queue
{
    private sealed record Candidate(int Priority, string PathKey, JsonObject Note, string Reason);

    public static JsonObject? OpenPrForTopic(JsonObject state, string topic) => state.Obj("prs").Select(pair => pair.Value).OfType<JsonObject>()
        .FirstOrDefault(pr => pr.Str("status") == "open" && (pr.Str("topic_id", pr.Str("topic")) == topic || pr.Str("topic_id", pr.Str("topic")) == Core.TopicId(topic)));

    public static JsonObject? SelectBatch(JsonObject state, JsonArray notes, string rulesHash, JsonObject? config = null)
    {
        config ??= new JsonObject();
        int limit = config.Int("max_notes_per_run", 4);
        int maximumOpen = config.Int("max_open_prs", 3);
        if (limit < 1 || maximumOpen < 1)
        {
            throw new InvalidDataException("queue limits must be positive");
        }
        JsonObject current = Core.CopyState(state);
        Dictionary<string, JsonObject[]> feedbackByTopic = current.Obj("feedback").Select(pair => pair.Value).OfType<JsonObject>().Where(item => item.Str("status") == "pending" && item["topic"] is not null)
            .GroupBy(item => item.Str("topic")).ToDictionary(group => group.Key, group => group.ToArray());
        int openCount = current.Obj("prs").Select(pair => pair.Value).Count(pr => pr.Str("status") == "open");
        var candidates = new Dictionary<string, List<Candidate>>(StringComparer.Ordinal);
        foreach (JsonObject note in notes.OfType<JsonObject>())
        {
            string path = note.Str("path");
            string topic = note.Str("topic", Core.TopicFor(path));
            string hash = note.Str("hash", LegacyIdentity.Digest(note.Str("content")));
            JsonObject? prior = current.Obj("notes")[path] as JsonObject;
            (int priority, string reason) = feedbackByTopic.ContainsKey(topic) ? (0, "feedback")
                : prior is null ? (1, "new")
                : prior.Str("content_hash") != hash ? (2, "changed")
                : prior.Str("outcome") is not ("keep" or "changed") ? (3, "unchecked")
                : prior.Str("outcome") == "keep" && prior.Str("rules_hash") == rulesHash
                    && !Review.VerifiedKeep(prior.Obj("keep_review"), path, note.Str("content"), rulesHash) ? (3, "keep_unverified")
                : note.Arr("violations").Count != 0 && prior.Str("violation_hash") != LegacyIdentity.ViolationHash(note.Arr("violations")) ? (4, "violations")
                : prior.Str("rules_hash") != rulesHash ? (5, "rules_changed") : (99, "");
            if (reason.Length == 0)
            {
                continue;
            }
            if (!candidates.TryGetValue(topic, out List<Candidate>? rows))
            {
                rows = [];
                candidates[topic] = rows;
            }
            rows.Add(new(priority, LegacyIdentity.CaseFold(path), note, reason));
        }
        string[] topics = candidates.Keys.OrderBy(topic => feedbackByTopic.ContainsKey(topic) ? 0 : 1)
            .ThenBy(topic => candidates[topic].Min(row => row.Priority)).ThenBy(LegacyIdentity.CaseFold, StringComparer.Ordinal).ToArray();
        JsonObject? scopeBatch = null;
        foreach (string topic in topics)
        {
            JsonObject? pr = OpenPrForTopic(current, topic);
            JsonObject[] feedback = feedbackByTopic.GetValueOrDefault(topic) ?? [];
            if (scopeBatch is not null && feedback.Length == 0)
            {
                return scopeBatch;
            }
            if (pr is null && openCount >= maximumOpen && feedback.Length == 0)
            {
                continue;
            }
            List<Candidate> rows = candidates[topic].OrderBy(row => row.Priority).ThenBy(row => row.PathKey, StringComparer.Ordinal).ToList();
            if (pr?.Bool("frozen") == true)
            {
                if (feedback.Length == 0)
                {
                    continue;
                }
                HashSet<string> allowedPaths = feedback.SelectMany(item => item.Arr("paths").Strings()).ToHashSet();
                rows.RemoveAll(row => !allowedPaths.Contains(row.Note.Str("path")));
            }
            HashSet<string> available = rows.Select(row => row.Note.Str("path")).ToHashSet();
            var requested = new HashSet<string>();
            foreach (JsonObject item in feedback)
            {
                HashSet<string> paths = item.Arr("paths").Strings().ToHashSet();
                if (paths.IsSubsetOf(available) && requested.Union(paths).Count() <= limit)
                {
                    requested.UnionWith(paths);
                }
            }
            Candidate[] selected = rows.OrderBy(row => requested.Contains(row.Note.Str("path")) ? 0 : 1).ThenBy(row => row.Priority).ThenBy(row => row.PathKey, StringComparer.Ordinal).Take(limit).ToArray();
            HashSet<string> selectedPaths = selected.Select(row => row.Note.Str("path")).ToHashSet();
            JsonObject[] scopedFeedback = feedback.Where(item => item.Arr("paths").Strings().ToHashSet().IsSubsetOf(selectedPaths)).ToArray();
            if (feedback.Length != 0 && scopedFeedback.Length == 0)
            {
                scopeBatch ??= MakeBatch(topic, [], feedback, rulesHash, pr);
                continue;
            }
            if (selected.Length != 0 || scopedFeedback.Length != 0)
            {
                return MakeBatch(topic, selected, scopedFeedback, rulesHash, pr);
            }
        }
        return scopeBatch;
    }

    private static JsonObject MakeBatch(string topic, IReadOnlyList<Candidate> selected, IEnumerable<JsonObject> feedback, string rulesHash, JsonObject? pr)
    {
        var notes = new JsonArray();
        foreach (Candidate row in selected)
        {
            JsonObject note = row.Note.Copy();
            note["selection_reason"] = row.Reason;
            notes.Add(note);
        }
        return new JsonObject
        {
            ["topic"] = topic,
            ["topic_id"] = Core.TopicId(topic),
            ["notes"] = notes,
            ["feedback"] = new JsonArray(feedback.Select(item => item.DeepClone()).ToArray()),
            ["rules_hash"] = rulesHash,
            ["pr"] = pr?.DeepClone()
        };
    }
}
