using System.Globalization;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

namespace DevBook.Tooling.Improvement;

public static class Core
{
    public const int StateVersion = 1;
    public static readonly string[] ContentAuthorities = ["AGENTS.md", ".codex/agents/note-reviewer.toml", ".codex/agents/note-writer.toml", ".codex/skills/obsidian-markdown/SKILL.md", "Vault/Templates/Pages/Template - Concept Page.md", "Vault/Templates/Pages/Template - Index.md", "Vault/Templates/Blocks/Template - Callout.md"];
    public static readonly HashSet<string> SpecialNotes = ["Vault/Home/index.md", "Vault/Home/Questions.md", "Vault/Home/About.md", "Vault/Home/Changelog.md"];

    public static string TopicFor(string path)
    {
        string[] parts = path.Split('/');
        if (parts.Length < 4 || parts[0] != "Vault" || parts[1] != "Home" || !path.EndsWith(".md", StringComparison.Ordinal))
        {
            throw new ArgumentException($"not an authorable Vault/Home note: {path}");
        }
        return string.Join('/', parts.Skip(2).SkipLast(1));
    }

    public static string TopicId(string topic)
    {
        string slug = Regex.Replace(LegacyIdentity.CaseFold(topic), "[^a-z0-9]+", "-").Trim('-');
        return $"{(slug.Length == 0 ? "topic" : slug)}-{LegacyIdentity.Digest(topic)[..8]}";
    }

