using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

namespace DevBook.Tooling.Improvement;

public sealed class ProposalException(string message) : IOException(message);

public static class Proposal
{
    private static readonly HashSet<string> EditKeys = ["path", "expected_hash", "before", "after", "reason", "kind", "learning_target", "essential_meanings", "sources", "feedback_keys"];
    private static readonly HashSet<string> Kinds = ["note", "rewrite", "add", "replace", "split", "remove"];
    private static readonly Regex MetadataPattern = new(@"^[ \t]*<!--[ \t]*(?<key>qard-[A-Za-z0-9_-]+):[ \t]*(?<value>.*?)[ \t]*-->[ \t]*$");
    private static readonly Regex HiddenQardPattern = new(@"<!--[ \t]*qard-[A-Za-z0-9_-]+:[\s\S]*?-->");
    private static readonly Regex WikiPattern = new(@"\[\[[^\]]+\]\]");
    private static readonly Regex BlockIdPattern = new(@"(?m)(?<!\S)\^[A-Za-z0-9_-]+[ \t]*$");

    public static string[] Ids(string block) => Markdown.Lines(block).Select(line => QardScanner.IdPattern.Match(line)).Where(match => match.Success).Select(match => match.Groups[1].Value).ToArray();

    public static IReadOnlyList<(int Start, int End, string Text)> QardSpans(string text)
    {
        string[] lines = Markdown.Lines(text, true);
        var offsets = new int[lines.Length + 1];
        for (var index = 0; index < lines.Length; index++)
        {
            offsets[index + 1] = offsets[index] + lines[index].Length;
        }
        var spans = new List<(int Start, int End, string Text)>();
        foreach (QardCard card in QardScanner.Scan(text).Where(card => card.Kind == "qard"))
        {
            int start = card.Line - 1;
            int metadataEnd = start - 1;
            if (metadataEnd >= 0 && string.IsNullOrWhiteSpace(lines[metadataEnd]))
            {
                metadataEnd--;
            }
            if (metadataEnd >= 0 && MetadataPattern.IsMatch(lines[metadataEnd].TrimEnd('\r', '\n')))
            {
                start = metadataEnd;
            }
            while (start > 0 && MetadataPattern.IsMatch(lines[start - 1].TrimEnd('\r', '\n')))
            {
                start--;
            }
            spans.Add((offsets[start], card.End, text[offsets[start]..card.End]));
        }
        return spans;
    }

    private static string[] Metadata(string block) => Markdown.Lines(block).Where(line => MetadataPattern.IsMatch(line)).ToArray();

    private static string Frontmatter(string text)
    {
        string[] lines = Markdown.Lines(text, true);
        if (lines.Length == 0 || lines[0].TrimStart('\ufeff').TrimEnd('\r', '\n') != "---")
        {
            return "";
        }
        for (var index = 1; index < lines.Length; index++)
        {
            if (lines[index].Trim() is "---" or "...")
            {
                return string.Concat(lines.Take(index + 1));
            }
        }
        throw new ProposalException("unterminated frontmatter");
    }

    private static bool ExactKeys(JsonObject value, params string[] keys) => value.Select(pair => pair.Key).ToHashSet().SetEquals(keys);
    private static bool Text(JsonObject value, string key, bool allowEmpty = false) => value[key] is JsonValue scalar && scalar.TryGetValue(out string? text) && (allowEmpty || !string.IsNullOrEmpty(text));
    private static bool StringList(JsonObject value, string key, bool nonemptyItems = false) => value[key] is JsonArray array && array.All(item => item is JsonValue scalar && scalar.TryGetValue(out string? text) && (!nonemptyItems || !string.IsNullOrWhiteSpace(text)));

