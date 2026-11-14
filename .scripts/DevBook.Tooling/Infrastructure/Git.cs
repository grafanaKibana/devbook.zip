namespace DevBook.Tooling.Infrastructure;

public static class Git
{
    public static byte[] Run(string root, params string[] arguments) =>
        RunAsync(new ProcessRequest("git", arguments, root))
            .GetAwaiter().GetResult().EnsureSuccess("Git").Output;

    public static async Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken = default)
    {
        var environment = request.Environment is null ? new Dictionary<string, string>(StringComparer.Ordinal)
            : new Dictionary<string, string>(request.Environment, StringComparer.Ordinal);
        environment["GIT_OPTIONAL_LOCKS"] = "0";
        var effective = request with { Environment = environment };
        int command = 0;
        while (command < request.Arguments.Count && request.Arguments[command].StartsWith('-'))
        {
            command += request.Arguments[command] is "-c" or "-C" or "--git-dir" or "--work-tree" ? 2 : 1;
        }
        if (command >= request.Arguments.Count || request.Arguments[command] != "diff")
            return await new SystemProcessRunner().RunAsync(effective, cancellationToken).ConfigureAwait(false);

        string temporary = Path.Combine(Path.GetTempPath(), "devbook-git-index-" + Guid.NewGuid().ToString("N"));
        if (OperatingSystem.IsWindows()) Directory.CreateDirectory(temporary);
        else Directory.CreateDirectory(temporary, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        var elapsed = System.Diagnostics.Stopwatch.StartNew();
        TimeSpan budget = request.Timeout ?? TimeSpan.FromMinutes(1);
        try
        {
            string[] prefix = request.Arguments.Take(command).ToArray();
            ProcessResult located = await new SystemProcessRunner().RunAsync(effective with
            {
                Arguments = [.. prefix, "rev-parse", "--git-path", "index"], Timeout = Remaining()
            }, cancellationToken).ConfigureAwait(false);
            located.EnsureSuccess("Locate effective Git index");
            string source = Path.GetFullPath(located.Stdout.TrimEnd('\r', '\n'), request.WorkingDirectory);
            string index = Path.Combine(temporary, "index");
            if (File.Exists(source)) File.Copy(source, index);
            environment["GIT_INDEX_FILE"] = index;
            return await new SystemProcessRunner().RunAsync(effective with
            {
                Arguments = [.. prefix, "-c", "diff.autoRefreshIndex=true", .. request.Arguments.Skip(command)],
                Timeout = Remaining()
            }, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            Directory.Delete(temporary, true);
        }

        TimeSpan Remaining() => budget > elapsed.Elapsed ? budget - elapsed.Elapsed
            : throw new TimeoutException("Git index inspection exceeded its execution deadline.");
    }

    public static string Text(string root, params string[] arguments) =>
        System.Text.Encoding.UTF8.GetString(Run(root, arguments)).TrimEnd('\r', '\n');

    public static string[] Paths(string root, params string[] arguments) =>
        System.Text.Encoding.UTF8.GetString(Run(root, arguments)).Split('\0', StringSplitOptions.RemoveEmptyEntries);
}
