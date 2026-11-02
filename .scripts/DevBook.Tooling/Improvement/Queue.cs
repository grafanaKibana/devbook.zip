using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class Queue
{
    private sealed record Candidate(int Priority, bool NeedsFixing, string PathKey, JsonObject Note, string Reason);

    public static JsonObject? OpenPrForTopic(JsonObject state, string topic) => state.Obj("prs").Select(pair => pair.Value).OfType<JsonObject>()
        .FirstOrDefault(pr => pr.Str("status") == "open" && (pr.Str("topic_id", pr.Str("topic")) == topic || pr.Str("topic_id", pr.Str("topic")) == Core.TopicId(topic)));

    public static JsonObject? SelectBatch(JsonObject state, JsonArray notes, string rulesHash, JsonObject? config = null)
    {
        config ??= new JsonObject();
        JsonObject current = Core.CopyState(state);
        Dictionary<string, JsonObject[]> feedbackByTopic = current.Obj("feedback").Select(pair => pair.Value).OfType<JsonObject>().Where(item => item.Str("status") == "pending" && item["topic"] is not null)
            .GroupBy(item => item.Str("topic")).ToDictionary(group => group.Key, group => group.ToArray());
        var candidates = new Dictionary<string, List<Candidate>>(StringComparer.Ordinal);
        foreach (JsonObject note in notes.OfType<JsonObject>())
        {
            string path = note.Str("path");
            string topic = note.Str("topic", Core.TopicFor(path));
            string hash = note.Str("hash", LegacyIdentity.Digest(note.Str("content")));
            JsonObject? prior = current.Obj("notes")[path] as JsonObject;
            string repairHash = note.Str("repair_input_hash");
            string evaluationHash = config.Str("evaluation_hash");
            (int priority, string reason) = feedbackByTopic.ContainsKey(topic) ? (0, "feedback")
                : prior is null ? (1, "new")
                : prior.Str("content_hash") != hash ? (2, "changed")
                : prior.Str("outcome") is not ("keep" or "changed") ? (3, "unchecked")
                : prior.Str("outcome") == "keep" && prior.Str("rules_hash") == rulesHash
                    && (prior.Obj("keep_review").Str("review_process") != Core.FocusedReviewVersion
                        || !Review.VerifiedKeep(prior.Obj("keep_review"), path, note.Str("content"), rulesHash)
                        || evaluationHash.Length != 0 && prior.Str("evaluation_hash") == evaluationHash
                            && prior.Obj("keep_review").Str("evaluation_hash") != evaluationHash) ? (3, "keep_unverified")
                : note.Arr("violations").Count != 0 && prior.Str("violation_hash") != LegacyIdentity.ViolationHash(note.Arr("violations")) ? (4, "violations")
                : prior.Str("rules_hash") != rulesHash ? (5, "rules_changed")
                : evaluationHash.Length != 0 && prior.Str("evaluation_hash") != evaluationHash ? (6, "evaluation_changed")
                : repairHash.Length != 0 && prior.Str("repair_input_hash") != repairHash ? (7, "needs_fixing") : (99, "");
            if (reason.Length == 0)
            {
                continue;
            }
            if (!candidates.TryGetValue(topic, out List<Candidate>? rows))
            {
                rows = [];
                candidates[topic] = rows;
            }
            rows.Add(new(priority, repairHash.Length != 0, LegacyIdentity.CaseFold(path), note, reason));
        }
        string[] topics = candidates.Keys.OrderBy(topic => feedbackByTopic.ContainsKey(topic) ? 0 : 1)
            .ThenBy(topic => candidates[topic].Any(row => row.NeedsFixing) ? 0 : 1)
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
            if (pr is not null && feedback.Length == 0)
            {
                continue;
            }
            List<Candidate> rows = candidates[topic].OrderBy(row => row.NeedsFixing ? 0 : 1).ThenBy(row => row.Priority).ThenBy(row => row.PathKey, StringComparer.Ordinal).ToList();
            if (feedback.Length != 0)
            {
                HashSet<string> allowedPaths = feedback.SelectMany(item => item.Arr("paths").Strings()).ToHashSet();
                rows.RemoveAll(row => !allowedPaths.Contains(row.Note.Str("path")));
            }
            Candidate[] selected = rows.Take(1).ToArray();
            HashSet<string> selectedPaths = selected.Select(row => row.Note.Str("path")).ToHashSet();
            JsonObject[] scopedFeedback = feedback.Where(item => item.Arr("paths").Strings().Any(selectedPaths.Contains)).ToArray();
            if (feedback.Length != 0 && scopedFeedback.Length == 0)
            {
                scopeBatch ??= MakeBatch(topic, [], feedback, rulesHash, config.Str("evaluation_hash"), pr);
                continue;
            }
            if (selected.Length != 0 || scopedFeedback.Length != 0)
            {
                return MakeBatch(topic, selected, scopedFeedback, rulesHash, config.Str("evaluation_hash"), pr);
            }
        }
        return scopeBatch;
    }

    private static JsonObject MakeBatch(string topic, IReadOnlyList<Candidate> selected, IEnumerable<JsonObject> feedback, string rulesHash, string evaluationHash, JsonObject? pr)
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
            ["evaluation_hash"] = evaluationHash,
            ["review_process"] = Core.FocusedReviewVersion,
            ["pr"] = pr?.DeepClone()
        };
    }
}
