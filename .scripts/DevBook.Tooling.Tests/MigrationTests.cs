using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class MigrationTests
{
    [Fact]
    public void Legacy_manifest_runs_native_migration_roundtrip_and_refuses_concurrent_user_edits()
    {
        // Arrange
        JsonObject fixture = JsonData.ParseObject(File.ReadAllText(System.IO.Path.Combine(AppContext.BaseDirectory, "fixtures", "LegacyMigration.json")));
        JsonObject manifest = fixture.RequiredObject("manifest").Copy();
        byte[] original = Convert.FromBase64String(fixture.Str("source_b64"));
        byte[] applied = Convert.FromBase64String(fixture.Str("applied_b64"));
        string root = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "devbook-migration-" + Guid.NewGuid().ToString("N"));
        string relative = manifest.Arr("files")[0]!.Str("path");
        string path = System.IO.Path.Combine(root, relative);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path)!);
        File.WriteAllBytes(path, original);
        try
        {

            // Act: inventory the legacy source.
            JsonObject inventory = Migration.CreateManifest(root);

            // Assert
            inventory.Arr("issues").Should().BeEmpty();
            inventory.Arr("files").Should().HaveCount(1);
            inventory.Arr("files")[0]!.Str("planned_sha256").Should().Be(manifest.Arr("files")[0]!.Str("planned_sha256"));

            // Act: validate and apply the guarded migration.
            Migration.Preflight(root, manifest, "original_sha256", "planned_sha256", "post_apply_sha256");
            IReadOnlyList<string> changed = Migration.Apply(root, manifest);
            byte[] migratedBytes = File.ReadAllBytes(path);
            IReadOnlyList<string> verification = Migration.Verify(root, manifest);
            string? migratedId = QardScanner.Scan(File.ReadAllText(path)).Single().Id;
            IReadOnlyList<string> repeatedApply = Migration.Apply(root, manifest);

            // Assert
            changed.Should().Equal(relative);
            migratedBytes.Should().Equal(applied);
            verification.Should().BeEmpty();
            migratedId.Should().Be("stable_legacy");
            repeatedApply.Should().BeEmpty();

            // Arrange: a concurrent source edit.
            File.AppendAllText(path, "Concurrent user text.\r\n");

            // Act
            Action unsafeRollback = () => Migration.Rollback(root, manifest);

            // Assert
            unsafeRollback.Should().Throw<InvalidDataException>().WithMessage("*compare-and-swap*");
            File.ReadAllText(path).Should().EndWith("Concurrent user text.\r\n");

            // Arrange: restore the exact migrated version.
            File.WriteAllBytes(path, applied);

            // Act: round-trip back to the original bytes.
            IReadOnlyList<string> rolledBack = Migration.Rollback(root, manifest);
            byte[] restoredBytes = File.ReadAllBytes(path);
            IReadOnlyList<string> repeatedRollback = Migration.Rollback(root, manifest);

            // Assert
            rolledBack.Should().Equal(relative);
            restoredBytes.Should().Equal(original);
            repeatedRollback.Should().BeEmpty();
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
