using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class Review
{
    public static bool VerifiedKeep(JsonObject evidence, string path, string current, string rulesHash)
    {
        if (evidence.Str("content_hash") != LegacyIdentity.Digest(current) || evidence.Str("rules_hash") != rulesHash
            || evidence["review"] is not JsonObject noteReview)
        {
            return false;
        }
        return Clean(new JsonObject { ["verdict"] = "CLEAN", ["notes"] = new JsonArray(noteReview.Copy()) },
            new Dictionary<string, string> { [path] = current }, new JsonObject(), new JsonArray(), new JsonArray());
    }

    public static bool Clean(JsonObject review, IReadOnlyDictionary<string, string> candidates, JsonObject proposal, JsonArray rejected, JsonArray feedback)
    {
        if (review.Str("verdict") != "CLEAN")
        {
            return false;
        }

        JsonObject[] notes = review.Arr("notes").OfType<JsonObject>().ToArray();
        if (notes.Length != candidates.Count || !notes.Select(note => note.Str("path")).ToHashSet().SetEquals(candidates.Keys))
        {
            return false;
        }

        foreach (JsonObject note in notes)
        {
            string path = note.Str("path");
            if (note.Str("verdict") != "CLEAN" || note.Arr("findings").Count != 0 || string.IsNullOrWhiteSpace(note.Str("summary")))
            {
                return false;
            }

            JsonArray evidence = note.Arr("current_text_evidence");
            if (evidence.Count == 0)
            {
                return false;
            }

            string[] lines = candidates[path].Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n');
            foreach (JsonObject citation in evidence.OfType<JsonObject>())
            {
                string quote = citation.Str("quote");
                int line = citation.Int("line_start");
                if (string.IsNullOrWhiteSpace(quote) || string.IsNullOrWhiteSpace(citation.Str("reason")) || line < 1)
                {
                    return false;
                }

                string excerpt = string.Join('\n', lines.Skip(line - 1).Take(quote.Count(character => character == '\n') + 1));
                if (!excerpt.Contains(quote, StringComparison.Ordinal))
                {
                    return false;
                }
            }
            if (evidence.Any(value => value is not JsonObject))
            {
                return false;
            }

            if (!note.Str("target_resolution").StartsWith("RESOLVED", StringComparison.Ordinal)
                && !note.Str("target_resolution").StartsWith("JUSTIFIED UNCHANGED", StringComparison.Ordinal))
            {
                return false;
            }

            if (note.Str("page_type").Length == 0 || note.Str("split_suggestion").Length == 0)
            {
                return false;
            }

            JsonObject quality = note.Obj("quality");
            if (new[] { "accuracy", "clarity", "rules_compliance" }.Any(key => quality.Str(key) != "PASS"))
            {
                return false;
            }

            if (new[] { "question_quality", "identity_safety" }.Any(key => quality.Str(key) is not ("PASS" or "NOT APPLICABLE")))
            {
                return false;
            }

            foreach (JsonObject edit in proposal.Arr("edits").OfType<JsonObject>().Where(edit => edit.Str("path") == path))
            {
                foreach (JsonObject source in edit.Arr("sources").OfType<JsonObject>())
                {
                    JsonObject? check = note.Arr("source_checks").OfType<JsonObject>().FirstOrDefault(item => item.Str("url") == source.Str("url") && item.Str("claim") == source.Str("claim"));
                    if (check?.Str("result") != "SUPPORTED" || string.IsNullOrWhiteSpace(check.Str("reason")))
                    {
                        return false;
                    }
                }
            }

            foreach (JsonObject rejection in rejected.OfType<JsonObject>().Where(item => item.Str("path") == path))
            {
                JsonObject? check = note.Arr("rejection_equivalence").OfType<JsonObject>().FirstOrDefault(item => item.Str("fingerprint") == rejection.Str("fingerprint"));
                bool reconsidered = proposal.Arr("decisions").OfType<JsonObject>().Any(item => item.Str("decision") == "reconsider" && item.Str("fingerprint") == rejection.Str("fingerprint"));
                if (check is null || check["equivalent"] is null || (!reconsidered && check.Bool("equivalent")) || string.IsNullOrWhiteSpace(check.Str("reason")))
                {
                    return false;
                }
            }
        }
        foreach (JsonObject decision in proposal.Arr("decisions").OfType<JsonObject>())
        {
            JsonObject? check = review.Arr("decision_checks").OfType<JsonObject>().FirstOrDefault(item => item.Str("feedback_key") == decision.Str("feedback_key")
                && item.Str("fingerprint") == decision.Str("fingerprint") && item.Str("decision") == decision.Str("decision"));
            JsonObject? request = feedback.OfType<JsonObject>().FirstOrDefault(item => item.Str("key") == decision.Str("feedback_key"));
            string quote = check.Str("request_quote");
            if (check.Str("verdict") != "SUPPORTED" || string.IsNullOrWhiteSpace(check.Str("reason")) || string.IsNullOrWhiteSpace(quote)
                || request is null || !request.Str("body").Contains(quote, StringComparison.Ordinal))
            {
                return false;
            }
        }
        return true;
    }

    public static async Task<string> DiffAsync(IReadOnlyDictionary<string, string> before, IReadOnlyDictionary<string, string> after, CancellationToken cancellationToken = default)
    {
        string temporary = Path.Combine(Path.GetTempPath(), "devbook-diff-" + Guid.NewGuid().ToString("N"));
        try
        {
            foreach ((string directory, IReadOnlyDictionary<string, string> sources) in new[] { ("before", before), ("after", after) })
            {
                Directory.CreateDirectory(Path.Combine(temporary, directory));
                foreach (KeyValuePair<string, string> item in sources)
                {
                    Runtime.ValidateRelativeNotePath(item.Key);
                    string path = Path.Combine(temporary, directory, item.Key);
                    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                    File.WriteAllText(path, item.Value, new UTF8Encoding(false));
                }
            }
            ProcessResult result = await new SystemProcessRunner().RunAsync(new ProcessRequest("git",
                ["-c", "core.quotePath=false", "diff", "--no-index", "--no-ext-diff", "--no-textconv", "--no-color", "--no-renames", "--text", "--src-prefix=a/", "--dst-prefix=b/", "--", "before", "after"],
                temporary, Runtime.SafeEnvironment(), Timeout: TimeSpan.FromSeconds(30), ClearEnvironment: true), cancellationToken);
            if (result.ExitCode is not (0 or 1))
            {
                throw new RuntimeFailure("Unable to prepare the reviewable diff.");
            }

            return string.Join('\n', result.Stdout.Split('\n').Select(line => line.StartsWith("diff --git ", StringComparison.Ordinal)
                || line.StartsWith("--- ", StringComparison.Ordinal) || line.StartsWith("+++ ", StringComparison.Ordinal)
                ? line.Replace("a/before/", "a/", StringComparison.Ordinal).Replace("b/after/", "b/", StringComparison.Ordinal) : line));
        }
        finally
        {
            if (Directory.Exists(temporary))
            {
                Directory.Delete(temporary, recursive: true);
            }
        }
    }

    public static int ChangedLines(string diff) => diff.Split('\n').Count(line => (line.StartsWith('+') && !line.StartsWith("+++ ", StringComparison.Ordinal))
        || (line.StartsWith('-') && !line.StartsWith("--- ", StringComparison.Ordinal)));
}
