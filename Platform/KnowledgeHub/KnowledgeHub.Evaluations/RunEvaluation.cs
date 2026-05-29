using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

const string ReportsFolderName = "EvaluationReports";
const string ReportFileName = "report.html";

var openBrowser = ParseOpenBrowserFlag(args);
var evaluationName = ParseEvaluationName(args) ?? "RAGSearch";
var projectDirectory = ResolveProjectDirectory();
var repoRoot = ResolveRepoRoot(projectDirectory);

Console.WriteLine($"Working directory: {projectDirectory}");

Console.WriteLine("\n=== Running Evaluation Tests ===\n");
Console.WriteLine($"Filtering evaluations by Name: {evaluationName}");

var testStopwatch = Stopwatch.StartNew();
var runStartedAtUtc = DateTime.UtcNow;
var escapedEvaluationName = evaluationName.Replace("\"", "\\\"");
var testProcess = Process.Start(new ProcessStartInfo
{
    FileName = "dotnet",
    Arguments = $"test \"{Path.Combine(projectDirectory, "KnowledgeHub.Evaluations.csproj")}\" " +
                "-c Release " +
                "-v n " +
                $"--filter \"Name~{escapedEvaluationName}\"",
    WorkingDirectory = projectDirectory,
    UseShellExecute = false,
});

testProcess?.WaitForExit();
testStopwatch.Stop();
var testExitCode = testProcess?.ExitCode ?? -1;
Console.WriteLine($"\nTests completed with exit code: {testExitCode}");
if (testExitCode != 0)
{
    Environment.Exit(testExitCode);
}

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
    Arguments = $"aieval report --path {ReportsFolderName} --output \"{reportOutputPath}\"",
    WorkingDirectory = projectDirectory,
    UseShellExecute = false,
});

reportProcess?.WaitForExit();
reportStopwatch.Stop();
var reportExitCode = reportProcess?.ExitCode ?? -1;
Console.WriteLine($"\nReport generation completed with exit code: {reportExitCode}");
if (reportExitCode != 0)
{
    Environment.Exit(reportExitCode);
}

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

var totalDuration = testStopwatch.Elapsed + reportStopwatch.Elapsed;
Console.WriteLine("\n=== Run Completed ===\n");
Console.WriteLine($"Timing breakdown: Tests {FormatDuration(testStopwatch.Elapsed)} | Report {FormatDuration(reportStopwatch.Elapsed)} | Total {FormatDuration(totalDuration)}");

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
    for (var index = 0; index < arguments.Length; index++)
    {
        var argument = arguments[index];
        if (argument.Equals("--name", StringComparison.OrdinalIgnoreCase))
        {
            return index + 1 < arguments.Length ? arguments[index + 1] : null;
        }

        if (argument.StartsWith("--name=", StringComparison.OrdinalIgnoreCase))
        {
            return argument["--name=".Length..];
        }
    }

    return null;
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

string ResolveRepoRoot(string startDirectory)
{
    var current = new DirectoryInfo(startDirectory);
    while (current is not null)
    {
        var gitPath = Path.Combine(current.FullName, ".git");
        if (Directory.Exists(gitPath) || File.Exists(gitPath))
        {
            return current.FullName;
        }

        current = current.Parent;
    }

    throw new DirectoryNotFoundException("Unable to locate repository root.");
}

void OpenReport(string reportOutputPath)
{
    try
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            Process.Start(new ProcessStartInfo { FileName = reportOutputPath, UseShellExecute = true });
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
    catch (Exception exception)
    {
        Console.WriteLine($"Could not open report automatically: {exception.Message}");
        Console.WriteLine($"Please open manually: {reportOutputPath}");
    }
}

string FormatDuration(TimeSpan duration)
    => duration.ToString(@"hh\:mm\:ss");