    public static void Validate(JsonObject proposal)
    {
        HashSet<string> keys = proposal.Select(pair => pair.Key).ToHashSet();
        if (proposal.Int("version") != 1 || !new[] { "version", "edits", "dispositions", "feedback" }.All(keys.Contains) || keys.Except(new[] { "version", "edits", "dispositions", "feedback", "decisions" }).Any())
        {
            throw new ProposalException("proposal must use the exact version 1 schema");
        }
        foreach (string field in new[] { "edits", "dispositions", "feedback" })
        {
            if (proposal[field] is not JsonArray)
            {
                throw new ProposalException($"proposal {field} must be a list");
            }
        }
        foreach (JsonNode? node in proposal.Arr("edits"))
        {
            if (node is not JsonObject edit || !edit.Select(pair => pair.Key).ToHashSet().SetEquals(EditKeys))
            {
                throw new ProposalException("edit has missing or unknown fields");
            }
            if (!Kinds.Contains(edit.Str("kind")) || edit.Str("learning_target") is not ("same" or "new" or "retired"))
            {
                throw new ProposalException("invalid edit kind or learning target");
            }
            if (!new[] { "path", "expected_hash", "before", "reason" }.All(key => Text(edit, key)) || !Text(edit, "after", true))
            {
                throw new ProposalException("edit string fields are invalid");
            }
            if (!StringList(edit, "essential_meanings", true) || (edit.Str("kind") != "note" && edit.Arr("essential_meanings").Count == 0))
            {
                throw new ProposalException("question edits require a finite nonempty essential-meanings set");
            }
            if (edit["sources"] is not JsonArray || !StringList(edit, "feedback_keys"))
            {
                throw new ProposalException("sources and feedback_keys must be lists");
            }
        }
        foreach (JsonNode? node in proposal.Arr("dispositions"))
        {
            if (node is not JsonObject item || !ExactKeys(item, "path", "outcome", "reason") || item.Str("outcome") is not ("keep" or "changed" or "blocked") || !Text(item, "path") || !Text(item, "reason"))
            {
                throw new ProposalException("invalid disposition");
            }
        }
        foreach (JsonNode? node in proposal.Arr("feedback"))
        {
            if (node is not JsonObject item || !ExactKeys(item, "key", "outcome", "reason") || item.Str("outcome") is not ("implemented" or "keep" or "awaiting-clarification" or "blocked") || !Text(item, "key") || !Text(item, "reason"))
            {
                throw new ProposalException("invalid feedback disposition");
            }
        }
        if (proposal.ContainsKey("decisions") && proposal["decisions"] is not JsonArray)
        {
            throw new ProposalException("proposal decisions must be a list");
        }
        foreach (JsonNode? node in proposal.Arr("decisions"))
        {
            if (node is not JsonObject item || !ExactKeys(item, "feedback_key", "fingerprint", "decision", "reason") || item.Str("decision") is not ("reject" or "reconsider") || !new[] { "feedback_key", "fingerprint", "reason" }.All(key => Text(item, key)))
            {
                throw new ProposalException("invalid owner proposal decision");
            }
        }
        string[] paths = proposal.Arr("dispositions").OfType<JsonObject>().Select(item => item.Str("path")).ToArray();
        string[] feedbackKeys = proposal.Arr("feedback").OfType<JsonObject>().Select(item => item.Str("key")).ToArray();
        if (paths.Distinct().Count() != paths.Length || feedbackKeys.Distinct().Count() != feedbackKeys.Length)
        {
            throw new ProposalException("duplicate disposition or feedback key");
        }
        if (proposal.Arr("edits").OfType<JsonObject>().Any(edit => !paths.Contains(edit.Str("path"))))
        {
            throw new ProposalException("every edited note requires one disposition");
        }
    }

