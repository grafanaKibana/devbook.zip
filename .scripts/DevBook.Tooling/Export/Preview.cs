using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Improvement;
using DevBook.Tooling.Infrastructure;
using DevBook.Tooling.Vault;

namespace DevBook.Tooling.Export;

public static class Preview
{
    public static Dictionary<string, byte[]> ReadSources(string root)
    {
        var result = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach (string path in Syncer.Snapshot(root).Keys)
        {
            Syncer.EnsureRegularPath(root, path);
            result.Add(path, File.ReadAllBytes(Path.Combine(root, path)));
        }
        return result;
    }

    public static Dictionary<string, byte[]> PublicationChanges(string root, IReadOnlyDictionary<string, byte[]> source, DateTimeOffset instant)
    {
        string[] keys = NoteDates.PublicationKeys(root);
        var changes = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach ((string path, byte[] bytes) in source)
        {
            if (!path.StartsWith("Vault/Home/", StringComparison.Ordinal) || !path.EndsWith(".md", StringComparison.OrdinalIgnoreCase)
                || !NoteDates.IsPublished(bytes) || NoteDates.Published(bytes, keys) is not null) continue;
            string text = new UTF8Encoding(false, true).GetString(bytes);
            Match opening = Regex.Match(text, @"\A\uFEFF?---\r?\n", RegexOptions.CultureInvariant);
            if (!opening.Success) throw new UnsafeInput("First publication requires valid source frontmatter.");
            string newline = opening.Value.EndsWith("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
            changes[path] = new UTF8Encoding(false).GetBytes(text.Insert(opening.Length, $"published: \"{NoteDates.Format(instant)}\"{newline}"));
        }
        return changes;
    }

    public static async Task WritePublicationsAsync(string root, IReadOnlyDictionary<string, byte[]> expected,
        IReadOnlyDictionary<string, byte[]> changes,
        Func<IReadOnlyList<string>, CancellationToken, Task<string>>? command = null, CancellationToken cancellationToken = default)
    {
        AssertSources(root, expected);
        var context = new SyncerContext(root, command, timeout: TimeSpan.FromSeconds(60));
        foreach ((string path, byte[] bytes) in changes)
        {
            Syncer.EnsureRegularPath(root, path);
            if (!expected.TryGetValue(path, out byte[]? original))
                throw new UnsafeInput("First-publication metadata lacks its verified source snapshot.");
            string publication = NoteDates.Published(bytes) ?? throw new UnsafeInput("First-publication metadata is missing its date.");
            Dictionary<string, byte[]> permitted = PublicationChanges(root, new Dictionary<string, byte[]> { [path] = original },
                DateTimeOffset.Parse(publication, System.Globalization.CultureInfo.InvariantCulture));
            if (!permitted.TryGetValue(path, out byte[]? safe) || !safe.AsSpan().SequenceEqual(bytes))
                throw new UnsafeInput("Preview may write only missing first-publication metadata.");
            var request = new JsonObject
            {
                ["vault_path"] = Path.Combine(Desktop.RealPath(root), "Vault"), ["path"] = path[6..],
                ["expected_sha256"] = SiteArtifact.Digest(original), ["updated_sha256"] = SiteArtifact.Digest(bytes),
                ["published"] = publication
            };
            string script = PublicationScript.Replace("REQUEST_JSON", request.ToJsonString(), StringComparison.Ordinal);
            JsonObject result;
            try { result = await Syncer.CliAsync(context, ["eval", "code=" + script], cancellationToken: cancellationToken); }
            catch (Exception error) when (error is SyncException or IOException)
            {
                throw new UnsafeInput("First publication requires this Vault open in Obsidian with CLI enabled. Current-content protection stopped the update: " + Syncer.SafeText(error.Message, 500));
            }
            if (result.Str("vault_path") != request.Str("vault_path") || result.Str("path") != request.Str("path")
                || result.Str("sha256") != request.Str("updated_sha256")
                || !File.ReadAllBytes(Path.Combine(root, path)).AsSpan().SequenceEqual(bytes))
                throw new UnsafeInput("First-publication result changed or could not be verified; current edits were preserved.");
        }
    }

    private const string PublicationScript = """
        (async()=>{
         const p=REQUEST_JSON;
         const hash=value=>require('node:crypto').createHash('sha256').update(value,'utf8').digest('hex');
         try{
          if(app.vault.adapter.getBasePath()!==p.vault_path)throw new Error('Connected vault differs from the preview source');
          if(typeof app.vault.process!=='function')throw new Error('The public Vault.process API is unavailable');
          const file=app.vault.getFileByPath(p.path);
          if(!file)throw new Error('First-publication source is not indexed in this vault');
          const updated=await app.vault.process(file,current=>{
           if(hash(current)!==p.expected_sha256)throw new Error('Source changed before atomic first-publication update');
           const opening=current.match(/^\uFEFF?---\r?\n/);
           if(!opening)throw new Error('First-publication frontmatter is invalid');
           const newline=opening[0].endsWith('\r\n')?'\r\n':'\n';
           const next=current.slice(0,opening[0].length)+'published: "'+p.published+'"'+newline+current.slice(opening[0].length);
           if(hash(next)!==p.updated_sha256)throw new Error('First-publication update differs from the verified change');
           return next;
          });
          if(hash(updated)!==p.updated_sha256||hash(await app.vault.read(file))!==p.updated_sha256)throw new Error('First-publication result changed before verification');
          return JSON.stringify({success:true,data:{vault_path:p.vault_path,path:p.path,sha256:p.updated_sha256}});
         }catch(error){return JSON.stringify({success:false,error:error instanceof Error?error.message:String(error)});}
        })()
        """;

    private static void AssertSources(string root, IReadOnlyDictionary<string, byte[]> expected)
    {
        Dictionary<string, byte[]> actual = ReadSources(root);
        if (actual.Count != expected.Count || expected.Any(item => !actual.TryGetValue(item.Key, out byte[]? current) || !current.AsSpan().SequenceEqual(item.Value)))
            throw new UnsafeInput("Vault changed during preview; current edits were preserved. Retry from the new working snapshot.");
    }

    public static async Task RunAsync(string root, string appBundle, int port = 8085, bool serve = true, CancellationToken cancellationToken = default,
        IProcessRunner? runner = null, Func<string, string, CancellationToken, Task>? renderSnapshot = null)
    {
        root = Desktop.RealPath(root);
        var context = new SyncerContext(root);
        using FileStream previewLock = Syncer.AcquireLock(context);
        Dictionary<string, byte[]> sources = ReadSources(root);
        string index = Git.Text(root, "rev-parse", "--git-path", "index");
        index = Path.GetFullPath(index, root);
        byte[] originalIndex = File.ReadAllBytes(index);
        string parent = Path.Combine(root, ".devbook-preview");
        Syncer.EnsureRegularPath(root, ".devbook-preview");
        Directory.CreateDirectory(parent);
        string preview = Path.Combine(parent, Guid.NewGuid().ToString("N"));
        bool retained = false;
        string? quartzTemporaryRoot = null;
        try
        {
            Console.WriteLine("Preparing an isolated preview of current Vault files; the Git index and personal Obsidian settings stay unchanged.");
            Git.Run(root, "clone", "--no-hardlinks", "--quiet", root, preview);
            foreach (string path in Git.Paths(root, "ls-files", "-z"))
            {
                if (path.StartsWith("Vault/.obsidian/", StringComparison.Ordinal) || SiteArtifact.IsOutput(path) || path == Receipt.PathName) continue;
                Syncer.EnsureRegularPath(root, path);
                string from = Path.Combine(root, path);
                string to = Path.Combine(preview, path);
                if (!File.Exists(from)) { if (File.Exists(to)) File.Delete(to); continue; }
                Directory.CreateDirectory(Path.GetDirectoryName(to)!);
                File.Copy(from, to, true);
            }
            foreach (string path in Syncer.Snapshot(preview).Keys)
                File.Delete(Path.Combine(preview, path));
            foreach ((string path, byte[] bytes) in sources)
            {
                string to = Path.Combine(preview, path);
                Directory.CreateDirectory(Path.GetDirectoryName(to)!);
                File.WriteAllBytes(to, bytes);
                File.SetLastWriteTimeUtc(to, File.GetLastWriteTimeUtc(Path.Combine(root, path)));
                if (OperatingSystem.IsMacOS()) File.SetCreationTimeUtc(to, File.GetCreationTimeUtc(Path.Combine(root, path)));
            }
            foreach (string path in Git.Paths(root, "ls-files", "--others", "--exclude-standard", "-z", "--", "Web/custom", ".scripts/DevBook.Tooling"))
            {
                Syncer.EnsureRegularPath(root, path);
                string to = Path.Combine(preview, path);
                Directory.CreateDirectory(Path.GetDirectoryName(to)!);
                File.Copy(Path.Combine(root, path), to);
            }
            Git.Run(preview, "add", "-A", "--", ".");
            string head = Git.Text(preview, "rev-parse", "HEAD");
            AssertSources(root, sources);
            await RenderAsync(preview, head, cancellationToken);
            AssertSources(root, sources);
            Dictionary<string, byte[]> published = PublicationChanges(root, sources, DateTimeOffset.UtcNow);
            if (published.Count > 0)
            {
                await WritePublicationsAsync(root, sources, published, cancellationToken: cancellationToken);
                foreach ((string path, byte[] bytes) in published)
                {
                    sources[path] = bytes;
                    File.WriteAllBytes(Path.Combine(preview, path), bytes);
                }
                Git.Run(preview, ["add", "--", .. published.Keys]);
                await RenderAsync(preview, head, cancellationToken);
            }
            AssertSources(root, sources);
            if (!File.ReadAllBytes(index).AsSpan().SequenceEqual(originalIndex))
                throw new UnsafeInput("The live Git index changed while preview was preparing; no index writes were made by preview.");
            previewLock.Dispose();
            string web = Path.Combine(preview, "Web");
            if (Directory.Exists(Path.Combine(root, "Web/node_modules"))
                && File.ReadAllBytes(Path.Combine(root, "Web/package-lock.json")).AsSpan().SequenceEqual(File.ReadAllBytes(Path.Combine(web, "package-lock.json"))))
                Directory.CreateSymbolicLink(Path.Combine(web, "node_modules"), Path.Combine(root, "Web/node_modules"));
            else
                await RunNpmAsync(web, ["ci", "--include=dev"], TimeSpan.FromMinutes(10), cancellationToken, runner);
            quartzTemporaryRoot = Directory.CreateTempSubdirectory("devbook-preview-quartz-").FullName;
            quartzTemporaryRoot = Desktop.RealPath(quartzTemporaryRoot);
            await RunNpmAsync(web, ["run", "build"], TimeSpan.FromMinutes(10), cancellationToken, runner, quartzTemporaryRoot);
            Console.WriteLine(new JsonObject { ["preview_root"] = preview, ["kind"] = "local", ["new_publication_dates"] = published.Count,
                ["url"] = $"http://localhost:{port}", ["source_index_preserved_during_preparation"] = true }.ToJsonString());
            if (!serve)
            {
                retained = true;
                Console.WriteLine("Preview output retained in the ignored preview directory for inspection.");
                return;
            }
            Console.WriteLine($"Preview: http://localhost:{port} — press Ctrl+C to stop.");
            using var stopped = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            ConsoleCancelEventHandler stop = (_, args) => { args.Cancel = true; stopped.Cancel(); };
            Console.CancelKeyPress += stop;
            try { await RunNpmAsync(web, ["run", "serve", "--", "--port", port.ToString(System.Globalization.CultureInfo.InvariantCulture)], TimeSpan.FromDays(1), stopped.Token, runner, quartzTemporaryRoot); }
            catch (OperationCanceledException) when (stopped.IsCancellationRequested) { }
            finally { Console.CancelKeyPress -= stop; }
        }
        finally
        {
            if (quartzTemporaryRoot is not null && Directory.Exists(quartzTemporaryRoot))
                Directory.Delete(quartzTemporaryRoot, true);
            if (!retained && Directory.Exists(preview))
            {
                bool recovery = Directory.EnumerateDirectories(preview, ".desktop-export-*", SearchOption.TopDirectoryOnly)
                    .Any(path => Directory.Exists(Path.Combine(path, "settings")));
                if (recovery) Console.Error.WriteLine("Preview retained for native settings recovery at " + preview);
                else Directory.Delete(preview, true);
            }
        }

        async Task RenderAsync(string checkout, string head, CancellationToken token)
        {
            if (renderSnapshot is not null) await renderSnapshot(checkout, head, token);
            else await Desktop.ExportCheckoutAsync(checkout, head, appBundle, cancellationToken: token, localSnapshot: true);
        }
    }

    private static async Task RunNpmAsync(string root, IReadOnlyList<string> arguments, TimeSpan timeout, CancellationToken cancellationToken, IProcessRunner? runner, string? quartzTemporaryRoot = null)
    {
        Dictionary<string, string>? environment = quartzTemporaryRoot is null ? null
            : new Dictionary<string, string> { ["DEVBOOK_QUARTZ_TEMP_ROOT"] = quartzTemporaryRoot };
        ProcessResult result = await (runner ?? new SystemProcessRunner()).RunAsync(new ProcessRequest("npm", arguments, root, Environment: environment, Timeout: timeout), cancellationToken);
        if (result.Stdout.Length > 0) Console.WriteLine(Syncer.SafeText(result.Stdout, 12000));
        if (result.Stderr.Length > 0) Console.Error.WriteLine(Syncer.SafeText(result.Stderr, 12000));
        result.EnsureSuccess("Preview npm operation");
    }
}
