using DevBook.Tooling.Export;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Vault;

/// <summary>Runs guarded source maintenance without requiring a desktop export.</summary>
public static class CommitPreparation
{
    public static async Task<int> RunAsync(string[] args)
    {
        try
        {
            string? root = null;
            string? hook = null;
            for (var index = 0; index < args.Length; index += 2)
            {
                if (index + 1 >= args.Length)
                {
                    throw new ArgumentException("Expected --repo-root and --hook values.");
                }
                switch (args[index])
                {
                    case "--repo-root": root = args[index + 1]; break;
                    case "--hook": hook = args[index + 1]; break;
                    default: throw new ArgumentException("Unknown source commit argument.");
                }
            }
            root = Repository.FindRoot(root);
            var context = new SyncerContext(root);
            if (Syncer.StagedSource(context).Length == 0)
            {
                return 0;
            }
            if (hook is null || Path.GetFullPath(hook) != Path.Combine(root, ".githooks", "pre-commit"))
            {
                throw new ArgumentException("Source maintenance requires this checkout's pre-commit hook.");
            }
            using FileStream sourceLock = Syncer.AcquireLock(context);
            Syncer.GuardSource(context);
            await Syncer.RunMaintenanceHookAsync(context, hook);
            Syncer.GuardSource(context);
            NoteDates.PrepareLocal(root, expectedHashes: Syncer.Snapshot(root));
            Syncer.GuardSource(context);
            Console.WriteLine("[pre-commit] Source maintenance verified; web export runs in CI.");
            return 0;
        }
        catch (Exception error) when (error is IOException or InvalidOperationException or ArgumentException)
        {
            Console.Error.WriteLine("[pre-commit] " + error.Message);
            return 1;
        }
    }
}
