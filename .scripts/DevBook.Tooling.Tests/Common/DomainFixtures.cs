using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

internal static class DomainFixtures
{
    public const string Path = "Vault/Home/Programming/NET/Card.md";
    public const string Card = "<!-- qard-source: original -->\n<!-- qard-id: stable_1 -->\n> [!qard]- What is the operating idea?\n> The original answer.\n";
    public const string Note = "---\ntopic: [Programming]\nsubtopic: [NET]\nlevel: [\"2\"]\npriority: Medium\nstatus: Creation\npublish: false\n---\nThe operating idea has a concrete boundary.\n\n# Questions\n\n" + Card;

    public static void CreateReviewContract(string root)
    {
        Directory.CreateDirectory(System.IO.Path.Combine(root, ".codex/agents"));
        File.WriteAllText(System.IO.Path.Combine(root, ".codex/agents/note-reviewer.toml"), "Fixture review contract");
    }

    public static JsonObject Edit(string kind = "rewrite", string target = "same", string? after = null) => new()
    {
        ["path"] = Path,
        ["expected_hash"] = LegacyIdentity.Digest(Note),
        ["before"] = Card,
        ["after"] = after ?? Card.Replace("The original answer.", "The answer explains its mechanism and boundary."),
        ["reason"] = "Explain the mechanism and boundary.",
        ["kind"] = kind,
        ["learning_target"] = target,
        ["essential_meanings"] = new JsonArray("The operating mechanism", "The important boundary"),
        ["sources"] = new JsonArray(),
        ["feedback_keys"] = new JsonArray()
    };

    public static JsonObject Proposal(JsonObject edit) => new()
    {
        ["version"] = 1,
        ["edits"] = new JsonArray(edit.Copy()),
        ["dispositions"] = new JsonArray(new JsonObject { ["path"] = edit.Str("path"), ["outcome"] = "changed", ["reason"] = "Improved the explanation." }),
        ["feedback"] = new JsonArray()
    };

    public static JsonObject NoteRecord(string path = Path, string? content = null) => new()
    {
        ["path"] = path,
        ["content"] = content ?? Note,
        ["hash"] = LegacyIdentity.Digest(content ?? Note),
        ["topic"] = Core.TopicFor(path),
        ["violations"] = new JsonArray()
    };

    public static JsonObject UnchangedReview(JsonObject payload) => new()
    {
        ["verdict"] = "CLEAN",
        ["notes"] = new JsonArray(payload.RequiredObject("current").Select(item => (JsonNode)new JsonObject
        {
            ["path"] = item.Key,
            ["verdict"] = "CLEAN",
            ["summary"] = "The complete unchanged fixture note remains accurate and clear.",
            ["page_type"] = "concept",
            ["split_suggestion"] = "Keep one concept",
            ["target_resolution"] = "JUSTIFIED UNCHANGED",
            ["findings"] = new JsonArray(),
            ["current_text_evidence"] = new JsonArray(new JsonObject
            {
                ["quote"] = item.Value!.GetValue<string>(),
                ["line_start"] = 1,
                ["reason"] = "Complete current fixture text inspected independently."
            }),
            ["source_checks"] = new JsonArray(),
            ["rejection_equivalence"] = new JsonArray(payload.Arr("rejected_proposals").OfType<JsonObject>()
                .Where(rejection => rejection.Str("path") == item.Key).Select(rejection => (JsonNode)new JsonObject
                {
                    ["fingerprint"] = rejection.Str("fingerprint"),
                    ["equivalent"] = false,
                    ["reason"] = "Keeping the unchanged baseline does not repeat the rejected fixture edit."
                }).ToArray()),
            ["quality"] = new JsonObject
            {
                ["accuracy"] = "PASS",
                ["clarity"] = "PASS",
                ["rules_compliance"] = "PASS",
                ["question_quality"] = "PASS",
                ["identity_safety"] = "PASS"
            }
        }).ToArray())
    };
}
