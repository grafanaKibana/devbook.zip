using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Vault;

public sealed record Issue(string Code, string Path, int Line, string Message, string Discriminator = "")
{
    public string BaselineId => $"{Code}|{Path}" + (Discriminator.Length == 0 ? "" : $"|{Discriminator}");
    public string Render() => $"{Path}:{Line}: [{Code}] {Message}";
}

public sealed record ValidationResult(IReadOnlyList<Issue> Issues, int Checked, int Suppressed);

public static class Validation
{
    public static readonly string[] ConceptFields = ["topic", "subtopic", "level", "priority", "status"];
    public static readonly HashSet<string> SpecialPages = ["Vault/Home/index.md", "Vault/Home/Questions.md", "Vault/Home/About.md"];
    public static readonly HashSet<string> GeneratedPages = ["Vault/Home/Changelog.md"];
    private static readonly HashSet<string> ImageSuffixes = [".avif", ".bmp", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".tif", ".tiff", ".webp"];
    private static readonly HashSet<string> AttachmentSuffixes = new(ImageSuffixes.Concat(new[] { ".csv", ".doc", ".docx", ".mov", ".mp3", ".mp4", ".ogg", ".pdf", ".ppt", ".pptx", ".tsv", ".wav", ".webm", ".xls", ".xlsx", ".zip" }));
    private static readonly string[] TemplateResidue = ["Quick introduction to the concept", "What is abc?", "Replace or delete these example links.", "[Link 1](https://example.com)", "Explain this section in plain language", "A real question worth being able to answer", "<%*", "tp.hooks.on_all_templates_executed"];
    private static readonly Regex ReferenceLink = new(@"^- \[(?<title>[^\]\n]+)\]\((?<url>https?://(?:(?:\\.)|[^()\s]|\([^()\n]*\))+)\)$");
    private static readonly Regex ReferenceTail = new(@"^- \[[^\]\n]+\]\(https?://(?:(?:\\.)|[^()\s]|\([^()\n]*\))+\)(?<tail>\s+\S.*)$");

    public static IReadOnlyList<Issue> ValidateNote(NoteDocument note, string homeRoot)
    {
        return ValidateFrontmatter(note).Concat(ValidateFolderNote(note, homeRoot))
            .Concat(ValidatePublished(note)).Concat(ValidateReferences(note)).Concat(ValidateResidue(note))
            .Concat(ValidateCodeFences(note)).Concat(ValidateQardInterviews(note)).ToArray();
    }

    public static IReadOnlyList<Issue> ValidateFrontmatter(NoteDocument note)
    {
        var issues = new List<Issue>();
        IReadOnlyDictionary<string, FrontmatterValue> fields = note.Frontmatter;
        if (!note.IsFolderNote && ConceptFields.Any(fields.ContainsKey))
        {
            foreach (string field in ConceptFields.Where(field => !fields.ContainsKey(field)))
            {
                issues.Add(new("frontmatter.missing", note.Rel, 1, $"concept note is missing required `{field}` frontmatter", field));
            }
        }
        foreach (string field in new[] { "topic", "subtopic", "level" })
        {
            if (fields.TryGetValue(field, out FrontmatterValue? value) && (value.Kind != "list" || value.Items.Any(item => item is not string)))
            {
                issues.Add(new("frontmatter.type", note.Rel, value.Line, $"`{field}` must be an array of strings, even with one value", field));
            }
        }
        if (fields.TryGetValue("level", out FrontmatterValue? level) && level.Kind == "list" && level.Items.Any(item => item is not string text || text is not ("1" or "2" or "3" or "4")))
        {
            issues.Add(new("frontmatter.level", note.Rel, level.Line, "`level` contains unsupported values; expected 1-4"));
        }
        foreach ((string field, string[] allowed) in new[] { ("priority", new[] { "Low", "Medium", "High" }), ("status", new[] { "Not-Started", "Creation", "Ready to Repeat", "Repetition", "Done" }) })
        {
            if (!fields.TryGetValue(field, out FrontmatterValue? value))
            {
                continue;
            }
            if (value.Kind != "string")
            {
                issues.Add(new("frontmatter.type", note.Rel, value.Line, $"`{field}` must be a scalar string", field));
            }
            else if (!allowed.Contains(value.Text))
            {
                issues.Add(new($"frontmatter.{field}", note.Rel, value.Line, $"unsupported `{field}` value {value.Text}; expected one of: {string.Join(", ", allowed.Order())}"));
            }
        }
        foreach (string field in new[] { "publish", "draft" })
        {
            if (fields.TryGetValue(field, out FrontmatterValue? value) && value.Kind != "bool")
            {
                issues.Add(new("frontmatter.type", note.Rel, value.Line, $"`{field}` must be the boolean `true` or `false`, not a string", field));
            }
        }
        return issues;
    }