    public static string BranchFor(string topic, int generation)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(generation, 1);
        return $"notes/automated-{TopicId(topic)}-g{generation}";
    }

    public static string RulesVersion(string root)
    {
        var records = new JsonArray();
        foreach (string relative in ContentAuthorities)
        {
            string path = System.IO.Path.Combine(root, relative);
            string digest = File.Exists(path) ? LegacyIdentity.Digest(File.ReadAllText(path).Replace("\r\n", "\n").Replace('\r', '\n')) : "missing";
            records.Add(new JsonArray(relative, digest));
        }
        return LegacyIdentity.Fingerprint(records);
    }

    public static JsonArray Inventory(string root)
    {
        root = System.IO.Path.GetFullPath(root);
        string home = System.IO.Path.Combine(root, "Vault", "Home");
        NoteDocument[] notes = Directory.EnumerateFiles(home, "*.md", SearchOption.AllDirectories).Order(StringComparer.Ordinal).Select(path => NoteDocument.Load(path, root)).ToArray();
        Issue[] issues = notes.SelectMany(note => Validation.ValidateNote(note, home)).Concat(Validation.ValidateGlobalQardIds(notes)).ToArray();
        var result = new JsonArray();
        foreach (NoteDocument note in notes.Where(note => !SpecialNotes.Contains(note.Rel)))
        {
            result.Add(new JsonObject
            {
                ["path"] = note.Rel,
                ["content"] = note.Content,
                ["hash"] = LegacyIdentity.Digest(note.Content),
                ["topic"] = TopicFor(note.Rel),
                ["violations"] = new JsonArray(issues.Where(issue => issue.Path == note.Rel).Select(issue => (JsonNode)new JsonObject { ["code"] = issue.Code, ["line"] = issue.Line, ["message"] = issue.Message }).ToArray())
            });
        }
        return result;
    }

    public static JsonObject NewState() => new()
    {
        ["version"] = StateVersion,
        ["runtime_version"] = null,
        ["notes"] = new JsonObject(),
        ["topics"] = new JsonObject(),
        ["prs"] = new JsonObject(),
        ["feedback"] = new JsonObject(),
        ["rejections"] = new JsonArray(),
        ["retired_ids"] = new JsonObject(),
        ["cooldown"] = null
    };

    public static JsonObject CopyState(JsonObject state)
    {
        if (state.Int("version") != StateVersion)
        {
            throw new InvalidDataException("unsupported state version");
        }
        JsonObject copy = state.Copy();
        foreach (KeyValuePair<string, JsonNode?> pair in NewState())
        {
            if (!copy.ContainsKey(pair.Key))
            {
                copy[pair.Key] = pair.Value?.DeepClone();
            }
        }
        foreach (string key in new[] { "notes", "topics", "prs", "feedback", "retired_ids" })
        {
            _ = copy.RequiredObject(key);
        }
        _ = copy.RequiredArray("rejections");
        return copy;
    }

    public static JsonObject RejectionTombstone(JsonObject edit, JsonObject result) => new()
    {
        ["fingerprint"] = LegacyIdentity.Proposal(edit),
        ["semantic_fingerprint"] = LegacyIdentity.Proposal(edit, semantic: true),
        ["path"] = edit.Str("path"),
        ["kind"] = edit.Str("kind"),
        ["learning_target"] = edit.Str("learning_target"),
        ["before"] = edit.Str("before"),
        ["after"] = edit.Str("after"),
        ["lineage"] = new JsonArray(result.Arr("lineage").OfType<JsonObject>().Where(value => value.Str("path") == edit.Str("path")).Select(value => value.DeepClone()).ToArray()),
        ["reconsidered_by"] = new JsonArray()
    };

    private static void PruneTerminalRecords(JsonObject state, JsonObject entry)
    {
        if (entry.Str("status") == "open" || entry["proposal_records"] is not JsonArray records || records.Count == 0)
        {
            return;
        }
        entry.Remove("proposal_records");
        entry["terminal_audit"] = new JsonObject
        {
            ["status"] = entry.Str("status"),
            ["record_count"] = records.Count,
            ["records"] = new JsonArray(records.OfType<JsonObject>().Select(record => (JsonNode)new JsonObject
            {
                ["batch_hash"] = LegacyIdentity.Fingerprint(record["batch"]),
                ["proposal_hash"] = LegacyIdentity.Fingerprint(record["proposal"]),
                ["result_hash"] = LegacyIdentity.Fingerprint(record["result"])
            }).ToArray())
        };
        if (entry.Str("status") != "closed")
        {
            return;
        }
        HashSet<string> known = state.Arr("rejections").OfType<JsonObject>().Select(item => item.Str("fingerprint")).ToHashSet();
        foreach (JsonObject record in records.OfType<JsonObject>())
        {
            foreach (JsonObject edit in record.Obj("proposal").Arr("edits").OfType<JsonObject>())
            {
                JsonObject tombstone = RejectionTombstone(edit, record.Obj("result"));
                if (known.Add(tombstone.Str("fingerprint")))
                {
                    state.RequiredArray("rejections").Add(tombstone);
                }
            }
        }
    }

    public static JsonObject SyncPrs(JsonObject state, JsonArray prs, JsonObject? config = null)
    {
        int maxNotes = config.Int("max_pr_notes", 16);
        int maxLines = config.Int("max_pr_lines", 1200);
        if (maxNotes < 1 || maxLines < 1)
        {
            throw new InvalidDataException("PR size limits must be positive");
        }
        JsonObject result = CopyState(state);
        var seen = new HashSet<string>();
        foreach (JsonObject raw in prs.OfType<JsonObject>())
        {
            string topic = raw.Str("topic_id", raw.Str("topic"));
            int generation = raw.Int("generation");
            int number = raw.Int("number");
            string status = raw.Str("status", raw.Str("state"));
            if (topic.Length == 0 || generation < 1 || number < 1 || status is not ("open" or "closed" or "merged"))
            {
                throw new InvalidDataException("managed PR needs topic/generation/number and valid status");
            }
            string key = $"{topic}:{generation}";
            if (!seen.Add(key))
            {
                throw new InvalidDataException($"duplicate managed PR marker {key}");
            }
            JsonObject prior = result.Obj("prs").Obj(key);
            bool inherited = prior.Bool("frozen") && !raw.Bool("clear_export_freeze");
            bool frozen = inherited || raw.Bool("frozen") || raw.Bool("review_activity") || raw.Bool("has_reviews") || raw.Int("review_count") > 0
                || raw.Int("note_count") >= maxNotes || raw.Int("changed_lines") >= maxLines || (raw["draft"] is JsonValue draft && draft.TryGetValue(out bool flag) && !flag);
            JsonObject entry = prior.Copy();
            foreach (KeyValuePair<string, JsonNode?> pair in raw)
            {
                entry[pair.Key] = pair.Value?.DeepClone();
            }
            entry["topic_id"] = topic;
            entry["generation"] = generation;
            entry["number"] = number;
            entry["status"] = status;
            entry["frozen"] = frozen;
            entry.Remove("clear_export_freeze");
            if (status == "open" && result.Obj("prs").Any(pair => pair.Key != key && pair.Value.Str("status") == "open" && pair.Value.Str("topic_id", pair.Value.Str("topic")) == topic))
            {
                throw new InvalidDataException($"multiple open managed PRs for topic {topic}");
            }
            PruneTerminalRecords(result, entry);
            result.RequiredObject("prs")[key] = entry;
            if (result.Obj("topics")[topic] is not JsonObject topicState)
            {
                topicState = new JsonObject { ["generation"] = generation };
                result.RequiredObject("topics")[topic] = topicState;
            }
            topicState["generation"] = Math.Max(topicState.Int("generation", 1), generation);
            if (status == "open")
            {
                topicState["open_pr_key"] = key;
            }
            else
            {
                if (topicState.Str("open_pr_key") == key)
                {
                    topicState.Remove("open_pr_key");
                }
                topicState["generation"] = Math.Max(topicState.Int("generation"), generation + 1);
                topicState["last_terminal_status"] = status;
            }
        }
        foreach (JsonObject entry in result.Obj("prs").Select(pair => pair.Value).OfType<JsonObject>())
        {
            PruneTerminalRecords(result, entry);
        }
        return result;
    }

    private static bool ActorAllowed(JsonObject item, JsonNode allowlist)
    {
        JsonObject actor = item["author"] as JsonObject ?? item["user"] as JsonObject ?? item;
        JsonNode? id = actor["id"] ?? actor["database_id"] ?? actor["databaseId"] ?? actor["author_id"];
        string login = actor.Str("login", actor.Str("author_login"));
        string identity = id?.ToString() ?? "";
        if (identity.Length == 0 || login.Length == 0)
        {
            return false;
        }
        if (allowlist is JsonArray list && list.OfType<JsonObject>().Any())
        {
            return list.OfType<JsonObject>().Any(entry => entry["id"]?.ToString() == identity && LegacyIdentity.CaseFold(entry.Str("login")) == LegacyIdentity.CaseFold(login));
        }
        IEnumerable<string> ids = allowlist is JsonObject mapping ? mapping.Arr("ids").Select(value => value?.ToString() ?? "") : ((JsonArray)allowlist).Where(value => value is JsonValue scalar && scalar.TryGetValue(out int _)).Select(value => value!.ToString());
        IEnumerable<string> logins = allowlist is JsonObject map ? map.Arr("logins").Strings() : ((JsonArray)allowlist).Where(value => value is JsonValue scalar && scalar.TryGetValue(out string? _)).Select(value => value!.GetValue<string>());
        return ids.Contains(identity) && logins.Select(LegacyIdentity.CaseFold).Contains(LegacyIdentity.CaseFold(login));
    }

    public static JsonArray IngestFeedback(JsonObject state, JsonArray prs, JsonArray comments, JsonNode allowlist)
    {
        JsonObject reconciled = SyncPrs(state, prs);
        HashSet<int> openNumbers = reconciled.Obj("prs").Select(pair => pair.Value).OfType<JsonObject>().Where(entry => entry.Str("status") == "open").Select(entry => entry.Int("number")).ToHashSet();
        var queued = new List<JsonObject>();
        foreach (JsonObject item in comments.OfType<JsonObject>())
        {
            if (!openNumbers.Contains(item.Int("pr_number", item.Int("pull_request_number"))) || !ActorAllowed(item, allowlist))
            {
                continue;
            }
            (string key, string revision) = LegacyIdentity.CoreFeedback(item);
            if (state.Obj("feedback").ContainsKey(key))
            {
                continue;
            }
            JsonObject entry = item.Copy();
            entry["key"] = key;
            entry["revision"] = revision;
            entry["status"] = "pending";
            queued.Add(entry);
        }
        return new JsonArray(queued.OrderBy(item => item.Str("updated_at"), StringComparer.Ordinal).ThenBy(item => item.Str("key"), StringComparer.Ordinal).Select(item => (JsonNode)item).ToArray());
    }

    public static JsonObject RecordOutcome(JsonObject state, JsonObject batch, JsonObject proposal, JsonObject result)
    {
        JsonObject current = CopyState(state);
        Dictionary<string, JsonObject> dispositions = proposal.Arr("dispositions").OfType<JsonObject>().ToDictionary(item => item.Str("path"));
        JsonObject[] notes = batch.Arr("notes").OfType<JsonObject>().ToArray();
        if (!dispositions.Keys.ToHashSet().SetEquals(notes.Select(note => note.Str("path"))))
        {
            throw new InvalidDataException("outcome dispositions must exactly cover batch notes");
        }
        foreach (JsonObject note in notes)
        {
            string path = note.Str("path");
            JsonObject record = current.Obj("notes")[path] is JsonObject prior ? prior.Copy() : new JsonObject();
            record["content_hash"] = result.Obj("sources")[path] is JsonValue source
                ? LegacyIdentity.Digest(source.GetValue<string>())
                : note.Str("hash", LegacyIdentity.Digest(note.Str("content")));
            record["rules_hash"] = batch["rules_hash"]?.DeepClone();
            record["outcome"] = dispositions[path].Str("outcome");
            record["violation_hash"] = LegacyIdentity.ViolationHash(note.Arr("violations"));
            current.RequiredObject("notes")[path] = record;
        }
        foreach (JsonObject item in proposal.Arr("feedback").OfType<JsonObject>())
        {
            if (current.Obj("feedback")[item.Str("key")] is JsonObject feedback)
            {
                feedback["status"] = item.Str("outcome");
                feedback["reason"] = item.Str("reason");
            }
        }
        foreach (JsonObject lineage in result.Arr("lineage").OfType<JsonObject>())
        {
            foreach (string id in lineage.Arr("old_ids").Strings())
            {
                current.RequiredObject("retired_ids")[id] = lineage.Copy();
            }
        }
        if (result.Str("outcome") is "rejected" or "closed_without_merge")
        {
            HashSet<string> known = current.Arr("rejections").OfType<JsonObject>().Select(item => item.Str("fingerprint")).ToHashSet();
            foreach (JsonObject edit in proposal.Arr("edits").OfType<JsonObject>())
            {
                JsonObject tombstone = RejectionTombstone(edit, result);
                if (known.Add(tombstone.Str("fingerprint")))
                {
                    current.RequiredArray("rejections").Add(tombstone);
                }
            }
        }
        return current;
    }

    public static string FormatTime(DateTimeOffset value)
    {
        DateTime utc = value.UtcDateTime;
        return utc.ToString(utc.Ticks % TimeSpan.TicksPerSecond == 0 ? "yyyy-MM-dd'T'HH:mm:ss'Z'" : "yyyy-MM-dd'T'HH:mm:ss.ffffff'Z'", CultureInfo.InvariantCulture);
    }

    public static JsonObject SetCooldown(JsonObject state, string kind, DateTimeOffset? reportedResetAt, DateTimeOffset now, int recheckHours = 24)
    {
        if (kind is not ("five_hour" or "weekly" or "unknown"))
        {
            throw new ArgumentException("invalid cooldown kind");
        }
        JsonObject current = CopyState(state);
        DateTimeOffset next = reportedResetAt > now ? reportedResetAt.Value : now.AddHours(recheckHours);
        string reset = reportedResetAt is null ? "unknown" : FormatTime(reportedResetAt.Value);
        string episode = LegacyIdentity.Digest($"{kind}|{reset}")[..16];
        JsonObject prior = current.Obj("cooldown");
        current["cooldown"] = new JsonObject
        {
            ["kind"] = kind,
            ["reported_reset_at"] = reportedResetAt is null ? null : reset,
            ["next_check_at"] = FormatTime(next),
            ["episode_key"] = episode,
            ["notice_pending"] = prior.Str("episode_key") != episode,
            ["notice_sent"] = prior.Str("episode_key") == episode && prior.Bool("notice_sent")
        };
        return current;
    }

    public static bool CooldownActive(JsonObject state, DateTimeOffset now) => state["cooldown"] is JsonObject cooldown
        && DateTimeOffset.TryParse(cooldown.Str("next_check_at"), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out DateTimeOffset next) && now < next;
}
