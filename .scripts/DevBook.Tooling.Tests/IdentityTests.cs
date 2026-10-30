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
        // Arrange
        string fixturePath = Path.Combine(AppContext.BaseDirectory, "fixtures", "LegacyIdentities.json");
        JsonObject fixture = JsonData.ParseObject(File.ReadAllText(fixturePath));
        JsonObject edit = fixture.RequiredObject("edit");
        JsonObject whitespace = fixture.RequiredObject("casefold");
        var rejected = new HashSet<string> { fixture.Str("semantic_proposal") };
        var processed = new HashSet<string> { fixture.Str("core_feedback_revision") };

        // Act
        var vectors = fixture.RequiredArray("vectors").Select(row => new
        {
            Canonical = LegacyIdentity.CanonicalJson(row!["value"], row.Bool("ascii"), row.Bool("spaced")),
            ExpectedCanonical = row.Str("canonical"),
            Digest = LegacyIdentity.Fingerprint(row["value"], row.Bool("ascii"), row.Bool("spaced")),
            ExpectedDigest = row.Str("digest")
        }).ToArray();
        string exactProposal = LegacyIdentity.Proposal(edit);
        string semanticProposal = LegacyIdentity.Proposal(edit, semantic: true);
        string runtimeFingerprint = LegacyIdentity.Fingerprint(fixture.RequiredArray("vectors")[0]!["value"]);
        (string key, string revision) = LegacyIdentity.CoreFeedback(fixture.RequiredObject("feedback"));
        string normalized = LegacyIdentity.CaseFold(LegacyIdentity.NormalizeWhitespace(whitespace.Str("input")));

        // Assert
        foreach (var vector in vectors)
        {
            vector.Canonical.Should().Be(vector.ExpectedCanonical);
            vector.Digest.Should().Be(vector.ExpectedDigest);
        }
        exactProposal.Should().Be(fixture.Str("exact_proposal"));
        semanticProposal.Should().Be(fixture.Str("semantic_proposal"));
        runtimeFingerprint.Should().Be(fixture.Str("runtime_fingerprint"));
        key.Should().Be(fixture.Str("core_feedback_key"));
        revision.Should().Be(fixture.Str("core_feedback_revision"));
        normalized.Should().Be(whitespace.Str("expected"));
        rejected.Should().Contain(semanticProposal);
        processed.Should().Contain(revision);
    }
}
