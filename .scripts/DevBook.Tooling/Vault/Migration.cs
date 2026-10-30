using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Vault;

public static class Migration
{
    private static readonly UTF8Encoding StrictUtf8 = new(false, true);
    private static string Hash(byte[] data) => Convert.ToHexStringLower(SHA256.HashData(data));
    private static string SemanticHash(string value) => Hash(StrictUtf8.GetBytes(value.Trim()));

    private static JsonObject ScanNote(string path, string root)
    {
        byte[] data = File.ReadAllBytes(path);
        string rel = System.IO.Path.GetRelativePath(root, path).Replace('\\', '/');
        var issues = new JsonArray();
        string text;
        try
        {
            text = StrictUtf8.GetString(data);
        }
        catch (DecoderFallbackException error)
        {
            issues.Add(new JsonObject { ["code"] = "file.encoding", ["line"] = 1, ["message"] = error.Message });
            return new() { ["path"] = rel, ["cards"] = new JsonArray(), ["generic"] = 0, ["issues"] = issues, ["metadata"] = new JsonObject(), ["metadata_present"] = new JsonArray() };
        }
        NoteDocument note = NoteDocument.Parse(text, rel, path);
        QardMetadata metadata = QardScanner.ParseMetadata(text);
        foreach (QardProblem issue in metadata.Issues)
        {
            issues.Add(new JsonObject { ["code"] = issue.Code, ["line"] = issue.Line, ["message"] = issue.Message });
        }
        var cards = new JsonArray();
        IReadOnlyList<QardCard> all = QardScanner.Scan(text, includeGeneric: true);
        foreach (QardCard card in all.Where(card => card.Kind == "qard" || card.InterviewScope))
        {
            cards.Add(new JsonObject
            {
                ["line"] = card.Line,
                ["end_line"] = card.EndLine,
                ["kind"] = card.Kind,
                ["interview_scope"] = card.InterviewScope,
                ["fold"] = card.Fold,
                ["front_sha256"] = SemanticHash(card.Front),
                ["back_sha256"] = SemanticHash(card.Back),
                ["front_nonempty"] = HasContent(card.Front),
                ["back_nonempty"] = HasContent(card.Back),
                ["qard_id"] = card.Id,
                ["qard_location"] = card.Location,
                ["header"] = card.Header
            });
        }
        foreach (Issue issue in Validation.ValidateQardInterviews(note).Where(issue => issue.Code != "qard.legacy-interview" && issue.Code != "qard.metadata" && issue.Code != "qard.duplicate-id" && issue.Code != "qard.orphan-id" && issue.Code != "qard.id" && issue.Code != "qard.identity-metadata"))
        {
            string code = issue.Code switch
            {
                "qard.hidden-card" => "card.hidden",
                "qard.id" => "card.invalid-id",
                "qard.answer-marker" => "card.ambiguous-answer",
                "qard.location" => "card.invalid-location",
                _ => "card." + issue.Code[5..]
            };
            issues.Add(new JsonObject { ["code"] = code, ["line"] = issue.Line, ["message"] = issue.Message });
        }
        string[] identityLines = Markdown.Lines(text);
        bool[] identityActive = QardScanner.ActiveLines(identityLines);
        var attachedIds = new HashSet<int>();
        foreach (QardCard card in all.Where(card => card.Kind == "qard" || card.InterviewScope))
        {
            int previous = card.Line - 2;
            if (previous >= 0 && string.IsNullOrWhiteSpace(identityLines[previous]))
            {
                previous--;
            }
            var relatedFields = new HashSet<string>();
            while (previous >= 0 && identityActive[previous] && (QardScanner.LooseIdPattern.IsMatch(identityLines[previous]) || QardScanner.LocationPattern.IsMatch(identityLines[previous]) || QardScanner.LooseRelatedPattern.IsMatch(identityLines[previous])))
            {
                Match related = QardScanner.LooseRelatedPattern.Match(identityLines[previous]);
                if (related.Success && (!QardScanner.RelatedPattern.IsMatch(identityLines[previous]) || !relatedFields.Add(related.Groups[1].Value)))
                {
                    issues.Add(new JsonObject { ["code"] = "card.identity-metadata", ["line"] = previous + 1, ["message"] = "Malformed or repeated related metadata interrupts native Qard identity attachment" });
                    break;
                }
                if (QardScanner.LooseIdPattern.IsMatch(identityLines[previous]))
                {
                    attachedIds.Add(previous);
                }
                previous--;
            }
        }
        for (var position = 0; position < identityLines.Length; position++)
        {
            if (!identityActive[position] || !QardScanner.LooseIdPattern.IsMatch(identityLines[position]))
            {
                continue;
            }
            if (!attachedIds.Contains(position))
            {
                issues.Add(new JsonObject { ["code"] = "card.orphan-id", ["line"] = position + 1, ["message"] = "qard-id must be adjacent metadata for a card" });
            }
            else if (!QardScanner.IdPattern.IsMatch(identityLines[position]))
            {
                issues.Add(new JsonObject { ["code"] = "card.invalid-id", ["line"] = position + 1, ["message"] = "qard-id must contain only letters, numbers, underscores, or hyphens" });
            }
        }
        foreach (QardCard card in all.Where(card => card.Kind == "question" && card.InterviewScope))
        {
            foreach ((bool valid, string code, string message) in new[]
            {
                (card.MarkerValid, "card.ambiguous-answer", "card has more than one qard-answer marker"),
                (HasContent(card.Front), "card.empty-front", "Qard card needs a question"),
                (HasContent(card.Back), "card.empty-back", "Qard card needs an answer"),
                (QardScanner.ValidateLocation(card.Location), "card.invalid-location", "qard-location must contain nonempty scalar deck and topic strings"),
                (!card.UnclosedFence, "card.unclosed-fence", "Qard card has an unclosed code fence")
            })
            {
                if (!valid)
                {
                    issues.Add(new JsonObject { ["code"] = code, ["line"] = card.Line, ["message"] = message });
                }
            }
        }
        string[] lines = Markdown.Lines(text);
        if (all.Any(card => card.Kind == "question" && card.InterviewScope) && metadata.Present.Count < 2 && QardScanner.FrontmatterSpan(lines) is { } span)
        {
            int rootIndent = lines.Skip(1).Take(span.End - 1).Where(line => !string.IsNullOrWhiteSpace(line) && !line.TrimStart().StartsWith('#'))
                .Select(line => line.Length - line.TrimStart().Length).DefaultIfEmpty(0).Min();
            if (rootIndent != 0)
            {
                issues.Add(new JsonObject { ["code"] = "metadata.unsupported", ["line"] = 2, ["message"] = "cannot safely seed Qard metadata into an indented root mapping" });
            }
        }
        var values = new JsonObject();
        foreach (KeyValuePair<string, string> pair in metadata.Values)
        {
            values[pair.Key] = pair.Value;
        }
        return new()
        {
            ["path"] = rel,
            ["cards"] = cards,
            ["generic"] = all.Count(card => card.Kind == "question" && !card.InterviewScope),
            ["issues"] = issues,
            ["metadata"] = values,
            ["metadata_present"] = new JsonArray(metadata.Present.Select(value => (JsonNode?)JsonValue.Create(value)).ToArray())
        };
    }

