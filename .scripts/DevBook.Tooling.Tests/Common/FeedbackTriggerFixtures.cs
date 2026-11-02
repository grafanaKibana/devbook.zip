using System.Text.Json.Nodes;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Tests;

internal static class FeedbackTriggerFixtures
{
    private static JsonObject Owner() => new() { ["id"] = 42, ["login"] = "owner" };

    public static JsonObject Command(RuntimeApi api)
    {
        JsonObject command = RuntimeFixtures.OwnerComment();
        command["id"] = 8;
        command["body"] = "/devbook fix";
        command["issue_url"] = $"https://api.github.com/repos/{api.Repo}/issues/1";
        api.Comments.Add(command);
        return Wire(new JsonObject
        {
            ["action"] = "created",
            ["repository"] = new JsonObject { ["full_name"] = api.Repo },
            ["sender"] = Owner(),
            ["issue"] = new JsonObject { ["number"] = 1, ["pull_request"] = new JsonObject() },
            ["comment"] = command.Copy()
        });
    }

    public static JsonObject Review(RuntimeApi api)
    {
        api.SignalRun = new JsonObject
        {
            ["id"] = 123,
            ["event"] = "pull_request_review",
            ["status"] = "completed",
            ["conclusion"] = "success",
            ["workflow_id"] = 99,
            ["repository"] = new JsonObject { ["full_name"] = api.Repo },
            ["head_repository"] = new JsonObject { ["full_name"] = api.Repo },
            ["actor"] = Owner(),
            ["triggering_actor"] = Owner(),
            ["head_branch"] = api.Pr.Obj("head").Str("ref"),
            ["pull_requests"] = new JsonArray(new JsonObject { ["number"] = 1 })
        };
        return Wire(new JsonObject
        {
            ["action"] = "completed",
            ["repository"] = new JsonObject { ["full_name"] = api.Repo },
            ["workflow_run"] = new JsonObject { ["id"] = 123 }
        });
    }

    private static JsonObject Wire(JsonObject value) => JsonNode.Parse(value.ToJsonString())!.AsObject();

    public static void AddUnpublishedFeedback(RuntimeApi api, string path)
    {
        JsonObject ReviewItem(int id, string state, string body) => new()
        {
            ["id"] = id,
            ["state"] = state,
            ["body"] = body,
            ["user"] = Owner(),
            ["submitted_at"] = "2026-11-02T11:00:00Z",
            ["paths"] = new JsonArray(path)
        };
        api.Reviews.Add(ReviewItem(20, "PENDING", "Unsubmitted request."));
        api.Reviews.Add(ReviewItem(21, "DISMISSED", "Dismissed request."));
        api.Reviews.Add(ReviewItem(22, "COMMENTED", " "));
        api.InlineComments.Add(new JsonObject
        {
            ["id"] = 23,
            ["pull_request_review_id"] = 20,
            ["body"] = "Pending inline request.",
            ["user"] = Owner(),
            ["path"] = path
        });
        JsonObject foreign = RuntimeFixtures.OwnerComment();
        foreign["id"] = 24;
        foreign.Obj("user")["id"] = 43;
        foreign["paths"] = new JsonArray(path);
        api.Comments.Add(foreign);
        Command(api);
    }
}
