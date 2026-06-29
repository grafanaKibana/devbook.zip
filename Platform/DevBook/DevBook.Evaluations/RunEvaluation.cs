using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

#region Variables

const string ReportsFolderName = "EvaluationReports";
const string ReportFileName = "report.html";

var openBrowser = ParseOpenBrowserFlag(args);
var useMiniDatasets = ParseMiniFlag(args);
var evaluationName = ParseEvaluationName(args) ?? "RAG.Search";
var projectDirectory = ResolveProjectDirectory();

#endregion

#region Helpers

bool ParseOpenBrowserFlag(string[] arguments)
{
    foreach (var arg in arguments)
    {
        if (arg.Equals("--open-browser", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (arg.StartsWith("--open-browser=", StringComparison.OrdinalIgnoreCase))
        {
            var value = arg["--open-browser=".Length..];
            return !value.Equals("false", StringComparison.OrdinalIgnoreCase);
        }
    }

    return false;
}

bool ParseMiniFlag(string[] arguments)
{
    foreach (var arg in arguments)
    {
        if (arg.Equals("--mini", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (arg.StartsWith("--mini=", StringComparison.OrdinalIgnoreCase))
        {
            var value = arg["--mini=".Length..];
            return !value.Equals("false", StringComparison.OrdinalIgnoreCase);
        }
    }

    return false;
}

string? ParseEvaluationName(string[] arguments)
{
    for (var i = 0; i < arguments.Length; i++)
    {
        var arg = arguments[i];

        if (arg.Equals("--name", StringComparison.OrdinalIgnoreCase))
        {
            return i + 1 < arguments.Length ? arguments[i + 1] : null;
        }

        if (arg.StartsWith("--name=", StringComparison.OrdinalIgnoreCase))
        {
            return arg["--name=".Length..];
        }
    }

    return null;
}


// Builds the `dotnet test --filter` expression for the requested evaluation. `all` runs every
// evaluation scenario (they all carry [Category("LLMCalls")]) into a single run folder so one report
// covers them; otherwise a single scenario is selected by test name.
string ResolveEvaluationTestFilter(string evaluationName)
{
    if (evaluationName.Equals("all", StringComparison.OrdinalIgnoreCase))
    {
        return "Category=LLMCalls";
    }

    var testName = evaluationName.Equals("RAG.Search", StringComparison.OrdinalIgnoreCase)
        ? "SearchOver"
        : evaluationName;
    return $"Name~{testName.Replace("\"", "\\\"")}";
}

string ResolveProjectDirectory([CallerFilePath] string scriptPath = "")
{
    var scriptDirectory = Path.GetDirectoryName(scriptPath);
    if (!string.IsNullOrWhiteSpace(scriptDirectory) && File.Exists(Path.Combine(scriptDirectory, "DevBook.Evaluations.csproj")))
    {
        return scriptDirectory;
    }

    var fromCurrentDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Platform", "DevBook", "DevBook.Evaluations");
    if (File.Exists(Path.Combine(fromCurrentDirectory, "DevBook.Evaluations.csproj")))
    {
        return fromCurrentDirectory;
    }

    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (current is not null)
    {
        if (File.Exists(Path.Combine(current.FullName, "DevBook.Evaluations.csproj")))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    throw new DirectoryNotFoundException("Unable to locate DevBook.Evaluations.csproj.");
}

void OpenReport(string reportOutputPath)
{
    try
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = reportOutputPath,
                UseShellExecute = true
            });
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            Process.Start("open", reportOutputPath);
        }
        else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            Process.Start("xdg-open", reportOutputPath);
        }

        Console.WriteLine("Report opened in default browser.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Could not open report automatically: {ex.Message}");
        Console.WriteLine($"Please open manually: {reportOutputPath}");
    }
}

string FormatDuration(TimeSpan duration)
{
    return duration.ToString(@"hh\:mm\:ss");
}

#endregion

Console.WriteLine($"Working directory: {projectDirectory}");

#region Step 1: Run evaluation tests

Console.WriteLine("\n=== Running Evaluation Tests ===\n");
var testFilterExpression = ResolveEvaluationTestFilter(evaluationName);
Console.WriteLine($"Filtering evaluations by: {evaluationName} (test filter: {testFilterExpression})");
Console.WriteLine($"Dataset mode: {(useMiniDatasets ? "mini (falls back to full where a mini dataset is absent)" : "full")}");

var testStopwatch = Stopwatch.StartNew();
var runStartedAtUtc = DateTime.UtcNow;
var testFilterArgs = $" --filter \"{testFilterExpression}\"";

var testStartInfo = new ProcessStartInfo
{
    FileName = "dotnet",
    Arguments = $"test \"{Path.Combine(projectDirectory, "DevBook.Evaluations.csproj")}\" " +
                "-c Release " +
                "-v n " +
                testFilterArgs,
    WorkingDirectory = projectDirectory,
    UseShellExecute = false,
    RedirectStandardOutput = false,
    RedirectStandardError = false
};

// Steer the scenarios to the mini datasets via the environment (inherited by the test process).
// Each scenario prefers its "-mini" dataset and falls back to the full file when the mini one is absent.
if (useMiniDatasets)
{
    testStartInfo.Environment["EVAL_DATASET"] = "mini";
}

