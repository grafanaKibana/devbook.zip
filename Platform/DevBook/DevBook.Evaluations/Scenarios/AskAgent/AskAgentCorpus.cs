namespace DevBook.Evaluations.Scenarios.AskAgent;

/// <summary>
/// A single agent task plus the (currently mocked) agent transcript that the judge scores.
/// </summary>
public sealed record AgentCase(
    string Id,
    string Name,
    string Task,
    string Difficulty,
    double QualityBias,
    int RiskLevel,
    int ApproxTokens,
    IReadOnlyList<AgentToolCall> ToolCalls,
    string ExpectedTools,
    string Answer,
    string ContextNote);

/// <summary>One tool invocation the agent made while solving a task.</summary>
public sealed record AgentToolCall(string Name, string Arguments);

/// <summary>
/// The agent task corpus for the AskAgent scenario. This is demo content: a real AskAgent
/// scenario would drive the live agent and feed its real transcripts to the judge. Here the
/// transcripts are synthesised deterministically from a small topic × task-form grid so the
/// generic (default) report rendering has data to show.
/// </summary>
public static class AskAgentCorpus
{
    public const string DisplayName = "AskAgent";
    public const string DatasetLabel = "DevBook · AskAgent (demo)";

    private static readonly (string Key, string Short, string Note, string Fact)[] Topics =
    [
        ("recallatr", "RecallAtR vs Recall@k", "RAG/Monitoring#Retrieval Quality Metrics", "RecallAtR fixes R to the number of expected evidence chunks per query, scoring coverage against an evidence budget rather than a fixed k."),
        ("hnsw", "silent HNSW recall drop", "RAG/Retrieval#Silent Recall Degradation", "As the graph grows a fixed ef_search explores a smaller relative neighbourhood, so recall decays without raising errors; raise ef_search and add a recall canary."),
        ("hybrid", "hybrid dense+sparse retrieval", "RAG/Retrieval#Hybrid Retrieval", "Run BM25 and dense retrieval in parallel and fuse with reciprocal rank fusion, then re-rank the top 20 with a cross-encoder."),
        ("tables", "chunking tables and lists", "RAG/Chunking#Structure-aware", "Use structure-aware splitting that treats a table or definition block as an atomic unit with a heading prefix carried into each chunk."),
        ("f1", "F1 from precision and recall", "ML/Eval/Classification#Precision, Recall, F1", "F1 = 2·p·r/(p+r); guard the p+r==0 case by returning 0."),
        ("prauc", "PR-AUC vs ROC-AUC", "ML/Eval/ROC-AUC and PR-AUC", "On heavy imbalance ROC-AUC looks optimistic because true negatives dominate; gate on PR-AUC and keep ROC-AUC secondary."),
        ("tenant", "cross-tenant cache leak", "RAG/Caching#Pitfalls", "Include tenant_id and index_version in the cache key, namespace per tenant, and add a property test that no key collides across tenants."),
        ("parentdoc", "parent-document retrieval", "RAG/Patterns#Parent-Document", "Index small child chunks for matching but return the enclosing section at generation time via a child→parent map."),
        ("contextual", "contextual retrieval", "RAG/RAG#Patterns", "Contextual retrieval prepends a short document-level context string to each chunk before embedding, improving recall on ambiguous chunks."),
        ("indexver", "index_version cache key", "RAG/Caching#Pitfalls", "Adding index_version to the cache key bypasses stale entries whenever the index is rebuilt."),
        ("rewrite", "query-rewrite semantic drift", "RAG/Patterns#Query Rewrite", "Aggressive rewrites can drift from user intent, retrieving fluent but wrong context; detect by comparing recall with and without rewriting on a held-out set."),
        ("ndcg", "NDCG vs MAP vs MRR", "ML/Eval/Evaluation", "MRR cares only about the first hit, MAP about precision across all hits, NDCG about graded relevance with a rank discount."),
        ("triage", "retrieval regression triage", "RAG/Retrieval#Aggregate Metrics Mask Failures", "Segmenting by query type localizes the drop; a code-identifier-only regression points at the embedding swap rather than chunking."),
        ("efsearch", "ef_search tuning", "RAG/Retrieval#ANN Index", "ef_search controls how many candidates the HNSW search explores; higher values raise recall at the cost of latency."),
        ("bm25", "BM25 on paraphrases", "RAG/Retrieval#Sparse Retrieval", "BM25 matches surface terms, so paraphrased queries with no lexical overlap score poorly; pair it with a dense signal."),
        ("rrf", "reciprocal rank fusion", "RAG/Re-ranking", "RRF combines rankings by summing 1/(k+rank), avoiding score-scale mismatch between dense and sparse retrievers."),
        ("mmr", "MMR result diversity", "RAG/Re-ranking", "MMR trades relevance against novelty with a λ parameter to reduce near-duplicate chunks in the result set."),
        ("embcache", "embedding cache at ingestion", "RAG/Caching#Embedding Cache", "The embedding cache keys on content hash, so re-ingesting unchanged notes skips re-embedding entirely."),
        ("identifiers", "vector search misses identifiers", "RAG/Retrieval#Dense Retrieval", "Dense embeddings blur exact identifiers, so a hybrid sparse signal is needed to retrieve code symbols reliably."),
        ("crossenc", "cross-encoder re-ranking", "RAG/Re-ranking#Cross-Encoder", "A cross-encoder jointly scores query+chunk for high precision but is costly, so apply it only to the top-K candidates."),
    ];

