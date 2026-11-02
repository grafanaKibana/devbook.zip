using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class WorkloadReceipts
{
    public static JsonArray Records(JsonObject receipt)
    {
        JsonArray records = receipt.Arr("records").Copy();
        if (records.Count == 0 && receipt["batch"] is JsonObject && receipt["proposal"] is JsonObject && receipt["result"] is JsonObject)
        {
            records.Add(new JsonObject
            {
                ["batch"] = receipt["batch"]!.DeepClone(),
                ["proposal"] = receipt["proposal"]!.DeepClone(),
                ["result"] = receipt["result"]!.DeepClone(),
                ["review"] = receipt["review"]?.DeepClone(),
                ["review_evidence"] = receipt["review_evidence"]?.DeepClone(),
                ["decisions"] = receipt.Arr("decisions").Copy()
            });
        }
        foreach (JsonObject record in records.OfType<JsonObject>())
        {
            if (record.Str("record_id").Length == 0) record["record_id"] = LegacyIdentity.Fingerprint(record);
        }
        return records;
    }

    public static JsonArray History(JsonObject receipt) => receipt["proposal_history"] is JsonArray history ? history.Copy() : Records(receipt);

    public static JsonObject Apply(JsonObject state, JsonObject receipt)
    {
        JsonObject applied = state.Obj("finalized_note_records").Copy();
        JsonArray records = Records(receipt);
        foreach (JsonObject record in records.OfType<JsonObject>())
        {
            string id = record.Str("record_id");
            if (applied.Bool(id)) continue;
            state = Core.RecordOutcome(state, record.RequiredObject("batch"), record.RequiredObject("proposal"), record.RequiredObject("result"), record["review"] as JsonObject);
            if (receipt.Int("version") >= 2 || receipt.Arr("decisions").Count == 0)
                Proposal.PersistDecisions(state, record.Arr("decisions"));
            Core.CompleteReviewHolds(state, record.RequiredObject("batch"), record["review_evidence"] as JsonObject);
            applied[id] = true;
        }
        state["finalized_note_records"] = applied;
        string legacy = LegacyIdentity.Fingerprint(receipt.Arr("decisions"));
        JsonObject legacyApplied = state.Obj("finalized_legacy_decisions").Copy();
        if (receipt.Int("version") < 2 && !legacyApplied.Bool(legacy))
        {
            Proposal.PersistDecisions(state, receipt.Arr("decisions"));
            legacyApplied[legacy] = true;
            state["finalized_legacy_decisions"] = legacyApplied;
        }
        JsonObject pending = state.Obj("pending_author_proposal");
        bool owned = receipt.Str("workload_id").Length > 0
            ? pending.Str("workload_id") == receipt.Str("workload_id") && records.OfType<JsonObject>().Any(record => JsonNode.DeepEquals(record["proposal"], pending["proposal"]))
            : pending.Str("topic_id") == receipt.Str("topic_id") && JsonNode.DeepEquals(pending["proposal"], receipt["proposal"]);
        if (owned) state.Remove("pending_author_proposal");
        return state;
    }
}