    private static bool HasContent(string value) => !string.IsNullOrWhiteSpace(Markdown.StripNonLinkMarkdown(value, true, true));

    public static JsonObject PathSeeds(string path, string root)
    {
        string relative = System.IO.Path.GetRelativePath(System.IO.Path.Combine(root, "Vault", "Home"), path).Replace('\\', '/');
        string[] parts = relative.Split('/');
        if (parts.Length < 2)
        {
            throw new InvalidDataException($"cannot derive Qard deck/topic for {relative}");
        }
        return new() { ["qard-deck"] = parts[0], ["qard-topic"] = System.IO.Path.ChangeExtension(string.Join('/', parts.Skip(1)), null) };
    }

    public static JsonObject CreateManifest(string root)
    {
        root = System.IO.Path.GetFullPath(root);
        string home = System.IO.Path.Combine(root, "Vault", "Home");
        if (!Directory.Exists(home))
        {
            throw new InvalidDataException($"missing vault home: {home}");
        }
        JsonObject[] scans = Directory.EnumerateFiles(home, "*.md", SearchOption.AllDirectories).Order(StringComparer.Ordinal).Select(path => ScanNote(path, root)).ToArray();
        var issues = new JsonArray();
        foreach (JsonObject scan in scans)
        {
            foreach (JsonObject issue in scan.Arr("issues").OfType<JsonObject>())
            {
                JsonObject entry = issue.Copy();
                entry["path"] = scan.Str("path");
                issues.Add(entry);
            }
        }
        foreach (var group in scans.SelectMany(scan => scan.Arr("cards").OfType<JsonObject>().Where(card => card["qard_id"] is not null).Select(card => (Scan: scan, Card: card)))
            .GroupBy(item => item.Card.Str("qard_id")).Where(group => group.Count() > 1))
        {
            foreach (var item in group)
            {
                issues.Add(new JsonObject { ["code"] = "card.duplicate-id", ["path"] = item.Scan.Str("path"), ["line"] = item.Card.Int("line"), ["message"] = $"duplicate qard-id '{group.Key}'" });
            }
        }
        var files = new JsonArray();
        foreach (JsonObject scan in scans)
        {
            JsonObject[] legacy = scan.Arr("cards").OfType<JsonObject>().Where(card => card.Str("kind") == "question").ToArray();
            if (legacy.Length == 0)
            {
                continue;
            }
            string path = System.IO.Path.Combine(root, scan.Str("path"));
            byte[] data = File.ReadAllBytes(path);
            var headers = new JsonArray();
            foreach (JsonObject card in legacy)
            {
                headers.Add(new JsonObject { ["line"] = card.Int("line"), ["original_b64"] = Convert.ToBase64String(StrictUtf8.GetBytes(card.Str("header"))), ["front_sha256"] = card.Str("front_sha256"), ["back_sha256"] = card.Str("back_sha256"), ["fold"] = card.Str("fold") });
            }
            JsonObject seeds = PathSeeds(path, root);
            if (scan.Arr("issues").OfType<JsonObject>().Any(issue => issue.Str("code").StartsWith("metadata.", StringComparison.Ordinal)))
            {
                seeds.Clear();
            }
            else
            {
                foreach (string field in scan.Arr("metadata_present").Strings())
                {
                    seeds.Remove(field);
                }
            }
            var entry = new JsonObject
            {
                ["path"] = scan.Str("path"),
                ["original_sha256"] = Hash(data),
                ["eol"] = EolName(data),
                ["final_newline"] = data.Length != 0 && data[^1] is 10 or 13,
                ["headers"] = headers,
                ["seed_values"] = seeds,
                ["preserved_metadata"] = scan.Obj("metadata").Copy(),
                ["qard_locations"] = new JsonArray(scan.Arr("cards").OfType<JsonObject>().Where(card => card["qard_location"] is not null).Select(card => card["qard_location"]!.DeepClone()).ToArray())
            };
            entry["planned_sha256"] = Hash(RenderAppliedBytes(root, entry, data));
            files.Add(entry);
        }
        var sortedIssues = new JsonArray(issues.OfType<JsonObject>().OrderBy(issue => LegacyIdentity.CaseFold(issue.Str("path")), StringComparer.Ordinal).ThenBy(issue => issue.Int("line")).ThenBy(issue => issue.Str("code"), StringComparer.Ordinal).Select(issue => issue.DeepClone()).ToArray());
        return new()
        {
            ["version"] = 1,
            ["created_at_utc"] = DateTimeOffset.UtcNow.ToString("O"),
            ["files"] = files,
            ["issues"] = sortedIssues,
            ["summary"] = new JsonObject
            {
                ["home_notes"] = scans.Length,
                ["target_files"] = files.Count,
                ["legacy_interview_cards"] = scans.Sum(scan => scan.Arr("cards").OfType<JsonObject>().Count(card => card.Str("kind") == "question")),
                ["native_qard_cards"] = scans.Sum(scan => scan.Arr("cards").OfType<JsonObject>().Count(card => card.Str("kind") == "qard")),
                ["generic_question_cards"] = scans.Sum(scan => scan.Int("generic")),
                ["issues"] = sortedIssues.Count
            }
        };
    }

