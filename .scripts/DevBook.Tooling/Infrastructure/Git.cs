namespace DevBook.Tooling.Infrastructure;

public static class Git
{
    public static byte[] Run(string root, params string[] arguments) =>
        new SystemProcessRunner().RunAsync(new ProcessRequest("git", arguments, root))
            .GetAwaiter().GetResult().EnsureSuccess("Git").Output;

    public static string Text(string root, params string[] arguments) =>
        System.Text.Encoding.UTF8.GetString(Run(root, arguments)).TrimEnd('\r', '\n');

    public static string[] Paths(string root, params string[] arguments) =>
        System.Text.Encoding.UTF8.GetString(Run(root, arguments)).Split('\0', StringSplitOptions.RemoveEmptyEntries);
}