    public static IReadOnlyList<Issue> ValidateFolderNote(NoteDocument note, string homeRoot)
    {
        string? parent = System.IO.Path.GetDirectoryName(note.Path);
        string expected = System.IO.Path.GetFileName(parent) + ".md";
        return note.IsFolderNote && parent != homeRoot && System.IO.Path.GetFileName(note.Path) != expected
            ? [new("folder-note.name", note.Rel, 1, $"FolderNote must be named `{expected}` to match its folder")] : [];
    }

    public static IReadOnlyList<Issue> ValidatePublished(NoteDocument note)
    {
        if (!note.Frontmatter.TryGetValue("publish", out FrontmatterValue? publish) || publish.Value is not true || SpecialPages.Contains(note.Rel))
        {
            return [];
        }
        var issues = new List<Issue>();
        string withoutFences = Regex.Replace(note.Body, "```.*?```", "", RegexOptions.Singleline);
        if (Regex.Replace(withoutFences, @"\s+", "").Length < 200)
        {
            issues.Add(new("publish.content", note.Rel, note.BodyStartLine, "`publish: true` requires substantive body content"));
        }
        if (!Regex.IsMatch(note.Body, @"```|(?m)^\s*[-*+]\s+|(?m)^\s*\|.*\|\s*$|`[^`]+`|\b\d+(?:\.\d+)?\b"))
        {
            issues.Add(new("publish.example", note.Rel, note.BodyStartLine, "`publish: true` needs a concrete signal such as code, a table, a list, or a numeric example"));
        }
        return issues;
    }