    private sealed record TaskForm(
        string Id,
        string Label,
        string Difficulty,
        double QualityBias,
        int RiskLevel,
        Func<(string Key, string Short, string Note, string Fact), IReadOnlyList<AgentToolCall>> Tools,
        Func<(string Key, string Short, string Note, string Fact), string> Task,
        string AnswerLead);

    private static readonly TaskForm[] Forms =
    [
        new("explain", "Explain", "easy", 0.18, 0,
            t => [new("read_note", t.Note)],
            t => $"Explain {t.Short}.", ""),
        new("diagnose", "Diagnose", "hard", -0.34, 0,
            t => [new("search_notes", $"\"{t.Short}\""), new("read_note", t.Note)],
            t => $"Walk me through why {t.Short} goes wrong in practice and how to detect it.", ""),
        new("design", "Design", "medium", 0.04, 0,
            t => [new("search_notes", $"\"{t.Short}\""), new("read_note", t.Note)],
            t => $"Design an approach for {t.Short} in the vault and justify the key decision.", ""),
        new("cite", "Cite", "easy", 0.12, 0,
            t => [new("search_notes", $"\"{t.Short}\""), new("read_note", t.Note)],
            t => $"Summarize {t.Short}. Answer with citations to the vault.", ""),
        new("tooluse", "Tool use", "medium", -0.02, 0,
            t => [new("read_note", t.Note), new("update_config", "index_version=2026.06"), new("get_config", "index_version")],
            t => $"Read the note on {t.Short}, then bump index_version in the retrieval config and confirm the write.", "After reading the note: "),
        new("refactor", "Refactor", "hard", -0.08, 1,
            t => [new("search_notes", $"\"{t.Short}\""), new("read_note", t.Note)],
            t => $"Our system has a defect related to {t.Short}. Propose a fix and the test that catches it.", "Proposed fix: "),
    ];

    /// <summary>Builds the full deterministic agent-task corpus (20 topics × 6 task forms).</summary>
    public static IReadOnlyList<AgentCase> BuildCases()
    {
        var cases = new List<AgentCase>();
        for (var topicIndex = 0; topicIndex < Topics.Length; topicIndex++)
        {
            var topic = Topics[topicIndex];
            for (var formIndex = 0; formIndex < Forms.Length; formIndex++)
            {
                var form = Forms[formIndex];
                var toolCalls = form.Tools(topic);
                cases.Add(new AgentCase(
                    Id: $"ag-{(topicIndex * Forms.Length + formIndex + 1):D3}",
                    Name: $"{form.Label} · {Capitalize(topic.Short)}",
                    Task: form.Task(topic),
                    Difficulty: form.Difficulty,
                    QualityBias: form.QualityBias + ((topicIndex % 5) - 2) * 0.04,
                    RiskLevel: form.RiskLevel,
                    ApproxTokens: 200 + (topic.Short.Length * 4) + (form.Difficulty == "hard" ? 260 : formIndex * 30),
                    ToolCalls: toolCalls,
                    ExpectedTools: string.Join(", ", toolCalls.Select(call => call.Name)),
                    Answer: (form.AnswerLead ?? string.Empty) + topic.Fact,
                    ContextNote: topic.Note));
            }
        }

        return cases;
    }

    private static string Capitalize(string value)
        => string.IsNullOrEmpty(value) ? value : char.ToUpperInvariant(value[0]) + value[1..];
}
