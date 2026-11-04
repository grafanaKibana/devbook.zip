using System.Text.Json.Nodes;
using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public sealed partial class GitHubRuntime
{
    public async Task CheckStackReadyAsync(CancellationToken cancellationToken = default) =>
        _ = await StackParentAsync(cancellationToken);

    private async Task<JsonObject> StackParentAsync(CancellationToken cancellationToken)
    {
        JsonObject[] managed = (await OpenPrsAsync(cancellationToken)).OfType<JsonObject>().Where(pr =>
        {
            var marker = Runtime.ParseMarker(pr.Str("body"));
            return marker is not null && Runtime.ValidPrIdentity(pr, api.Repo, baseBranch, marker.Value.Topic, marker.Value.Generation);
        }).ToArray();
        if (managed.Length == 0) return new JsonObject { ["publication_base_branch"] = baseBranch };

        // Existing parallel PRs require an explicit migration; never pick an arbitrary winner.
        JsonObject[] roots = managed.Where(pr => pr.Obj("base").Str("ref") == baseBranch).ToArray();
        if (roots.Length != 1) throw new Conflict("Managed improvement PRs do not form one stack; reconcile their branches before publication.");
        JsonObject tip = roots[0];
        var visited = new HashSet<int> { tip.Int("number") };
        while (true)
        {
            JsonObject[] children = managed.Where(pr => pr.Obj("base").Str("ref") == tip.Obj("head").Str("ref")).ToArray();
            if (children.Length == 0) break;
            if (children.Length != 1 || !visited.Add(children[0].Int("number"))) throw new Conflict("Managed improvement stack is ambiguous.");
            JsonObject child = children[0];
            string parentHead = tip.Obj("head").Str("sha");
            string childHead = child.Obj("head").Str("sha");
            JsonObject ancestry = await Runtime.ObjectAsync(api, "GET", $"/compare/{parentHead}...{childHead}", cancellationToken: cancellationToken);
            if (ancestry.Obj("merge_base_commit").Str("sha") != parentHead)
                throw new Conflict("A lower stack layer changed; rebase the stack and verify its exports before appending another topic.");
            tip = child;
        }
        if (visited.Count != managed.Length) throw new Conflict("Managed improvement stack has disconnected branches.");
        tip = await Runtime.ObjectAsync(api, "GET", $"/pulls/{tip.Int("number")}", cancellationToken: cancellationToken);
        var identity = Runtime.ParseMarker(tip.Str("body"));
        if (identity is null || Runtime.Lifecycle(tip) != "open"
            || !Runtime.ValidPrIdentity(tip, api.Repo, baseBranch, identity.Value.Topic, identity.Value.Generation)
            || tip["mergeable"] is not JsonValue value || !value.TryGetValue(out bool mergeable) || !mergeable)
        {
            throw new Conflict("Stack tip is terminal, conflicted or still being evaluated by GitHub; retry after it is ready.");
        }
        string head = tip.Obj("head").Str("sha");
        if (await RefShaAsync(tip.Obj("head").Str("ref"), cancellationToken) != head)
            throw new Conflict("Stack tip changed during selection.");
        string rootSha = await RefShaAsync(baseBranch, cancellationToken);
        JsonObject comparison = await Runtime.ObjectAsync(api, "GET", $"/compare/{rootSha}...{head}", cancellationToken: cancellationToken);
        if (comparison.Obj("merge_base_commit").Str("sha") != rootSha)
            throw new Conflict("Stack tip must include the current trusted base before another topic is appended.");
        RemoteExportReceipt receipt = await Receipt.RemoteAsync(api, head, cancellationToken);
        if (!receipt.SourcesCurrent) throw new Conflict("Stack tip requires a genuine export before another topic can be appended.");
        JsonObject checks = await Runtime.RequiredChecksForShaAsync(api, head, requiredChecks.Append("validate").Distinct(), cancellationToken);
        if (checks.Count == 0 || checks.Any(item => item.Value?.GetValue<string>() != "success"))
            throw new Conflict("Stack tip exact-head validation has not passed.");
        return new JsonObject
        {
            ["publication_base_branch"] = tip.Obj("head").Str("ref"),
            ["publication_base_sha"] = head,
            ["stack_parent_pr"] = tip.Int("number")
        };
    }

    private async Task RequireStackParentAsync(JsonObject operation, CancellationToken cancellationToken)
    {
        if (operation.Int("stack_parent_pr") < 1) return;
        JsonObject parent = await Runtime.ObjectAsync(api, "GET", $"/pulls/{operation.Int("stack_parent_pr")}", cancellationToken: cancellationToken);
        var marker = Runtime.ParseMarker(parent.Str("body"));
        if (marker is null || Runtime.Lifecycle(parent) != "open"
            || !Runtime.ValidPrIdentity(parent, api.Repo, baseBranch, marker.Value.Topic, marker.Value.Generation)
            || parent.Obj("head").Str("ref") != operation.Str("publication_base_branch")
            || parent.Obj("head").Str("sha") != operation.Str("publication_base_sha")
            || await RefShaAsync(operation.Str("publication_base_branch"), cancellationToken) != operation.Str("publication_base_sha"))
        {
            await ArchivePendingAsync(operation.Str("op_id"), "invalidated_operations", new JsonObject
            {
                ["reason"] = "Stack parent changed before publication; candidate retained for reconciliation.",
                ["expected_parent_head"] = operation["publication_base_sha"]?.DeepClone(),
                ["observed_parent_head"] = parent.Obj("head")["sha"]?.DeepClone(),
                ["stack_parent_pr"] = operation.Int("stack_parent_pr")
            }, pauseTopic: true, cancellationToken: cancellationToken);
            throw new Conflict("Stack parent changed before publication; candidate retained and affected topic paused.");
        }
    }

    private async Task<JsonObject> EnsureStackAsync(JsonObject pr, JsonObject operation, CancellationToken cancellationToken)
    {
        int parentNumber = operation.Int("stack_parent_pr");
        if (parentNumber < 1 || Runtime.Lifecycle(pr) != "open") return pr;
        JsonObject parent = await Runtime.ObjectAsync(api, "GET", $"/pulls/{parentNumber}", cancellationToken: cancellationToken);
        int stackNumber = parent.Obj("stack").Int("number");
        if (pr.Obj("stack").Int("number") > 0)
        {
            if (stackNumber != pr.Obj("stack").Int("number")
                || !Runtime.ValidPrIdentity(pr, api.Repo, baseBranch, operation.Str("topic"), operation.Int("generation")))
                throw new Conflict("PR belongs to an unexpected native GitHub stack.");
            // A merged parent can legitimately retarget and rebase this layer. Recovery
            // checks the current branch head before allowing any further write.
            return pr;
        }
        if (!Runtime.ValidPrIdentity(pr, api.Repo, operation.Str("publication_base_branch"), operation.Str("topic"), operation.Int("generation")))
            throw new Conflict("Pending stack layer changed its machine identity or parent branch.");
        await RequireStackParentAsync(operation, cancellationToken);
        await AssertLeaseAsync(cancellationToken);
        await api.RequestAsync("POST", stackNumber > 0 ? $"/stacks/{stackNumber}/add" : "/stacks", new JsonObject
        {
            ["pull_requests"] = stackNumber > 0 ? new JsonArray(pr.Int("number")) : new JsonArray(parentNumber, pr.Int("number"))
        }, cancellationToken: cancellationToken);
        JsonObject updated = await Runtime.ObjectAsync(api, "GET", $"/pulls/{pr.Int("number")}", cancellationToken: cancellationToken);
        parent = await Runtime.ObjectAsync(api, "GET", $"/pulls/{parentNumber}", cancellationToken: cancellationToken);
        if (updated.Obj("stack").Int("number") < 1 || updated.Obj("stack").Int("number") != parent.Obj("stack").Int("number")
            || !Runtime.ValidPrIdentity(updated, api.Repo, baseBranch, operation.Str("topic"), operation.Int("generation")))
            throw new Conflict("Native GitHub stack registration is not yet confirmed; preserve publication for replay.");
        return updated;
    }
}
