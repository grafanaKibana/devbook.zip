using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ExportTests
{
    [Fact]
    public void ReceiptBindsCompleteNativePolicySourcesAndGeneratedBytesAndRetainsLegacyEvidence()
    {
        GitTreeEntry[] entries = [.. Receipt.RequiredPolicyPaths.Select(path => new GitTreeEntry(path, "100644", "blob", new string('a', 40))),
            new(".scripts/DevBook.Tooling/Infrastructure/LegacyCaseFold.json", "100644", "blob", new string('b', 40)),
            new("Vault/Home/Programming/Card.md", "100644", "blob", new string('c', 40)),
            new("Web/content/Programming/Card.md", "100644", "blob", new string('d', 40)),
            new("Web/content/Assets/Image.png", "100644", "blob", new string('e', 40))];
        JsonObject receipt = Receipt.Make(entries);
        Receipt.Validate(receipt, entries).Should().BeTrue();
        receipt.Obj("policy").ContainsKey(".scripts/DevBook.Tooling/Infrastructure/LegacyCaseFold.json").Should().BeTrue();
        Action stale = () => Receipt.Validate(receipt, entries.Select(entry => entry.Path.EndsWith("LegacyCaseFold.json", StringComparison.Ordinal)
            ? entry with { Sha = new string('f', 40) } : entry));
        stale.Should().Throw<InvalidDataException>();
        Action unsafeEntry = () => Receipt.Make(entries.Append(new GitTreeEntry("Web/content/Escape", "120000", "blob", new string('a', 40))));
        unsafeEntry.Should().Throw<InvalidDataException>();
        Receipt.IsExportPath("Vault/Home/Programming/Card.md").Should().BeFalse();
        Receipt.IsExportPath("Web/content/../escape").Should().BeFalse();
        Receipt.IsExportPath("Web/content/Assets/Image.png").Should().BeTrue();
        var historical = new JsonObject
        {
            ["version"] = 1,
            ["policy"] = new JsonObject { [".scripts/sync-quartz.py"] = new JsonObject { ["sha"] = new string('a', 40), ["mode"] = "100644" } }
        };
        string original = historical.ToJsonString();
        Action legacy = () => Receipt.Validate(historical, entries);
        legacy.Should().Throw<StaleExportPolicyException>();
        historical.ToJsonString().Should().Be(original);
    }
}