    private static string EolName(byte[] bytes)
    {
        string text = StrictUtf8.GetString(bytes);
        int crlf = Regex.Matches(text, "\r\n").Count;
        int lf = text.Count(character => character == '\n') - crlf;
        int cr = text.Count(character => character == '\r') - crlf;
        return new[] { crlf, lf, cr }.Count(count => count != 0) > 1 ? "mixed" : crlf != 0 ? "crlf" : cr != 0 ? "cr" : "lf";
    }

    private static string DetectEol(string text) => Regex.Match(text, "\r\n|\n|\r") is { Success: true } match ? match.Value : "\n";

    private static string QardHeader(string original)
    {
        string ending = original[original.TrimEnd('\r', '\n').Length..];
        Match match = QardScanner.HeaderPattern.Match(original.TrimEnd('\r', '\n'));
        if (!match.Success)
        {
            throw new InvalidDataException("manifest does not contain a callout header");
        }
        int kindIndex = match.Groups["kind"].Index;
        int suffixStart = kindIndex + match.Groups["kind"].Length;
        string suffix = original[suffixStart..].TrimEnd('\r', '\n');
        suffix = Regex.Replace(suffix, @"^\][+-]?", "]-");
        return original[..kindIndex] + "qard" + suffix + ending;
    }

    private static string SeedLine(string key, JsonNode? value, string eol) => $"{key}: {LegacyIdentity.CanonicalJson(value)}{eol}";