var testProcess = Process.Start(testStartInfo);

testProcess?.WaitForExit();
testStopwatch.Stop();
var testDuration = testStopwatch.Elapsed;
var testExitCode = testProcess?.ExitCode ?? -1;
Console.WriteLine($"\nTests completed with exit code: {testExitCode}");
if (testExitCode != 0)
{
    Environment.Exit(testExitCode);
}

#endregion

#region Step 2: Generate the report

Console.WriteLine("\n=== Generating Evaluation Report ===\n");

var resultsDir = Path.Combine(projectDirectory, ReportsFolderName, "results");
var latestRunFolder = Directory.Exists(resultsDir)
    ? Directory.GetDirectories(resultsDir)
        .Where(directory => Directory.GetLastWriteTimeUtc(directory) >= runStartedAtUtc.AddSeconds(-1))
        .OrderByDescending(Directory.GetLastWriteTimeUtc)
        .FirstOrDefault()
    : null;

if (latestRunFolder is null)
{
    Console.Error.WriteLine("No evaluation run folder was created by this run. Check that the selected evaluation was not skipped and required configuration is set.");
    Environment.Exit(1);
}

Console.WriteLine($"Latest run folder: {latestRunFolder}");

var reportOutputPath = Path.Combine(latestRunFolder, ReportFileName);
var reportStopwatch = Stopwatch.StartNew();
var reportProcess = Process.Start(new ProcessStartInfo
{
    FileName = "dotnet",
    Arguments = "aieval report " +
                $"--path {ReportsFolderName} " +
                $"--output \"{reportOutputPath}\"",
    WorkingDirectory = projectDirectory,
    UseShellExecute = false,
    RedirectStandardOutput = false,
    RedirectStandardError = false
});

reportProcess?.WaitForExit();
reportStopwatch.Stop();
var reportDuration = reportStopwatch.Elapsed;
var reportExitCode = reportProcess?.ExitCode ?? -1;
Console.WriteLine($"\nReport generation completed with exit code: {reportExitCode}");
if (reportExitCode != 0)
{
    Environment.Exit(reportExitCode);
}

#endregion

#region Step 2b: Generate the fancy report (additive)

// Additive only: this never replaces the `dotnet aieval report` step above. It
// always runs the read-only RunReport.cs tool to also emit report.fancy.html
// alongside the unchanged report.html. Failures here are non-fatal — the run has
// already produced the standard report.
Console.WriteLine("\n=== Generating Fancy Report (additive) ===\n");
Console.WriteLine("(compiling the file-based report tool if needed — the first run after a change can take a moment)\n");
var fancyScriptPath = Path.Combine(projectDirectory, "RunReport.cs");

// RunReport.cs is a file-based app (excluded from the project's compile). Two constraints decide the
// working directory:
//   1. It must NOT be projectDirectory (which contains DevBook.Evaluations.csproj): `dotnet run` would
//      launch the PROJECT — whose entry point is this very script — and re-run the whole evaluation.
//   2. It must NOT be a volatile dir like the system temp: from there the file-based restore can't reuse
//      the repo's build/NuGet context and does a cold ~90s restore on every run (observed).
// The repo root satisfies both — it is project-free here AND is exactly where the IDE launch profiles
// run the tool (fast). RunReport.cs self-locates via [CallerFilePath] and takes an absolute --run folder,
// so it does not otherwise depend on the working directory.
var repoRoot = Path.GetFullPath(Path.Combine(projectDirectory, "..", "..", ".."));
var fancyProcess = Process.Start(new ProcessStartInfo
{
    FileName = "dotnet",
    Arguments = $"run \"{fancyScriptPath}\" -- --run \"{latestRunFolder}\"",
    WorkingDirectory = repoRoot,
    UseShellExecute = false,
    RedirectStandardOutput = false,
    RedirectStandardError = false
});

fancyProcess?.WaitForExit();
var fancyExitCode = fancyProcess?.ExitCode ?? -1;
if (fancyExitCode != 0)
{
    Console.Error.WriteLine($"Fancy report generation returned exit code {fancyExitCode} (non-fatal; report.html is unaffected).");
}

#endregion

#region Step 3: Open Report in Browser

// Prefer opening the fancy report (the richer view); fall back to the standard report.html if the
// additive fancy step did not produce one.
var fancyReportPath = Path.Combine(latestRunFolder, "report.fancy.html");
var reportToOpen = File.Exists(fancyReportPath) ? fancyReportPath : reportOutputPath;

if (openBrowser && File.Exists(reportToOpen))
{
    Console.WriteLine($"\n=== Opening Report: {reportToOpen} ===\n");
    OpenReport(reportToOpen);
}
else if (File.Exists(reportOutputPath))
{
    Console.WriteLine($"\nReports generated in: {latestRunFolder}");
}
else
{
    Console.Error.WriteLine($"Report file not found at {reportOutputPath}");
    Environment.Exit(1);
}

#endregion

var totalDuration = testDuration + reportDuration;
Console.WriteLine("\n=== Run Completed ===\n");
Console.WriteLine(
    "Timing breakdown: " +
    $"Tests {FormatDuration(testDuration)} | " +
    $"Report {FormatDuration(reportDuration)} | " +
    $"Total {FormatDuration(totalDuration)}");

Environment.Exit(testExitCode);