    public static JsonObject Apply(IReadOnlyDictionary<string, string> sources, JsonObject proposal, JsonArray? rejections = null,
        IEnumerable<string>? expectedFeedbackKeys = null, IEnumerable<string>? requiredFeedbackKeys = null)
    {
        Validate(proposal);
        HashSet<string> dispositionPaths = proposal.Arr("dispositions").OfType<JsonObject>().Select(item => item.Str("path")).ToHashSet();
        if (!dispositionPaths.SetEquals(sources.Keys))
        {
            throw new ProposalException("dispositions must exactly cover guarded notes");
        }
        string[] expected = expectedFeedbackKeys?.ToArray() ?? [];
        if (expected.Distinct().Count() != expected.Length || !proposal.Arr("feedback").OfType<JsonObject>().Select(item => item.Str("key")).ToHashSet().SetEquals(expected))
        {
            throw new ProposalException("feedback dispositions must exactly cover unique queued owner feedback");
        }
        HashSet<string> required = requiredFeedbackKeys?.ToHashSet() ?? [];
        rejections ??= new JsonArray();
        var retired = new List<string>();
        var lineage = new JsonArray();
        var fingerprints = new JsonArray();
        var grouped = new Dictionary<string, List<(int Start, int End, JsonObject Edit)>>();
        foreach (JsonObject edit in proposal.Arr("edits").OfType<JsonObject>())
        {
            string path = edit.Str("path");
            string[] pathParts = path.Split('/');
            if (pathParts.Length < 4 || pathParts[0] != "Vault" || pathParts[1] != "Home" || pathParts.Any(part => part is "" or "." or "..") || path.Contains('\\') || !path.EndsWith(".md", StringComparison.Ordinal) || !sources.TryGetValue(path, out string? source))
            {
                throw new ProposalException($"unsafe or unguarded proposal path: {path}");
            }
            string before = edit.Str("before");
            string after = edit.Str("after");
            if (LegacyIdentity.Digest(source) != edit.Str("expected_hash"))
            {
                throw new ProposalException($"whole-note CAS conflict: {path}");
            }
            int start = UniqueIndex(source, before, $"replacement anchor must be unique: {path}");
            int end = start + before.Length;
            string exact = LegacyIdentity.Proposal(edit);
            string semantic = LegacyIdentity.Proposal(edit, semantic: true);
            HashSet<string> feedbackKeys = edit.Arr("feedback_keys").Strings().ToHashSet();
            foreach (JsonNode? rejection in rejections)
            {
                bool matches = rejection is JsonValue scalar && scalar.TryGetValue(out string? rejected) && rejected == exact
                    || rejection is JsonObject rejectedEdit && (rejectedEdit.Str("fingerprint") == exact || rejectedEdit.Str("semantic_fingerprint") == semantic);
                if (matches && (rejection is not JsonObject value || !value.Arr("reconsidered_by").Strings().Any(feedbackKeys.Contains)))
                {
                    throw new ProposalException("proposal repeats a rejected edit without fingerprint-specific reconsideration");
                }
            }
            if (required.Count != 0 && !feedbackKeys.Overlaps(required))
            {
                throw new ProposalException("frozen edits require explicit owner-feedback causality");
            }
            if (edit.Str("kind") == "note")
            {
                if (edit.Str("learning_target") != "same")
                {
                    throw new ProposalException("note prose edits cannot transform Qard identity");
                }
                if (QardSpans(source).Any(span => start < span.End && end > span.Start))
                {
                    throw new ProposalException("note edits cannot overlap Qard cards or adjacent metadata");
                }
                if (!HiddenQardPattern.Matches(before).Cast<Match>().Select(match => match.Value).SequenceEqual(HiddenQardPattern.Matches(after).Cast<Match>().Select(match => match.Value)))
                {
                    throw new ProposalException("note edits cannot transform Qard metadata");
                }
            }
            else
            {
                ValidateCardEdit(edit, source, start, end, retired, lineage);
            }
            List<string> remainingLinks = WikiPattern.Matches(after).Cast<Match>().Select(match => match.Value).ToList();
            var removed = new List<string>();
            foreach (string link in WikiPattern.Matches(before).Cast<Match>().Select(match => match.Value))
            {
                if (!remainingLinks.Remove(link))
                {
                    removed.Add(link);
                }
            }
            string reason = LegacyIdentity.CaseFold(edit.Str("reason"));
            if (removed.Count != 0 && (!reason.Contains("wikilink", StringComparison.Ordinal) || removed.Any(link => !reason.Contains(LegacyIdentity.CaseFold(link[2..^2].Split('|', 2)[0]), StringComparison.Ordinal))))
            {
                throw new ProposalException("wikilink removal requires explicit target-specific semantic rationale");
            }
            ValidateSourcePlacement(path, after, edit.Arr("sources"));
            if (!grouped.TryGetValue(path, out List<(int Start, int End, JsonObject Edit)>? edits))
            {
                edits = [];
                grouped[path] = edits;
            }
            if (edits.Any(prior => start < prior.End && end > prior.Start))
            {
                throw new ProposalException("proposal edits overlap in the original note");
            }
            edits.Add((start, end, edit));
            fingerprints.Add(exact);
        }
        var candidates = new JsonObject();
        foreach (KeyValuePair<string, string> source in sources)
        {
            candidates[source.Key] = source.Value;
        }
        foreach (KeyValuePair<string, List<(int Start, int End, JsonObject Edit)>> item in grouped)
        {
            string candidate = sources[item.Key];
            foreach (var edit in item.Value.OrderByDescending(edit => edit.Start))
            {
                candidate = candidate[..edit.Start] + edit.Edit.Str("after") + candidate[edit.End..];
            }
            if (Frontmatter(candidate) != Frontmatter(sources[item.Key]))
            {
                throw new ProposalException("proposal must preserve frontmatter exactly");
            }
            if (!BlockIdPattern.Matches(candidate).Cast<Match>().Select(match => match.Value).Order(StringComparer.Ordinal).SequenceEqual(BlockIdPattern.Matches(sources[item.Key]).Cast<Match>().Select(match => match.Value).Order(StringComparer.Ordinal)))
            {
                throw new ProposalException("proposal must preserve block IDs exactly");
            }
            candidates[item.Key] = candidate;
        }
        return new JsonObject
        {
            ["sources"] = candidates,
            ["edits"] = proposal.Arr("edits").Copy(),
            ["retired_ids"] = new JsonArray(retired.Select(id => (JsonNode?)JsonValue.Create(id)).ToArray()),
            ["lineage"] = lineage,
            ["fingerprints"] = fingerprints
        };
    }