    public static byte[] RenderAppliedBytes(string root, JsonObject entry, byte[]? source = null)
    {
        source ??= File.ReadAllBytes(System.IO.Path.Combine(root, entry.Str("path")));
        string text = StrictUtf8.GetString(source);
        List<string> lines = Markdown.Lines(text, true).ToList();
        bool[] active = QardScanner.ActiveLines(lines);
        bool[] scope = QardScanner.QuestionScope(lines, active);
        foreach (JsonObject header in entry.RequiredArray("headers").OfType<JsonObject>())
        {
            int index = header.Int("line") - 1;
            string original = StrictUtf8.GetString(Convert.FromBase64String(header.Str("original_b64")));
            if (index < 0 || index >= lines.Count || !active[index] || !scope[index])
            {
                throw new InvalidDataException($"manifest header is outside an active # Questions section in {entry.Str("path")}:{index + 1}");
            }
            if (lines[index] == QardHeader(original))
            {
                continue;
            }
            if (lines[index] != original)
            {
                throw new InvalidDataException($"header drift in {entry.Str("path")}:{index + 1}");
            }
            lines[index] = QardHeader(original);
        }
        JsonObject seeds = entry.RequiredObject("seed_values");
        if (seeds.Count != 0)
        {
            (int Start, int End)? span = QardScanner.FrontmatterSpan(lines);
            QardMetadata metadata = QardScanner.ParseMetadata(text);
            if (span is null || metadata.Issues.Count != 0 || metadata.Present.Overlaps(seeds.Select(pair => pair.Key)))
            {
                throw new InvalidDataException($"cannot safely seed Qard metadata: {entry.Str("path")}");
            }
            JsonObject expected = PathSeeds(System.IO.Path.Combine(root, entry.Str("path")), root);
            if (seeds.Any(pair => !JsonNode.DeepEquals(pair.Value, expected[pair.Key])))
            {
                throw new InvalidDataException($"manifest contains noncanonical initial seed: {entry.Str("path")}");
            }
            lines.InsertRange(span.Value.End, seeds.Select(pair => SeedLine(pair.Key, pair.Value, DetectEol(text))));
        }
        return StrictUtf8.GetBytes(string.Concat(lines));
    }

    public static byte[] RenderRollbackBytes(JsonObject entry, byte[] data)
    {
        string text = StrictUtf8.GetString(data);
        List<string> lines = Markdown.Lines(text, true).ToList();
        JsonObject seeds = entry.RequiredObject("seed_values");
        foreach (JsonObject header in entry.RequiredArray("headers").OfType<JsonObject>())
        {
            int index = header.Int("line") - 1 + seeds.Count;
            string original = StrictUtf8.GetString(Convert.FromBase64String(header.Str("original_b64")));
            if (index < 0 || index >= lines.Count || lines[index] != QardHeader(original))
            {
                throw new InvalidDataException($"cannot locate migration-owned header in {entry.Str("path")}:{index + 1}");
            }
            lines[index] = original;
        }
        foreach (KeyValuePair<string, JsonNode?> pair in seeds)
        {
            string seed = SeedLine(pair.Key, pair.Value, DetectEol(text));
            int[] positions = lines.Select((line, index) => (line, index)).Where(item => item.line == seed).Select(item => item.index).ToArray();
            if (positions.Length != 1)
            {
                throw new InvalidDataException($"cannot uniquely remove migration-owned metadata in {entry.Str("path")}");
            }
            lines.RemoveAt(positions[0]);
        }
        return StrictUtf8.GetBytes(string.Concat(lines));
    }

