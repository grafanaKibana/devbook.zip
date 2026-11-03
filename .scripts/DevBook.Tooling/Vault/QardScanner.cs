using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace DevBook.Tooling.Vault;

public sealed record QardCard(int Start, int End, int HeaderOffset, int Line, int EndLine,
    string Kind, string Fold, string Title, string Front, string Back, string? Id,
    string? Location, string Text, string Header, bool InterviewScope, bool MarkerValid,
    bool UnclosedFence, int MetadataLine);

public sealed record QardMetadata(Dictionary<string, string> Values, HashSet<string> Present,
    IReadOnlyList<QardProblem> Issues);

public sealed record QardProblem(string Code, int Line, string Message, string Discriminator = "");

public static class QardScanner
{
    public static readonly Regex HeaderPattern = new(@"^[^\S\r\n]{0,3}>[^\S\r\n]*\[!(?<kind>question|qard)\](?<fold>[+-]?)(?:[^\S\r\n]+(?<title>.*))?$", RegexOptions.IgnoreCase);
    public static readonly Regex QuotePattern = new(@"^ {0,3}> ?(?<text>.*)$");
    public static readonly Regex IdPattern = new(@"^[ \t]*<!--[ \t]*qard-id:[ \t]*([A-Za-z0-9_-]+)[ \t]*-->[ \t]*$");
    public static readonly Regex LooseIdPattern = new(@"^[ \t]*<!--[ \t]*qard-id:[ \t]*(.*?)[ \t]*-->[ \t]*$");
    public static readonly Regex LocationPattern = new(@"^[ \t]*<!--[ \t]*qard-location:[ \t]*(.+?)[ \t]*-->[ \t]*$");
    public static readonly Regex RelatedPattern = new(@"^\s*<!-- qard-(siblings|reverse): ([A-Za-z0-9_-]+) -->\s*$");
    public static readonly Regex LooseRelatedPattern = new(@"^[ \t]*<!--[ \t]*qard-(siblings|reverse):.*?-->[ \t]*$");
    public static readonly Regex NativeHeaderPattern = new(@"^ {0,3}> ?\[!qard\][+-]?(?:[ \t]+.*)?$", RegexOptions.IgnoreCase);
    public const string AnswerMarker = "<!-- qard-answer -->";

    public static bool[] ActiveLines(IReadOnlyList<string> lines, bool obsidianComments = true)
    {
        var active = new List<bool>();
        string fence = "";
        string? commentEnd = null;
        bool inCard = false;
        foreach (string line in lines)
        {
            string raw = line.TrimEnd('\r', '\n');
            Match quoted = QuotePattern.Match(raw);
            if (inCard && !quoted.Success)
            {
                fence = "";
                inCard = false;
            }
            string codeLine = inCard && quoted.Success ? quoted.Groups["text"].Value : raw;
            Match? header = fence.Length == 0 ? HeaderPattern.Match(raw) : null;
            if (header?.Success == true)
            {
                inCard = true;
            }
            if (fence.Length != 0)
            {
                active.Add(false);
                Match closing = Regex.Match(codeLine, @"^ {0,3}(`+|~+)\s*$");
                if (closing.Success && closing.Groups[1].Value[0] == fence[0] && closing.Groups[1].Length >= fence.Length)
                {
                    fence = "";
                }
                continue;
            }
            Match opening = commentEnd is null ? Regex.Match(codeLine, @"^ {0,3}(`{3,}|~{3,})") : Match.Empty;
            if (opening.Success)
            {
                active.Add(false);
                fence = opening.Groups[1].Value;
                continue;
            }
            raw = Regex.Replace(raw, @"(?<!`)(`+)(.*?)\1(?!`)", "");
            bool hidden = commentEnd is not null;
            string remaining = raw;
            while (remaining.Length != 0)
            {
                if (commentEnd is not null)
                {
                    int end = remaining.IndexOf(commentEnd, StringComparison.Ordinal);
                    if (end < 0)
                    {
                        break;
                    }
                    remaining = remaining[(end + commentEnd.Length)..];
                    commentEnd = null;
                    continue;
                }
                Match opener = Regex.Match(remaining, obsidianComments ? @"<!--|%%" : @"<!--");
                if (!opener.Success || (!obsidianComments && opener.Index != 0 && !string.IsNullOrWhiteSpace(remaining[..opener.Index])))
                {
                    break;
                }
                if (opener.Value == "%%")
                {
                    hidden = true;
                }
                commentEnd = opener.Value == "<!--" ? "-->" : "%%";
                remaining = remaining[(opener.Index + opener.Length)..];
            }
            active.Add(!hidden);
            if (header?.Success == true && !hidden)
            {
                Match titleFence = Regex.Match(header.Groups["title"].Value, @"^ {0,3}(`{3,}|~{3,})");
                if (titleFence.Success)
                {
                    fence = titleFence.Groups[1].Value;
                }
            }
        }
        return active.ToArray();
    }