    private static void ValidateCardEdit(JsonObject edit, string source, int start, int end, List<string> retired, JsonArray lineage)
    {
        string kind = edit.Str("kind");
        string target = edit.Str("learning_target");
        string before = edit.Str("before");
        string after = edit.Str("after");
        bool matchesCard = QardSpans(source).Any(span => span.Text == before);
        if (kind != "add" && !matchesCard)
        {
            throw new ProposalException("card edit must replace one complete active Qard block including adjacent metadata");
        }
        string[] beforeIds = Ids(before);
        string[] afterIds = Ids(after);
        string[] beforeMeta = Metadata(before);
        string[] afterMeta = Metadata(after);
        string[] beforeNonId = beforeMeta.Where(line => !QardScanner.IdPattern.IsMatch(line)).ToArray();
        string[] afterNonId = afterMeta.Where(line => !QardScanner.IdPattern.IsMatch(line)).ToArray();
        IReadOnlyList<(int Start, int End, string Text)> cards = QardSpans(after);
        if (kind != "remove" && cards.Any(card => QardScanner.Scan(card.Text).First(value => value.Kind == "qard").Fold != "-"))
        {
            throw new ProposalException("authored Qard cards must be collapsed");
        }
        if (Regex.IsMatch(after, @"(?im)^>[ \t]*(?:essential meanings|grading (?:criteria|rubric))\s*:"))
        {
            throw new ProposalException("internal grading guidance cannot be rendered into a visible card");
        }
        if (target == "same")
        {
            if (kind != "rewrite" || cards.Count != 1 || !beforeMeta.SequenceEqual(afterMeta))
            {
                throw new ProposalException("same-target rewrite must preserve all adjacent Qard metadata exactly");
            }
            return;
        }
        if (beforeMeta.Any(line => MetadataPattern.Match(line).Groups["key"].Value.Equals("qard-reverse", StringComparison.OrdinalIgnoreCase)))
        {
            throw new ProposalException("reverse-linked cards require a coordinated native metadata transformation");
        }
        if (kind == "add")
        {
            if (!after.Contains(before, StringComparison.Ordinal) || cards.Count < 1 || matchesCard)
            {
                throw new ProposalException("add must retain a non-card insertion anchor and add a complete Qard card");
            }
            if (HiddenQardPattern.IsMatch(before) || QardSpans(source).Any(span => start < span.End && end > span.Start))
            {
                throw new ProposalException("add anchor cannot contain or overlap Qard metadata");
            }
            if (afterIds.Length != 0)
            {
                throw new ProposalException("new cards must be ID-less");
            }
        }
        else if (afterIds.Length != 0)
        {
            throw new ProposalException("replacement and split targets must be ID-less");
        }
        if (kind == "split")
        {
            if (cards.Any(card => !Metadata(card.Text).Where(line => !QardScanner.IdPattern.IsMatch(line)).SequenceEqual(beforeNonId)))
            {
                throw new ProposalException("every split child must preserve the parent's non-identity Qard metadata exactly");
            }
        }
        else if (kind is not ("add" or "remove") && !beforeNonId.SequenceEqual(afterNonId))
        {
            throw new ProposalException("sensitive non-identity Qard metadata must be preserved exactly");
        }
        if (target == "new" && kind is not ("add" or "replace" or "split"))
        {
            throw new ProposalException("new learning targets require add, replace, or split");
        }
        if (target == "retired" && kind != "remove")
        {
            throw new ProposalException("retired learning targets require remove");
        }
        if (kind == "split" && cards.Count < 2)
        {
            throw new ProposalException("split must create at least two ID-less cards");
        }
        if (kind == "replace" && cards.Count != 1)
        {
            throw new ProposalException("replacement must create one ID-less card");
        }
        if (kind == "remove" && after.Trim().Length != 0)
        {
            throw new ProposalException("removed target must have an empty replacement");
        }
        if (kind != "add")
        {
            retired.AddRange(beforeIds);
        }
        lineage.Add(new JsonObject
        {
            ["path"] = edit.Str("path"),
            ["kind"] = kind,
            ["old_ids"] = new JsonArray(beforeIds.Select(id => (JsonNode?)JsonValue.Create(id)).ToArray()),
            ["new_ids"] = new JsonArray(),
            ["learning_target"] = target,
            ["rationale"] = edit.Str("reason"),
            ["before"] = before,
            ["after"] = after
        });
    }