    public static void AssertManifest(JsonObject manifest, string? root = null)
    {
        if (manifest.Int("version") != 1 || manifest["files"] is not JsonArray files)
        {
            throw new InvalidDataException("invalid migration manifest");
        }
        var seen = new HashSet<string>();
        foreach (JsonNode? node in files)
        {
            if (node is not JsonObject entry)
            {
                throw new InvalidDataException("invalid migration manifest entry");
            }
            string path = entry.Str("path");
            string[] parts = path.Split('/');
            if (System.IO.Path.IsPathRooted(path) || path.Contains('\\') || !path.EndsWith(".md", StringComparison.OrdinalIgnoreCase) || parts.Length < 3 || parts[0] != "Vault" || parts[1] != "Home" || parts.Any(part => part is "" or "." or "..") || !seen.Add(path))
            {
                throw new InvalidDataException($"unsafe migration manifest path: {path}");
            }
            if (root is not null)
            {
                string current = System.IO.Path.GetFullPath(root);
                foreach (string component in parts)
                {
                    current = System.IO.Path.Combine(current, component);
                    if (File.Exists(current) || Directory.Exists(current))
                    {
                        FileSystemInfo info = Directory.Exists(current) ? new DirectoryInfo(current) : new FileInfo(current);
                        if (info.LinkTarget is not null)
                        {
                            throw new InvalidDataException($"migration manifest path contains a symbolic link: {path}");
                        }
                    }
                }
            }
            if (entry["seed_values"] is not JsonObject seeds || seeds.Any(pair => pair.Key is not ("qard-deck" or "qard-topic") || pair.Value is not JsonValue scalar || !scalar.TryGetValue(out string? value) || string.IsNullOrWhiteSpace(value) || value.Any(character => character is '\r' or '\n' or '\0')))
            {
                throw new InvalidDataException($"invalid seed fields for {path}");
            }
            foreach (string field in new[] { "original_sha256", "planned_sha256" })
            {
                if (!Regex.IsMatch(entry.Str(field), "^[0-9a-f]{64}$"))
                {
                    throw new InvalidDataException($"invalid {field} for {path}");
                }
            }
            if (entry["post_apply_sha256"] is not null && entry.Str("post_apply_sha256") != entry.Str("planned_sha256"))
            {
                throw new InvalidDataException($"invalid post_apply_sha256 for {path}");
            }
            if (entry["headers"] is not JsonArray headers || headers.Count == 0 || headers.Any(header => header is not JsonObject))
            {
                throw new InvalidDataException($"invalid header inventory for {path}");
            }
        }
    }

    public static void Preflight(string root, JsonObject manifest, params string[] allowed)
    {
        AssertManifest(manifest, root);
        var drift = new List<string>();
        foreach (JsonObject entry in manifest.RequiredArray("files").OfType<JsonObject>())
        {
            string path = System.IO.Path.Combine(root, entry.Str("path"));
            string hash = File.Exists(path) ? Hash(File.ReadAllBytes(path)) : "missing";
            if (!allowed.Any(field => entry.Str(field) == hash))
            {
                drift.Add($"{entry.Str("path")}: {hash}");
            }
        }
        if (drift.Count != 0)
        {
            throw new InvalidDataException("compare-and-swap check failed:\n" + string.Join('\n', drift));
        }
    }

