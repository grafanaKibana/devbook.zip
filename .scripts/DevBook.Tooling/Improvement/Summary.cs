using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

namespace DevBook.Tooling.Improvement;

public static class Summary
{
    private const string StartToken = "<!-- devbook-improvement:start";
    private const string EndPrefix = "<!-- devbook-improvement:end";
    private const string EndToken = "<!-- devbook-improvement:end -->";
    private static readonly Regex ManagedPattern = new(@"^<!-- devbook-improvement:start topic=(?<topic>[a-z0-9-]+) -->\n.*?^<!-- devbook-improvement:end -->[ \t]*$", RegexOptions.Singleline | RegexOptions.Multiline);

    public static JsonArray CoalesceChanges(IReadOnlyDictionary<string, string> baseline, IReadOnlyDictionary<string, string> current, JsonArray changes)
    {
        var combined = new List<JsonObject>();
        var identities = new Dictionary<(string Path, string Id), int>();
        foreach (JsonObject raw in changes.OfType<JsonObject>())
        {
            JsonObject item = raw.Copy();
            string path = item.Str("path");
            if (!baseline.TryGetValue(path, out string? original) || !current.TryGetValue(path, out string? final) || original == final)
            {
                continue;
            }
            string? id = Proposal.Ids(item.Str("before")).FirstOrDefault();
            int? target = id is not null && identities.TryGetValue((path, id), out int index) ? index : null;
            if (target is null)
            {
                for (int prior = combined.Count - 1; prior >= 0; prior--)
                {
                    if (combined[prior].Str("path") == path && combined[prior].Str("after") == item.Str("before"))
                    {
                        target = prior;
                        break;
                    }
                }
            }
            int? innerOffset = null;
            if (target is null && item.Str("before").Length != 0)
            {
                var containers = new List<(int Index, int Offset)>();
                for (var prior = 0; prior < combined.Count; prior++)
                {
                    if (combined[prior].Str("path") != path)
                    {
                        continue;
                    }
                    string after = combined[prior].Str("after");
                    string anchor = item.Str("before");
                    int offset = after.IndexOf(anchor, StringComparison.Ordinal);
                    if (offset >= 0 && after.IndexOf(anchor, offset + anchor.Length, StringComparison.Ordinal) < 0)
                    {
                        containers.Add((prior, offset));
                    }
                }
                if (containers.Count == 1)
                {
                    target = containers[0].Index;
                    innerOffset = containers[0].Offset;
                }
            }
            if (target is null)
            {
                item["_reasons"] = new JsonArray(item.Str("reason"));
                item["_problems"] = new JsonArray(item.Str("problem"));
                item["_benefits"] = new JsonArray(item.Str("reader_benefit"));
                combined.Add(item);
                if (id is not null)
                {
                    identities[(path, id)] = combined.Count - 1;
                }
                continue;
            }
            JsonObject priorItem = combined[target.Value];
            string previousAfter = priorItem.Str("after");
            priorItem["after"] = innerOffset is int offsetInParent
                ? previousAfter[..offsetInParent] + item.Str("after") + previousAfter[(offsetInParent + item.Str("before").Length)..]
                : item.Str("after");
            priorItem.RequiredArray("_reasons").Add(item.Str("reason"));
            priorItem["reason"] = string.Join("; ", priorItem.Arr("_reasons").Strings().Where(reason => reason.Length != 0).Distinct());
            foreach ((string field, string collected) in new[] { ("problem", "_problems"), ("reader_benefit", "_benefits") })
            {
                priorItem.RequiredArray(collected).Add(item.Str(field));
                priorItem[field] = string.Join("; ", priorItem.Arr(collected).Strings().Where(value => value.Length != 0).Distinct());
            }
            var sources = new JsonArray();
            foreach (JsonNode? source in priorItem.Arr("sources").Concat(item.Arr("sources")))
            {
                if (!sources.Any(existing => JsonNode.DeepEquals(existing, source)))
                {
                    sources.Add(source?.DeepClone());
                }
            }
            priorItem["sources"] = sources;
            if (priorItem.Str("kind") == "rewrite")
            {
                priorItem["kind"] = item.Str("kind", "rewrite");
            }
            if (priorItem.Str("learning_target") == "same")
            {
                priorItem["learning_target"] = item.Str("learning_target", "same");
            }
        }
        var result = new JsonArray();
        foreach (JsonObject item in combined)
        {
            string path = item.Str("path");
            string before = item.Str("before");
            string after = item.Str("after");
            string? id = Proposal.Ids(before).FirstOrDefault();
            if (id is not null)
            {
                string? originalCard = Proposal.QardSpans(baseline[path]).FirstOrDefault(card => Proposal.Ids(card.Text).Contains(id)).Text;
                string? finalCard = Proposal.QardSpans(current[path]).FirstOrDefault(card => Proposal.Ids(card.Text).Contains(id)).Text;
                before = originalCard ?? before;
                after = finalCard ?? after;
            }
            if (before == after || (before.Length != 0 && !baseline[path].Contains(before, StringComparison.Ordinal)) || (after.Length != 0 && !current[path].Contains(after, StringComparison.Ordinal)))
            {
                continue;
            }
            item["before"] = before;
            item["after"] = after;
            item.Remove("_reasons");
            item.Remove("_problems");
            item.Remove("_benefits");
            result.Add(item);
        }
        return result;
    }