    private static void ValidateSourcePlacement(string path, string after, JsonArray entries)
    {
        if (Regex.IsMatch(after, @"(?:\]\(#Questions\)|\[\[[^\]]*#Questions(?:\|[^\]]*)?\]\])", RegexOptions.IgnoreCase))
        {
            throw new ProposalException($"circular Questions link in {path}");
        }
        foreach (JsonNode? node in entries)
        {
            if (node is not JsonObject entry || !ExactKeys(entry, "url", "claim", "version") || !new[] { "url", "claim", "version" }.All(key => Text(entry, key) && entry.Str(key).Trim().Length != 0))
            {
                throw new ProposalException("source entries require nonempty url, claim, and version");
            }
            string url = entry.Str("url");
            if (!url.StartsWith("https://", StringComparison.Ordinal) || !after.Contains(url, StringComparison.Ordinal))
            {
                throw new ProposalException($"source URL missing from changed answer: {url}");
            }
            if (QardScanner.Scan(after).Any(card => card.Front.Contains(url, StringComparison.Ordinal)))
            {
                throw new ProposalException("sources must be on the answer side");
            }
        }
    }

    public static int UniqueIndex(string text, string anchor, string message)
    {
        int index = text.IndexOf(anchor, StringComparison.Ordinal);
        if (anchor.Length == 0 || index < 0 || text.IndexOf(anchor, index + anchor.Length, StringComparison.Ordinal) >= 0)
        {
            throw new ProposalException(message);
        }
        return index;
    }

