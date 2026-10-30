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
}
