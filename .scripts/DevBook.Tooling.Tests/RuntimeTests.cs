using System.Text;
using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class RuntimeTests
{
    [Theory]
    [InlineData("main", 1)]
    [InlineData("feature/devbook-improvement-setup", 1810001)]
    public async Task Publication_targets_the_configured_base_with_a_distinct_pilot_generation(string baseBranch, int generation)
    {
        // Arrange
        var api = new RuntimeApi { BaseBranch = baseBranch };
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, baseBranch, leaseOwner: "fixture", activation: () => { });
        JsonObject request = RuntimeFixtures.Request("Original", "Reviewed candidate");
        string branch = Runtime.ExpectedManagedBranch(RuntimeFixtures.Topic, generation);
        request["generation"] = generation;
        request["branch"] = branch;

        // Act
        JsonObject result = await runtime.PublishAsync(request);

        // Assert
        result.Str("status").Should().Be("awaiting_export");
        api.Pr.Obj("base").Str("ref").Should().Be(baseBranch);
        api.Pr.Obj("head").Str("ref").Should().Be(branch);
        api.Pr.Bool("draft").Should().BeTrue();
        Runtime.ValidPrIdentity(api.Pr, api.Repo, baseBranch, RuntimeFixtures.Topic, generation).Should().BeTrue();
        Runtime.ValidPrIdentity(api.Pr, api.Repo, "wrong-base", RuntimeFixtures.Topic, generation).Should().BeFalse();
        result.Obj("export_request").Str("branch").Should().Be(branch);
        api.PrCreates.Should().Be(1);
        api.ForceWrites.Should().Be(0);
    }

    [Fact]
    public async Task Publication_reuses_marked_pr_and_renews_review_only_for_owner_requested_fixes()
    {
        // Arrange
        var api = new RuntimeApi();
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        JsonObject request = RuntimeFixtures.Request("Original", "First reviewed candidate");

        // Act: publish the first reviewed candidate.
        JsonObject first = await runtime.PublishAsync(request);

        // Assert
        first.Str("status").Should().Be("awaiting_export");
        first.Obj("export_request").Str("expected_head").Should().Be(api.Head);
        api.PrCreates.Should().Be(1);

        // Arrange: owner text and active review freeze the PR.
        api.Pr["body"] = "Owner text.\n\n" + api.Pr.Str("body") + "\nOwner footer.\n";
        api.Pr["draft"] = false;
        JsonObject second = RuntimeFixtures.Request("First reviewed candidate", "Second reviewed candidate");
        second["expected_pr_number"] = 1;
        second["expected_branch_sha"] = api.Head;

        // Act
        Func<Task> frozen = async () => await runtime.PublishAsync(second);

        // Assert
        await frozen.Should().ThrowAsync<UnsafeInput>();
        api.Commits.Should().Be(1);

        // Arrange: the owner explicitly requests a fix.
        api.Comments.Add(RuntimeFixtures.OwnerComment());
        JsonArray pending = await Feedback.PollAsync(api, 1, RuntimeFixtures.Allowlist());
        second["pending_feedback"] = pending.Copy();
        second["edits"] = new JsonArray(new JsonObject { ["path"] = RuntimeFixtures.NotePath, ["feedback_keys"] = new JsonArray(pending[0]!.Str("key")) });
        second["feedback_revision"] = new JsonObject
        {
            ["allowlist"] = new JsonArray("42:owner"),
            ["processed"] = new JsonObject { ["comment:7"] = pending[0]!["revision"]!.DeepClone() }
        };

        // Act
        await runtime.PublishAsync(second);
        StateSnapshot published = await store.ReadAsync();

        // Assert
        api.PrCreates.Should().Be(1);
        api.Commits.Should().Be(2);
        api.DraftConversions.Should().Be(1);
        api.Pr.Str("body").Should().StartWith("Owner text.").And.EndWith("Owner footer.\n");
        api.Pr.Str("body").Should().Contain("Second reviewed candidate");
        api.ForceWrites.Should().Be(0);
        published.State.Obj("export_operations").Count.Should().Be(2);
    }

    [Fact]
    public async Task Interrupted_publication_reuses_commit_and_terminal_or_legacy_operations_do_not_replay()
    {
        // Arrange
        var api = new RuntimeApi { FailPrCreateOnce = true };
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });

        // Act: publication is interrupted after its branch update.
        Func<Task> interrupted = async () => await runtime.PublishAsync(RuntimeFixtures.Request("Original", "Reviewed"));

        // Assert
        await interrupted.Should().ThrowAsync<RuntimeFailure>();
        (await store.ReadAsync()).State.Obj("pending_operation").Str("phase").Should().Be("branch_updated");

        // Act: recover the recorded operation.
        JsonObject? recovered = await runtime.RecoverPendingAsync();
        JsonObject? repeatedRecovery = await runtime.RecoverPendingAsync();

        // Assert
        recovered!.Str("status").Should().Be("awaiting_export");
        api.Commits.Should().Be(1);
        api.PrCreates.Should().Be(1);
        repeatedRecovery.Should().BeNull();

        // Arrange: a legacy operation lacks the prepared-source contract.
        JsonObject legacy = RuntimeFixtures.Request("Reviewed", "Unprepared legacy candidate");
        legacy["op_id"] = "old-operation";
        legacy["topic"] = RuntimeFixtures.Topic;
        legacy["generation"] = 1;
        legacy["branch"] = RuntimeFixtures.Branch;
        legacy["pr_number"] = 1;
        legacy["phase"] = "prepared";
        legacy.Remove("prepared_source_version");
        StateSnapshot snapshot = await store.ReadAsync();
        snapshot.State["pending_operation"] = legacy;
        await store.WriteAsync(snapshot.State, snapshot, "fixture legacy pending");

        // Act: pause unprepared legacy work.
        string legacyStatus = (await runtime.RecoverPendingAsync())!.Str("status");

        // Assert
        legacyStatus.Should().Be("prepared_source_contract_required");
        api.Commits.Should().Be(1);

        // Arrange: the owner closes the PR.
        api.Pr["state"] = "closed";

        // Act: stop terminal work without another commit.
        string terminalStatus = (await runtime.RecoverPendingAsync())!.Str("status");

        // Assert
        terminalStatus.Should().Be("pr_terminal");
        (await store.ReadAsync()).State.Obj("terminal_operations").ContainsKey("old-operation").Should().BeTrue();
        api.Commits.Should().Be(1);
    }

    [Fact]
    public async Task Source_guards_and_read_only_transport_reject_unsafe_writes_before_side_effects()
    {
        // Arrange
        string directory = Path.Combine(Path.GetTempPath(), "devbook-runtime-test-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(directory, "Vault/Home/NET"));
        string path = Path.Combine(directory, "Vault/Home/NET/Card.md");
        File.WriteAllText(path, "Owner's concurrent change");
        try
        {

            // Act: apply against a stale source version.
            Action stale = () => Runtime.ApplyGuardedSources(directory, new Dictionary<string, string> { [RuntimeFixtures.NotePath] = "Old source" }, new Dictionary<string, string> { [RuntimeFixtures.NotePath] = "Candidate" });

            // Assert
            stale.Should().Throw<Conflict>();
            File.ReadAllText(path).Should().Be("Owner's concurrent change");

            // Arrange: a read-only GitHub transport.
            var readOnly = new GhApi("owner/repo", readOnly: true);

            // Act
            Func<Task> write = async () => await readOnly.RequestAsync("POST", "/pulls", new JsonObject());

            // Assert
            await write.Should().ThrowAsync<UnsafeInput>();

            // Act: request an encoded path traversal.
            Func<Task> traversal = async () => await readOnly.RequestAsync("GET", "/contents/%252e%252e/config");

            // Assert
            await traversal.Should().ThrowAsync<UnsafeInput>();
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }
}