    public static string Render(IReadOnlyDictionary<string, string> baseline, IReadOnlyDictionary<string, string> current,
        JsonArray changes, JsonArray feedback, IReadOnlyDictionary<string, string>? noteLinks = null)
    {
        noteLinks ??= new Dictionary<string, string>();
        string Reference(string path)
        {
            string label = path.StartsWith("Vault/Home/", StringComparison.Ordinal) ? path["Vault/Home/".Length..] : path;
            return noteLinks.TryGetValue(path, out string? link) ? $"[`{label}`]({link})" : $"`{label}`";
        }
        JsonObject[] final = CoalesceChanges(baseline, current, changes).OfType<JsonObject>().ToArray();
        Dictionary<string, int> counts = new[] { "add", "rewrite", "split", "remove", "replace" }.ToDictionary(kind => kind, kind => final.Count(item => item.Str("kind") == kind));
        var lines = new List<string> { "## 1. Note improvements", "" };
        string[] noteChanges = final.Where(item => item.Str("kind") == "note").Select(item => $"- {Reference(item.Str("path"))} — {Rationale(item)}").ToArray();
        lines.AddRange(noteChanges.Length == 0 ? ["- No prose-only note changes."] : noteChanges);
        lines.AddRange(["", "## 2. Questions and answers", "", $"- Added: {counts["add"]}", $"- Rewritten: {counts["rewrite"]}", $"- Split: {counts["split"]}", $"- Proposed for removal: {counts["remove"]}", $"- Replaced: {counts["replace"]}", "", "## 3. Significant question changes", ""]);
        JsonObject[] questions = final.Where(item => item.Str("kind") != "note").ToArray();
        foreach (JsonObject item in questions)
        {
            lines.AddRange([$"- {Reference(item.Str("path"))}", $"  - Before: {VisibleCards(item.Str("before"))}", $"  - After: {VisibleCards(item.Str("after"))}", $"  - Rationale: {Rationale(item)}"]);
        }
        if (questions.Length == 0)
        {
            lines.Add("- No significant question changes.");
        }
        lines.AddRange(["", "## 4. User feedback", ""]);
        string[] feedbackLines = feedback.OfType<JsonObject>().Select(item => $"- {item.Str("url", item.Str("key", "feedback"))}: {item.Str("outcome", "pending")} — {item.Str("reason")}").ToArray();
        lines.AddRange(feedbackLines.Length == 0 ? ["- No owner feedback in this batch."] : feedbackLines);
        return EscapeManagedTokens(string.Join('\n', lines).TrimEnd() + "\n");
    }

    private static string VisibleCards(string block)
    {
        string[] visible = QardScanner.Scan(block).Where(card => card.Kind == "qard").Select(card =>
        {
            string question = string.Join(' ', Markdown.Lines(card.Front).Select(line => line.Trim()).Where(line => line.Length != 0));
            string answer = string.Join(' ', Markdown.Lines(card.Back).Select(line => line.Trim()).Where(line => line.Length != 0));
            answer = Regex.Replace(answer, @"\[([^\]]+)\]\([^)]+\)", "$1");
            return $"“{question}” — {answer[..Math.Min(180, answer.Length)]}";
        }).ToArray();
        return visible.Length == 0 ? "None" : string.Join(" / ", visible);
    }

    private static string Rationale(JsonObject change)
    {
        string explanation = string.Join(' ', new[] { change.Str("problem"), change.Str("reason"), change.Str("reader_benefit") }
            .Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()).Distinct(StringComparer.Ordinal)
            .Select(value => ".!?".Contains(value[^1]) ? value : value + "."));
        string[] citations = change.Arr("sources").OfType<JsonObject>().Where(source => source.Str("url").Length != 0)
            .GroupBy(source => source.Str("url"), StringComparer.Ordinal)
            .Select(group => $"[{group.First().Str("claim", "Source")}]({group.Key})").ToArray();
        return citations.Length == 0 ? explanation : $"{explanation} {string.Join(", ", citations)}";
    }

    private static string EscapeManagedTokens(string value) => value.Replace(StartToken, "&lt;!-- devbook-improvement:start").Replace(EndPrefix, "&lt;!-- devbook-improvement:end");

    private static MatchCollection ManagedSections(string body)
    {
        MatchCollection matches = ManagedPattern.Matches(body);
        int starts = Regex.Matches(body, Regex.Escape(StartToken)).Count;
        int ends = Regex.Matches(body, Regex.Escape(EndPrefix)).Count;
        if (starts != ends || starts > 1 || (starts != 0 && matches.Count != 1))
        {
            throw new InvalidDataException("malformed or duplicate managed PR body markers");
        }
        return matches;
    }

    public static string UpdateManagedBody(string body, string summary, string topic)
    {
        if (summary.Contains(StartToken, StringComparison.Ordinal) || summary.Contains(EndPrefix, StringComparison.Ordinal))
        {
            throw new InvalidDataException("generated summary contains a managed PR body delimiter");
        }
        string markerTopic = Core.TopicId(topic);
        string managed = $"<!-- devbook-improvement:start topic={markerTopic} -->\n{summary.TrimEnd()}\n{EndToken}";
        MatchCollection matches = ManagedSections(body);
        string updated;
        if (matches.Count != 0)
        {
            Match match = matches[0];
            if (match.Groups["topic"].Value != markerTopic)
            {
                throw new InvalidDataException("managed PR body belongs to another topic");
            }
            updated = body[..match.Index] + managed + body[(match.Index + match.Length)..];
        }
        else
        {
            string separator = body.Length == 0 || body.EndsWith("\n\n", StringComparison.Ordinal) ? "" : body.EndsWith('\n') ? "\n" : "\n\n";
            updated = body + separator + managed + "\n";
        }
        if (ManagedSections(updated).Count != 1)
        {
            throw new InvalidDataException("managed PR body update did not produce exactly one valid section");
        }
        return updated;
    }
}