    public static IReadOnlyList<string> Apply(string root, JsonObject manifest)
    {
        AssertManifest(manifest, root);
        if (manifest.Arr("issues").Count != 0)
        {
            throw new InvalidDataException($"inventory contains {manifest.Arr("issues").Count} blocking issue(s)");
        }
        Preflight(root, manifest, "original_sha256", "planned_sha256", "post_apply_sha256");
        var outputs = new List<(JsonObject Entry, byte[] Data)>();
        foreach (JsonObject entry in manifest.RequiredArray("files").OfType<JsonObject>())
        {
            byte[] current = File.ReadAllBytes(System.IO.Path.Combine(root, entry.Str("path")));
            if (Hash(current) == entry.Str("planned_sha256"))
            {
                continue;
            }
            byte[] output = RenderAppliedBytes(root, entry, current);
            if (Hash(output) != entry.Str("planned_sha256"))
            {
                throw new InvalidDataException($"planned output mismatch for {entry.Str("path")}");
            }
            outputs.Add((entry, output));
        }
        foreach (var output in outputs)
        {
            string path = System.IO.Path.Combine(root, output.Entry.Str("path"));
            if (Hash(File.ReadAllBytes(path)) != output.Entry.Str("original_sha256"))
            {
                throw new InvalidDataException($"compare-and-swap recheck failed for {output.Entry.Str("path")}");
            }
            AtomicWrite(path, output.Data);
        }
        foreach (JsonObject entry in manifest.RequiredArray("files").OfType<JsonObject>())
        {
            if (Hash(File.ReadAllBytes(System.IO.Path.Combine(root, entry.Str("path")))) != entry.Str("planned_sha256"))
            {
                throw new InvalidDataException($"post-write verification failed for {entry.Str("path")}");
            }
            entry["post_apply_sha256"] = entry.Str("planned_sha256");
        }
        return outputs.Select(output => output.Entry.Str("path")).ToArray();
    }

    public static IReadOnlyList<string> Verify(string root, JsonObject manifest)
    {
        AssertManifest(manifest, root);
        var errors = new List<string>();
        foreach (JsonObject entry in manifest.RequiredArray("files").OfType<JsonObject>())
        {
            string path = System.IO.Path.Combine(root, entry.Str("path"));
            if (!File.Exists(path) || Hash(File.ReadAllBytes(path)) != entry.Str("planned_sha256"))
            {
                errors.Add($"hash mismatch or missing: {entry.Str("path")}");
                continue;
            }
            IReadOnlyList<QardCard> cards = QardScanner.Scan(StrictUtf8.GetString(File.ReadAllBytes(path)));
            if (cards.Any(card => card.Kind == "question"))
            {
                errors.Add($"legacy interview cards remain: {entry.Str("path")}");
            }
            List<(string Front, string Back, string Fold)> actual = cards.Select(card => (SemanticHash(card.Front), SemanticHash(card.Back), card.Fold)).ToList();
            foreach (JsonObject header in entry.RequiredArray("headers").OfType<JsonObject>())
            {
                var signature = (header.Str("front_sha256"), header.Str("back_sha256"), "-");
                if (!actual.Remove(signature))
                {
                    errors.Add($"semantic tuple missing: {entry.Str("path")} {signature.Item1[..Math.Min(12, signature.Item1.Length)]}");
                }
            }
        }
        return errors;
    }

    public static IReadOnlyList<string> Rollback(string root, JsonObject manifest)
    {
        Preflight(root, manifest, "original_sha256", "planned_sha256", "post_apply_sha256");
        var outputs = new List<(JsonObject Entry, byte[] Data)>();
        foreach (JsonObject entry in manifest.RequiredArray("files").OfType<JsonObject>())
        {
            string path = System.IO.Path.Combine(root, entry.Str("path"));
            byte[] current = File.ReadAllBytes(path);
            if (Hash(current) == entry.Str("original_sha256"))
            {
                continue;
            }
            byte[] output = RenderRollbackBytes(entry, current);
            if (Hash(output) != entry.Str("original_sha256"))
            {
                throw new InvalidDataException($"rollback projection mismatch for {entry.Str("path")}");
            }
            outputs.Add((entry, output));
        }
        foreach (var output in outputs)
        {
            string path = System.IO.Path.Combine(root, output.Entry.Str("path"));
            if (Hash(File.ReadAllBytes(path)) != output.Entry.Str("planned_sha256"))
            {
                throw new InvalidDataException($"rollback compare-and-swap recheck failed for {output.Entry.Str("path")}");
            }
            AtomicWrite(path, output.Data);
        }
        return outputs.Select(output => output.Entry.Str("path")).ToArray();
    }

