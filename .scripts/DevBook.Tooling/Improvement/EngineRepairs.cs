using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public sealed partial class ImprovementEngine
{
    private static string RepairKey(JsonObject envelope) => LegacyIdentity.Fingerprint(new JsonObject
    {
        ["source_hashes"] = envelope.Obj("source_hashes").Copy(),
        ["rules_hash"] = envelope.Str("rules_hash"),
        ["repair_inputs"] = envelope.Obj("repair_inputs").Copy(),
        ["feedback_keys"] = envelope.Arr("feedback_keys").Copy()
    });

    private static void StoreHold(JsonObject state, JsonObject hold)
    {
        JsonObject holds = EnsureObject(state, "held_proposals");
        string topic = hold.Str("topic_id");
        if (holds[topic] is JsonObject previous)
        {
            EnsureObject(state, "invalid_proposals")[LegacyIdentity.Fingerprint(previous)] = previous.Copy();
        }
        holds[topic] = hold.Copy();
    }

    private bool CanPrepareRepair(JsonObject state, JsonObject envelope) => config.Int("max_review_repairs_per_batch", 1) == 1
        && state.Obj("review_repair_attempts").Int(RepairKey(envelope)) == 0;

    private static bool HasRepairFinding(JsonObject review, IEnumerable<string> paths) => review.Str("verdict") == "CHANGES REQUIRED"
        && review.Arr("notes").OfType<JsonObject>().Where(note => paths.Contains(note.Str("path")))
            .SelectMany(note => note.Arr("findings").OfType<JsonObject>()).Any(finding => finding.Str("severity") is "High" or "Medium");

    private void PrepareRepair(JsonObject state, JsonObject envelope, JsonObject review, string evaluation)
    {
        EnsureObject(state, "parked_review_repairs").Remove(RepairKey(envelope));
        JsonObject pending = envelope.Copy();
        pending["repair_previous_proposal"] = envelope.Obj("proposal").Copy();
        pending["repair_review"] = review.Copy();
        pending["previous_evaluation_hash"] = envelope.Str("evaluation_hash");
        pending["evaluation_hash"] = evaluation;
        pending["review_repair_key"] = RepairKey(envelope);
        pending["author_repair_pending"] = true;
        pending.Remove("repair_reserved");
        pending.Remove("completed_review");
        pending.Remove("review_evidence");
        state["pending_author_proposal"] = pending;
    }

    private void ParkBlockedRepair(JsonObject state, JsonArray notes, HashSet<string> paused)
    {
        JsonObject pending = state.Obj("pending_author_proposal");
        if (pending.Str("review_repair_key").Length == 0) return;
        string[] paths = pending.Obj("source_hashes").Select(item => item.Key).ToArray();
        HashSet<string> available = notes.OfType<JsonObject>().Select(note => note.Str("path")).ToHashSet();
        string topic = paths.Length == 0 ? "" : Core.TopicFor(paths[0]);
        JsonObject? pr = Queue.OpenPrForTopic(state, topic);
        if (config.Int("max_review_repairs_per_batch", 1) == 0 || paths.Length != 1 || paths.Any(path => !available.Contains(path))
            || paused.Contains(Core.TopicId(topic)) || pr is not null && pending.Arr("feedback_keys").Count == 0)
        {
            HoldIncompatiblePending(state, pending, "repair_scope_paused");
            JsonObject parked = state.Obj("held_proposals").Obj(pending.Str("topic_id"));
            EnsureObject(state, "parked_review_repairs")[pending.Str("review_repair_key")] = LegacyIdentity.Fingerprint(parked);
        }
    }

    private void PromoteHeldRepair(JsonObject state, JsonArray notes, HashSet<string> paused, string rules, string evaluation)
    {
        if (config.Int("max_review_repairs_per_batch", 1) == 0 || state.Obj("pending_author_proposal").Count != 0
            || state.Obj("feedback").Any(item => item.Value.Str("status") == "pending"))
        {
            return;
        }
        Dictionary<string, JsonObject> available = notes.OfType<JsonObject>().ToDictionary(note => note.Str("path"));
        foreach (JsonObject hold in state.Obj("held_proposals").Concat(state.Obj("invalid_proposals")).Select(item => item.Value).OfType<JsonObject>()
            .OrderBy(hold => hold.Obj("batch").Str("topic"), StringComparer.Ordinal).ThenBy(hold => LegacyIdentity.Fingerprint(hold), StringComparer.Ordinal))
        {
            string[] paths = hold.Obj("source_hashes").Select(item => item.Key).ToArray();
            bool resume = hold.Obj("incompatibility").Str("stage") == "repair_scope_paused"
                && hold.Str("review_repair_key").Length > 0 && hold.Str("evaluation_hash") == evaluation
                && state.Obj("parked_review_repairs").Str(hold.Str("review_repair_key")) == LegacyIdentity.Fingerprint(hold);
            if ((!resume && !CanPrepareRepair(state, hold)) || paths.Length != 1 || hold.Str("target_note").Length > 0 || hold.Str("review_focus").Length > 0
                || hold["feedback_keys"] is not JsonArray || hold.Str("rules_hash") != rules
                || paths.Any(path => !available.ContainsKey(path) || available[path].Str("hash") != hold.Obj("source_hashes").Str(path))
                || !JsonNode.DeepEquals(hold["repair_inputs"], RepairInputsFor(paths.Select(path => available[path])))
                || hold.Arr("feedback_keys").Count != 0)
            {
                continue;
            }
            string topic = Core.TopicFor(paths[0]);
            JsonObject? pr = Queue.OpenPrForTopic(state, topic);
            if (paused.Contains(Core.TopicId(topic)) || pr is not null
                || workload?.Str("topic").Length > 0 && workload.Str("topic") != topic)
            {
                continue;
            }
            if (resume)
            {
                EnsureObject(state, "parked_review_repairs").Remove(hold.Str("review_repair_key"));
                JsonObject resumed = hold.Copy();
                resumed.Remove("incompatibility");
                state["pending_author_proposal"] = resumed;
                return;
            }
            JsonObject review = hold.Obj("blocked_review");
            Dictionary<string, string> current = paths.ToDictionary(path => path, path => available[path].Str("content"));
            (JsonObject bound, JsonArray bindings) = Review.BindEvidence(review, current);
            bool evidenceOnly = hold.Obj("proposal").Arr("edits").Count == 0 && bindings.Count > 0
                && Review.Clean(bound, current, hold.Obj("proposal"), state.Arr("rejections"), hold.Obj("batch").Arr("feedback"));
            if (!HasRepairFinding(review, paths) && !evidenceOnly)
            {
                continue;
            }
            JsonObject fresh = hold.Copy();
            fresh["topic_id"] = Core.TopicId(topic);
            fresh.RequiredObject("batch")["topic"] = topic;
            fresh.RequiredObject("batch")["topic_id"] = Core.TopicId(topic);
            PrepareRepair(state, fresh, review, evaluation);
            return;
        }
    }
}
