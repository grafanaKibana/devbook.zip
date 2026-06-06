using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

#region Variables

const string ReportsFolderName = "EvaluationReports";
const string ReportFileName = "report.html";

var openBrowser = ParseOpenBrowserFlag(args);
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


string ResolveEvaluationTestFilter(string evaluationName)
{
    return evaluationName.Equals("RAG.Search", StringComparison.OrdinalIgnoreCase)
        ? "SearchOverRerankedChunks"
        : evaluationName;
}

string ResolveProjectDirectory([CallerFilePath] string scriptPath = "")
{
    var scriptDirectory = Path.GetDirectoryName(scriptPath);
    if (!string.IsNullOrWhiteSpace(scriptDirectory) && File.Exists(Path.Combine(scriptDirectory, "KnowledgeHub.Evaluations.csproj")))
    {
        return scriptDirectory;
    }

    var fromCurrentDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Platform", "KnowledgeHub", "KnowledgeHub.Evaluations");
    if (File.Exists(Path.Combine(fromCurrentDirectory, "KnowledgeHub.Evaluations.csproj")))
    {
        return fromCurrentDirectory;
    }

    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (current is not null)
    {
        if (File.Exists(Path.Combine(current.FullName, "KnowledgeHub.Evaluations.csproj")))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    throw new DirectoryNotFoundException("Unable to locate KnowledgeHub.Evaluations.csproj.");
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
var testFilterName = ResolveEvaluationTestFilter(evaluationName);
Console.WriteLine($"Filtering evaluations by Name: {evaluationName} (test filter: {testFilterName})");

var testStopwatch = Stopwatch.StartNew();
var runStartedAtUtc = DateTime.UtcNow;
var escapedEvaluationName = testFilterName.Replace("\"", "\\\"");
var testFilterArgs = $" --filter \"Name~{escapedEvaluationName}\"";

var testProcess = Process.Start(new ProcessStartInfo
{
    FileName = "dotnet",
    Arguments = $"test \"{Path.Combine(projectDirectory, "KnowledgeHub.Evaluations.csproj")}\" " +
                "-c Release " +
                "-v n " +
                testFilterArgs,
    WorkingDirectory = projectDirectory,
    UseShellExecute = false,
    RedirectStandardOutput = false,
    RedirectStandardError = false
});

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

#region Step 3: Open Report in Browser

if (openBrowser && File.Exists(reportOutputPath))
{
    Console.WriteLine($"\n=== Opening Report: {reportOutputPath} ===\n");
    OpenReport(reportOutputPath);
}
else if (File.Exists(reportOutputPath))
{
    Console.WriteLine($"\nReport generated at: {reportOutputPath}");
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