    public static void AtomicWrite(string path, byte[] data)
    {
        string directory = System.IO.Path.GetDirectoryName(System.IO.Path.GetFullPath(path))!;
        Directory.CreateDirectory(directory);
        string temporary = System.IO.Path.Combine(directory, $".{System.IO.Path.GetFileName(path)}.{Guid.NewGuid():N}.tmp");
        UnixFileMode? mode = !OperatingSystem.IsWindows() && File.Exists(path) ? File.GetUnixFileMode(path) : null;
        try
        {
            using (var stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                stream.Write(data);
                stream.Flush(flushToDisk: true);
            }
            if (!OperatingSystem.IsWindows() && mode is not null)
            {
                File.SetUnixFileMode(temporary, mode.Value);
            }
            File.Move(temporary, path, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporary))
            {
                File.Delete(temporary);
            }
        }
    }

    public static Task<int> RunAsync(string[] args)
    {
        if (args.Contains("--help") || args.Contains("-h"))
        {
            Console.WriteLine("migrate-question-callouts-to-qard.cs (inventory|dry-run|apply|verify|rollback) --manifest PATH [--repo-root PATH]");
            return Task.FromResult(0);
        }
        try
        {
            string command = args.FirstOrDefault() ?? throw new ArgumentException("migration command required");
            if (command is not ("inventory" or "dry-run" or "apply" or "verify" or "rollback"))
            {
                throw new ArgumentException("unknown migration command");
            }
            int rootIndex = Array.IndexOf(args, "--repo-root");
            string root = rootIndex >= 0 ? System.IO.Path.GetFullPath(args.ElementAtOrDefault(rootIndex + 1) ?? throw new ArgumentException("--repo-root needs a path")) : Repository.FindRoot();
            int manifestIndex = Array.IndexOf(args, "--manifest");
            string manifestPath = manifestIndex >= 0 ? args.ElementAtOrDefault(manifestIndex + 1) ?? throw new ArgumentException("--manifest needs a path") : throw new ArgumentException("--manifest required");
            JsonObject manifest = command == "inventory" ? CreateManifest(root) : JsonData.ParseObject(File.ReadAllText(manifestPath));
            AssertManifest(manifest, root);
            switch (command)
            {
                case "inventory":
                    AtomicWrite(manifestPath, Encoding.UTF8.GetBytes(manifest.ToJsonString(JsonData.Options) + "\n"));
                    Console.WriteLine(manifest.Obj("summary").ToJsonString());
                    break;
                case "dry-run":
                    if (manifest.Arr("issues").Count != 0)
                    {
                        throw new InvalidDataException($"inventory contains {manifest.Arr("issues").Count} blocking issue(s)");
                    }
                    Preflight(root, manifest, "original_sha256", "planned_sha256", "post_apply_sha256");
                    Console.WriteLine(manifest.Obj("summary").ToJsonString());
                    break;
                case "apply":
                    IReadOnlyList<string> changed = Apply(root, manifest);
                    AtomicWrite(manifestPath, Encoding.UTF8.GetBytes(manifest.ToJsonString(JsonData.Options) + "\n"));
                    Console.WriteLine(JsonSerializer.Serialize(new { changed }));
                    break;
                case "verify":
                    IReadOnlyList<string> errors = Verify(root, manifest);
                    if (errors.Count != 0)
                    {
                        throw new InvalidDataException("verification failed:\n" + string.Join('\n', errors));
                    }
                    Console.WriteLine(JsonSerializer.Serialize(new { verified_files = manifest.Arr("files").Count }));
                    break;
                default:
                    IReadOnlyList<string> rolledBack = Rollback(root, manifest);
                    AtomicWrite(manifestPath, Encoding.UTF8.GetBytes(manifest.ToJsonString(JsonData.Options) + "\n"));
                    Console.WriteLine(JsonSerializer.Serialize(new { rolled_back = rolledBack }));
                    break;
            }
            return Task.FromResult(0);
        }
        catch (Exception error) when (error is IOException or ArgumentException or InvalidOperationException or JsonException or DecoderFallbackException or FormatException)
        {
            Console.Error.WriteLine($"[qard-migration] error: {error.Message}");
            return Task.FromResult(1);
        }
    }
}