    public static bool[] QuestionScope(IReadOnlyList<string> lines, IReadOnlyList<bool> active)
    {
        bool inside = false;
        return lines.Select((line, index) =>
        {
            line = line.TrimEnd('\r', '\n');
            if (active[index] && Regex.IsMatch(line, @"^# Questions[ \t]*$"))
            {
                inside = true;
                return false;
            }
            if (active[index] && inside && Regex.IsMatch(line, @"^# [^#]"))
            {
                inside = false;
            }
            return inside;
        }).ToArray();
    }

    public static IReadOnlyList<QardCard> Scan(string text, bool includeGeneric = false)
    {
        string[] rawLines = Markdown.Lines(text, true);
        string[] lines = rawLines.Select(line => line.TrimEnd('\r', '\n')).ToArray();
        bool[] active = ActiveLines(lines);
        bool[] scope = QuestionScope(lines, active);
        int[] offsets = new int[lines.Length + 1];
        for (var position = 0; position < rawLines.Length; position++)
        {
            offsets[position + 1] = offsets[position] + rawLines[position].Length;
        }
        var cards = new List<QardCard>();
        for (var index = 0; index < lines.Length; index++)
        {
            Match match = active[index] ? HeaderPattern.Match(lines[index]) : Match.Empty;
            if (!match.Success)
            {
                continue;
            }
            string kind = match.Groups["kind"].Value.ToLowerInvariant();
            if (kind == "question" && !scope[index] && !includeGeneric)
            {
                continue;
            }
            string title = match.Groups["title"].Value;
            Match titleFence = Regex.Match(title, @"^ {0,3}(`{3,}|~{3,})");
            string fence = titleFence.Success ? titleFence.Groups[1].Value : "";
            var body = new List<string>();
            int end = index + 1;
            for (; end < lines.Length; end++)
            {
                Match quote = QuotePattern.Match(lines[end]);
                if (!quote.Success || (active[end] && HeaderPattern.IsMatch(lines[end])))
                {
                    break;
                }
                string value = quote.Groups["text"].Value;
                Match marker = Regex.Match(value, @"^ {0,3}(`{3,}|~{3,})(.*)$");
                if (fence.Length != 0)
                {
                    if (marker.Success && marker.Groups[1].Value[0] == fence[0] && marker.Groups[1].Length >= fence.Length && string.IsNullOrWhiteSpace(marker.Groups[2].Value))
                    {
                        fence = "";
                    }
                }
                else if (marker.Success)
                {
                    fence = marker.Groups[1].Value;
                }
                body.Add(value);
            }
            bool[] bodyActive = ActiveLines(new[] { title }.Concat(body).ToArray());
            int[] markers = body.Select((value, position) => (value, position)).Where(item => bodyActive[item.position + 1] && item.value.Trim() == AnswerMarker).Select(item => item.position).ToArray();
            string front = markers.Length == 0 ? title.Trim() : string.Join('\n', new[] { title }.Concat(body.Take(markers[0]))).Trim();
            string back = markers.Length == 0 ? string.Join('\n', body).Trim() : string.Join('\n', body.Skip(markers[0] + 1)).Trim();
            if (markers.Length > 1)
            {
                front = back = "";
            }
            (string? id, string? location, int metadataStart) = CardMetadata(lines, index, active);
            cards.Add(new(offsets[metadataStart], offsets[end], offsets[index], index + 1, end, kind,
                match.Groups["fold"].Value, title, front, back, id, location,
                text[offsets[metadataStart]..offsets[end]], rawLines[index], scope[index], markers.Length <= 1, fence.Length != 0, metadataStart + 1));
            index = end - 1;
        }
        return cards;
    }

    public static (string? Id, string? Location, int Start) CardMetadata(IReadOnlyList<string> lines, int headerIndex, IReadOnlyList<bool>? active = null)
    {
        active ??= ActiveLines(lines);
        string? id = null;
        string? location = null;
        var related = new HashSet<string>(StringComparer.Ordinal);
        int previous = headerIndex - 1;
        if (previous >= 0 && string.IsNullOrWhiteSpace(lines[previous]))
        {
            previous--;
        }
        int start = headerIndex;
        while (previous >= 0 && active[previous] && lines[previous].Trim().Length != 0)
        {
            string raw = lines[previous].TrimEnd('\r', '\n');
            Match idMatch = IdPattern.Match(raw);
            Match locationMatch = LocationPattern.Match(raw);
            Match relatedMatch = RelatedPattern.Match(raw);
            if (idMatch.Success && id is null)
            {
                id = idMatch.Groups[1].Value;
            }
            else if (locationMatch.Success && location is null)
            {
                location = locationMatch.Groups[1].Value;
            }
            else if (relatedMatch.Success && related.Add(relatedMatch.Groups[1].Value))
            {
            }
            else
            {
                break;
            }
            start = previous--;
        }
        return (id, location, start);
    }