    public static (JsonArray Rejections, JsonArray Actions) BindDecisions(JsonObject proposal, JsonArray history, JsonArray rejected, JsonArray feedback)
    {
        var known = new Dictionary<string, (JsonObject Edit, JsonObject Record)>();
        foreach (JsonObject record in history.OfType<JsonObject>())
        {
            foreach (JsonObject edit in record.Obj("proposal").Arr("edits").OfType<JsonObject>())
            {
                known[LegacyIdentity.Proposal(edit)] = (edit, record);
            }
        }
        JsonArray rejections = rejected.Copy();
        Dictionary<string, JsonObject> lookup = rejections.OfType<JsonObject>().ToDictionary(entry => entry.Str("fingerprint"));
        HashSet<string> keys = feedback.OfType<JsonObject>().Select(item => item.Str("key")).ToHashSet();
        var actions = new JsonArray();
        var seen = new HashSet<string>();
        foreach (JsonObject decision in proposal.Arr("decisions").OfType<JsonObject>())
        {
            string fingerprint = decision.Str("fingerprint");
            if (!keys.Contains(decision.Str("feedback_key")) || !seen.Add(fingerprint))
            {
                throw new ProposalException("proposal decision lacks a unique verified pending feedback revision");
            }
            JsonObject action = decision.Copy();
            if (decision.Str("decision") == "reject")
            {
                if (!known.TryGetValue(fingerprint, out var prior))
                {
                    throw new ProposalException("rejection does not reference a recorded open-PR proposal");
                }
                JsonObject source = prior.Record.Obj("batch").Arr("notes").OfType<JsonObject>().First(note => note.Str("path") == prior.Edit.Str("path"));
                action["edit"] = prior.Edit.Copy();
                action["original_source"] = source.Str("content");
            }
            else
            {
                if (!lookup.TryGetValue(fingerprint, out JsonObject? rejection))
                {
                    throw new ProposalException("reconsideration does not reference a rejected proposal");
                }
                if (rejection["reconsidered_by"] is not JsonArray reconsidered)
                {
                    reconsidered = new JsonArray();
                    rejection["reconsidered_by"] = reconsidered;
                }
                reconsidered.Add(decision.Str("feedback_key"));
            }
            actions.Add(action);
        }
        return (rejections, actions);
    }

    public static void PersistDecisions(JsonObject state, JsonArray actions)
    {
        foreach (JsonObject action in actions.OfType<JsonObject>())
        {
            if (action.Str("decision") == "reconsider")
            {
                JsonObject entry = state.Arr("rejections").OfType<JsonObject>().First(item => item.Str("fingerprint") == action.Str("fingerprint"));
                if (entry["reconsidered_by"] is not JsonArray reconsidered)
                {
                    reconsidered = new JsonArray();
                    entry["reconsidered_by"] = reconsidered;
                }
                reconsidered.Add(action.Str("feedback_key"));
            }
            else if (!state.Arr("rejections").OfType<JsonObject>().Any(item => item.Str("fingerprint") == action.Str("fingerprint")))
            {
                JsonObject edit = action.RequiredObject("edit");
                JsonObject tombstone = Core.RejectionTombstone(edit, new JsonObject());
                tombstone["feedback_key"] = action.Str("feedback_key");
                tombstone["reason"] = action.Str("reason");
                state.RequiredArray("rejections").Add(tombstone);
                foreach (string id in Ids(edit.Str("before")))
                {
                    state.RequiredObject("retired_ids").Remove(id);
                }
            }
        }
    }

