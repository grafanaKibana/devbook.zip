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
            JsonObject inventory = Migration.CreateManifest(root);
            inventory.Arr("issues").Should().BeEmpty();
            inventory.Arr("files").Should().HaveCount(1);
            inventory.Arr("files")[0]!.Str("planned_sha256").Should().Be(manifest.Arr("files")[0]!.Str("planned_sha256"));
            Migration.Preflight(root, manifest, "original_sha256", "planned_sha256", "post_apply_sha256");
            Migration.Apply(root, manifest).Should().Equal(relative);
            File.ReadAllBytes(path).Should().Equal(applied);
            Migration.Verify(root, manifest).Should().BeEmpty();
            QardScanner.Scan(File.ReadAllText(path)).Single().Id.Should().Be("stable_legacy");
            Migration.Apply(root, manifest).Should().BeEmpty();
            File.AppendAllText(path, "Concurrent user text.\r\n");
            Action unsafeRollback = () => Migration.Rollback(root, manifest);
            unsafeRollback.Should().Throw<InvalidDataException>().WithMessage("*compare-and-swap*");
            File.ReadAllText(path).Should().EndWith("Concurrent user text.\r\n");
            File.WriteAllBytes(path, applied);
            Migration.Rollback(root, manifest).Should().Equal(relative);
            File.ReadAllBytes(path).Should().Equal(original);
            Migration.Rollback(root, manifest).Should().BeEmpty();
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
