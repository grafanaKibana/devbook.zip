using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Improvement;

public static class Pilot
{
    public static JsonObject Configure(JsonObject config, Func<string> checkoutSha, IReadOnlyDictionary<string, string>? environment = null)
    {
        string Value(string key) => environment is null ? Environment.GetEnvironmentVariable(key) ?? "" : environment.GetValueOrDefault(key) ?? "";
        if (Value("DEVBOOK_IMPROVEMENT_PILOT") != "true")
        {
            return config;
        }

        const string repository = "grafanaKibana/devbook.zip";
        const string branch = "feature/devbook-improvement-setup";
        var required = new Dictionary<string, string>
        {
            ["GITHUB_REPOSITORY"] = repository,
            ["GITHUB_EVENT_NAME"] = "workflow_dispatch",
            ["GITHUB_REF"] = "refs/heads/" + branch,
            ["GITHUB_WORKFLOW_REF"] = repository + "/.github/workflows/devbook-improvement.yml@refs/heads/" + branch,
            ["GITHUB_ACTOR"] = "grafanaKibana",
            ["GITHUB_ACTOR_ID"] = "45916288",
            ["GITHUB_TRIGGERING_ACTOR"] = "grafanaKibana",
            ["DEVBOOK_IMPROVEMENT_PRODUCTION_ACTIVATED"] = "false",
            ["DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED"] = "false"
        };
        string[] missing = required.Where(item => Value(item.Key) != item.Value).Select(item => item.Key).ToArray();
        if (config.Str("repo") != repository || missing.Length != 0)
        {
            throw new ProductionGate("PR181 pilot requires the owner-dispatched branch workflow with production and scheduling disabled: " + string.Join(", ", missing));
        }

        string expectedSha = Value("DEVBOOK_IMPROVEMENT_PILOT_SHA");
        if (!Regex.IsMatch(expectedSha, "^[0-9a-f]{40}$", RegexOptions.CultureInvariant)
            || Value("GITHUB_SHA") != expectedSha || checkoutSha() != expectedSha)
        {
            throw new ProductionGate("PR181 pilot must use the explicitly authorized workflow and checkout SHA.");
        }

        JsonObject pilot = config.Copy();
        pilot["base_branch"] = branch;
        pilot["state_branch"] = "maintenance/devbook-improvement-pr181-test-state";
        pilot["initial_generation"] = 1_810_001;
        pilot["max_notes_per_run"] = 2;
        pilot["max_pr_notes"] = 2;
        pilot["max_open_prs"] = 1;
        return pilot;
    }
}
