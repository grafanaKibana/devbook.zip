using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class IdentityTests
{
    [Fact]
    public void NativeIdentitiesRecognizeLegacyRejectionsAndFeedback()
    {
        string fixturePath = Path.Combine(AppContext.BaseDirectory, "fixtures", "LegacyIdentities.json");
        JsonObject fixture = JsonData.ParseObject(File.ReadAllText(fixturePath));
        foreach (JsonNode? row in fixture.RequiredArray("vectors"))
        {
            LegacyIdentity.CanonicalJson(row!["value"], row.Bool("ascii"), row.Bool("spaced"))
                .Should().Be(row.Str("canonical"));
            LegacyIdentity.Fingerprint(row["value"], row.Bool("ascii"), row.Bool("spaced"))
                .Should().Be(row.Str("digest"));
        }

        JsonObject edit = fixture.RequiredObject("edit");
        LegacyIdentity.Proposal(edit).Should().Be(fixture.Str("exact_proposal"));
        LegacyIdentity.Proposal(edit, semantic: true).Should().Be(fixture.Str("semantic_proposal"));
        LegacyIdentity.Fingerprint(fixture.RequiredArray("vectors")[0]!["value"])
            .Should().Be(fixture.Str("runtime_fingerprint"));
        (string key, string revision) = LegacyIdentity.CoreFeedback(fixture.RequiredObject("feedback"));
        key.Should().Be(fixture.Str("core_feedback_key"));
        revision.Should().Be(fixture.Str("core_feedback_revision"));
        JsonObject whitespace = fixture.RequiredObject("casefold");
        LegacyIdentity.CaseFold(LegacyIdentity.NormalizeWhitespace(whitespace.Str("input")))
            .Should().Be(whitespace.Str("expected"));

        var rejected = new HashSet<string> { fixture.Str("semantic_proposal") };
        rejected.Should().Contain(LegacyIdentity.Proposal(edit, semantic: true));
        var processed = new HashSet<string> { fixture.Str("core_feedback_revision") };
        processed.Should().Contain(revision);
    }
}