    public static IReadOnlyList<Issue> ValidateReferences(NoteDocument note)
    {
        if (SpecialPages.Contains(note.Rel) || GeneratedPages.Contains(note.Rel) || (!note.IsFolderNote && !ConceptFields.Any(note.Frontmatter.ContainsKey)))
        {
            return [];
        }
        string[] lines = Markdown.Lines(note.Body);
        string[] visible = Markdown.Lines(Markdown.StripNonLinkMarkdown(note.Body, preserveInlineCode: true));
        int[] headings = visible.Select((line, index) => (line, index)).Where(item => item.line == "# References").Select(item => item.index).ToArray();
        if (headings.Length == 0)
        {
            return [];
        }
        if (headings.Length > 1)
        {
            return [new("references.heading", note.Rel, note.BodyStartLine + headings[1], "concept and FolderNote pages may contain at most one literal `# References` heading")];
        }
        var issues = new List<Issue>();
        for (int index = headings[0] + 1; index < visible.Length && !Regex.IsMatch(visible[index], @"^#\s+"); index++)
        {
            string line = lines[index];
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }
            Match link = ReferenceLink.Match(line);
            bool image = line.StartsWith("- ![", StringComparison.Ordinal) || (link.Success && IsImageUrl(link.Groups["url"].Value));
            string? code = image ? "references.image" : link.Success ? null : ReferenceTail.IsMatch(line) ? "references.trailing-text"
                : Regex.Matches(line, @"https?://[^\s)>]+(?:\([^()\n]*\))?[^\s)>]*").Cast<Match>().Any(match => IsImageUrl(match.Value)) ? "references.image" : "references.format";
            if (code is not null)
            {
                string message = code switch
                {
                    "references.image" => "References must not contain Markdown images or direct image-file URLs",
                    "references.trailing-text" => "reference entries must end after the Markdown link; remove trailing explanation",
                    _ => "reference entries must be bare `- [descriptive title](https://...)` bullets"
                };
                issues.Add(new(code, note.Rel, note.BodyStartLine + index, message));
            }
        }
        return issues;
    }

    private static bool IsImageUrl(string url) => Uri.TryCreate(url, UriKind.Absolute, out Uri? uri) && ImageSuffixes.Contains(System.IO.Path.GetExtension(Uri.UnescapeDataString(uri.AbsolutePath)).ToLowerInvariant());

    public static IReadOnlyList<Issue> ValidateResidue(NoteDocument note)
    {
        List<Issue> issues = TemplateResidue.Where(note.Content.Contains).Select(residue => new Issue("template.residue", note.Rel, Markdown.LineOf(note.Content, residue), $"remove template placeholder or Templater residue: {residue}", residue)).ToList();
        if (!GeneratedPages.Contains(note.Rel) && Regex.IsMatch(note.Content, @"\[\[.*Software Engineering|Software Engineering/"))
        {
            issues.Add(new("path.legacy", note.Rel, Markdown.LineOf(note.Content, "Software Engineering"), "replace the obsolete `Software Engineering` vault path with `Home`"));
        }
        return issues;
    }

    public static IReadOnlyList<Issue> ValidateCodeFences(NoteDocument note)
    {
        var issues = new List<Issue>();
        (char Marker, int Length)? open = null;
        var tabsdown = new Stack<(char Marker, int Length)>();
        var indents = new List<int>();
        string[] lines = Markdown.Lines(note.Body);
        for (var index = 0; index < lines.Length; index++)
        {
            string line = Markdown.NormalizeContainerLine(Markdown.ExpandTabs(lines[index]), indents, open is not null);
            Match match = Regex.Match(line, @"^ {0,3}(`{3,}|~{3,})(.*)$");
            if (!match.Success)
            {
                continue;
            }
            string fence = match.Groups[1].Value;
            string language = match.Groups[2].Value.Trim();
            if (open is not null)
            {
                if (fence[0] == open.Value.Marker && fence.Length >= open.Value.Length && language.Length == 0)
                {
                    open = null;
                }
            }
            else if (tabsdown.TryPeek(out var wrapper) && fence[0] == wrapper.Marker && fence.Length >= wrapper.Length && language.Length == 0)
            {
                tabsdown.Pop();
            }
            else if (language.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() == "tabsdown")
            {
                tabsdown.Push((fence[0], fence.Length));
            }
            else
            {
                open = (fence[0], fence.Length);
                if (language.Length == 0)
                {
                    issues.Add(new("markdown.code-fence-language", note.Rel, note.BodyStartLine + index, "fenced code blocks need a language; use `text` when none fits"));
                }
            }
        }
        return issues;
    }

    public static IReadOnlyList<Issue> ValidateQardInterviews(NoteDocument note)
    {
        var issues = QardScanner.ParseMetadata(note.Content).Issues.Select(issue => new Issue("qard.metadata", note.Rel, issue.Line, issue.Message, issue.Discriminator)).ToList();
        string[] lines = Markdown.Lines(note.Body);
        bool[] active = QardScanner.ActiveLines(lines);
        bool[] native = QardScanner.ActiveLines(lines, false);
        var attached = new HashSet<int>();
        for (var index = 0; index < lines.Length; index++)
        {
            Match header = QardScanner.HeaderPattern.Match(lines[index]);
            if (!header.Success || !header.Groups["kind"].Value.Equals("qard", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }
            if (native[index] && !active[index])
            {
                issues.Add(new("qard.hidden-card", note.Rel, note.BodyStartLine + index, "Qard indexes this card despite Markdown/Obsidian comment hiding; remove or unhide the card"));
            }
            if (!active[index])
            {
                continue;
            }
            int previous = index - 1;
            if (previous >= 0 && string.IsNullOrWhiteSpace(lines[previous]))
            {
                previous--;
            }
            var related = new HashSet<string>();
            while (previous >= 0 && active[previous] && (QardScanner.LooseIdPattern.IsMatch(lines[previous]) || QardScanner.LocationPattern.IsMatch(lines[previous]) || QardScanner.LooseRelatedPattern.IsMatch(lines[previous])))
            {
                Match looseRelated = QardScanner.LooseRelatedPattern.Match(lines[previous]);
                if (looseRelated.Success && (!QardScanner.RelatedPattern.IsMatch(lines[previous]) || !related.Add(looseRelated.Groups[1].Value)))
                {
                    issues.Add(new("qard.identity-metadata", note.Rel, note.BodyStartLine + previous, "Malformed or repeated related metadata interrupts native Qard identity attachment"));
                    break;
                }
                if (QardScanner.LooseIdPattern.IsMatch(lines[previous]))
                {
                    attached.Add(previous);
                }
                previous--;
            }
        }
        for (var index = 0; index < lines.Length; index++)
        {
            if (active[index] && QardScanner.LooseIdPattern.IsMatch(lines[index]) && !attached.Contains(index))
            {
                issues.Add(new("qard.orphan-id", note.Rel, note.BodyStartLine + index, "qard-id must be adjacent metadata for a Qard card"));
            }
        }
        foreach (QardCard card in QardScanner.Scan(note.Body))
        {
            int line = note.BodyStartLine + card.Line - 1;
            if (card.Kind == "question")
            {
                issues.Add(new("qard.legacy-interview", note.Rel, line, "interview cards under `# Questions` must use `[!qard]`; generic Question callouts remain valid elsewhere"));
            }
            if (card.UnclosedFence)
            {
                issues.Add(new("qard.unclosed-fence", note.Rel, line, "Qard card has an unclosed code fence"));
            }
            if (card.Kind != "qard")
            {
                continue;
            }
            if (!QardScanner.NativeHeaderPattern.IsMatch(card.Header.TrimEnd('\r', '\n')))
            {
                issues.Add(new("qard.header", note.Rel, line, "Qard header must match native syntax: up to three spaces before `>` and at most one literal space before `[!qard]`"));
            }
            if (card.Fold != "-")
            {
                issues.Add(new("qard.collapsed", note.Rel, line, "Qard interview cards must use collapsed `[!qard]-` callouts"));
            }
            if (!card.MarkerValid)
            {
                issues.Add(new("qard.answer-marker", note.Rel, line, "Qard card may contain only one `qard-answer` marker"));
            }
            if (string.IsNullOrWhiteSpace(Markdown.StripNonLinkMarkdown(card.Front, true, true)))
            {
                issues.Add(new("qard.empty-front", note.Rel, line, "Qard card needs a nonempty question"));
            }
            if (string.IsNullOrWhiteSpace(Markdown.StripNonLinkMarkdown(card.Back, true, true)))
            {
                issues.Add(new("qard.empty-back", note.Rel, line, "Qard card needs a nonempty answer"));
            }
            int metadataIndex = card.Line - 2;
            if (metadataIndex >= 0 && string.IsNullOrWhiteSpace(lines[metadataIndex]))
            {
                metadataIndex--;
            }
            while (metadataIndex >= 0 && active[metadataIndex] && !string.IsNullOrWhiteSpace(lines[metadataIndex]))
            {
                if (QardScanner.LooseIdPattern.IsMatch(lines[metadataIndex]) && !QardScanner.IdPattern.IsMatch(lines[metadataIndex]))
                {
                    issues.Add(new("qard.id", note.Rel, line, "`qard-id` must contain only letters, numbers, underscores, or hyphens"));
                    break;
                }
                if (!QardScanner.LocationPattern.IsMatch(lines[metadataIndex]) && !QardScanner.RelatedPattern.IsMatch(lines[metadataIndex]) && !QardScanner.IdPattern.IsMatch(lines[metadataIndex]))
                {
                    break;
                }
                metadataIndex--;
            }
            if (!QardScanner.ValidateLocation(card.Location))
            {
                issues.Add(new("qard.location", note.Rel, line, "`qard-location` must contain nonempty scalar deck and topic strings up to 200 characters"));
            }
        }
        foreach (IGrouping<string, QardCard> duplicate in QardScanner.Scan(note.Body).Where(card => card.Kind == "qard" && card.Id is not null).GroupBy(card => card.Id!).Where(group => group.Count() > 1))
        {
            issues.AddRange(duplicate.Select(card => new Issue("qard.duplicate-id", note.Rel, note.BodyStartLine + card.Line - 1, $"duplicate qard-id `{duplicate.Key}`", duplicate.Key)));
        }
        return issues;
    }

    public static IReadOnlyList<Issue> ValidateGlobalQardIds(IEnumerable<NoteDocument> notes, ISet<string>? selectedPaths = null)
    {
        return notes.SelectMany(note => QardScanner.Scan(note.Body).Where(card => card.Kind == "qard" && card.Id is not null).Select(card => (Note: note, Card: card)))
            .GroupBy(item => item.Card.Id!).Where(group => group.Count() > 1)
            .SelectMany(group => group.Where(item => selectedPaths is null || selectedPaths.Contains(item.Note.Path)).Select(item => new Issue("qard.duplicate-id", item.Note.Rel, item.Note.BodyStartLine + item.Card.Line - 1, $"duplicate qard-id `{group.Key}`", group.Key))).ToArray();
    }

    public static IReadOnlyList<Issue> ValidateWikilinks(NoteDocument note, VaultIndex index)
    {
        var issues = new List<Issue>();
        string content = Markdown.StripNonLinkMarkdown(note.Content);
        foreach (Match match in Regex.Matches(content, @"\[\[([^\]\n]+)\]\]"))
        {
            int slashes = 0;
            for (int position = match.Index - 1; position >= 0 && content[position] == '\\'; position--)
            {
                slashes++;
            }
            if (slashes % 2 == 1)
            {
                continue;
            }
            string raw = match.Groups[1].Value;
            string link = raw.Split('|', 2)[0].TrimEnd('\\');
            string[] split = link.Split('#', 2);
            string target = split[0].Trim();
            string? resolved = index.Resolve(note.Path, target);
            int line = content.AsSpan(0, match.Index).Count('\n') + 1;
            if (resolved is null)
            {
                issues.Add(new("wikilink.unresolved", note.Rel, line, $"wikilink target does not resolve in the vault: [[{raw}]]", LegacyIdentity.CaseFold(target)));
            }
            else if (System.IO.Path.GetExtension(resolved).Equals(".md", StringComparison.OrdinalIgnoreCase) && split.Length == 2 && split[1].Length != 0 && !split[1].StartsWith('^') && !Regex.IsMatch(target, @"^(http://|https://|mailto:|obsidian://)", RegexOptions.IgnoreCase))
            {
                string targetBody = Markdown.SplitFrontmatter(File.ReadAllText(resolved)).Body;
                string headings = Markdown.NormalizeHeadingContainers(Markdown.StripNonLinkMarkdown(targetBody, true));
                IEnumerable<string> rawHeadings = Regex.Matches(headings, @"^[ \t]{0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?$", RegexOptions.Multiline).Cast<Match>().Select(found => found.Groups[1].Value)
                    .Concat(Regex.Matches(headings, @"^([^\n]+)\r?\n[ \t]{0,3}(?:=+|-+)[ \t]*$", RegexOptions.Multiline).Cast<Match>().Select(found => found.Groups[1].Value));
                HashSet<string> normalized = rawHeadings.Select(heading => LegacyIdentity.CaseFold(Regex.Replace(Markdown.VisibleHeadingText(heading), @"\s+", " ").Trim())).ToHashSet();
                string anchor = LegacyIdentity.CaseFold(Regex.Replace(Uri.UnescapeDataString(split[1]), @"\s+", " ").Trim());
                if (!normalized.Contains(anchor))
                {
                    issues.Add(new("wikilink.heading-unresolved", note.Rel, line, $"wikilink heading does not exist in the target note: [[{raw}]]", $"{LegacyIdentity.CaseFold(target)}#{anchor}"));
                }
            }
        }
        return issues;
    }

    public static IReadOnlyList<Issue> ValidateExpectedHubs(string root, IEnumerable<NoteDocument> notes, IEnumerable<string> directories)
    {
        string home = System.IO.Path.Combine(root, "Vault", "Home");
        Dictionary<string, NoteDocument> byPath = notes.ToDictionary(note => note.Path);
        var issues = new List<Issue>();
        foreach (string directory in directories.Distinct().Order())
        {
            if (directory == home || !Directory.Exists(directory) || System.IO.Path.GetRelativePath(home, directory).Split(System.IO.Path.DirectorySeparatorChar).Any(part => part.StartsWith('.')) || !Directory.EnumerateFiles(directory, "*.md").Any())
            {
                continue;
            }
            string expected = System.IO.Path.Combine(directory, System.IO.Path.GetFileName(directory) + ".md");
            string rel = System.IO.Path.GetRelativePath(root, expected).Replace('\\', '/');
            if (!File.Exists(expected))
            {
                issues.Add(new("folder-note.missing", rel, 1, $"folder containing notes must have hub `{System.IO.Path.GetFileName(expected)}`"));
            }
            else if (!byPath.TryGetValue(expected, out NoteDocument? hub) || !hub.IsFolderNote)
            {
                issues.Add(new("folder-note.tag", rel, 1, "folder hub must keep `tags: [FolderNote]`"));
            }
        }
        return issues;
    }

    public static IReadOnlyList<Issue> ValidateAttachmentLocations(string root, IEnumerable<string> paths)
    {
        string vault = System.IO.Path.Combine(root, "Vault");
        string assets = System.IO.Path.Combine(vault, "Assets") + System.IO.Path.DirectorySeparatorChar;
        return paths.Distinct().Where(path => File.Exists(path) && AttachmentSuffixes.Contains(System.IO.Path.GetExtension(path).ToLowerInvariant()) && path.StartsWith(vault + System.IO.Path.DirectorySeparatorChar, StringComparison.Ordinal) && !path.StartsWith(assets, StringComparison.Ordinal))
            .Select(path => new Issue("attachment.location", System.IO.Path.GetRelativePath(root, path).Replace('\\', '/'), 1, "attachments belong under `Vault/Assets/`, never beside notes")).ToArray();
    }

    public static IReadOnlyList<Issue> ValidateRoadmap(string root)
    {
        string canvasPath = System.IO.Path.Combine(root, "Vault", "Home", "Roadmap.canvas");
        if (!File.Exists(canvasPath))
        {
            return [new("generated.roadmap", "Vault/Home/Roadmap.canvas", 1, "Roadmap generator or canvas is missing")];
        }
        try
        {
            JsonNode? actual = JsonNode.Parse(File.ReadAllText(canvasPath));
            JsonNode expected = Roadmap.Generate(root).Canvas;
            if (!JsonNode.DeepEquals(Roadmap.NormalizeForComparison(actual!), Roadmap.NormalizeForComparison(expected)))
            {
                return [new("generated.roadmap", "Vault/Home/Roadmap.canvas", 1, "Roadmap.canvas is stale; run `dotnet run --no-cache --file generate-roadmap.cs`")];
            }
            return [];
        }
        catch (System.Text.Json.JsonException error)
        {
            return [new("generated.roadmap", "Vault/Home/Roadmap.canvas", 1, $"Roadmap canvas is unreadable: {error.Message}")];
        }
    }

    public static IReadOnlyList<Issue> ValidateStepTrace(string root)
    {
        if (!File.Exists(System.IO.Path.Combine(root, "Web", "custom", "steptrace", "build.mjs")))
        {
            return [new("generated.steptrace", "Web/custom/steptrace", 1, "StepTrace build script is missing")];
        }
        string message;
        try
        {
            ProcessResult result = new SystemProcessRunner().RunAsync(new("node", ["custom/steptrace/build.mjs", "--check"], System.IO.Path.Combine(root, "Web"))).GetAwaiter().GetResult();
            if (result.ExitCode == 0)
            {
                return [];
            }
            string[] output = Markdown.Lines(result.Stderr + "\n" + result.Stdout).Select(line => line.Trim()).Where(line => line.Length != 0).ToArray();
            message = output.FirstOrDefault(line => line.Contains("steptrace check:") || line.Contains("steptrace build:"))?.Replace("Error: ", "")
                ?? $"StepTrace freshness check could not run (are Web dependencies installed? run `npm ci` in Web): {output.FirstOrDefault(line => line.StartsWith("Error") || line.Contains("Cannot find")) ?? output.FirstOrDefault(line => line.Contains("ERR_") || line.Contains("not found") || line.Contains("Traceback")) ?? output.LastOrDefault() ?? $"exit code {result.ExitCode}"}";
        }
        catch (System.ComponentModel.Win32Exception error)
        {
            message = $"cannot run StepTrace freshness check: {error.Message}";
        }
        return [new("generated.steptrace", "Web/custom/steptrace", 1, message)];
    }

    public static HashSet<string> LoadBaseline(string path)
    {
        if (!File.Exists(path))
        {
            return [];
        }
        JsonObject baseline = JsonData.ParseObject(File.ReadAllText(path));
        if (baseline.Int("version") != 1 || baseline["violations"] is not JsonArray violations)
        {
            throw new InvalidDataException($"invalid vault validation baseline: {path}");
        }
        return violations.Strings().ToHashSet(StringComparer.Ordinal);
    }

    public static ValidationResult Validate(string root, string mode, bool useBaseline = true)
    {
        root = System.IO.Path.GetFullPath(root);
        string vault = System.IO.Path.Combine(root, "Vault");
        string home = System.IO.Path.Combine(vault, "Home");
        List<NoteDocument> allNotes = Directory.EnumerateFiles(home, "*.md", SearchOption.AllDirectories).Order(StringComparer.Ordinal).Select(path => NoteDocument.Load(path, root)).ToList();
        string[] changed = mode == "staged" ? Git.Paths(root, "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z").Select(path => System.IO.Path.Combine(root, path)).ToArray() : [];
        List<NoteDocument> selected = mode == "staged" ? allNotes.Where(note => changed.Contains(note.Path)).ToList() : allNotes;
        var index = new VaultIndex(vault);
        var issues = selected.SelectMany(note => ValidateNote(note, home)).ToList();
        issues.AddRange(ValidateGlobalQardIds(allNotes, mode == "staged" ? selected.Select(note => note.Path).ToHashSet() : null));
        foreach (NoteDocument note in mode == "staged" && selected.Count != 0 ? allNotes : selected)
        {
            issues.AddRange(ValidateWikilinks(note, index));
        }
        if (mode == "all")
        {
            issues.AddRange(ValidateExpectedHubs(root, allNotes, Directory.EnumerateDirectories(home, "*", SearchOption.AllDirectories)));
            issues.AddRange(ValidateAttachmentLocations(root, Directory.EnumerateFiles(vault, "*", SearchOption.AllDirectories)));
            issues.AddRange(ValidateRoadmap(root));
            issues.AddRange(ValidateStepTrace(root));
        }
        else if (changed.Length != 0)
        {
            issues.AddRange(ValidateExpectedHubs(root, allNotes, selected.Select(note => System.IO.Path.GetDirectoryName(note.Path)!)));
            issues.AddRange(ValidateAttachmentLocations(root, changed));
            if (changed.Any(path => path.StartsWith(home + System.IO.Path.DirectorySeparatorChar, StringComparison.Ordinal)))
            {
                issues.AddRange(ValidateRoadmap(root));
            }
            string[] surfaces = ["Web/custom/steptrace", "Web/custom/emitters/steptrace-static.ts", "Web/quartz/static/steptrace", "Vault/.obsidian/plugins/steptrace"];
            if (changed.Any(path => surfaces.Any(surface => path == System.IO.Path.Combine(root, surface) || path.StartsWith(System.IO.Path.Combine(root, surface) + System.IO.Path.DirectorySeparatorChar, StringComparison.Ordinal))))
            {
                issues.AddRange(ValidateStepTrace(root));
            }
        }
        List<Issue> ordered = issues.Distinct().OrderBy(issue => LegacyIdentity.CaseFold(issue.Path), StringComparer.Ordinal).ThenBy(issue => issue.Line).ThenBy(issue => issue.Code, StringComparer.Ordinal).ToList();
        HashSet<string> baseline = mode == "all" && useBaseline ? LoadBaseline(System.IO.Path.Combine(root, ".scripts", "vault-validation-baseline.json")) : [];
        int suppressed = ordered.Count(issue => baseline.Contains(issue.BaselineId));
        return new(ordered.Where(issue => !baseline.Contains(issue.BaselineId)).ToArray(), selected.Count, suppressed);
    }

    public static Task<int> RunAsync(string[] args)
    {
        if (args.Contains("--help") || args.Contains("-h"))
        {
            Console.WriteLine("validate-vault.cs (--all | --staged) [--no-baseline] [--repo-root PATH]");
            return Task.FromResult(0);
        }
        try
        {
            if (args.Contains("--all") == args.Contains("--staged") || args.Any(argument => argument.StartsWith("--") && argument is not ("--all" or "--staged" or "--no-baseline" or "--repo-root")))
            {
                throw new ArgumentException("choose exactly one of --all or --staged");
            }
            int rootIndex = Array.IndexOf(args, "--repo-root");
            string root = rootIndex >= 0 ? args.ElementAtOrDefault(rootIndex + 1) ?? throw new ArgumentException("--repo-root needs a path") : Repository.FindRoot();
            string mode = args.Contains("--staged") ? "staged" : "all";
            ValidationResult result = Validate(root, mode, !args.Contains("--no-baseline"));
            if (result.Issues.Count != 0)
            {
                Console.WriteLine($"[vault-validation] FAILED: {result.Issues.Count} actionable violation(s)");
                foreach (Issue issue in result.Issues)
                {
                    Console.WriteLine($"- {issue.Render()}");
                }
                if (mode == "all" && result.Suppressed != 0)
                {
                    Console.WriteLine($"[vault-validation] {result.Suppressed} known baseline violation(s) suppressed");
                }
                return Task.FromResult(1);
            }
            string scope = mode == "staged" ? "staged" : "full vault";
            string baselineNote = result.Suppressed == 0 ? "" : $"; {result.Suppressed} known baseline violation(s) suppressed";
            Console.WriteLine($"[vault-validation] OK: {result.Checked} note(s) checked ({scope}){baselineNote}");
            return Task.FromResult(0);
        }
        catch (Exception error) when (error is IOException or ArgumentException or InvalidOperationException or System.Text.Json.JsonException or System.ComponentModel.Win32Exception)
        {
            Console.Error.WriteLine($"[vault-validation] error: {error.Message}");
            return Task.FromResult(2);
        }
    }
}

