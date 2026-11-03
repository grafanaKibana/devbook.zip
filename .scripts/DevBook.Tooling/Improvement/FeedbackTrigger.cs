using System.Globalization;
using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class FeedbackTrigger
{
    public const string SignalWorkflowPath = ".github/workflows/devbook-improvement-feedback.yml";

    public static async Task<JsonObject> ResolveAsync(JsonObject config, string eventName, JsonObject payload,
        IGitHubApi api, CancellationToken cancellationToken = default)
    {
        JsonObject Ignored() => new() { ["status"] = "feedback_ignored", ["feedback_pr"] = 0 };
        string repo = config.Str("repo");
        if (api.Repo != repo || payload.Obj("repository").Str("full_name") != repo)
        {
            return Ignored();
        }

        try
        {
            long number;
            string branch = "";
            JsonArray owners = config.Arr("owner_allowlist");
            if (eventName == "issue_comment")
            {
                JsonObject comment = payload.Obj("comment");
                number = PositiveId(payload.Obj("issue")["number"]);
                long commentId = PositiveId(comment["id"]);
                if (payload.Str("action") is not ("created" or "edited") || payload.Obj("issue")["pull_request"] is not JsonObject
                    || number == 0 || commentId == 0 || !Feedback.IsOwner(payload.Obj("sender"), owners)
                    || !Feedback.IsOwner(comment.Obj("user"), owners) || comment.Str("body").Trim() != Feedback.FixCommand)
                {
                    return Ignored();
                }
                JsonObject current = await Runtime.ObjectAsync(api, "GET", $"/issues/comments/{commentId}", cancellationToken: cancellationToken);
                if (PositiveId(current["id"]) != commentId || !Feedback.IsOwner(current.Obj("user"), owners)
                    || current.Str("body").Trim() != Feedback.FixCommand || current.Str("body") != comment.Str("body")
                    || comment.Str("updated_at").Length == 0 || current.Str("updated_at") != comment.Str("updated_at")
                    || current.Str("issue_url") != $"https://api.github.com/repos/{repo}/issues/{number}")
                {
                    return Ignored();
                }
            }
            else if (eventName == "workflow_run")
            {
                long runId = PositiveId(payload.Obj("workflow_run")["id"]);
                if (payload.Str("action") != "completed" || runId == 0)
                {
                    return Ignored();
                }
                JsonObject run = await Runtime.ObjectAsync(api, "GET", $"/actions/runs/{runId}", cancellationToken: cancellationToken);
                JsonObject workflow = await Runtime.ObjectAsync(api, "GET", "/actions/workflows/devbook-improvement-feedback.yml", cancellationToken: cancellationToken);
                if (PositiveId(run["id"]) != runId || run.Str("event") != "pull_request_review"
                    || run.Str("status") != "completed" || run.Str("conclusion") != "success"
                    || PositiveId(workflow["id"]) == 0 || PositiveId(run["workflow_id"]) != PositiveId(workflow["id"])
                    || workflow.Str("path") != SignalWorkflowPath || run.Obj("repository").Str("full_name") != repo
                    || run.Obj("head_repository").Str("full_name") != repo || !Feedback.IsOwner(run.Obj("actor"), owners)
                    || !Feedback.IsOwner(run.Obj("triggering_actor"), owners) || run.Arr("pull_requests").Count != 1)
                {
                    return Ignored();
                }
                number = PositiveId(run.Arr("pull_requests")[0]?["number"]);
                branch = run.Str("head_branch");
                if (number == 0 || branch.Length == 0)
                {
                    return Ignored();
                }
            }
            else
            {
                return Ignored();
            }

            if (number > int.MaxValue)
            {
                return Ignored();
            }
            JsonObject pr = await Runtime.ObjectAsync(api, "GET", $"/pulls/{number}", cancellationToken: cancellationToken);
            (string Topic, int Generation)? marker = Runtime.ParseMarker(pr.Str("body"));
            if (PositiveId(pr["number"]) != number || Runtime.Lifecycle(pr) != "open" || marker is null
                || !Runtime.ValidPrIdentity(pr, repo, config.Str("base_branch", "main"), marker.Value.Topic, marker.Value.Generation)
                || branch.Length != 0 && pr.Obj("head").Str("ref") != branch)
            {
                return Ignored();
            }
            JsonArray feedback = await Feedback.PollAsync(api, (int)number, owners, cancellationToken);
            return feedback.OfType<JsonObject>().Any(item => !string.IsNullOrWhiteSpace(item.Str("body")))
                ? new JsonObject { ["status"] = "feedback_ready", ["feedback_pr"] = (int)number }
                : Ignored();
        }
        catch (GitHubApiFailure error) when (error.Status == 404)
        {
            return Ignored();
        }
    }

    private static long PositiveId(JsonNode? node) => node is JsonValue value && value.GetValueKind() == System.Text.Json.JsonValueKind.Number
        && long.TryParse(value.ToJsonString(), NumberStyles.None, CultureInfo.InvariantCulture, out long id) && id > 0 ? id : 0;
}
