namespace DevBook.Tooling.Infrastructure;

public static class Repository
{
    public static string FindRoot(string? start = null)
    {
        string initial = Path.GetFullPath(start ?? Directory.GetCurrentDirectory());
        DirectoryInfo? directory = new(File.Exists(initial) ? Path.GetDirectoryName(initial)! : initial);
        while (directory is not null)
        {
            if ((File.Exists(Path.Combine(directory.FullName, ".git"))
                || Directory.Exists(Path.Combine(directory.FullName, ".git")))
                && Directory.Exists(Path.Combine(directory.FullName, ".scripts")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Run this tool from a DevBook checkout or supply its repository root.");
    }
}