public sealed class VaultIndex
{
    private readonly string _vault;
    private readonly Dictionary<string, string> _relative = new(StringComparer.Ordinal);
    private readonly Dictionary<string, List<string>> _names = new(StringComparer.Ordinal);

    public VaultIndex(string vaultRoot)
    {
        _vault = System.IO.Path.GetFullPath(vaultRoot);
        foreach (string path in Directory.EnumerateFiles(_vault, "*", SearchOption.AllDirectories))
        {
            string relative = System.IO.Path.GetRelativePath(_vault, path).Replace('\\', '/');
            if (relative.Split('/').Any(part => part.StartsWith('.')))
            {
                continue;
            }
            foreach (string key in new[] { relative, System.IO.Path.ChangeExtension(relative, null) }.Distinct())
            {
                _relative[LegacyIdentity.CaseFold(key)] = path;
            }
            foreach (string name in new[] { System.IO.Path.GetFileName(path), System.IO.Path.GetFileNameWithoutExtension(path) }.Distinct())
            {
                string key = LegacyIdentity.CaseFold(name);
                if (!_names.TryGetValue(key, out List<string>? entries))
                {
                    entries = [];
                    _names[key] = entries;
                }
                entries.Add(path);
            }
        }
    }

    public string? Resolve(string source, string rawTarget)
    {
        string target = Uri.UnescapeDataString(rawTarget.Trim().Replace('\\', '/'));
        if (target.Length == 0 || target.StartsWith('#') || target.StartsWith('^') || Regex.IsMatch(target, @"^(http://|https://|mailto:|obsidian://)"))
        {
            return source;
        }
        target = target.TrimStart('/');
        var candidates = new List<string> { target };
        string parent = System.IO.Path.GetRelativePath(_vault, System.IO.Path.GetDirectoryName(source)!).Replace('\\', '/');
        if (!parent.StartsWith("..", StringComparison.Ordinal))
        {
            candidates.Insert(0, $"{parent}/{target}");
        }
        if (!target.StartsWith("Home/", StringComparison.Ordinal))
        {
            candidates.Add($"Home/{target}");
        }
        foreach (string candidate in candidates)
        {
            string key = LegacyIdentity.CaseFold(candidate.TrimStart('.', '/'));
            if (_relative.TryGetValue(key, out string? path))
            {
                return path;
            }
        }
        return _names.TryGetValue(LegacyIdentity.CaseFold(System.IO.Path.GetFileName(target)), out List<string>? matches) ? matches.FirstOrDefault() : null;
    }
}
