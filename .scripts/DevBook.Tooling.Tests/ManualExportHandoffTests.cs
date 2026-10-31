using System.Text.Json.Nodes;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using FluentAssertions;
using Xunit;

namespace DevBook.Tooling.Tests;

public sealed class ManualExportHandoffTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ManualExportRetainsFrozenRecoveryWithoutAutomaticWorkflowRequest(bool recovery)
    {
        // Arrange
        var api = new RuntimeApi { FailPrCreateOnce = recovery };
        var store = new MemoryStateStore(Core.NewState());
        await new DurableLease(store, "fixture").AcquireAsync();
        var runtime = new GitHubRuntime(api, store, leaseOwner: "fixture", activation: () => { });
        JsonObject request = RuntimeFixtures.Request("Original", "Reviewed source");
        request["automatic_export"] = false;
        if (recovery)
        {
            // Act: interrupt source publication after its branch update.
            Func<Task> interrupted = () => runtime.PublishAsync(request);

            // Assert
            await interrupted.Should().ThrowAsync<RuntimeFailure>();
        }

        // Act: publish normally or resume the saved operation.
        JsonObject result = recovery
            ? (await runtime.RecoverPendingAsync())!
            : await runtime.PublishAsync(request);
        StateSnapshot saved = await store.ReadAsync();
        JsonObject operation = saved.State.Obj("export_operations").Single().Value!.AsObject();
        JsonObject pr = saved.State.Obj("prs").Single().Value!.AsObject();

        // Assert
        result.Str("status").Should().Be("awaiting_export");
        result.Bool("automatic_export").Should().BeFalse();
        result.ContainsKey("export_request").Should().BeFalse();
        saved.State["pending_operation"].Should().BeNull();
        operation.Obj("candidate").Str(RuntimeFixtures.NotePath).Should().Be("Reviewed source");
        operation.Obj("evidence").Obj("export_request").Str("expected_head").Should().Be(api.Head);
        operation.Obj("evidence").Int("export_attempts").Should().Be(0);
        operation.Obj("evidence")["export_last_dispatch_at"].Should().BeNull();
        pr.Bool("frozen").Should().BeTrue();
        pr.Bool("automatic_export").Should().BeFalse();
        api.PrCreates.Should().Be(1);
    }
}