    public static void RestoreRejected(JsonObject proposal, JsonObject result, JsonArray actions, IReadOnlyDictionary<string, string> sources)
    {
        foreach (JsonObject action in actions.OfType<JsonObject>().Where(action => action.Str("decision") == "reject"))
        {
            JsonObject edit = action.RequiredObject("edit");
            string path = edit.Str("path");
            if (!sources.TryGetValue(path, out string? source))
            {
                throw new ProposalException("rejection target is outside this bounded feedback batch");
            }
            string current = result.RequiredObject("sources").Str(path);
            string before = edit.Str("after");
            string after = edit.Str("before");
            if (before.Length == 0)
            {
                string original = action.Str("original_source");
                int offset = UniqueIndex(original, after, "original rejected target is ambiguous");
                string left = original[Math.Max(0, offset - 80)..offset];
                string right = original[(offset + after.Length)..Math.Min(original.Length, offset + after.Length + 80)];
                before = left + right;
                after = left + after + right;
            }
            int start;
            try
            {
                start = UniqueIndex(source, before, "rejected replacement is absent or ambiguous in the selected source");
            }
            catch (ProposalException) when (edit.Str("before").Length != 0 && source.Contains(edit.Str("before"), StringComparison.Ordinal)
                && source.IndexOf(edit.Str("before"), source.IndexOf(edit.Str("before"), StringComparison.Ordinal) + edit.Str("before").Length, StringComparison.Ordinal) < 0
                && !proposal.Arr("edits").OfType<JsonObject>().Any(item => item.Str("path") == path))
            {
                continue;
            }
            int end = start + before.Length;
            if (edit.Str("kind") != "note" && edit.Str("after").Length != 0)
            {
                var spans = QardSpans(source).Where(span => span.Start < end && span.End > start).ToArray();
                if (spans.Length == 0 || spans.Any(span => span.Start < start || span.End > end))
                {
                    throw new ProposalException("rejection must restore complete current Qard blocks and adjacent metadata");
                }
            }
            foreach (JsonObject currentEdit in proposal.Arr("edits").OfType<JsonObject>().Where(item => item.Str("path") == path))
            {
                int editStart = UniqueIndex(source, currentEdit.Str("before"), "rejection overlaps an edit without a unique selected-source anchor");
                if (editStart < end && editStart + currentEdit.Str("before").Length > start)
                {
                    throw new ProposalException("rejected block is touched by another current edit; split the feedback batch");
                }
            }
            int position = UniqueIndex(current, before, "rejected bot block became ambiguous; original source retained for reconciliation");
            result.RequiredObject("sources")[path] = current[..position] + after + current[(position + before.Length)..];
            var restoration = new JsonObject
            {
                ["path"] = path,
                ["expected_hash"] = LegacyIdentity.Digest(source),
                ["before"] = before,
                ["after"] = after,
                ["reason"] = $"Restore exact original source after owner rejection: {action.Str("reason")}",
                ["kind"] = edit.Str("kind") == "note" ? "note" : "rewrite",
                ["learning_target"] = "same",
                ["essential_meanings"] = edit.Arr("essential_meanings").Copy(),
                ["sources"] = new JsonArray(),
                ["feedback_keys"] = new JsonArray(action.Str("feedback_key"))
            };
            proposal.RequiredArray("edits").Add(restoration);
            foreach (JsonObject disposition in proposal.Arr("dispositions").OfType<JsonObject>().Where(item => item.Str("path") == path))
            {
                disposition["outcome"] = "changed";
                disposition["reason"] = restoration.Str("reason");
            }
            result.RequiredArray("edits").Add(restoration.Copy());
            result.RequiredArray("lineage").Add(new JsonObject
            {
                ["path"] = path,
                ["kind"] = "restore-rejected",
                ["old_ids"] = new JsonArray(),
                ["restored_ids"] = new JsonArray(Ids(edit.Str("before")).Select(id => (JsonNode?)JsonValue.Create(id)).ToArray()),
                ["original_fingerprint"] = action.Str("fingerprint")
            });
        }
    }
}