    public static bool ValidateLocation(string? raw)
    {
        if (raw is null)
        {
            return true;
        }
        try
        {
            if (JsonNode.Parse(raw) is not JsonObject value || value.Count != 2 || !value.ContainsKey("deck") || !value.ContainsKey("topic"))
            {
                return false;
            }
            return value.All(pair => pair.Value is JsonValue scalar && scalar.TryGetValue(out string? text)
                && !string.IsNullOrWhiteSpace(text) && text.Length <= 200 && !text.Any(character => character is '\r' or '\n' or '\0'));
        }
        catch (System.Text.Json.JsonException)
        {
            return false;
        }
    }

    public static (int Start, int End)? FrontmatterSpan(IReadOnlyList<string> lines)
    {
        if (lines.Count == 0 || lines[0].TrimEnd('\r', '\n').TrimStart('\ufeff') != "---")
        {
            return null;
        }
        for (var index = 1; index < lines.Count; index++)
        {
            if (lines[index].Trim() is "---" or "...")
            {
                return (0, index);
            }
        }
        return null;
    }

    public static QardMetadata ParseMetadata(string text)
    {
        string[] lines = Markdown.Lines(text);
        (int Start, int End)? span = FrontmatterSpan(lines);
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        var present = new HashSet<string>(StringComparer.Ordinal);
        var issues = new List<QardProblem>();
        if (span is null)
        {
            return new(values, present, issues);
        }
        string[] yaml = lines.Skip(1).Take(span.Value.End - 1).ToArray();
        int rootIndent = yaml.Where(line => line.Trim().Length != 0 && !line.TrimStart().StartsWith('#')).Select(line => line.Length - line.TrimStart().Length).DefaultIfEmpty(0).Min();
        foreach (string field in new[] { "qard-deck", "qard-topic" })
        {
            string key = $"(?:{field}|\"{field}\"|'{field}')";
            var pattern = new Regex($"^{key}[ \\t]*:(.*)$");
            var matches = yaml.Select((line, index) => (Match: pattern.Match(line), Line: index + 2)).Where(item => item.Match.Success).ToArray();
            var suspicious = yaml.Select((line, index) => (Line: line, Number: index + 2)).Where(item => Regex.IsMatch(item.Line, $"^(?:\\?[ \\t]+)?{key}(?:[ \\t]*:|[ \\t]*$)")
                || (rootIndent != 0 && item.Line.Length - item.Line.TrimStart().Length == rootIndent && pattern.IsMatch(item.Line[rootIndent..]))).ToArray();
            if (matches.Length == 0 && suspicious.Length != 0)
            {
                present.Add(field);
                issues.Add(new("metadata.unsupported", suspicious[0].Number, $"unsupported YAML form for {field}; migration will not seed over it", field));
            }
            else if (matches.Length > 1)
            {
                present.Add(field);
                issues.Add(new("metadata.duplicate", matches[1].Line, $"duplicate {field}", field));
            }
            else if (matches.Length == 1)
            {
                present.Add(field);
                string? value = ParseStringScalar(matches[0].Match.Groups[1].Value);
                if (value is null)
                {
                    issues.Add(new("metadata.invalid", matches[0].Line, $"{field} must be a nonempty scalar single-line string", field));
                }
                else
                {
                    values[field] = value;
                }
            }
        }
        return new(values, present, issues);
    }

    public static string? ParseStringScalar(string raw)
    {
        raw = raw.Trim();
        if (raw.Length == 0 || "[{|>&*!".Contains(raw[0]))
        {
            return null;
        }
        string value;
        if (raw[0] is '"' or '\'')
        {
            if (raw.Length < 2 || raw[^1] != raw[0])
            {
                return null;
            }
            try
            {
                value = raw[0] == '"' ? System.Text.Json.JsonSerializer.Deserialize<string>(raw)! : raw[1..^1].Replace("''", "'");
            }
            catch (System.Text.Json.JsonException)
            {
                return null;
            }
        }
        else
        {
            if (new[] { "null", "~", "true", "false", ".nan", ".inf", "+.inf", "-.inf" }.Contains(raw.ToLowerInvariant())
                || Regex.IsMatch(raw, @"^[-+]?(?:0|[1-9][0-9_]*)(?:\.[0-9_]+)?(?:[eE][-+]?[0-9]+)?$")
                || Regex.IsMatch(raw, @"^[-+]?0(?:x[0-9a-fA-F_]+|o[0-7_]+)$"))
            {
                return null;
            }
            value = raw;
        }
        return string.IsNullOrWhiteSpace(value) || value.Any(character => character is '\r' or '\n' or '\0') ? null : value;
    }
}
